import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIClient } from '../src/server/ai/client';

// Shared mock for Anthropic messages.create
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

function makeTextResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('AIClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCreate.mockReset();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('creates an Anthropic client with the provided API key', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      new AIClient('sk-ant-my-key');
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'sk-ant-my-key' });
    });
  });

  describe('generate - success path', () => {
    it('returns text content from AI response', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce(makeTextResponse('Hello, world!'));

      const result = await ai.generate('test prompt');
      expect(result).toBe('Hello, world!');
    });

    it('passes prompt as user message with correct parameters', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce(makeTextResponse('response'));

      await ai.generate('my custom prompt');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'my custom prompt' }],
      });
    });

    it('uses custom maxTokens when provided', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce(makeTextResponse('response'));

      await ai.generate('prompt', 6000);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 6000 }),
      );
    });

    it('defaults maxTokens to 4096', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce(makeTextResponse('response'));

      await ai.generate('prompt');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 4096 }),
      );
    });

    it('returns empty string when response has no text block', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
      });

      const result = await ai.generate('prompt');
      expect(result).toBe('');
    });

    it('returns empty string when response content is empty array', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce({ content: [] });

      const result = await ai.generate('prompt');
      expect(result).toBe('');
    });

    it('returns first text block when multiple content blocks exist', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'first block' },
          { type: 'text', text: 'second block' },
        ],
      });

      const result = await ai.generate('prompt');
      expect(result).toBe('first block');
    });
  });

  describe('generate - rate limiting', () => {
    it('delays when calls are made faster than 500ms apart', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValue(makeTextResponse('ok'));

      // First call - no delay needed
      await ai.generate('prompt1');

      // Second call immediately - should be rate-limited
      const promise = ai.generate('prompt2');
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('does not delay when calls are spaced more than 500ms apart', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValue(makeTextResponse('ok'));

      await ai.generate('prompt1');
      await vi.advanceTimersByTimeAsync(600);
      await ai.generate('prompt2');

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generate - retry logic', () => {
    it('retries on 429 rate limit error', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce(makeTextResponse('success after retry'));

      const promise = ai.generate('prompt');
      // Advance past retry delay: 2^0 * 2000 = 2000ms
      await vi.advanceTimersByTimeAsync(3000);
      const result = await promise;

      expect(result).toBe('success after retry');
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited, retrying in 2000ms (attempt 1/3)'),
      );
    });

    it('retries on 529 overload error', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate
        .mockRejectedValueOnce(new Error('529 Overloaded'))
        .mockResolvedValueOnce(makeTextResponse('recovered'));

      const promise = ai.generate('prompt');
      await vi.advanceTimersByTimeAsync(3000);
      const result = await promise;

      expect(result).toBe('recovered');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 internal server error', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockResolvedValueOnce(makeTextResponse('recovered'));

      const promise = ai.generate('prompt');
      await vi.advanceTimersByTimeAsync(3000);
      const result = await promise;

      expect(result).toBe('recovered');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('uses exponential backoff: 2s on first retry, 4s on second', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate
        .mockRejectedValueOnce(new Error('429'))
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValueOnce(makeTextResponse('finally'));

      const promise = ai.generate('prompt');
      // First retry: 2^0 * 2000 = 2000ms
      await vi.advanceTimersByTimeAsync(2500);
      // Second retry: 2^1 * 2000 = 4000ms
      await vi.advanceTimersByTimeAsync(4500);
      const result = await promise;

      expect(result).toBe('finally');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('throws after 3 failed attempts on retryable errors', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate
        .mockRejectedValueOnce(new Error('429 rate limited'))
        .mockRejectedValueOnce(new Error('429 rate limited'))
        .mockRejectedValueOnce(new Error('429 rate limited'));

      let caughtError: unknown = null;
      const promise = ai.generate('prompt').catch((err) => { caughtError = err; });
      // Advance past all retries: 2000 + 4000 + buffer
      await vi.advanceTimersByTimeAsync(15000);
      await promise;

      expect(caughtError).toBeTruthy();
      expect((caughtError as { message: string }).message).toContain('429 rate limited');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('does not retry on non-retryable errors (e.g., 401 auth)', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockRejectedValueOnce(new Error('401 Unauthorized'));

      await expect(ai.generate('prompt')).rejects.toThrow('401 Unauthorized');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('does not retry on validation errors', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockRejectedValueOnce(new Error('Invalid request: prompt too long'));

      await expect(ai.generate('prompt')).rejects.toThrow('Invalid request: prompt too long');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 400 bad request', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockRejectedValueOnce(new Error('400 Bad Request'));

      await expect(ai.generate('prompt')).rejects.toThrow('400 Bad Request');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('preserves the original error object on non-retryable failure', async () => {
      const ai = new AIClient('sk-ant-test');
      const originalError = new Error('Custom error');
      (originalError as any).status = 403;

      mockCreate.mockRejectedValueOnce(originalError);

      try {
        await ai.generate('prompt');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBe(originalError);
      }
    });

    it('throws the last error after exhausting all retries', async () => {
      const ai = new AIClient('sk-ant-test');
      const error1 = new Error('429 first');
      const error2 = new Error('429 second');
      const error3 = new Error('429 third');

      mockCreate
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(error3);

      let caughtError: unknown = null;
      const promise = ai.generate('prompt').catch((err) => { caughtError = err; });
      await vi.advanceTimersByTimeAsync(15000);
      await promise;

      expect(caughtError).toBe(error3);
    });

    it('handles error with empty message gracefully (no retry)', async () => {
      const ai = new AIClient('sk-ant-test');
      const error = new Error();
      mockCreate.mockRejectedValueOnce(error);

      // Empty message doesn't include 429/529/500, so no retry
      await expect(ai.generate('prompt')).rejects.toThrow();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate - model configuration', () => {
    it('uses claude-sonnet-4-5-20250929 model', async () => {
      const ai = new AIClient('sk-ant-test');
      mockCreate.mockResolvedValueOnce(makeTextResponse('ok'));

      await ai.generate('prompt');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-5-20250929' }),
      );
    });
  });
});
