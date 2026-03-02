import express from 'express';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { surveyRoutes } from './routes/surveys';
import { sensingRoutes } from './routes/sensing';
import { participantRoutes } from './routes/participants';
import { dashboardRoutes } from './routes/dashboard';
import { ConfigService } from '../utils/config';
import { DatabaseService } from '../utils/database';
import { Logger } from '../utils/logger';

const logger = new Logger('APIServer');

/**
 * Initialize and configure the EARS API server.
 * All routes handling PHI require auth + audit middleware.
 */
export async function createServer(): Promise<express.Application> {
  const app = express();
  const port = ConfigService.get('API_PORT', 3000);

  // Global middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(rateLimitMiddleware());

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', version: ConfigService.get('APP_VERSION') });
  });

  // PHI-handling routes — require authentication + audit logging
  app.use('/api/v1/surveys', authMiddleware, auditMiddleware, surveyRoutes);
  app.use('/api/v1/sensing', authMiddleware, auditMiddleware, sensingRoutes);
  app.use('/api/v1/participants', authMiddleware, auditMiddleware, participantRoutes);

  // Dashboard routes — require authentication (read-only, de-identified data)
  app.use('/api/v1/dashboard', authMiddleware, dashboardRoutes);

  // Initialize database connection pool
  await DatabaseService.initialize();
  logger.info(`EARS API server configured on port ${port}`);

  return app;
}
