import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProgramMetadata, Documentation, IdlCache, QueueItem, AnchorIdl } from '../types';

// Only allow base58 characters in program IDs (Solana address charset)
const SAFE_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function sanitizeId(id: string): string {
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(`Invalid program ID format: ${id}`);
  }
  return id;
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`[Store] Corrupt JSON at ${filePath}, resetting to fallback: ${(err as Error).message}`);
    // Back up corrupt file
    try {
      fs.renameSync(filePath, filePath + '.corrupt.' + Date.now());
    } catch {}
    return fallback;
  }
}

function safeWriteJson(filePath: string, data: unknown): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

/**
 * Per-file async mutex to prevent concurrent read-modify-write races.
 * Each file path gets its own lock queue so operations on different files
 * can proceed in parallel while operations on the same file are serialized.
 */
export class FileMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
    // Chain this operation after any pending operation on the same file
    const prev = this.locks.get(filePath) ?? Promise.resolve();

    let releaseFn: () => void;
    const next = new Promise<void>(resolve => { releaseFn = resolve; });
    this.locks.set(filePath, next);

    // Wait for previous operation on this file to complete
    await prev;

    try {
      return await fn();
    } finally {
      releaseFn!();
      // Clean up if no more operations are queued
      if (this.locks.get(filePath) === next) {
        this.locks.delete(filePath);
      }
    }
  }
}

export class Store {
  private dataDir: string;
  private programsFile: string;
  private queueFile: string;
  private docsDir: string;
  private idlsDir: string;
  private mutex: FileMutex;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.programsFile = path.join(dataDir, 'programs.json');
    this.queueFile = path.join(dataDir, 'queue.json');
    this.docsDir = path.join(dataDir, 'docs');
    this.idlsDir = path.join(dataDir, 'idls');
    this.mutex = new FileMutex();
    this.ensureDirs();
  }

  private ensureDirs(): void {
    for (const dir of [this.dataDir, this.docsDir, this.idlsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    if (!fs.existsSync(this.programsFile)) {
      safeWriteJson(this.programsFile, []);
    }
    if (!fs.existsSync(this.queueFile)) {
      safeWriteJson(this.queueFile, []);
    }
  }

  // Program index
  getProgramIndex(): ProgramMetadata[] {
    return safeReadJson<ProgramMetadata[]>(this.programsFile, []);
  }

  getProgram(programId: string): ProgramMetadata | undefined {
    sanitizeId(programId);
    return this.getProgramIndex().find(p => p.programId === programId);
  }

  saveProgram(program: ProgramMetadata): void {
    sanitizeId(program.programId);
    const programs = this.getProgramIndex();
    const idx = programs.findIndex(p => p.programId === program.programId);
    if (idx >= 0) {
      programs[idx] = program;
    } else {
      programs.push(program);
    }
    safeWriteJson(this.programsFile, programs);
  }

  async saveProgramSafe(program: ProgramMetadata): Promise<void> {
    return this.mutex.acquire(this.programsFile, () => {
      this.saveProgram(program);
    });
  }

  removeProgram(programId: string): void {
    sanitizeId(programId);
    const programs = this.getProgramIndex().filter(p => p.programId !== programId);
    safeWriteJson(this.programsFile, programs);
  }

  async removeProgramSafe(programId: string): Promise<void> {
    return this.mutex.acquire(this.programsFile, () => {
      this.removeProgram(programId);
    });
  }

  // Queue
  getQueue(): QueueItem[] {
    return safeReadJson<QueueItem[]>(this.queueFile, []);
  }

  addToQueue(programId: string): { item: QueueItem; isNew: boolean } {
    sanitizeId(programId);
    const queue = this.getQueue();
    const existing = queue.find(q => q.programId === programId);

    // If already pending/processing, return as-is
    if (existing && existing.status !== 'failed') {
      return { item: existing, isNew: false };
    }

    // If failed, reset to pending for retry (clear attempts so it gets a fresh retry budget)
    if (existing && existing.status === 'failed') {
      existing.status = 'pending';
      existing.attempts = 0;
      existing.lastError = undefined;
      safeWriteJson(this.queueFile, queue);
      return { item: existing, isNew: false };
    }

    const item: QueueItem = {
      programId,
      status: 'pending',
      addedAt: new Date().toISOString(),
      attempts: 0,
    };
    queue.push(item);
    safeWriteJson(this.queueFile, queue);
    return { item, isNew: true };
  }

  async addToQueueSafe(programId: string): Promise<{ item: QueueItem; isNew: boolean }> {
    return this.mutex.acquire(this.queueFile, () => {
      return this.addToQueue(programId);
    });
  }

  updateQueueItem(programId: string, update: Partial<QueueItem>): void {
    sanitizeId(programId);
    const queue = this.getQueue();
    const idx = queue.findIndex(q => q.programId === programId);
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], ...update };
      safeWriteJson(this.queueFile, queue);
    }
  }

  async updateQueueItemSafe(programId: string, update: Partial<QueueItem>): Promise<void> {
    return this.mutex.acquire(this.queueFile, () => {
      this.updateQueueItem(programId, update);
    });
  }

  removeFromQueue(programId: string): void {
    sanitizeId(programId);
    const queue = this.getQueue().filter(q => q.programId !== programId);
    safeWriteJson(this.queueFile, queue);
  }

  async removeFromQueueSafe(programId: string): Promise<void> {
    return this.mutex.acquire(this.queueFile, () => {
      this.removeFromQueue(programId);
    });
  }

  getPendingItems(): QueueItem[] {
    return this.getQueue().filter(q => q.status === 'pending');
  }

  // Recover stuck 'processing' items on startup
  recoverStuckItems(): number {
    const queue = this.getQueue();
    let recovered = 0;
    for (const item of queue) {
      if (item.status === 'processing') {
        item.status = 'pending';
        recovered++;
      }
    }
    if (recovered > 0) {
      safeWriteJson(this.queueFile, queue);
      console.log(`[Store] Recovered ${recovered} stuck 'processing' items back to 'pending'`);
    }
    return recovered;
  }

  // Documentation
  getDocs(programId: string): Documentation | null {
    sanitizeId(programId);
    const file = path.join(this.docsDir, `${programId}.json`);
    return safeReadJson<Documentation | null>(file, null);
  }

  saveDocs(docs: Documentation): void {
    sanitizeId(docs.programId);
    const file = path.join(this.docsDir, `${docs.programId}.json`);
    safeWriteJson(file, docs);
  }

  removeDocs(programId: string): void {
    sanitizeId(programId);
    const file = path.join(this.docsDir, `${programId}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  removeIdlCache(programId: string): void {
    sanitizeId(programId);
    const file = path.join(this.idlsDir, `${programId}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  // IDL cache
  getIdlCache(programId: string): IdlCache | null {
    sanitizeId(programId);
    const file = path.join(this.idlsDir, `${programId}.json`);
    return safeReadJson<IdlCache | null>(file, null);
  }

  saveIdlCache(programId: string, idl: AnchorIdl): IdlCache {
    sanitizeId(programId);
    const hash = this.hashIdl(idl);
    const cache: IdlCache = {
      programId,
      idl,
      hash,
      fetchedAt: new Date().toISOString(),
    };
    const file = path.join(this.idlsDir, `${programId}.json`);
    safeWriteJson(file, cache);
    return cache;
  }

  hashIdl(idl: AnchorIdl): string {
    return crypto.createHash('sha256').update(JSON.stringify(idl)).digest('hex');
  }

  // Compute stats from stored data (survives restart)
  getStats(): { documented: number; failed: number; total: number } {
    const programs = this.getProgramIndex();
    return {
      documented: programs.filter(p => p.status === 'documented').length,
      failed: programs.filter(p => p.status === 'failed').length,
      total: programs.length,
    };
  }
}
