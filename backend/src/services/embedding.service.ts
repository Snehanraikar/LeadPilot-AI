import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { getAIProvider } from '../ai/provider.factory';
import { ensurePgVector } from '../ai/pgvector.client';
import { sha256 } from '../utils/crypto';
import { logger } from '../utils/logger';

function buildLeadDocument(lead: {
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  wellnessFocus: string | null;
  notes: Array<{ content: string }>;
  purchases: Array<{ purchasedAt: Date; quantity: number; product: { name: string; category: string } }>;
}): string {
  const parts = [
    `Name: ${lead.name}`,
    lead.email && `Email: ${lead.email}`,
    lead.company && `Company: ${lead.company}`,
    `Status: ${lead.status}`,
    lead.wellnessFocus && `Wellness focus: ${lead.wellnessFocus}`,
    ...lead.purchases.map(
      (p) => `Purchase: ${p.product.name} (${p.product.category}) x${p.quantity} on ${p.purchasedAt.toDateString()}`,
    ),
    ...lead.notes.map((n) => `Note: ${n.content}`),
  ].filter(Boolean);
  return parts.join('\n');
}

export class EmbeddingService {
  async upsertLeadEmbedding(leadId: string, orgId: string): Promise<void> {
    try {
      await ensurePgVector();
      const ai = getAIProvider();

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          status: true,
          wellnessFocus: true,
          notes: { select: { content: true }, take: 10 },
          purchases: {
            select: { purchasedAt: true, quantity: true, product: { select: { name: true, category: true } } },
            orderBy: { purchasedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!lead) return;

      const document = buildLeadDocument(lead);
      const contentHash = sha256(document);

      const existing = await prisma.leadEmbedding.findFirst({ where: { leadId } });
      if (existing?.contentHash === contentHash) return;

      const vector = await ai.embed(document);
      // vector is number[] of floats from the AI provider — safe to format as SQL literal
      const vectorLiteral = `[${vector.join(',')}]`;
      const id = existing?.id ?? uuidv4();

      await prisma.$executeRawUnsafe(
        `INSERT INTO lead_embeddings
           (id, "leadId", "organizationId", name, company, status, "wellnessFocus", content,
            embedding, "contentHash", "modelUsed", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10, $11, NOW(), NOW())
         ON CONFLICT ("leadId") DO UPDATE SET
           "organizationId" = EXCLUDED."organizationId",
           name             = EXCLUDED.name,
           company          = EXCLUDED.company,
           status           = EXCLUDED.status,
           "wellnessFocus"  = EXCLUDED."wellnessFocus",
           content          = EXCLUDED.content,
           embedding        = EXCLUDED.embedding,
           "contentHash"    = EXCLUDED."contentHash",
           "modelUsed"      = EXCLUDED."modelUsed",
           "updatedAt"      = NOW()`,
        id,
        leadId,
        orgId,
        lead.name,
        lead.company ?? null,
        lead.status,
        lead.wellnessFocus ?? null,
        document,
        vectorLiteral,
        contentHash,
        ai.embeddingModelId,
      );
    } catch (err) {
      logger.error({ err, leadId }, 'Failed to upsert lead embedding');
    }
  }

  async deleteLeadEmbedding(leadId: string): Promise<void> {
    try {
      await prisma.leadEmbedding.deleteMany({ where: { leadId } });
    } catch (err) {
      logger.error({ err, leadId }, 'Failed to delete lead embedding');
    }
  }

  async semanticSearch(orgId: string, query: string, limit = 10) {
    await ensurePgVector();
    const ai = getAIProvider();
    const queryVector = await ai.embed(query);
    const vectorLiteral = `[${queryVector.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        leadId: string;
        name: string;
        company: string | null;
        status: string;
        content: string;
        score: number;
      }>
    >(
      `SELECT "leadId", name, company, status, content,
              1 - (embedding <=> $1::vector) AS score
       FROM lead_embeddings
       WHERE "organizationId" = $2
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= 0.6
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      orgId,
      limit,
    );

    return results.map((r) => ({
      leadId: r.leadId,
      name: r.name,
      company: r.company,
      status: r.status,
      score: Number(r.score),
      snippet: r.content.slice(0, 200),
    }));
  }
}
