import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateConnections } from '../index';
import { SolanaClient } from '../solana/client';
import { Config } from '../config';

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    anthropicApiKey: 'sk-ant-test-key-12345',
    apiPort: 3000,
    agentDiscoveryIntervalMs: 300000,
    dataDir: '/tmp/soldocs-test',
    webhookUrl: null,
    agentConcurrency: 1,
    ...overrides,
  };
}

describe('validateConnections', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let warnSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('succeeds when RPC returns a valid version', async () => {
    const solana = new SolanaClient('https://api.mainnet-beta.solana.com');
    // Mock the connection.getVersion to return a valid response
    solana.connection.getVersion = vi.fn().mockResolvedValue({ 'solana-core': '1.18.0', 'feature-set': 123 });

    const config = makeConfig();
    await expect(validateConnections(solana, config)).resolves.toBeUndefined();

    // Should log success messages
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Solana RPC OK'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Anthropic API key format OK'));
  });

  it('throws when RPC connection fails', async () => {
    const solana = new SolanaClient('https://invalid-rpc.example.com');
    solana.connection.getVersion = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const config = makeConfig({ solanaRpcUrl: 'https://invalid-rpc.example.com' });
    await expect(validateConnections(solana, config)).rejects.toThrow('Solana RPC connection failed');
    await expect(validateConnections(solana, config)).rejects.toThrow('ECONNREFUSED');
  });

  it('throws with RPC URL included in error message', async () => {
    const solana = new SolanaClient('https://bad-endpoint.example.com');
    solana.connection.getVersion = vi.fn().mockRejectedValue(new Error('timeout'));

    const config = makeConfig({ solanaRpcUrl: 'https://bad-endpoint.example.com' });
    await expect(validateConnections(solana, config)).rejects.toThrow('bad-endpoint.example.com');
  });

  it('warns when API key does not start with sk-ant-', async () => {
    const solana = new SolanaClient('https://api.mainnet-beta.solana.com');
    solana.connection.getVersion = vi.fn().mockResolvedValue({ 'solana-core': '1.18.0' });

    const config = makeConfig({ anthropicApiKey: 'invalid-key-format' });
    await validateConnections(solana, config);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('does not start with "sk-ant-"'));
  });

  it('does not warn when API key has correct prefix', async () => {
    const solana = new SolanaClient('https://api.mainnet-beta.solana.com');
    solana.connection.getVersion = vi.fn().mockResolvedValue({ 'solana-core': '1.18.0' });

    const config = makeConfig({ anthropicApiKey: 'sk-ant-valid-key' });
    await validateConnections(solana, config);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Anthropic API key format OK'));
  });

  it('logs the Solana version from the RPC response', async () => {
    const solana = new SolanaClient('https://api.mainnet-beta.solana.com');
    solana.connection.getVersion = vi.fn().mockResolvedValue({ 'solana-core': '2.1.5' });

    const config = makeConfig();
    await validateConnections(solana, config);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2.1.5'));
  });
});
