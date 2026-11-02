/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes/api.ts';
import { errorHandler } from './src/server/middleware/errorHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Parse CLI flags or env vars for port and host
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
  const PORT = Number(process.env.PORT) || cliPort || 3000;

  const hostArgIndex = process.argv.indexOf('--host');
  const cliHost = hostArgIndex !== -1 && process.argv[hostArgIndex + 1] ? process.argv[hostArgIndex + 1] : undefined;
  const HOST = process.env.HOST || cliHost || '0.0.0.0';

  const isProd = process.env.NODE_ENV === 'production';

  // Parse incoming JSON payloads
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Centralized error handler for API routes
  app.use('/api', errorHandler);

  if (!isProd) {
    // Development mode: mount Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[OAuth Readiness Intelligence] Server listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[OAuth Readiness Intelligence] Port ${PORT} busy, retrying in 1s...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, HOST);
      }, 1000);
    } else {
      console.error('[OAuth Readiness Intelligence] Server error:', err);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[OAuth Readiness Intelligence] Failed to start server:', err);
  process.exit(1);
});
