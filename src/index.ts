import http from 'http';
import { loadConfig, Config } from './config';
import { Store } from './store';
import { SolanaClient } from './solana/client';
import { AIClient } from './ai/client';
import { Agent } from './agent/core';
import { createServer, startServer } from './api/server';

/**
 * Validates that Solana RPC and Anthropic API key are usable at startup.
 * Fails fast with clear error messages instead of failing later at runtime.
 */
export async function validateConnections(solana: SolanaClient, config: Config): Promise<void> {
  // Validate Solana RPC connectivity
  console.log('[Startup] Validating Solana RPC connection...');
  try {
    const version = await solana.withRetry(() => solana.connection.getVersion());
    console.log(`[Startup] Solana RPC OK (version: ${version['solana-core']})`);
  } catch (error) {
    throw new Error(`Solana RPC connection failed (${config.solanaRpcUrl}): ${(error as Error).message}`);
  }

  // Validate Anthropic API key format (basic check — real validation happens on first call)
  if (!config.anthropicApiKey.startsWith('sk-ant-')) {
    console.warn('[Startup] Warning: ANTHROPIC_API_KEY does not start with "sk-ant-". It may be invalid.');
  } else {
    console.log('[Startup] Anthropic API key format OK');
  }
}

/** Max time to wait for in-flight work to finish during shutdown */
export const SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Creates a graceful shutdown handler that:
 * 1. Stops the agent loop (no new batches start)
 * 2. Closes the HTTP server (stops accepting new connections)
 * 3. Waits briefly for in-flight work to drain
 * 4. Exits cleanly
 */
export function createShutdown(agent: Agent, server: http.Server): () => void {
  let shuttingDown = false;

  return () => {
    // Guard against double-signal (e.g., rapid Ctrl+C twice)
    if (shuttingDown) return;
    shuttingDown = true;

    console.log('\n[Shutdown] Gracefully shutting down...');
    agent.stop();
    server.close(() => {
      console.log('[Shutdown] HTTP server closed');
    });

    // Give in-flight work time to finish, then force exit
    setTimeout(() => {
      console.log('[Shutdown] Shutdown complete');
      process.exit(0);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };
}

async function main() {
  console.log('===========================================');
  console.log('  SolDocs - Solana Program Documentation');
  console.log('  Autonomous AI Agent');
  console.log('===========================================\n');

  // Load config
  const config = loadConfig();
  console.log(`[Config] RPC: ${config.solanaRpcUrl}`);
  console.log(`[Config] Port: ${config.apiPort}`);
  console.log(`[Config] Discovery interval: ${config.agentDiscoveryIntervalMs / 1000}s`);
  console.log(`[Config] Concurrency: ${config.agentConcurrency}`);
  if (config.webhookUrl) console.log(`[Config] Webhook: ${config.webhookUrl}`);
  console.log('');

  // Initialize components
  const store = new Store(config.dataDir);
  const solana = new SolanaClient(config.solanaRpcUrl);
  const ai = new AIClient(config.anthropicApiKey);

  // Validate connections before starting
  await validateConnections(solana, config);
  console.log('');

  const agent = new Agent(config, store, solana, ai);

  // Start API server
  const app = createServer(store, agent);
  const server = await startServer(app, config.apiPort);

  // Graceful shutdown on signals
  const shutdown = createShutdown(agent, server);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start autonomous agent loop in background
  // If the agent loop crashes, the process must exit — a running API server
  // with a dead agent is worse than a clean restart.
  agent.start().catch(err => {
    console.error('[Fatal] Agent crashed:', err);
    process.exit(1);
  });
}

main().catch(err => {
  console.error('[Fatal] Failed to start:', err);
  process.exit(1);
});
