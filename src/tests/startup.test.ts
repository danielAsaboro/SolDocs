import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConnections, createShutdown, SHUTDOWN_TIMEOUT_MS } from '../index';
import { SolanaClient } from '../solana/client';
import { Config } from '../config';
import http from 'http';

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

describe('createShutdown', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAgent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockServer: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    mockAgent = { stop: vi.fn() };
    mockServer = { close: vi.fn((cb?: () => void) => { if (cb) cb(); }) };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports SHUTDOWN_TIMEOUT_MS as 5000', () => {
    expect(SHUTDOWN_TIMEOUT_MS).toBe(5000);
  });

  it('calls agent.stop() when shutdown is triggered', () => {
    const shutdown = createShutdown(
      mockAgent as unknown as import('../agent/core').Agent,
      mockServer as unknown as http.Server,
    );
    shutdown();
    expect(mockAgent.stop).toHaveBeenCalledTimes(1);
  });

  it('calls server.close() when shutdown is triggered', () => {
    const shutdown = createShutdown(
      mockAgent as unknown as import('../agent/core').Agent,
      mockServer as unknown as http.Server,
    );
    shutdown();
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });

  it('logs shutdown messages', () => {
    const shutdown = createShutdown(
      mockAgent as unknown as import('../agent/core').Agent,
      mockServer as unknown as http.Server,
    );
    shutdown();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Gracefully shutting down'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP server closed'));
  });

  it('ignores duplicate shutdown signals (double Ctrl+C guard)', () => {
    const shutdown = createShutdown(
      mockAgent as unknown as import('../agent/core').Agent,
      mockServer as unknown as http.Server,
    );
    shutdown();
    shutdown(); // second call should be ignored
    expect(mockAgent.stop).toHaveBeenCalledTimes(1);
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });

  it('schedules process.exit after SHUTDOWN_TIMEOUT_MS', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const shutdown = createShutdown(
      mockAgent as unknown as import('../agent/core').Agent,
      mockServer as unknown as http.Server,
    );
    shutdown();

    // Before timeout — exit not called yet
    expect(exitSpy).not.toHaveBeenCalled();

    // Advance past the timeout
    vi.advanceTimersByTime(SHUTDOWN_TIMEOUT_MS);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
