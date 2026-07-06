import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { CreatePurchaseDto } from '../validators/product.validator';
import { EmbeddingService } from './embedding.service';

const embeddingService = new EmbeddingService();

export class PurchaseService {
  async listForLead(leadId: string, orgId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundError('Lead');

    return prisma.purchase.findMany({
      where: { leadId },
      include: { product: true },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async create(leadId: string, orgId: string, dto: CreatePurchaseDto) {
    const [lead, product] = await Promise.all([
      prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } }),
      prisma.product.findFirst({ where: { id: dto.productId, organizationId: orgId } }),
    ]);
    if (!lead) throw new NotFoundError('Lead');
    if (!product) throw new NotFoundError('Product');

    const purchasedAt = dto.purchasedAt ?? new Date();
    const nextReplenishmentAt = product.replenishmentDays
      ? new Date(purchasedAt.getTime() + product.replenishmentDays * 24 * 60 * 60 * 1000)
      : null;

    const purchase = await prisma.purchase.create({
      data: {
        leadId,
        productId: product.id,
        organizationId: orgId,
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice ?? product.price,
        currency: dto.currency ?? product.currency,
        status: dto.status,
        purchasedAt,
        nextReplenishmentAt,
        notes: dto.notes,
      },
      include: { product: true },
    });

    embeddingService.upsertLeadEmbedding(leadId, orgId).catch(() => null);
    return purchase;
  }

  async getReplenishmentsDue(orgId: string, withinDays = 14) {
    const now = new Date();
    const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    return prisma.purchase.findMany({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
        nextReplenishmentAt: { gte: now, lte: until },
      },
      include: {
        product: { select: { id: true, name: true, category: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
      orderBy: { nextReplenishmentAt: 'asc' },
      take: 30,
    });
  }
}
