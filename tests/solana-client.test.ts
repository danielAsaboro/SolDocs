import { describe, it, expect } from 'vitest';
import { SolanaClient } from '../src/server/solana/client';
import { isValidProgramId } from '../src/server/solana/program-info';

describe('SolanaClient', () => {
  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const client = new SolanaClient('https://api.mainnet-beta.solana.com');
      const result = await client.withRetry(async () => 42);
      expect(result).toBe(42);
    });

    it('retries on 429 and eventually succeeds', async () => {
      const client = new SolanaClient('https://api.mainnet-beta.solana.com');
      let attempts = 0;
      const result = await client.withRetry(async () => {
        attempts++;
        if (attempts < 3) throw new Error('429 Too Many Requests');
        return 'ok';
      }, 3);
      expect(result).toBe('ok');
      expect(attempts).toBe(3);
    });

    it('retries on 503 errors', async () => {
      const client = new SolanaClient('https://api.mainnet-beta.solana.com');
      let attempts = 0;
      const result = await client.withRetry(async () => {
        attempts++;
        if (attempts < 2) throw new Error('503 Service Unavailable');
        return 'recovered';
      }, 3);
      expect(result).toBe('recovered');
    });

    it('does not retry on non-retryable errors', async () => {
      const client = new SolanaClient('https://api.mainnet-beta.solana.com');
      let attempts = 0;
      await expect(
        client.withRetry(async () => {
          attempts++;
          throw new Error('Invalid public key');
        }, 3)
      ).rejects.toThrow('Invalid public key');
      expect(attempts).toBe(1);
    });

    it('throws after max retries exhausted', async () => {
      const client = new SolanaClient('https://api.mainnet-beta.solana.com');
      let attempts = 0;
      await expect(
        client.withRetry(async () => {
          attempts++;
          throw new Error('429 rate limited');
        }, 2)
      ).rejects.toThrow('429 rate limited');
      expect(attempts).toBe(2);
    });
  });
});

describe('isValidProgramId', () => {

  it('accepts valid base58 addresses', () => {
    expect(isValidProgramId('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH')).toBe(true);
    expect(isValidProgramId('11111111111111111111111111111111')).toBe(true);
    expect(isValidProgramId('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidProgramId('')).toBe(false);
    expect(isValidProgramId('not-a-key')).toBe(false);
    expect(isValidProgramId('0x1234')).toBe(false);
    expect(isValidProgramId('../../etc/passwd')).toBe(false);
  });
});
