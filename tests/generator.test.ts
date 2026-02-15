import { describe, it, expect, vi } from 'vitest';
import { DocGenerator } from '../src/server/docs/generator';
import { AIClient } from '../src/server/ai/client';
import { AnchorIdl } from '../src/server/types';
import { overviewPrompt, instructionsPrompt, accountsPrompt, securityPrompt } from '../src/server/ai/prompts';

// Mock AI client that returns predictable responses
class MockAIClient {
  callCount = 0;
  prompts: string[] = [];
  async generate(prompt: string, _maxTokens?: number): Promise<string> {
    this.callCount++;
    this.prompts.push(prompt);
    if (prompt.includes('security auditor')) {
      return '## Access Control Analysis\nSigner checks present.\n## Common Pitfalls\n- Check authorities.\n## Best Practices\n- Validate all accounts.';
    }
    if (prompt.includes('overview') || prompt.includes('comprehensive overview')) {
      return '## Program Overview\nThis is a test program.\n## Architecture\nSimple design.\n## Key Features\n- Feature 1\n## Instructions Summary\n| Name | Purpose |\n|------|---------|';
    }
    if (prompt.includes('Account Types') || prompt.includes('account types')) {
      return '## Account Types\n### State\nMain state account.\n## Error Codes\n| Code | Name |\n|------|------|';
    }
    if (prompt.includes('detailed documentation for the following')) {
      return '### `initialize`\n**Description**: Initializes the program.\n\n```typescript\nconst tx = await program.methods.initialize().rpc();\n```';
    }
    return '# Generic documentation content';
  }
}

// Mock AI client that throws errors
class FailingAIClient {
  callCount = 0;
  failOnCall = 0; // 0-indexed: fail on the Nth call
  constructor(failOnCall = 0) { this.failOnCall = failOnCall; }
  async generate(prompt: string, _maxTokens?: number): Promise<string> {
    if (this.callCount === this.failOnCall) {
      this.callCount++;
      throw new Error('AI service unavailable');
    }
    this.callCount++;
    if (prompt.includes('security auditor')) return '## Security\n```\ncheck\n```';
    if (prompt.includes('overview')) return '## Overview\nTest.\n```\ncode\n```';
    if (prompt.includes('Account Types')) return '## Accounts\n```\ncode\n```';
    return '### `ix`\n**Description**: test.\n```typescript\ncode\n```';
  }
}

const MOCK_IDL: AnchorIdl = {
  version: '0.1.0',
  name: 'test_program',
  instructions: [
    { name: 'initialize', accounts: [{ name: 'state', isMut: true, isSigner: false }], args: [] },
    { name: 'transfer', accounts: [], args: [{ name: 'amount', type: 'u64' }] },
    { name: 'close', accounts: [], args: [] },
  ],
  accounts: [{ name: 'State', type: { kind: 'struct', fields: [{ name: 'authority', type: 'publicKey' }] } }],
  errors: [{ code: 6000, name: 'Unauthorized', msg: 'Not authorized' }],
};

describe('DocGenerator', () => {
  it('generates complete documentation with all sections', async () => {
    const mockAi = new MockAIClient();
    const gen = new DocGenerator(mockAi as unknown as AIClient);
    const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc123');

    expect(doc.programId).toBe('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
    expect(doc.name).toBe('test_program');
    expect(doc.idlHash).toBe('abc123');
    expect(doc.overview).toContain('Program Overview');
    expect(doc.instructions).toContain('initialize');
    expect(doc.accounts).toContain('Account Types');
    expect(doc.security).toContain('Access Control');
    expect(doc.fullMarkdown).toContain('test_program');
    expect(doc.fullMarkdown).toContain('SolDocs');
    expect(doc.generatedAt).toBeTruthy();
  });

  it('makes correct number of AI calls', async () => {
    const mockAi = new MockAIClient();
    const gen = new DocGenerator(mockAi as unknown as AIClient);
    await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');

    // 1 overview + 1 batch of instructions (3 instructions < batch size 5) + 1 accounts + 1 security = 4
    expect(mockAi.callCount).toBe(4);
  });

  it('batches instructions correctly for large IDLs', async () => {
    const mockAi = new MockAIClient();
    const gen = new DocGenerator(mockAi as unknown as AIClient);

    const largeIdl: AnchorIdl = {
      ...MOCK_IDL,
      instructions: Array.from({ length: 12 }, (_, i) => ({
        name: `instruction_${i}`,
        accounts: [],
        args: [],
      })),
    };
    await gen.generate(largeIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');

    // 1 overview + 3 batches (12/5 = 2.4, rounds to 3 batches) + 1 accounts + 1 security = 6
    expect(mockAi.callCount).toBe(6);
  });

  it('handles IDL with no accounts/types', async () => {
    const mockAi = new MockAIClient();
    const gen = new DocGenerator(mockAi as unknown as AIClient);

    const minimalIdl: AnchorIdl = {
      version: '0.1.0',
      name: 'minimal',
      instructions: [{ name: 'do_thing', accounts: [], args: [] }],
    };
    const doc = await gen.generate(minimalIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
    expect(doc.accounts).toContain('No account types');
    // 1 overview + 1 instructions + 0 accounts (skipped) + 1 security = 3
    expect(mockAi.callCount).toBe(3);
  });

  it('handles IDL v2 format with metadata.name instead of name', async () => {
    const mockAi = new MockAIClient();
    const gen = new DocGenerator(mockAi as unknown as AIClient);

    const v2Idl: AnchorIdl = {
      address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      metadata: { name: 'whirlpool', version: '0.3.0', spec: '0.1.0' },
      instructions: [{ name: 'swap', accounts: [], args: [{ name: 'amount', type: 'u64' }] }],
      accounts: [{ name: 'Whirlpool', type: { kind: 'struct', fields: [{ name: 'liquidity', type: 'u128' }] } }],
    };
    const doc = await gen.generate(v2Idl, 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', 'v2hash');

    expect(doc.name).toBe('whirlpool');
    expect(doc.fullMarkdown).toContain('# whirlpool');
    expect(doc.fullMarkdown).not.toContain('undefined');
  });

  describe('error propagation', () => {
    it('propagates AI error from overview pass', async () => {
      const failAi = new FailingAIClient(0); // fail on first call (overview)
      const gen = new DocGenerator(failAi as unknown as AIClient);
      await expect(gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc'))
        .rejects.toThrow('AI service unavailable');
    });

    it('propagates AI error from instruction pass', async () => {
      const failAi = new FailingAIClient(1); // fail on second call (instructions)
      const gen = new DocGenerator(failAi as unknown as AIClient);
      await expect(gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc'))
        .rejects.toThrow('AI service unavailable');
    });

    it('propagates AI error from accounts pass', async () => {
      const failAi = new FailingAIClient(2); // fail on third call (accounts)
      const gen = new DocGenerator(failAi as unknown as AIClient);
      await expect(gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc'))
        .rejects.toThrow('AI service unavailable');
    });

    it('propagates AI error from security pass', async () => {
      const failAi = new FailingAIClient(3); // fail on fourth call (security)
      const gen = new DocGenerator(failAi as unknown as AIClient);
      await expect(gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc'))
        .rejects.toThrow('AI service unavailable');
    });
  });

  describe('fullMarkdown structure', () => {
    it('contains program name as top-level heading', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.fullMarkdown).toMatch(/^# test_program\n/);
    });

    it('contains program ID in blockquote', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.fullMarkdown).toContain('`dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`');
    });

    it('contains all four section headings', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.fullMarkdown).toContain('# Instructions');
      expect(doc.fullMarkdown).toContain('# Accounts & Types');
      expect(doc.fullMarkdown).toContain('# Security Analysis');
    });

    it('contains SolDocs attribution in header and footer', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.fullMarkdown).toContain('Generated by SolDocs');
      expect(doc.fullMarkdown).toContain('Documentation generated autonomously by SolDocs');
    });

    it('contains section separators (---)', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // Should have multiple --- separators between sections
      const separators = doc.fullMarkdown.split('\n---\n');
      expect(separators.length).toBeGreaterThanOrEqual(5); // header + 4 sections + footer
    });

    it('includes generatedAt timestamp in header', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.fullMarkdown).toContain('Generated at:');
    });
  });

  describe('generatedAt field', () => {
    it('returns a valid ISO 8601 timestamp', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      const parsed = new Date(doc.generatedAt);
      expect(parsed.toISOString()).toBe(doc.generatedAt);
    });

    it('timestamp is recent (within last 5 seconds)', async () => {
      const before = Date.now();
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const doc = await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      const after = Date.now();
      const ts = new Date(doc.generatedAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('instruction batch separators', () => {
    it('joins multiple batches with --- separator', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const largeIdl: AnchorIdl = {
        ...MOCK_IDL,
        instructions: Array.from({ length: 7 }, (_, i) => ({
          name: `ix_${i}`,
          accounts: [],
          args: [],
        })),
      };
      const doc = await gen.generate(largeIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // 7 instructions = 2 batches, so 1 separator between them
      expect(doc.instructions).toContain('---');
    });

    it('single batch has no --- separator in instructions', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const smallIdl: AnchorIdl = {
        ...MOCK_IDL,
        instructions: [{ name: 'only_one', accounts: [], args: [] }],
      };
      const doc = await gen.generate(smallIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.instructions).not.toContain('---');
    });
  });

  describe('validateDoc warnings', () => {
    it('warns when generated docs are unusually short', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Create a mock that returns very short responses
      class ShortAIClient {
        async generate(): Promise<string> { return 'short'; }
      }
      const gen = new DocGenerator(new ShortAIClient() as unknown as AIClient);
      const tinyIdl: AnchorIdl = {
        name: 'x',
        instructions: [{ name: 'a', accounts: [], args: [] }],
      };
      await gen.generate(tinyIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unusually short'));
      warnSpy.mockRestore();
    });

    it('warns when no code blocks found in output', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Return long text but without code blocks
      class NoCodeBlockAIClient {
        async generate(): Promise<string> {
          return 'A '.repeat(300); // long enough to not trigger short warning
        }
      }
      const gen = new DocGenerator(new NoCodeBlockAIClient() as unknown as AIClient);
      const idl: AnchorIdl = {
        name: 'nocode',
        instructions: [{ name: 'a', accounts: [], args: [] }],
      };
      await gen.generate(idl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No code blocks'));
      warnSpy.mockRestore();
    });

    it('does not warn when docs have sufficient length and code blocks', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      await gen.generate(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // Standard mock returns code blocks and the assembled doc is > 500 chars
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('handles IDL with only events (no accounts/types/errors)', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const eventsOnlyIdl: AnchorIdl = {
        name: 'events_only',
        instructions: [{ name: 'emit', accounts: [], args: [] }],
        events: [{ name: 'Transfer', fields: [{ name: 'amount', type: 'u64' }] }],
      };
      const doc = await gen.generate(eventsOnlyIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // events are defined, so AI is called for accounts pass
      expect(doc.accounts).toContain('Account Types');
      expect(mockAi.callCount).toBe(4);
    });

    it('handles IDL with only errors (no accounts/types/events)', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const errorsOnlyIdl: AnchorIdl = {
        name: 'errors_only',
        instructions: [{ name: 'fail', accounts: [], args: [] }],
        errors: [{ code: 100, name: 'Boom', msg: 'explosion' }],
      };
      const doc = await gen.generate(errorsOnlyIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      expect(doc.accounts).toContain('Account Types');
      expect(mockAi.callCount).toBe(4);
    });

    it('handles IDL with empty arrays for all optional fields', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const emptyArraysIdl: AnchorIdl = {
        name: 'empty_arrays',
        instructions: [{ name: 'noop', accounts: [], args: [] }],
        accounts: [],
        types: [],
        events: [],
        errors: [],
      };
      const doc = await gen.generate(emptyArraysIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // All arrays empty -> skip accounts pass
      expect(doc.accounts).toContain('No account types');
      expect(mockAi.callCount).toBe(3);
    });

    it('handles exactly 5 instructions in a single batch', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const fiveIxIdl: AnchorIdl = {
        ...MOCK_IDL,
        instructions: Array.from({ length: 5 }, (_, i) => ({
          name: `ix_${i}`,
          accounts: [],
          args: [],
        })),
      };
      await gen.generate(fiveIxIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // Exactly BATCH_SIZE=5 instructions -> 1 batch
      // 1 overview + 1 instruction batch + 1 accounts + 1 security = 4
      expect(mockAi.callCount).toBe(4);
    });

    it('handles exactly 6 instructions in two batches', async () => {
      const mockAi = new MockAIClient();
      const gen = new DocGenerator(mockAi as unknown as AIClient);
      const sixIxIdl: AnchorIdl = {
        ...MOCK_IDL,
        instructions: Array.from({ length: 6 }, (_, i) => ({
          name: `ix_${i}`,
          accounts: [],
          args: [],
        })),
      };
      await gen.generate(sixIxIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', 'abc');
      // 6 instructions -> 2 batches (5 + 1)
      // 1 overview + 2 instruction batches + 1 accounts + 1 security = 5
      expect(mockAi.callCount).toBe(5);
    });
  });
});

describe('Prompt templates', () => {
  describe('overviewPrompt', () => {
    it('includes program ID and name', () => {
      const prompt = overviewPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('test_program');
    });

    it('includes correct instruction count', () => {
      const prompt = overviewPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('Number of Instructions: 3');
    });

    it('includes correct account count', () => {
      const prompt = overviewPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('Number of Account Types: 1');
    });

    it('includes correct error count', () => {
      const prompt = overviewPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('Number of Error Codes: 1');
    });

    it('shows 0 for missing optional fields', () => {
      const minimalIdl: AnchorIdl = {
        name: 'minimal',
        instructions: [{ name: 'a', accounts: [], args: [] }],
      };
      const prompt = overviewPrompt(minimalIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('Number of Account Types: 0');
      expect(prompt).toContain('Number of Custom Types: 0');
      expect(prompt).toContain('Number of Events: 0');
      expect(prompt).toContain('Number of Error Codes: 0');
    });

    it('truncates IDL JSON to 15000 characters', () => {
      // Create IDL with very large types array
      const largeIdl: AnchorIdl = {
        name: 'huge_program',
        instructions: [{ name: 'a', accounts: [], args: [] }],
        types: Array.from({ length: 500 }, (_, i) => ({
          name: `VeryLongTypeName_${i}_${'x'.repeat(50)}`,
          type: { kind: 'struct', fields: [{ name: `field_${i}`, type: 'u64' }] },
        })),
      };
      const prompt = overviewPrompt(largeIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      // The JSON in the prompt should be truncated
      const jsonBlock = prompt.split('```json\n')[1]?.split('\n```')[0] || '';
      expect(jsonBlock.length).toBeLessThanOrEqual(15000);
    });

    it('contains expected Markdown section requests', () => {
      const prompt = overviewPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('## Program Overview');
      expect(prompt).toContain('## Architecture');
      expect(prompt).toContain('## Key Features');
      expect(prompt).toContain('## Instructions Summary');
    });
  });

  describe('instructionsPrompt', () => {
    it('includes program name', () => {
      const prompt = instructionsPrompt(MOCK_IDL.instructions, 'test_program');
      expect(prompt).toContain('Program: test_program');
    });

    it('includes instruction JSON', () => {
      const prompt = instructionsPrompt(MOCK_IDL.instructions, 'test_program');
      expect(prompt).toContain('"initialize"');
      expect(prompt).toContain('"transfer"');
      expect(prompt).toContain('"close"');
    });

    it('requests example usage with TypeScript', () => {
      const prompt = instructionsPrompt(MOCK_IDL.instructions, 'test_program');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('@coral-xyz/anchor');
    });
  });

  describe('accountsPrompt', () => {
    it('includes account types JSON', () => {
      const prompt = accountsPrompt(MOCK_IDL);
      expect(prompt).toContain('"State"');
      expect(prompt).toContain('"authority"');
    });

    it('includes errors JSON when present', () => {
      const prompt = accountsPrompt(MOCK_IDL);
      expect(prompt).toContain('Error Codes:');
      expect(prompt).toContain('"Unauthorized"');
    });

    it('omits events section when no events', () => {
      const noEventsIdl: AnchorIdl = {
        name: 'no_events',
        instructions: [{ name: 'a', accounts: [], args: [] }],
        accounts: [{ name: 'State', type: { kind: 'struct', fields: [] } }],
      };
      const prompt = accountsPrompt(noEventsIdl);
      expect(prompt).not.toContain('Events:');
    });

    it('includes events section when present', () => {
      const eventsIdl: AnchorIdl = {
        name: 'with_events',
        instructions: [{ name: 'a', accounts: [], args: [] }],
        events: [{ name: 'Transfer', fields: [{ name: 'amount', type: 'u64' }] }],
      };
      const prompt = accountsPrompt(eventsIdl);
      expect(prompt).toContain('Events:');
      expect(prompt).toContain('"Transfer"');
    });
  });

  describe('securityPrompt', () => {
    it('includes program ID and name', () => {
      const prompt = securityPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('test_program');
    });

    it('contains security-focused section requests', () => {
      const prompt = securityPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('Access Control');
      expect(prompt).toContain('Common Pitfalls');
      expect(prompt).toContain('Best Practices');
      expect(prompt).toContain('Trust Assumptions');
    });

    it('truncates IDL JSON to 15000 characters', () => {
      const largeIdl: AnchorIdl = {
        name: 'huge',
        instructions: [{ name: 'a', accounts: [], args: [] }],
        types: Array.from({ length: 500 }, (_, i) => ({
          name: `VeryLongTypeName_${i}_${'x'.repeat(50)}`,
          type: { kind: 'struct', fields: [{ name: `field_${i}`, type: 'u64' }] },
        })),
      };
      const prompt = securityPrompt(largeIdl, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      const jsonBlock = prompt.split('```json\n')[1]?.split('\n```')[0] || '';
      expect(jsonBlock.length).toBeLessThanOrEqual(15000);
    });

    it('includes IDL-only analysis disclaimer', () => {
      const prompt = securityPrompt(MOCK_IDL, 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
      expect(prompt).toContain('static IDL analysis only');
    });
  });
});
