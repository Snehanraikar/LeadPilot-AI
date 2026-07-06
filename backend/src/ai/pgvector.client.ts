import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const VECTOR_SIZE = parseInt(process.env.VECTOR_SIZE ?? '384', 10);

export async function ensurePgVector(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  } catch (err) {
    // On Supabase the extension is pre-enabled; this is a no-op warning, not fatal
    logger.warn({ err }, 'pgvector extension setup skipped (likely already enabled)');
  }
}

export interface LeadVectorPayload {
  leadId: string;
  organizationId: string;
  name: string;
  company: string | null;
  status: string;
  industry: string | null;
  content: string;
}
