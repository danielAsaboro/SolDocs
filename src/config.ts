import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

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

export function loadConfig(): Config {
  return {
    solanaRpcUrl: requireEnv('SOLANA_RPC_URL'),
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    apiPort: parseInt(process.env.API_PORT || '3000', 10),
    agentDiscoveryIntervalMs: parseInt(process.env.AGENT_DISCOVERY_INTERVAL_MS || '300000', 10),
    dataDir: path.join(__dirname, 'data'),
    webhookUrl: process.env.WEBHOOK_URL || null,
    agentConcurrency: Math.max(1, parseInt(process.env.AGENT_CONCURRENCY || '1', 10)),
  };
}
