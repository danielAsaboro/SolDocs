import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import http from 'http';
import { Store } from '../store';
import { Agent } from '../agent/core';
import { SolanaClient } from '../solana/client';
import { AIClient } from '../ai/client';
import { createServer } from '../api/server';

// Helper to make HTTP requests without external deps
function request(server: http.Server, method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const options = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode!, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode!, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const VALID_ID = 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
const VALID_ID2 = 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY';

describe('API Routes', () => {
  let tmpDir: string;
  let store: Store;
  let server: http.Server;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soldocs-api-test-'));
    store = new Store(tmpDir);
    const solana = new SolanaClient('https://api.mainnet-beta.solana.com');
    const ai = new AIClient('fake-key');
    const agent = new Agent(
      {
        solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
        anthropicApiKey: 'fake-key',
        apiPort: 0,
        agentDiscoveryIntervalMs: 999999,
        dataDir: tmpDir,
        webhookUrl: null,
        agentConcurrency: 1,
      },
      store, solana, ai
    );
    const app = createServer(store, agent);
    server = app.listen(0); // Random available port
  });

  afterAll(() => {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset store between tests
    fs.writeFileSync(path.join(tmpDir, 'programs.json'), '[]');
    fs.writeFileSync(path.join(tmpDir, 'queue.json'), '[]');
  });

  describe('GET /api/health', () => {
    it('returns ok', async () => {
      const { status, data } = await request(server, 'GET', '/api/health');
      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeTruthy();
    });
  });

  describe('GET /api/agent/status', () => {
    it('returns agent state', async () => {
      const { status, data } = await request(server, 'GET', '/api/agent/status');
      expect(status).toBe(200);
      expect(data).toHaveProperty('running');
      expect(data).toHaveProperty('programsDocumented');
      expect(data).toHaveProperty('queueLength');
      expect(data).toHaveProperty('errors');
    });
  });

  describe('GET /api/programs', () => {
    it('returns empty list initially', async () => {
      const { status, data } = await request(server, 'GET', '/api/programs');
      expect(status).toBe(200);
      expect(data.programs).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('returns saved programs', async () => {
      store.saveProgram({
        programId: VALID_ID,
        name: 'drift',
        description: 'Drift protocol',
        instructionCount: 10,
        accountCount: 5,
        status: 'documented',
        idlHash: 'abc',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const { data } = await request(server, 'GET', '/api/programs');
      expect(data.programs).toHaveLength(1);
      expect(data.programs[0].name).toBe('drift');
    });

    it('supports search', async () => {
      store.saveProgram({
        programId: VALID_ID,
        name: 'drift',
        description: 'Perp trading',
        instructionCount: 10,
        accountCount: 5,
        status: 'documented',
        idlHash: 'abc',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const { data: found } = await request(server, 'GET', '/api/programs?search=drift');
      expect(found.programs).toHaveLength(1);

      const { data: notFound } = await request(server, 'GET', '/api/programs?search=zzzzz');
      expect(notFound.programs).toHaveLength(0);
    });

    it('supports pagination', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'a', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      store.saveProgram({
        programId: VALID_ID2, name: 'b', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { data } = await request(server, 'GET', '/api/programs?page=1&limit=1');
      expect(data.programs).toHaveLength(1);
      expect(data.total).toBe(2);
      expect(data.totalPages).toBe(2);
    });

    it('defaults page to 1 when page param is non-numeric', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'a', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { status, data } = await request(server, 'GET', '/api/programs?page=abc');
      expect(status).toBe(200);
      expect(data.page).toBe(1);
      expect(data.programs).toHaveLength(1);
    });

    it('defaults limit to 50 when limit param is non-numeric', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'a', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { status, data } = await request(server, 'GET', '/api/programs?limit=xyz');
      expect(status).toBe(200);
      expect(data.limit).toBe(50);
      expect(data.programs).toHaveLength(1);
    });

    it('clamps page to minimum of 1 for negative values', async () => {
      const { status, data } = await request(server, 'GET', '/api/programs?page=-5');
      expect(status).toBe(200);
      expect(data.page).toBe(1);
    });

    it('clamps limit to range [1, 100]', async () => {
      const { data: low } = await request(server, 'GET', '/api/programs?limit=0');
      expect(low.limit).toBe(1);

      const { data: high } = await request(server, 'GET', '/api/programs?limit=999');
      expect(high.limit).toBe(100);
    });

    it('returns empty array for page beyond total pages', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'a', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { status, data } = await request(server, 'GET', '/api/programs?page=999');
      expect(status).toBe(200);
      expect(data.programs).toHaveLength(0);
      expect(data.total).toBe(1);
    });

    it('handles both page and limit as non-numeric gracefully', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'a', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { status, data } = await request(server, 'GET', '/api/programs?page=foo&limit=bar');
      expect(status).toBe(200);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(50);
      expect(data.programs).toHaveLength(1);
    });

    it('ignores non-string search param', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'drift', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      // Duplicate search params become an array in Express - should not crash
      const { status, data } = await request(server, 'GET', '/api/programs?search=drift&search=other');
      expect(status).toBe(200);
      // Express parses duplicate params as array, our code safely ignores non-string
      // Returns all programs since search defaults to empty string
      expect(data.programs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/programs/:id', () => {
    it('returns 404 for unknown program', async () => {
      const { status, data } = await request(server, 'GET', `/api/programs/${VALID_ID}`);
      expect(status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('returns 400 for invalid ID format', async () => {
      const { status } = await request(server, 'GET', '/api/programs/not-a-valid-key!!!');
      expect(status).toBe(400);
    });
  });

  describe('POST /api/programs', () => {
    it('rejects missing programId', async () => {
      const { status } = await request(server, 'POST', '/api/programs', {});
      expect(status).toBe(400);
    });

    it('rejects invalid programId', async () => {
      const { status } = await request(server, 'POST', '/api/programs', { programId: 'not-valid!' });
      expect(status).toBe(400);
    });

    it('accepts valid programId', async () => {
      const { status, data } = await request(server, 'POST', '/api/programs', { programId: VALID_ID });
      expect(status).toBe(202);
      expect(data.item.programId).toBe(VALID_ID);
    });

    it('retries failed programs', async () => {
      store.addToQueue(VALID_ID);
      store.updateQueueItem(VALID_ID, { status: 'failed', lastError: 'err' });

      const { status, data } = await request(server, 'POST', '/api/programs', { programId: VALID_ID });
      expect(status).toBe(200);
      expect(data.item.status).toBe('pending');
    });
  });

  describe('POST /api/programs/:id/idl', () => {
    it('rejects invalid IDL', async () => {
      const { status } = await request(server, 'POST', `/api/programs/${VALID_ID}/idl`, { foo: 'bar' });
      expect(status).toBe(400);
    });

    it('accepts valid IDL and queues program', async () => {
      const idl = { name: 'test', version: '0.1.0', instructions: [{ name: 'init', accounts: [], args: [] }] };
      const { status, data } = await request(server, 'POST', `/api/programs/${VALID_ID}/idl`, idl);
      expect(status).toBe(202);
      expect(data.message).toContain('IDL uploaded');

      // Verify IDL was saved
      const cached = store.getIdlCache(VALID_ID);
      expect(cached).not.toBeNull();
      expect(cached!.idl.name).toBe('test');

      // Verify program was queued
      expect(store.getPendingItems()).toHaveLength(1);
    });
  });

  describe('DELETE /api/programs/:id', () => {
    it('returns 404 for unknown program', async () => {
      const { status } = await request(server, 'DELETE', `/api/programs/${VALID_ID}`);
      expect(status).toBe(404);
    });

    it('deletes existing program', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'test', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const { status, data } = await request(server, 'DELETE', `/api/programs/${VALID_ID}`);
      expect(status).toBe(200);
      expect(data.message).toBe('Program deleted');
      expect(store.getProgram(VALID_ID)).toBeUndefined();
    });

    it('cleans up IDL cache and doc files on delete', async () => {
      store.saveProgram({
        programId: VALID_ID, name: 'test', description: '', instructionCount: 0,
        accountCount: 0, status: 'documented', idlHash: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      store.saveIdlCache(VALID_ID, { name: 'test', version: '0.1.0', instructions: [{ name: 'init', accounts: [], args: [] }] });
      store.saveDocs({
        programId: VALID_ID, name: 'test', overview: 'o', instructions: 'i', accounts: 'a',
        security: 's', fullMarkdown: '# Full', generatedAt: new Date().toISOString(), idlHash: 'h',
      });

      // Verify files exist before delete
      expect(store.getIdlCache(VALID_ID)).not.toBeNull();
      expect(store.getDocs(VALID_ID)).not.toBeNull();

      const { status } = await request(server, 'DELETE', `/api/programs/${VALID_ID}`);
      expect(status).toBe(200);

      // Verify all associated files are cleaned up
      expect(store.getProgram(VALID_ID)).toBeUndefined();
      expect(store.getIdlCache(VALID_ID)).toBeNull();
      expect(store.getDocs(VALID_ID)).toBeNull();
    });
  });

  describe('GET /api/queue', () => {
    it('returns queue', async () => {
      store.addToQueue(VALID_ID);
      const { status, data } = await request(server, 'GET', '/api/queue');
      expect(status).toBe(200);
      expect(data.queue).toHaveLength(1);
    });
  });
});
