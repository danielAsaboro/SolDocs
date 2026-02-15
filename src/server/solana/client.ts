import { Connection } from '@solana/web3.js';

export class SolanaClient {
  public connection: Connection;
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const message = lastError.message || '';
        // Retry on rate limit or server errors
        if (message.includes('429') || message.includes('503') || message.includes('502')) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`[Solana] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}
