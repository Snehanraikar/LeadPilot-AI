import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { CreateActivityDto, CreateNoteDto } from '../validators/activity.validator';
import { EmbeddingService } from './embedding.service';
import { buildPaginationMeta } from '../utils/response';

const embeddingService = new EmbeddingService();

export class ActivityService {
  async getOrgFeed(orgId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { lead: { organizationId: orgId } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          lead: { select: { id: true, name: true, company: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where: { lead: { organizationId: orgId } } }),
    ]);

    return { activities, meta: buildPaginationMeta(page, limit, total) };
  }

  async getTimeline(leadId: string, orgId: string) {
    // Verify lead belongs to org
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundError('Lead');

    const [activities, notes] = await Promise.all([
      prisma.activity.findMany({
        where: { leadId },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.note.findMany({
        where: { leadId },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Merge and sort into unified timeline
    const timeline = [
      ...activities.map((a) => ({ ...a, itemType: 'activity' as const })),
      ...notes.map((n) => ({ ...n, itemType: 'note' as const })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return timeline;
  }

  async createActivity(leadId: string, orgId: string, userId: string, dto: CreateActivityDto) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundError('Lead');

    const activity = await prisma.activity.create({
      data: { ...dto, leadId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    embeddingService.upsertLeadEmbedding(leadId, orgId).catch(() => null);
    return activity;
  }

  async updateActivity(activityId: string, userId: string, dto: Partial<CreateActivityDto>) {
    const activity = await prisma.activity.findFirst({ where: { id: activityId, userId } });
    if (!activity) throw new NotFoundError('Activity');

    return prisma.activity.update({
      where: { id: activityId },
      data: dto,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async deleteActivity(activityId: string, userId: string): Promise<void> {
    const activity = await prisma.activity.findFirst({ where: { id: activityId, userId } });
    if (!activity) throw new NotFoundError('Activity');
    await prisma.activity.delete({ where: { id: activityId } });
  }

  async createNote(leadId: string, orgId: string, userId: string, dto: CreateNoteDto) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundError('Lead');

    const note = await prisma.note.create({
      data: { ...dto, leadId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    embeddingService.upsertLeadEmbedding(leadId, orgId).catch(() => null);
    return note;
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note) throw new NotFoundError('Note');
    await prisma.note.delete({ where: { id: noteId } });
  }

  async getUpcomingFollowUps(orgId: string, userId: string) {
    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return prisma.activity.findMany({
      where: {
        lead: { organizationId: orgId },
        userId,
        scheduledAt: { gte: now, lte: inWeek },
        completedAt: null,
      },
      include: {
        lead: { select: { id: true, name: true, company: true, status: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });
  }
}
