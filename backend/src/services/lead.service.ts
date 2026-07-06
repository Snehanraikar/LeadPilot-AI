import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { LeadRepository, LeadWithOwner } from '../repositories/lead.repository';
import { CreateLeadDto, UpdateLeadDto, LeadFiltersDto } from '../validators/lead.validator';
import { NotFoundError } from '../utils/errors';
import { buildPaginationMeta, PaginationMeta } from '../utils/response';
import { EmbeddingService } from './embedding.service';

export class LeadService {
  private readonly repo = new LeadRepository();
  private readonly embeddingService = new EmbeddingService();

  async list(
    orgId: string,
    filters: LeadFiltersDto,
  ): Promise<{ leads: LeadWithOwner[]; meta: PaginationMeta }> {
    const { leads, total } = await this.repo.findMany(orgId, filters);
    const meta = buildPaginationMeta(filters.page, filters.limit, total);
    return { leads, meta };
  }

  async getById(id: string, orgId: string): Promise<LeadWithOwner> {
    const lead = await this.repo.findById(id, orgId);
    if (!lead) throw new NotFoundError('Lead');
    return lead;
  }

  async create(orgId: string, ownerId: string, dto: CreateLeadDto): Promise<LeadWithOwner> {
    const lead = await this.repo.create(orgId, ownerId, dto);
    // Queue embedding asynchronously — don't block the response
    this.embeddingService.upsertLeadEmbedding(lead.id, orgId).catch(() => null);
    return lead;
  }

  async update(id: string, orgId: string, dto: UpdateLeadDto): Promise<LeadWithOwner> {
    await this.getById(id, orgId);
    const updated = await this.repo.update(id, orgId, dto);
    this.embeddingService.upsertLeadEmbedding(id, orgId).catch(() => null);
    return updated;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.getById(id, orgId);
    await this.repo.delete(id, orgId);
    this.embeddingService.deleteLeadEmbedding(id).catch(() => null);
  }

  async bulkImportCsv(orgId: string, ownerId: string, csvBuffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const rows = csvParse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        await this.repo.create(orgId, ownerId, {
          name: row['name'] ?? row['Name'] ?? '',
          email: row['email'] ?? row['Email'] ?? undefined,
          phone: row['phone'] ?? row['Phone'] ?? undefined,
          company: row['company'] ?? row['Company'] ?? undefined,
          currency: row['currency'] ?? row['Currency'] ?? 'USD',
          estimatedValue: row['estimated_value'] ? Number(row['estimated_value']) : undefined,
        });
        imported++;
      } catch {
        errors.push(`Row ${i + 2}: Failed to import`);
      }
    }

    return { imported, errors };
  }

  async exportCsv(orgId: string, filters: LeadFiltersDto): Promise<string> {
    const { leads } = await this.repo.findMany(orgId, { ...filters, limit: 10000, page: 1 });

    return csvStringify(
      leads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        wellnessFocus: l.wellnessFocus,
        status: l.status,
        leadSource: l.leadSource,
        estimatedValue: l.estimatedValue?.toString(),
        currency: l.currency,
        tags: l.tags.join(';'),
        owner: `${l.owner.firstName} ${l.owner.lastName}`,
        createdAt: l.createdAt.toISOString(),
      })),
      { header: true },
    );
  }

  async getDashboardStats(orgId: string) {
    const [statusCounts, revenueTrend] = await Promise.all([
      this.repo.countByStatus(orgId),
      this.repo.getRevenueByMonth(orgId),
    ]);

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const won = statusCounts['WON'] ?? 0;
    const lost = statusCounts['LOST'] ?? 0;
    const active = total - won - lost - (statusCounts['DISQUALIFIED'] ?? 0);
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

    return { total, active, won, lost, conversionRate, statusCounts, revenueTrend };
  }
}
