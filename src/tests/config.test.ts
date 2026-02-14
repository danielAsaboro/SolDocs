import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { loadConfig, Config } from '../config';

// Save and restore env vars around each test
const savedEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const key of [
    'SOLANA_RPC_URL', 'ANTHROPIC_API_KEY', 'API_PORT',
    'AGENT_DISCOVERY_INTERVAL_MS', 'WEBHOOK_URL', 'AGENT_CONCURRENCY',
  ]) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function setRequiredEnv() {
  process.env.SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345';
}

function clearOptionalEnv() {
  delete process.env.API_PORT;
  delete process.env.AGENT_DISCOVERY_INTERVAL_MS;
  delete process.env.WEBHOOK_URL;
  delete process.env.AGENT_CONCURRENCY;
}

describe('Config', () => {
  beforeEach(() => {
    saveEnv();
    setRequiredEnv();
    clearOptionalEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('required environment variables', () => {
    it('throws when SOLANA_RPC_URL is missing', () => {
      delete process.env.SOLANA_RPC_URL;
      expect(() => loadConfig()).toThrow('Missing required environment variable: SOLANA_RPC_URL');
    });

    it('throws when ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => loadConfig()).toThrow('Missing required environment variable: ANTHROPIC_API_KEY');
    });

    it('throws when SOLANA_RPC_URL is empty string', () => {
      process.env.SOLANA_RPC_URL = '';
      expect(() => loadConfig()).toThrow('Missing required environment variable: SOLANA_RPC_URL');
    });

    it('throws when ANTHROPIC_API_KEY is empty string', () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(() => loadConfig()).toThrow('Missing required environment variable: ANTHROPIC_API_KEY');
    });

    it('loads SOLANA_RPC_URL correctly', () => {
      process.env.SOLANA_RPC_URL = 'https://my-rpc.example.com';
      const config = loadConfig();
      expect(config.solanaRpcUrl).toBe('https://my-rpc.example.com');
    });

    it('loads ANTHROPIC_API_KEY correctly', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-my-secret-key';
      const config = loadConfig();
      expect(config.anthropicApiKey).toBe('sk-ant-my-secret-key');
    });
  });

  describe('default values', () => {
    it('defaults apiPort to 3000', () => {
      const config = loadConfig();
      expect(config.apiPort).toBe(3000);
    });

    it('defaults agentDiscoveryIntervalMs to 300000', () => {
      const config = loadConfig();
      expect(config.agentDiscoveryIntervalMs).toBe(300000);
    });

    it('defaults webhookUrl to null', () => {
      const config = loadConfig();
      expect(config.webhookUrl).toBeNull();
    });

    it('defaults agentConcurrency to 1', () => {
      const config = loadConfig();
      expect(config.agentConcurrency).toBe(1);
    });

    it('sets dataDir to src/data', () => {
      const config = loadConfig();
      // dataDir is path.join(__dirname, 'data') where __dirname is src/
      expect(config.dataDir).toMatch(/src[\/\\]data$/);
    });
  });

  describe('optional environment variables', () => {
    it('reads API_PORT from env', () => {
      process.env.API_PORT = '8080';
      const config = loadConfig();
      expect(config.apiPort).toBe(8080);
    });

    it('reads AGENT_DISCOVERY_INTERVAL_MS from env', () => {
      process.env.AGENT_DISCOVERY_INTERVAL_MS = '60000';
      const config = loadConfig();
      expect(config.agentDiscoveryIntervalMs).toBe(60000);
    });

    it('reads WEBHOOK_URL from env', () => {
      process.env.WEBHOOK_URL = 'https://hooks.example.com/notify';
      const config = loadConfig();
      expect(config.webhookUrl).toBe('https://hooks.example.com/notify');
    });

    it('reads AGENT_CONCURRENCY from env', () => {
      process.env.AGENT_CONCURRENCY = '5';
      const config = loadConfig();
      expect(config.agentConcurrency).toBe(5);
    });
  });

  describe('agentConcurrency minimum enforcement', () => {
    it('enforces minimum of 1 when set to 0', () => {
      process.env.AGENT_CONCURRENCY = '0';
      const config = loadConfig();
      expect(config.agentConcurrency).toBe(1);
    });

    it('enforces minimum of 1 when set to negative', () => {
      process.env.AGENT_CONCURRENCY = '-5';
      const config = loadConfig();
      expect(config.agentConcurrency).toBe(1);
    });

    it('allows values greater than 1', () => {
      process.env.AGENT_CONCURRENCY = '10';
      const config = loadConfig();
      expect(config.agentConcurrency).toBe(10);
    });
  });

  describe('parseInt edge cases', () => {
    it('parses API_PORT with leading zeros', () => {
      process.env.API_PORT = '03000';
      const config = loadConfig();
      expect(config.apiPort).toBe(3000);
    });

    it('returns NaN for non-numeric API_PORT', () => {
      process.env.API_PORT = 'abc';
      const config = loadConfig();
      expect(config.apiPort).toBeNaN();
    });

    it('returns NaN for non-numeric AGENT_DISCOVERY_INTERVAL_MS', () => {
      process.env.AGENT_DISCOVERY_INTERVAL_MS = 'never';
      const config = loadConfig();
      expect(config.agentDiscoveryIntervalMs).toBeNaN();
    });

    it('returns NaN for non-numeric AGENT_CONCURRENCY (Math.max with NaN)', () => {
      process.env.AGENT_CONCURRENCY = 'many';
      const config = loadConfig();
      // Math.max(1, NaN) returns NaN in JavaScript
      expect(config.agentConcurrency).toBeNaN();
    });

    it('truncates decimal API_PORT to integer', () => {
      process.env.API_PORT = '3000.75';
      const config = loadConfig();
      expect(config.apiPort).toBe(3000);
    });
  });

  describe('Config interface completeness', () => {
    it('returns all expected Config fields', () => {
      const config = loadConfig();
      expect(config).toHaveProperty('solanaRpcUrl');
      expect(config).toHaveProperty('anthropicApiKey');
      expect(config).toHaveProperty('apiPort');
      expect(config).toHaveProperty('agentDiscoveryIntervalMs');
      expect(config).toHaveProperty('dataDir');
      expect(config).toHaveProperty('webhookUrl');
      expect(config).toHaveProperty('agentConcurrency');
    });

    it('returns exactly the expected fields (no extras)', () => {
      const config = loadConfig();
      const keys = Object.keys(config).sort();
      expect(keys).toEqual([
        'agentConcurrency',
        'agentDiscoveryIntervalMs',
        'anthropicApiKey',
        'apiPort',
        'dataDir',
        'solanaRpcUrl',
        'webhookUrl',
      ]);
    });
  });
});
