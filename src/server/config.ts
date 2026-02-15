import path from 'path';

export interface Config {
  solanaRpcUrl: string;
  anthropicApiKey: string;
  apiPort: number;
  agentDiscoveryIntervalMs: number;
  dataDir: string;
  webhookUrl: string | null;
  agentConcurrency: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): Config {
  return {
    solanaRpcUrl: requireEnv('SOLANA_RPC_URL'),
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    apiPort: safeParseInt(process.env.API_PORT, 3000),
    agentDiscoveryIntervalMs: safeParseInt(process.env.AGENT_DISCOVERY_INTERVAL_MS, 300000),
    dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
    webhookUrl: process.env.WEBHOOK_URL || null,
    agentConcurrency: Math.max(1, safeParseInt(process.env.AGENT_CONCURRENCY, 1)),
  };
}
