import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Store, FileMutex } from '../src/server/store';
import { ProgramMetadata, AnchorIdl } from '../src/server/types';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'soldocs-test-'));
}

function cleanup(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const VALID_PROGRAM_ID = 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
const VALID_PROGRAM_ID2 = 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY';

function makeProgram(id: string, overrides: Partial<ProgramMetadata> = {}): ProgramMetadata {
  return {
    programId: id,
    name: 'test-program',
    description: 'A test program',
    instructionCount: 5,
    accountCount: 3,
    status: 'documented',
    idlHash: 'abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_IDL: AnchorIdl = {
  version: '0.1.0',
  name: 'test_program',
  instructions: [
    { name: 'initialize', accounts: [], args: [] },
    { name: 'transfer', accounts: [], args: [] },
  ],
};

describe('Store', () => {
  let tmpDir: string;
  let store: Store;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    store = new Store(tmpDir);
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('initialization', () => {
    it('creates data directories and files', () => {
      expect(fs.existsSync(tmpDir)).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'docs'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'idls'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'programs.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'queue.json'))).toBe(true);
    });

    it('starts with empty program index', () => {
      expect(store.getProgramIndex()).toEqual([]);
    });

    it('starts with empty queue', () => {
      expect(store.getQueue()).toEqual([]);
    });
  });

  describe('program CRUD', () => {
    it('saves and retrieves a program', () => {
      const prog = makeProgram(VALID_PROGRAM_ID);
      store.saveProgram(prog);
      expect(store.getProgram(VALID_PROGRAM_ID)).toEqual(prog);
    });

    it('updates existing program', () => {
      store.saveProgram(makeProgram(VALID_PROGRAM_ID, { name: 'v1' }));
      store.saveProgram(makeProgram(VALID_PROGRAM_ID, { name: 'v2' }));
      expect(store.getProgramIndex()).toHaveLength(1);
      expect(store.getProgram(VALID_PROGRAM_ID)!.name).toBe('v2');
    });

    it('removes a program', () => {
      store.saveProgram(makeProgram(VALID_PROGRAM_ID));
      store.removeProgram(VALID_PROGRAM_ID);
      expect(store.getProgram(VALID_PROGRAM_ID)).toBeUndefined();
    });

    it('returns undefined for unknown program', () => {
      expect(store.getProgram(VALID_PROGRAM_ID)).toBeUndefined();
    });
  });

  describe('queue', () => {
    it('adds item to queue', () => {
      const { item, isNew } = store.addToQueue(VALID_PROGRAM_ID);
      expect(isNew).toBe(true);
      expect(item.programId).toBe(VALID_PROGRAM_ID);
      expect(item.status).toBe('pending');
      expect(item.attempts).toBe(0);
    });

    it('does not duplicate pending items', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      const { isNew } = store.addToQueue(VALID_PROGRAM_ID);
      expect(isNew).toBe(false);
      expect(store.getQueue()).toHaveLength(1);
    });

    it('resets failed items to pending on re-add', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.updateQueueItem(VALID_PROGRAM_ID, { status: 'failed', lastError: 'oops' });
      const { item } = store.addToQueue(VALID_PROGRAM_ID);
      expect(item.status).toBe('pending');
      expect(item.lastError).toBeUndefined();
    });

    it('resets attempt counter to zero when re-adding a failed item', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.updateQueueItem(VALID_PROGRAM_ID, { status: 'failed', attempts: 7, lastError: 'oops' });
      const { item } = store.addToQueue(VALID_PROGRAM_ID);
      expect(item.attempts).toBe(0);
    });

    it('getPendingItems filters correctly', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.addToQueue(VALID_PROGRAM_ID2);
      store.updateQueueItem(VALID_PROGRAM_ID, { status: 'processing' });
      expect(store.getPendingItems()).toHaveLength(1);
      expect(store.getPendingItems()[0].programId).toBe(VALID_PROGRAM_ID2);
    });

    it('removes item from queue', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.removeFromQueue(VALID_PROGRAM_ID);
      expect(store.getQueue()).toHaveLength(0);
    });

    it('recovers stuck processing items', () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.updateQueueItem(VALID_PROGRAM_ID, { status: 'processing' });
      expect(store.getPendingItems()).toHaveLength(0);
      store.recoverStuckItems();
      expect(store.getPendingItems()).toHaveLength(1);
    });
  });

  describe('IDL cache', () => {
    it('saves and retrieves IDL', () => {
      const cache = store.saveIdlCache(VALID_PROGRAM_ID, MOCK_IDL);
      expect(cache.hash).toBeTruthy();
      expect(cache.idl.name).toBe('test_program');

      const retrieved = store.getIdlCache(VALID_PROGRAM_ID);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.hash).toBe(cache.hash);
    });

    it('returns null for missing IDL', () => {
      expect(store.getIdlCache(VALID_PROGRAM_ID)).toBeNull();
    });

    it('produces consistent hashes', () => {
      const h1 = store.hashIdl(MOCK_IDL);
      const h2 = store.hashIdl(MOCK_IDL);
      expect(h1).toBe(h2);
    });

    it('produces different hashes for different IDLs', () => {
      const h1 = store.hashIdl(MOCK_IDL);
      const h2 = store.hashIdl({ ...MOCK_IDL, name: 'different' });
      expect(h1).not.toBe(h2);
    });

    it('removes IDL cache file from disk', () => {
      store.saveIdlCache(VALID_PROGRAM_ID, MOCK_IDL);
      expect(store.getIdlCache(VALID_PROGRAM_ID)).not.toBeNull();
      store.removeIdlCache(VALID_PROGRAM_ID);
      expect(store.getIdlCache(VALID_PROGRAM_ID)).toBeNull();
    });

    it('removeIdlCache is a no-op when IDL does not exist', () => {
      // Should not throw
      store.removeIdlCache(VALID_PROGRAM_ID);
      expect(store.getIdlCache(VALID_PROGRAM_ID)).toBeNull();
    });
  });

  describe('documentation', () => {
    it('saves and retrieves docs', () => {
      const docs = {
        programId: VALID_PROGRAM_ID,
        name: 'test',
        overview: '# Overview',
        instructions: '# Instructions',
        accounts: '# Accounts',
        security: '# Security',
        fullMarkdown: '# Full',
        generatedAt: new Date().toISOString(),
        idlHash: 'abc',
      };
      store.saveDocs(docs);
      expect(store.getDocs(VALID_PROGRAM_ID)).toEqual(docs);
    });

    it('returns null for missing docs', () => {
      expect(store.getDocs(VALID_PROGRAM_ID)).toBeNull();
    });

    it('removes docs file from disk', () => {
      const docs = {
        programId: VALID_PROGRAM_ID,
        name: 'test',
        overview: '# Overview',
        instructions: '# Instructions',
        accounts: '# Accounts',
        security: '# Security',
        fullMarkdown: '# Full',
        generatedAt: new Date().toISOString(),
        idlHash: 'abc',
      };
      store.saveDocs(docs);
      expect(store.getDocs(VALID_PROGRAM_ID)).not.toBeNull();
      store.removeDocs(VALID_PROGRAM_ID);
      expect(store.getDocs(VALID_PROGRAM_ID)).toBeNull();
    });

    it('removeDocs is a no-op when docs do not exist', () => {
      // Should not throw
      store.removeDocs(VALID_PROGRAM_ID);
      expect(store.getDocs(VALID_PROGRAM_ID)).toBeNull();
    });
  });

  describe('security: path traversal', () => {
    it('rejects path traversal in program ID', () => {
      expect(() => store.getProgram('../../etc/passwd')).toThrow('Invalid program ID format');
    });

    it('rejects empty program ID', () => {
      expect(() => store.getProgram('')).toThrow('Invalid program ID format');
    });

    it('rejects program ID with special chars', () => {
      expect(() => store.getProgram('abc<script>alert(1)</script>')).toThrow('Invalid program ID format');
    });

    it('rejects slashes in program ID', () => {
      expect(() => store.getDocs('../../../etc/passwd')).toThrow('Invalid program ID format');
    });
  });

  describe('corrupt JSON recovery', () => {
    it('recovers from corrupt programs.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'programs.json'), '{invalid json!!!');
      const newStore = new Store(tmpDir);
      expect(newStore.getProgramIndex()).toEqual([]);
    });

    it('recovers from corrupt queue.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'queue.json'), 'not json at all');
      const newStore = new Store(tmpDir);
      expect(newStore.getQueue()).toEqual([]);
    });
  });

  describe('stats', () => {
    it('computes stats from stored programs', () => {
      store.saveProgram(makeProgram(VALID_PROGRAM_ID, { status: 'documented' }));
      store.saveProgram(makeProgram(VALID_PROGRAM_ID2, { status: 'failed' }));
      const stats = store.getStats();
      expect(stats.documented).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(2);
    });
  });

  describe('per-file mutex (race condition fix)', () => {
    it('saveProgramSafe serializes concurrent writes', async () => {
      // Fire off many concurrent saves for different programs
      const ids = [
        VALID_PROGRAM_ID,
        VALID_PROGRAM_ID2,
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ',
      ];

      await Promise.all(ids.map(id =>
        store.saveProgramSafe(makeProgram(id, { name: `program-${id.slice(0, 4)}` }))
      ));

      const programs = store.getProgramIndex();
      expect(programs).toHaveLength(4);
      // All programs should be present — none lost to a race
      for (const id of ids) {
        expect(programs.find(p => p.programId === id)).toBeDefined();
      }
    });

    it('addToQueueSafe serializes concurrent queue writes', async () => {
      const ids = [
        VALID_PROGRAM_ID,
        VALID_PROGRAM_ID2,
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      ];

      await Promise.all(ids.map(id => store.addToQueueSafe(id)));

      const queue = store.getQueue();
      expect(queue).toHaveLength(3);
      for (const id of ids) {
        expect(queue.find(q => q.programId === id)).toBeDefined();
      }
    });

    it('updateQueueItemSafe works correctly', async () => {
      store.addToQueue(VALID_PROGRAM_ID);
      await store.updateQueueItemSafe(VALID_PROGRAM_ID, { status: 'processing' });
      const queue = store.getQueue();
      expect(queue[0].status).toBe('processing');
    });

    it('removeFromQueueSafe works correctly', async () => {
      store.addToQueue(VALID_PROGRAM_ID);
      store.addToQueue(VALID_PROGRAM_ID2);
      await store.removeFromQueueSafe(VALID_PROGRAM_ID);
      const queue = store.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].programId).toBe(VALID_PROGRAM_ID2);
    });

    it('removeProgramSafe works correctly', async () => {
      store.saveProgram(makeProgram(VALID_PROGRAM_ID));
      store.saveProgram(makeProgram(VALID_PROGRAM_ID2));
      await store.removeProgramSafe(VALID_PROGRAM_ID);
      const programs = store.getProgramIndex();
      expect(programs).toHaveLength(1);
      expect(programs[0].programId).toBe(VALID_PROGRAM_ID2);
    });

    it('mutex allows different files to proceed in parallel', async () => {
      // Queue and program operations on different files should not block each other
      const [queueResult] = await Promise.all([
        store.addToQueueSafe(VALID_PROGRAM_ID),
        store.saveProgramSafe(makeProgram(VALID_PROGRAM_ID)),
      ]);
      expect(queueResult.isNew).toBe(true);
      expect(store.getProgram(VALID_PROGRAM_ID)).toBeDefined();
    });

    it('concurrent mixed operations preserve all data', async () => {
      // Simulate agent + API concurrent access
      await Promise.all([
        store.addToQueueSafe(VALID_PROGRAM_ID),
        store.addToQueueSafe(VALID_PROGRAM_ID2),
        store.saveProgramSafe(makeProgram(VALID_PROGRAM_ID, { name: 'from-api' })),
        store.saveProgramSafe(makeProgram(VALID_PROGRAM_ID2, { name: 'from-agent' })),
      ]);

      const queue = store.getQueue();
      const programs = store.getProgramIndex();
      expect(queue).toHaveLength(2);
      expect(programs).toHaveLength(2);
    });
  });
});

describe('FileMutex', () => {
  it('serializes operations on the same key', async () => {
    const mutex = new FileMutex();
    const order: number[] = [];

    const op1 = mutex.acquire('file-a', async () => {
      await new Promise(r => setTimeout(r, 30));
      order.push(1);
      return 'first';
    });

    const op2 = mutex.acquire('file-a', () => {
      order.push(2);
      return 'second';
    });

    const results = await Promise.all([op1, op2]);
    expect(results).toEqual(['first', 'second']);
    expect(order).toEqual([1, 2]);
  });

  it('allows parallel operations on different keys', async () => {
    const mutex = new FileMutex();
    const order: string[] = [];

    const op1 = mutex.acquire('file-a', async () => {
      await new Promise(r => setTimeout(r, 30));
      order.push('a');
    });

    const op2 = mutex.acquire('file-b', async () => {
      order.push('b');
    });

    await Promise.all([op1, op2]);
    // 'b' should complete before 'a' since they're on different keys
    expect(order).toEqual(['b', 'a']);
  });

  it('releases lock even if operation throws', async () => {
    const mutex = new FileMutex();

    // First operation throws
    await expect(
      mutex.acquire('file-a', () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    // Second operation should still proceed
    const result = await mutex.acquire('file-a', () => 'ok');
    expect(result).toBe('ok');
  });

  it('returns the value from the callback', async () => {
    const mutex = new FileMutex();
    const result = await mutex.acquire('file-a', () => 42);
    expect(result).toBe(42);
  });
});
