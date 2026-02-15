import Anthropic from '@anthropic-ai/sdk';

export class AIClient {
  private client: Anthropic;
  private lastCallTime = 0;
  private minIntervalMs = 500; // Rate limit: max 2 calls/sec

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, maxTokens = 4096): Promise<string> {
    // Simple rate limiting
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(r => setTimeout(r, this.minIntervalMs - elapsed));
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.lastCallTime = Date.now();
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find(b => b.type === 'text');
        return textBlock ? textBlock.text : '';
      } catch (error) {
        lastError = error as Error;
        const message = lastError.message || '';
        if (message.includes('429') || message.includes('529') || message.includes('500')) {
          const delay = Math.pow(2, attempt) * 2000;
          console.log(`[AI] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}
