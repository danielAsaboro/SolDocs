import { describe, it, expect } from 'vitest';
import pako from 'pako';

// We can't easily test the on-chain fetch without a real RPC, but we CAN test the IDL parsing logic.
// Extract the tryParseIdl logic for direct testing.

interface AnchorIdl {
  name: string;
  instructions: unknown[];
  [key: string]: unknown;
}

function tryParseIdl(data: Buffer, headerOffset: number): AnchorIdl | null {
  try {
    if (data.length <= headerOffset + 4) return null;
    const dataLen = data.readUInt32LE(headerOffset);
    if (dataLen <= 0 || dataLen > data.length - headerOffset - 4 || dataLen > 10_000_000) return null;
    const compressedData = data.slice(headerOffset + 4, headerOffset + 4 + dataLen);
    const inflated = pako.inflate(compressedData);
    const jsonStr = new TextDecoder().decode(inflated);
    const idl = JSON.parse(jsonStr) as AnchorIdl;
    if (idl && idl.instructions && Array.isArray(idl.instructions)) return idl;
    return null;
  } catch {
    return null;
  }
}

function makeIdlBuffer(idl: object, headerOffset: number): Buffer {
  const json = JSON.stringify(idl);
  const compressed = pako.deflate(Buffer.from(json));
  const header = Buffer.alloc(headerOffset + 4);
  header.writeUInt32LE(compressed.length, headerOffset);
  return Buffer.concat([header, compressed]);
}

describe('IDL Parsing', () => {
  const MOCK_IDL = {
    version: '0.1.0',
    name: 'test_program',
    instructions: [
      { name: 'initialize', accounts: [], args: [] },
      { name: 'transfer', accounts: [], args: [{ name: 'amount', type: 'u64' }] },
    ],
    accounts: [{ name: 'State', type: { kind: 'struct', fields: [] } }],
    errors: [{ code: 6000, name: 'Unauthorized', msg: 'Not authorized' }],
  };

  describe('tryParseIdl', () => {
    it('parses IDL at new Anchor format (offset=44)', () => {
      const buf = makeIdlBuffer(MOCK_IDL, 44);
      const result = tryParseIdl(buf, 44);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test_program');
      expect(result!.instructions).toHaveLength(2);
    });

    it('parses IDL at old Anchor format (offset=12)', () => {
      const buf = makeIdlBuffer(MOCK_IDL, 12);
      const result = tryParseIdl(buf, 12);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test_program');
    });

    it('parses IDL at minimal format (offset=8)', () => {
      const buf = makeIdlBuffer(MOCK_IDL, 8);
      const result = tryParseIdl(buf, 8);
      expect(result).not.toBeNull();
    });

    it('returns null for empty buffer', () => {
      expect(tryParseIdl(Buffer.alloc(0), 44)).toBeNull();
    });

    it('returns null for buffer too short', () => {
      expect(tryParseIdl(Buffer.alloc(10), 44)).toBeNull();
    });

    it('returns null for invalid compressed data', () => {
      const buf = Buffer.alloc(100);
      buf.writeUInt32LE(50, 44); // claim 50 bytes of data
      // But data is all zeros (invalid zlib)
      expect(tryParseIdl(buf, 44)).toBeNull();
    });

    it('returns null for valid JSON without instructions', () => {
      const noInstructions = { version: '0.1.0', name: 'bad' };
      const buf = makeIdlBuffer(noInstructions, 44);
      expect(tryParseIdl(buf, 44)).toBeNull();
    });

    it('returns null for oversized length', () => {
      const buf = Buffer.alloc(100);
      buf.writeUInt32LE(0x7FFFFFFF, 44); // Huge length
      expect(tryParseIdl(buf, 44)).toBeNull();
    });

    it('handles large IDL correctly', () => {
      const largeIdl = {
        ...MOCK_IDL,
        instructions: Array.from({ length: 100 }, (_, i) => ({
          name: `instruction_${i}`,
          accounts: Array.from({ length: 10 }, (_, j) => ({
            name: `account_${j}`,
            isMut: j % 2 === 0,
            isSigner: j === 0,
          })),
          args: [{ name: 'param', type: 'u64' }],
        })),
      };
      const buf = makeIdlBuffer(largeIdl, 44);
      const result = tryParseIdl(buf, 44);
      expect(result).not.toBeNull();
      expect(result!.instructions).toHaveLength(100);
    });
  });
});
