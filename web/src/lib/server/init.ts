import path from "path";
import { Store } from "@backend/store";
import { SolanaClient } from "@backend/solana/client";
import { AIClient } from "@backend/ai/client";
import { Agent } from "@backend/agent/core";
import type { Config } from "@backend/config";

interface ServerContext {
  config: Config;
  store: Store;
  solana: SolanaClient;
  ai: AIClient;
  agent: Agent;
}

function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function loadConfig(): Config {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!rpcUrl || !apiKey) {
    throw new Error(
      "Missing SOLANA_RPC_URL or ANTHROPIC_API_KEY environment variables"
    );
  }

  return {
    solanaRpcUrl: rpcUrl,
    anthropicApiKey: apiKey,
    apiPort: safeParseInt(process.env.API_PORT, 3000),
    agentDiscoveryIntervalMs: safeParseInt(
      process.env.AGENT_DISCOVERY_INTERVAL_MS,
      300000
    ),
    dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
    webhookUrl: process.env.WEBHOOK_URL || null,
    agentConcurrency: Math.max(
      1,
      safeParseInt(process.env.AGENT_CONCURRENCY, 1)
    ),
  };
}

// Singleton preserved across hot reloads in dev
const globalForServer = globalThis as typeof globalThis & {
  __serverContext?: ServerContext;
  __agentStarted?: boolean;
};

export function getServerContext(): ServerContext {
  if (globalForServer.__serverContext) {
    return globalForServer.__serverContext;
  }

  const config = loadConfig();
  const store = new Store(config.dataDir);
  const solana = new SolanaClient(config.solanaRpcUrl);
  const ai = new AIClient(config.anthropicApiKey);
  const agent = new Agent(config, store, solana, ai);

  const ctx: ServerContext = { config, store, solana, ai, agent };
  globalForServer.__serverContext = ctx;

  // Start agent in background (only once)
  if (!globalForServer.__agentStarted) {
    globalForServer.__agentStarted = true;
    agent.start().catch((err) => {
      console.error("[Fatal] Agent crashed:", err);
    });
  }

  return ctx;
}

// Lightweight store-only access (for routes that don't need the full agent)
let storeOnly: Store | null = null;

export function getStore(): Store {
  // Try full context first
  if (globalForServer.__serverContext) {
    return globalForServer.__serverContext.store;
  }

  // Fallback: store-only mode (useful if env vars not set for agent)
  if (!storeOnly) {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    storeOnly = new Store(dataDir);
  }
  return storeOnly;
}
