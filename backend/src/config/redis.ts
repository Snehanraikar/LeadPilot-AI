import { prisma } from './database';

// Drop-in replacement for the Redis cache — backed by Postgres.
// The same `cache` export is used by ai.service.ts and jobs/index.ts unchanged.

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const row = await prisma.cache.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < new Date()) {
      await prisma.cache.delete({ where: { key } }).catch(() => null);
      return null;
    }
    return JSON.parse(row.value) as T;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000)
      : null;
    await prisma.cache.upsert({
      where: { key },
      update: { value: JSON.stringify(value), expiresAt },
      create: { key, value: JSON.stringify(value), expiresAt },
    });
  },

  async del(key: string): Promise<void> {
    await prisma.cache.delete({ where: { key } }).catch(() => null);
  },

  async delPattern(pattern: string): Promise<void> {
    // Convert Redis glob (*) to SQL LIKE (%)
    const sqlPattern = pattern.replace(/\*/g, '%');
    await prisma.$executeRawUnsafe(
      `DELETE FROM cache WHERE key LIKE $1`,
      sqlPattern,
    );
  },
};

// No-op stubs so index.ts import doesn't break
export const connectRedis = async (): Promise<void> => {};
export const redis = { quit: async () => {} };
