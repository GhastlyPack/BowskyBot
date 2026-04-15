import express from 'express';
import cors from 'cors';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { serversRouter } from './routes/servers.js';
import { membersRouter } from './routes/members.js';
import { rolesRouter } from './routes/roles.js';
import { channelsRouter } from './routes/channels.js';
import { channelsMoveRouter } from './routes/channels-move.js';

export function startApi() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // All API routes require auth
  app.use('/api/v1', authMiddleware);

  // Routes
  app.use('/api/v1/servers', serversRouter);
  app.use('/api/v1/servers', membersRouter);
  app.use('/api/v1/servers', rolesRouter);
  app.use('/api/v1/servers', channelsRouter);
  app.use('/api/v1/servers', channelsMoveRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err, 'Unhandled API error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  app.listen(config.API_PORT, () => {
    logger.info(`REST API listening on port ${config.API_PORT}`);
  });

  return app;
}
