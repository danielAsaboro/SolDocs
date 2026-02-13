import { Config } from '../config';
import { Store } from '../store';
import { SolanaClient } from '../solana/client';
import { AIClient } from '../ai/client';
import { DocGenerator } from '../docs/generator';
import { fetchIdl } from '../solana/idl';
import { fetchProgramInfo } from '../solana/program-info';
import { seedQueueIfEmpty, checkForUpgrades } from './discovery';
import { AgentState, AgentError, QueueItem, getIdlName, Documentation } from '../types';
import { sendWebhookNotification } from './webhook';

export class Agent {
  private config: Config;
  private store: Store;
  private solana: SolanaClient;
  private docGen: DocGenerator;
  private state: AgentState;
  private running = false;
  private upgradeCheckCounter = 0;
  private readonly UPGRADE_CHECK_EVERY = 12;

  constructor(config: Config, store: Store, solana: SolanaClient, ai: AIClient) {
    this.config = config;
    this.store = store;
    this.solana = solana;
    this.docGen = new DocGenerator(ai);

    // Initialize state from persisted data
    const stats = store.getStats();
    this.state = {
      running: false,
      programsDocumented: stats.documented,
      programsFailed: stats.failed,
      totalProcessed: stats.total,
      queueLength: 0,
      lastRunAt: null,
      startedAt: new Date().toISOString(),
      errors: [],
    };
  }

  getState(): AgentState {
    this.state.queueLength = this.store.getPendingItems().length;
    // Keep stats in sync with store
    const stats = this.store.getStats();
    this.state.programsDocumented = stats.documented;
    this.state.programsFailed = stats.failed;
    this.state.totalProcessed = stats.total;
    return { ...this.state };
  }

  async start(): Promise<void> {
    console.log('[Agent] Starting autonomous agent loop...');
    this.running = true;
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();

    // Recover any items stuck in 'processing' from a previous crash
    this.store.recoverStuckItems();

    // Seed with well-known programs on first run
    const seeded = seedQueueIfEmpty(this.store);
    if (seeded > 0) {
      console.log(`[Agent] Seeded ${seeded} programs into queue`);
    }

    // Main loop
    while (this.running) {
      try {
        await this.processQueue();
        this.state.lastRunAt = new Date().toISOString();

        // Periodically check for upgrades
        this.upgradeCheckCounter++;
        if (this.upgradeCheckCounter >= this.UPGRADE_CHECK_EVERY) {
          this.upgradeCheckCounter = 0;
          await this.checkUpgrades();
        }
      } catch (error) {
        console.error(`[Agent] Loop error: ${(error as Error).message}`);
        this.addError('agent-loop', (error as Error).message);
      }

      if (this.running) {
        const interval = this.config.agentDiscoveryIntervalMs;
        console.log(`[Agent] Sleeping for ${interval / 1000}s...`);
        await new Promise(r => setTimeout(r, interval));
      }
    }
  }

  stop(): void {
    console.log('[Agent] Stopping agent...');
    this.running = false;
    this.state.running = false;
  }

  private async processQueue(): Promise<void> {
    const pending = this.store.getPendingItems();
    if (pending.length === 0) {
      console.log('[Agent] Queue empty, nothing to process');
      return;
    }

    const concurrency = this.config.agentConcurrency;
    console.log(`[Agent] Processing ${pending.length} pending items (concurrency=${concurrency})...`);

    // Process in batches of `concurrency`
    for (let i = 0; i < pending.length; i += concurrency) {
      if (!this.running) break;

      const batch = pending.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(item => this.processProgramSafe(item))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'rejected') {
          // Shouldn't happen since processProgramSafe catches internally,
          // but guard against unexpected errors
          const item = batch[j];
          const msg = (result.reason as Error).message || 'Unknown error';
          console.error(`[Agent] Unexpected failure for ${item.programId}: ${msg}`);
          this.addError(item.programId, msg);
        }
      }
    }
  }

  private async processProgramSafe(item: QueueItem): Promise<void> {
    try {
      await this.processProgram(item.programId);
    } catch (error) {
      const msg = (error as Error).message;
      console.error(`[Agent] Failed to process ${item.programId}: ${msg}`);
      await this.store.updateQueueItemSafe(item.programId, {
        status: 'failed',
        attempts: item.attempts + 1,
        lastError: msg,
      });
      await this.store.saveProgramSafe({
        programId: item.programId,
        name: item.programId.slice(0, 8) + '...',
        description: '',
        instructionCount: 0,
        accountCount: 0,
        status: 'failed',
        idlHash: '',
        createdAt: item.addedAt,
        updatedAt: new Date().toISOString(),
        errorMessage: msg,
      });
      this.addError(item.programId, msg);
    }
  }

  private async processProgram(programId: string): Promise<void> {
    console.log(`[Agent] Processing program: ${programId}`);

    // Mark as processing
    await this.store.updateQueueItemSafe(programId, { status: 'processing' });

    // Step 1: Check if we already have an IDL cached (from upload or URL fetch)
    let idl = this.store.getIdlCache(programId)?.idl || null;

    // Step 2: If no cached IDL, try fetching from chain
    if (!idl) {
      // Validate program exists and is executable
      const info = await fetchProgramInfo(this.solana, programId);
      if (!info) {
        throw new Error('Program account not found on Solana');
      }
      if (!info.executable) {
        throw new Error('Account is not an executable program');
      }

      idl = await fetchIdl(this.solana, programId);
      if (!idl) {
        throw new Error('No Anchor IDL found (not on-chain, not uploaded). Use POST /api/programs/:id/idl to upload one.');
      }
    }

    // Step 3: Check if IDL has changed since last doc generation
    const existingCache = this.store.getIdlCache(programId);
    const newCache = this.store.saveIdlCache(programId, idl);
    const existingDocs = this.store.getDocs(programId);

    if (existingCache && existingDocs && existingCache.hash === newCache.hash) {
      console.log(`[Agent] IDL unchanged for ${programId}, skipping doc generation`);
      await this.store.removeFromQueueSafe(programId);
      return;
    }

    // Step 4: Generate documentation
    console.log(`[Agent] Generating docs for "${getIdlName(idl)}"...`);
    const docs = await this.docGen.generate(idl, programId, newCache.hash);
    this.store.saveDocs(docs);

    // Step 5: Update program index
    await this.store.saveProgramSafe({
      programId,
      name: getIdlName(idl),
      description: docs.overview.slice(0, 200).replace(/[#*\n]/g, ' ').trim(),
      instructionCount: idl.instructions.length,
      accountCount: idl.accounts?.length || 0,
      status: 'documented',
      idlHash: newCache.hash,
      createdAt: existingCache?.fetchedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Step 6: Send webhook notification if configured
    await this.notifyWebhook(docs);

    // Step 7: Remove from queue
    await this.store.removeFromQueueSafe(programId);
    console.log(`[Agent] Successfully documented "${getIdlName(idl)}" (${programId})`);
  }

  private async checkUpgrades(): Promise<void> {
    const programIds = checkForUpgrades(this.store);
    if (programIds.length === 0) return;

    console.log(`[Agent] Checking ${programIds.length} programs for IDL upgrades...`);
    for (const programId of programIds) {
      try {
        const idl = await fetchIdl(this.solana, programId);
        if (!idl) continue;

        const cached = this.store.getIdlCache(programId);
        const newHash = this.store.hashIdl(idl);

        if (cached && cached.hash !== newHash) {
          console.log(`[Agent] IDL upgrade detected for ${programId}, re-queuing`);
          await this.store.addToQueueSafe(programId);
        }
      } catch (error) {
        console.log(`[Agent] Upgrade check failed for ${programId}: ${(error as Error).message}`);
      }
    }
  }

  private async notifyWebhook(docs: Documentation): Promise<void> {
    if (!this.config.webhookUrl) return;
    try {
      await sendWebhookNotification(this.config.webhookUrl, docs);
      console.log(`[Agent] Webhook notification sent for ${docs.programId}`);
    } catch (error) {
      console.error(`[Agent] Webhook notification failed: ${(error as Error).message}`);
    }
  }

  private addError(programId: string, message: string): void {
    const error: AgentError = {
      programId,
      message,
      timestamp: new Date().toISOString(),
    };
    this.state.errors.push(error);
    if (this.state.errors.length > 50) {
      this.state.errors = this.state.errors.slice(-50);
    }
  }
}
