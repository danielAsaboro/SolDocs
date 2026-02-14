import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { Store } from '../store';
import { Agent } from '../agent/core';
import { createRoutes } from './routes';

// Simple in-memory rate limiter (no extra dependency)
function createRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (val.resetAt <= now) hits.delete(key);
    }
  }, 60_000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }
    next();
  };
}

export function createServer(store: Store, agent: Agent): express.Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // Rate limit write endpoints: 30 requests per minute per IP
  const writeLimiter = createRateLimiter(60_000, 30);
  app.post('/api/*', writeLimiter);
  app.delete('/api/*', writeLimiter);

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API routes
  app.use(createRoutes(store, agent));

  // Serve static files from public/
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global error handler — must be last
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(`[API] Error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function startServer(app: express.Application, port: number): Promise<import('http').Server> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Server] API server running at http://localhost:${port}`);
      console.log(`[Server] Web explorer at http://localhost:${port}`);
      resolve(server);
    });
  });
}
