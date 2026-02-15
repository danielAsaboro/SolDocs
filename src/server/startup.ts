import http from 'http';
import { Config } from './config';
import { SolanaClient } from './solana/client';
import { Agent } from './agent/core';

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
