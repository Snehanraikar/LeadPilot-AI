import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { cache } from '../config/redis';

export function startJobs(): void {
  // Purge expired refresh tokens daily at 2am
  cron.schedule('0 2 * * *', async () => {
    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }] },
      });
      logger.info({ count }, 'Purged expired refresh tokens');
    } catch (err) {
      logger.error({ err }, 'Failed to purge refresh tokens');
    }
  });

  // Clean AI cache for archived leads every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const archived = await prisma.lead.findMany({
        where: { isArchived: true },
        select: { id: true },
      });
      await Promise.all([
        ...archived.map((l) => cache.del(`ai:summary:${l.id}`)),
        ...archived.map((l) => cache.del(`ai:score:${l.id}`)),
      ]);
      logger.info({ count: archived.length }, 'Cleared AI cache for archived leads');
    } catch (err) {
      logger.error({ err }, 'Failed to clear AI cache');
    }
  });
}
