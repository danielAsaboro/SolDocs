import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhookNotification, WebhookPayload } from '../src/server/agent/webhook';
import { Documentation } from '../src/server/types';

function makeDocs(overrides: Partial<Documentation> = {}): Documentation {
  return {
    programId: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
    name: 'test_program',
    overview: '## Program Overview\nThis is a test program that does things.',
    instructions: '### `initialize`\nInitializes the program.\n\n### `transfer`\nTransfers tokens.',
    accounts: '## Account Types\n### State\nMain state account.',
    security: '## Access Control\nSigner checks present.',
    fullMarkdown: '# test_program\n\nFull documentation here.',
    generatedAt: '2026-02-14T12:00:00.000Z',
    idlHash: 'abc123def456',
    ...overrides,
  };
}

describe('sendWebhookNotification', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('payload structure', () => {
    it('sends correct payload with all required fields', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      const docs = makeDocs();
      await sendWebhookNotification('https://example.com/hook', docs);

      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.event).toBe('doc.completed');
      expect(capturedBody!.programId).toBe('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(capturedBody!.name).toBe('test_program');
      expect(capturedBody!.timestamp).toBeTruthy();
      expect(capturedBody!.documentation).toBeDefined();
      expect(capturedBody!.documentation.idlHash).toBe('abc123def456');
      expect(capturedBody!.documentation.generatedAt).toBe('2026-02-14T12:00:00.000Z');
    });

    it('sends POST request with JSON content-type', async () => {
      let capturedInit: RequestInit | undefined;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedInit = init;
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://example.com/hook', makeDocs());

      expect(capturedInit).toBeDefined();
      expect(capturedInit!.method).toBe('POST');
      expect(capturedInit!.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('sends to the correct webhook URL', async () => {
      let capturedUrl = '';
      globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
        capturedUrl = url.toString();
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://hooks.example.com/custom-path', makeDocs());

      expect(capturedUrl).toBe('https://hooks.example.com/custom-path');
    });

    it('includes a valid ISO timestamp in the payload', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://example.com/hook', makeDocs());

      // Timestamp should be a valid ISO date string
      const parsed = new Date(capturedBody!.timestamp);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('overview truncation', () => {
    it('truncates overview to 500 characters', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      const longOverview = 'A'.repeat(1000);
      await sendWebhookNotification('https://example.com/hook', makeDocs({ overview: longOverview }));

      expect(capturedBody!.documentation.overview).toHaveLength(500);
      expect(capturedBody!.documentation.overview).toBe('A'.repeat(500));
    });

    it('sends full overview when shorter than 500 chars', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      const shortOverview = 'Short overview text.';
      await sendWebhookNotification('https://example.com/hook', makeDocs({ overview: shortOverview }));

      expect(capturedBody!.documentation.overview).toBe('Short overview text.');
    });
  });

  describe('instruction count parsing', () => {
    it('counts instructions by ### headers', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      // Two ### headers
      const instructions = '### `initialize`\nFirst instruction.\n\n### `transfer`\nSecond instruction.';
      await sendWebhookNotification('https://example.com/hook', makeDocs({ instructions }));

      expect(capturedBody!.documentation.instructionCount).toBe(2);
    });

    it('returns 1 when no ### headers are found', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      // No ### headers at all
      const instructions = 'Just plain text without headers.';
      await sendWebhookNotification('https://example.com/hook', makeDocs({ instructions }));

      expect(capturedBody!.documentation.instructionCount).toBe(1);
    });

    it('counts multiple ### headers correctly', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      // Five ### headers
      const instructions = '### `a`\n### `b`\n### `c`\n### `d`\n### `e`';
      await sendWebhookNotification('https://example.com/hook', makeDocs({ instructions }));

      expect(capturedBody!.documentation.instructionCount).toBe(5);
    });
  });

  describe('error handling', () => {
    it('throws when webhook returns HTTP error status', async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response('Internal Server Error', { status: 500 });
      }) as unknown as typeof fetch;

      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).rejects.toThrow('Webhook returned HTTP 500');
    });

    it('throws on HTTP 404', async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response('Not Found', { status: 404 });
      }) as unknown as typeof fetch;

      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).rejects.toThrow('Webhook returned HTTP 404');
    });

    it('throws on HTTP 403', async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response('Forbidden', { status: 403 });
      }) as unknown as typeof fetch;

      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).rejects.toThrow('Webhook returned HTTP 403');
    });

    it('propagates network errors from fetch', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch;

      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('propagates DNS resolution errors', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND example.com');
      }) as unknown as typeof fetch;

      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).rejects.toThrow('ENOTFOUND');
    });

    it('does not throw when webhook returns 2xx status', async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response('Created', { status: 201 });
      }) as unknown as typeof fetch;

      // Should not throw — 201 is a success status
      await expect(
        sendWebhookNotification('https://example.com/hook', makeDocs())
      ).resolves.toBeUndefined();
    });
  });

  describe('timeout', () => {
    it('passes AbortSignal.timeout(10000) to fetch', async () => {
      let capturedSignal: AbortSignal | undefined;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedSignal = init?.signal as AbortSignal;
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://example.com/hook', makeDocs());

      expect(capturedSignal).toBeDefined();
      // AbortSignal.timeout creates a signal — we can verify it's an AbortSignal
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('edge cases', () => {
    it('handles empty instructions string', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://example.com/hook', makeDocs({ instructions: '' }));

      // Empty string split by '###' yields [''], length - 1 = 0, fallback to 1
      expect(capturedBody!.documentation.instructionCount).toBe(1);
    });

    it('handles empty overview string', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      await sendWebhookNotification('https://example.com/hook', makeDocs({ overview: '' }));

      expect(capturedBody!.documentation.overview).toBe('');
    });

    it('preserves programId from documentation object', async () => {
      let capturedBody: WebhookPayload | null = null;
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response('OK', { status: 200 });
      }) as unknown as typeof fetch;

      const customId = 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY';
      await sendWebhookNotification('https://example.com/hook', makeDocs({
        programId: customId,
        name: 'phoenix_dex',
      }));

      expect(capturedBody!.programId).toBe(customId);
      expect(capturedBody!.name).toBe('phoenix_dex');
    });
  });
});
