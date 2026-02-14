import { Router, Request, Response } from 'express';
import { Store } from '../store';
import { Agent } from '../agent/core';
import { isValidProgramId } from '../solana/program-info';
import { AnchorIdl, getIdlName } from '../types';

export function createRoutes(store: Store, agent: Agent): Router {
  const router = Router();

  // Health check
  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Agent status
  router.get('/api/agent/status', (_req: Request, res: Response) => {
    res.json(agent.getState());
  });

  // List all documented programs with pagination and search
  router.get('/api/programs', (req: Request, res: Response) => {
    let programs = store.getProgramIndex();

    // Search filter (coerce to string for safety against array query params)
    const rawSearch = req.query.search;
    const search = (typeof rawSearch === 'string' ? rawSearch : '').toLowerCase();
    if (search) {
      programs = programs.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.programId.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    // Sort by most recently updated
    programs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Pagination (guard against NaN from non-numeric query params)
    const rawPage = parseInt(req.query.page as string || '1', 10);
    const rawLimit = parseInt(req.query.limit as string || '50', 10);
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 50 : rawLimit));
    const total = programs.length;
    const offset = (page - 1) * limit;
    const paginated = programs.slice(offset, offset + limit);

    res.json({
      programs: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  // Get program documentation
  router.get('/api/programs/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidProgramId(id)) {
      res.status(400).json({ error: 'Invalid program ID format' });
      return;
    }

    try {
      const program = store.getProgram(id);
      if (!program) {
        res.status(404).json({ error: 'Program not found' });
        return;
      }
      const docs = store.getDocs(id);
      res.json({ program, docs });
    } catch {
      res.status(400).json({ error: 'Invalid program ID' });
    }
  });

  // Get raw IDL
  router.get('/api/programs/:id/idl', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidProgramId(id)) {
      res.status(400).json({ error: 'Invalid program ID format' });
      return;
    }

    try {
      const cached = store.getIdlCache(id);
      if (!cached) {
        res.status(404).json({ error: 'IDL not found' });
        return;
      }
      res.json(cached);
    } catch {
      res.status(400).json({ error: 'Invalid program ID' });
    }
  });

  // Add program to queue (by program ID for on-chain IDL fetch)
  router.post('/api/programs', async (req: Request, res: Response) => {
    const { programId } = req.body;

    if (!programId || typeof programId !== 'string') {
      res.status(400).json({ error: 'programId is required' });
      return;
    }

    if (!isValidProgramId(programId.trim())) {
      res.status(400).json({ error: 'Invalid Solana program ID' });
      return;
    }

    const trimmed = programId.trim();
    const { item, isNew } = await store.addToQueueSafe(trimmed);

    if (isNew) {
      res.status(202).json({ message: 'Program added to queue', item });
    } else if (item.status === 'pending') {
      res.json({ message: 'Program re-queued for processing', item });
    } else {
      res.json({ message: 'Program already in queue', item });
    }
  });

  // Upload IDL directly for a program
  router.post('/api/programs/:id/idl', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidProgramId(id)) {
      res.status(400).json({ error: 'Invalid program ID format' });
      return;
    }

    const idl = req.body as AnchorIdl;
    if (!idl || !idl.instructions || !Array.isArray(idl.instructions) || !getIdlName(idl) || getIdlName(idl) === 'unknown_program') {
      res.status(400).json({ error: 'Invalid IDL format. Must have "name" (or "metadata.name") and "instructions" array.' });
      return;
    }

    try {
      store.saveIdlCache(id, idl);
      // Add to queue for doc generation
      await store.addToQueueSafe(id);
      res.status(202).json({ message: 'IDL uploaded and program queued for documentation', programId: id });
    } catch {
      res.status(400).json({ error: 'Failed to save IDL' });
    }
  });

  // Delete a program and its docs
  router.delete('/api/programs/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidProgramId(id)) {
      res.status(400).json({ error: 'Invalid program ID format' });
      return;
    }

    try {
      const program = store.getProgram(id);
      if (!program) {
        res.status(404).json({ error: 'Program not found' });
        return;
      }
      await store.removeProgramSafe(id);
      await store.removeFromQueueSafe(id);
      store.removeDocs(id);
      store.removeIdlCache(id);
      res.json({ message: 'Program deleted' });
    } catch {
      res.status(400).json({ error: 'Invalid program ID' });
    }
  });

  // Get queue status
  router.get('/api/queue', (_req: Request, res: Response) => {
    const queue = store.getQueue();
    res.json({ queue, total: queue.length });
  });

  return router;
}
