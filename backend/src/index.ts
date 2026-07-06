import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ensurePgVector } from './ai/pgvector.client';
import { logger } from './utils/logger';
import { startJobs } from './jobs';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  logger.info('Database connected');

  await ensurePgVector();
  logger.info('pgvector ready');

  startJobs();
  logger.info('Background jobs started');

  const server = app.listen(env.PORT, () => {
    logger.info(`LeadPilot AI server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs: ${env.API_BASE_URL}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap failed');
  process.exit(1);
});
