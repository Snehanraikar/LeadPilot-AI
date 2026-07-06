import { Prisma, Lead, LeadStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { CreateLeadDto, UpdateLeadDto, LeadFiltersDto } from '../validators/lead.validator';

export const leadSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  wellnessFocus: true,
  jobTitle: true,
  website: true,
  linkedinUrl: true,
  leadSource: true,
  status: true,
  estimatedValue: true,
  currency: true,
  tags: true,
  customFields: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  _count: { select: { activities: true, notes: true } },
} satisfies Prisma.LeadSelect;

export type LeadWithOwner = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function buildWhereClause(orgId: string, filters: LeadFiltersDto): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    organizationId: orgId,
    isArchived: false,
  };

  if (filters.status) where.status = filters.status;
  if (filters.source) where.leadSource = filters.source;
  if (filters.wellnessFocus) where.wellnessFocus = filters.wellnessFocus;
  if (filters.ownerId) where.ownerId = filters.ownerId;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.minValue !== undefined || filters.maxValue !== undefined) {
    where.estimatedValue = {
      ...(filters.minValue !== undefined && { gte: filters.minValue }),
      ...(filters.maxValue !== undefined && { lte: filters.maxValue }),
    };
  }

  if (filters.tags) {
    const tagList = filters.tags.split(',').map((t) => t.trim());
    where.tags = { hasSome: tagList };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom && { gte: filters.dateFrom }),
      ...(filters.dateTo && { lte: filters.dateTo }),
    };
  }

  return where;
}

export class LeadRepository {
  async findMany(
    orgId: string,
    filters: LeadFiltersDto,
  ): Promise<{ leads: LeadWithOwner[]; total: number }> {
    const where = buildWhereClause(orgId, filters);
    const skip = (filters.page - 1) * filters.limit;
    const orderBy = { [filters.sortBy ?? 'createdAt']: filters.sortOrder };

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({ where, select: leadSelect, skip, take: filters.limit, orderBy }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async findById(id: string, orgId: string): Promise<LeadWithOwner | null> {
    return prisma.lead.findFirst({ where: { id, organizationId: orgId }, select: leadSelect });
  }

  async create(orgId: string, ownerId: string, dto: CreateLeadDto): Promise<LeadWithOwner> {
    return prisma.lead.create({
      data: {
        ...dto,
        customFields: dto.customFields as Prisma.InputJsonValue | undefined,
        organizationId: orgId,
        ownerId,
      },
      select: leadSelect,
    });
  }

  async update(id: string, orgId: string, dto: UpdateLeadDto): Promise<LeadWithOwner> {
    return prisma.lead.update({
      where: { id, organizationId: orgId },
      data: { ...dto, customFields: dto.customFields as Prisma.InputJsonValue | undefined },
      select: leadSelect,
    });
  }

  async delete(id: string, orgId: string): Promise<void> {
    await prisma.lead.update({
      where: { id, organizationId: orgId },
      data: { isArchived: true },
    });
  }

  async hardDelete(id: string, orgId: string): Promise<void> {
    await prisma.lead.delete({ where: { id, organizationId: orgId } });
  }

  async countByStatus(orgId: string): Promise<Record<LeadStatus, number>> {
    const result = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId: orgId, isArchived: false },
      _count: { id: true },
    });

    const counts = {} as Record<LeadStatus, number>;
    for (const row of result) {
      counts[row.status] = row._count.id;
    }
    return counts;
  }

  async getRevenueByMonth(orgId: string, months = 6): Promise<{ month: string; revenue: number }[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const leads = await prisma.lead.findMany({
      where: {
        organizationId: orgId,
        status: 'WON',
        updatedAt: { gte: since },
      },
      select: { estimatedValue: true, updatedAt: true },
    });

    const byMonth: Record<string, number> = {};
    for (const lead of leads) {
      const key = lead.updatedAt.toISOString().slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] ?? 0) + Number(lead.estimatedValue ?? 0);
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  }

  async findForEmbedding(orgId: string): Promise<
    Array<{ id: string; name: string; email: string | null; company: string | null; status: string; wellnessFocus: string | null; notes: Array<{ content: string }> }>
  > {
    return prisma.lead.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        status: true,
        wellnessFocus: true,
        notes: { select: { content: true }, take: 5 },
      },
    });
  }
}
