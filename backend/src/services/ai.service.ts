import { ActivityType } from '@prisma/client';
import { prisma } from '../config/database';
import { getAIProvider } from '../ai/provider.factory';
import { AIProvider } from '../ai/provider.interface';
import { cache } from '../config/redis';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { EmbeddingService } from './embedding.service';
import type {
  AiSummaryResult,
  LeadScoreResult,
  FollowUpResult,
  FollowUpTone,
  FollowUpType,
  RagChatMessage,
  RagChatResult,
  TaskIntent,
} from '../domain/types';

const embeddingService = new EmbeddingService();
const VALID_ACTIVITY_TYPES = new Set(Object.values(ActivityType));

async function resolveLeadByName(orgId: string, name: string) {
  const candidates = await prisma.lead.findMany({
    where: { organizationId: orgId, isArchived: false, name: { contains: name, mode: 'insensitive' } },
    select: { id: true, name: true, ownerId: true },
    take: 5,
  });
  if (candidates.length === 0) return null;
  const exact = candidates.find((l) => l.name.toLowerCase() === name.toLowerCase());
  return exact ?? candidates[0];
}

async function resolveAssigneeByName(orgId: string, name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const candidates = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      OR: [
        ...tokens.map((t) => ({ firstName: { contains: t, mode: 'insensitive' as const } })),
        ...tokens.map((t) => ({ lastName: { contains: t, mode: 'insensitive' as const } })),
        { email: { contains: name.trim(), mode: 'insensitive' as const } },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    take: 10,
  });
  if (candidates.length === 0) return null;
  const exact = candidates.find((u) => `${u.firstName} ${u.lastName}`.toLowerCase() === name.trim().toLowerCase());
  return exact ?? candidates[0];
}

const SUMMARY_CACHE_TTL = 60 * 60 * 6; // 6 hours
const SCORE_CACHE_TTL = 60 * 60 * 2;   // 2 hours

async function getLeadContext(leadId: string, orgId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      notes: { orderBy: { createdAt: 'desc' }, take: 10 },
      aiSummaries: { orderBy: { createdAt: 'desc' }, take: 1 },
      leadScores: { orderBy: { createdAt: 'desc' }, take: 1 },
      purchases: { orderBy: { purchasedAt: 'desc' }, take: 10, include: { product: true } },
    },
  });
  if (!lead) throw new NotFoundError('Lead');
  return lead;
}

function formatPurchaseHistory(purchases: Array<{
  quantity: number;
  purchasedAt: Date;
  nextReplenishmentAt: Date | null;
  status: string;
  product: { name: string; category: string };
}>): string {
  if (purchases.length === 0) return 'None yet';
  return purchases
    .map((p) => {
      const replenishment = p.nextReplenishmentAt
        ? `next replenishment due ${p.nextReplenishmentAt.toDateString()}`
        : 'no replenishment cycle tracked';
      return `- ${p.product.name} (${p.product.category}) x${p.quantity}, purchased ${p.purchasedAt.toDateString()}, status ${p.status}, ${replenishment}`;
    })
    .join('\n');
}

export class AiService {
  // ── Lead Summary ────────────────────────────────────────────────────────────

  async generateSummary(leadId: string, orgId: string): Promise<AiSummaryResult> {
    const cacheKey = `ai:summary:${leadId}`;
    const cached = await cache.get<AiSummaryResult>(cacheKey);
    if (cached) return cached;

    const lead = await getLeadContext(leadId, orgId);
    const ai = getAIProvider();

    const prompt = `
You are a CRM AI assistant for a health & wellness products company. Analyze this lead/customer and provide a structured analysis
focused on nurturing them around the products they've bought and what they should buy or replenish next.

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company ?? 'Unknown'}
- Wellness focus: ${lead.wellnessFocus ?? 'Unknown'}
- Job Title: ${lead.jobTitle ?? 'Unknown'}
- Status: ${lead.status}
- Lead Source: ${lead.leadSource}
- Estimated Value: ${lead.estimatedValue ?? 'Unknown'}

Purchase history:
${formatPurchaseHistory(lead.purchases)}

Recent Activities (${lead.activities.length}):
${lead.activities.map((a) => `- [${a.type}] ${a.title}: ${a.description ?? ''}`).join('\n') || 'None'}

Notes:
${lead.notes.map((n) => `- ${n.content}`).join('\n') || 'None'}

Provide analysis as JSON with this exact structure:
{
  "customerProfile": "2-3 sentence profile, referencing what they've bought and their wellness focus",
  "painPoints": ["pain point 1", "pain point 2"],
  "buyingSignals": ["signal 1", "signal 2"],
  "objections": ["objection 1", "objection 2"],
  "suggestedAction": "specific recommended next action — e.g. a replenishment reminder, a cross-sell of a related product, or a nurture touchpoint"
}
`;

    const raw = await ai.generate(prompt, {
      systemPrompt: 'You are a precise CRM AI for a health & wellness product company. Always respond with valid JSON only.',
      temperature: 0.3,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned invalid JSON');
    const result = JSON.parse(jsonMatch[0]) as AiSummaryResult;

    await prisma.aiSummary.create({
      data: {
        leadId,
        customerProfile: result.customerProfile,
        painPoints: result.painPoints,
        buyingSignals: result.buyingSignals,
        objections: result.objections,
        suggestedAction: result.suggestedAction,
        modelUsed: ai.modelId,
      },
    });

    await cache.set(cacheKey, result, SUMMARY_CACHE_TTL);
    return result;
  }

  // ── Follow-up Generator ─────────────────────────────────────────────────────

  async generateFollowUp(
    leadId: string,
    orgId: string,
    type: FollowUpType,
    tone: FollowUpTone,
  ): Promise<FollowUpResult> {
    const lead = await getLeadContext(leadId, orgId);
    const ai = getAIProvider();

    const typeDescriptions = {
      email: 'a professional email',
      whatsapp: 'a concise WhatsApp message (under 160 words)',
      call_script: 'a structured phone call script with opener, key points, and close',
    };

    const toneDescriptions = {
      professional: 'formal, concise, business-oriented',
      friendly: 'warm, approachable, conversational',
      persuasive: 'compelling, value-focused, with clear CTA',
    };

    const prompt = `
Generate ${typeDescriptions[type]} for this health & wellness brand's lead/customer.

Tone: ${toneDescriptions[tone]}

Lead: ${lead.name} at ${lead.company ?? 'their company'}
Wellness focus: ${lead.wellnessFocus ?? 'Unknown'}
Status: ${lead.status}
Recent interaction: ${lead.activities[0]?.title ?? 'No recent interaction'}

Purchase history:
${formatPurchaseHistory(lead.purchases)}

Notes context:
${lead.notes[0]?.content ?? 'None'}

If they have a recent purchase nearing its replenishment date, nurture toward reordering it. Otherwise, nurture toward their wellness focus and any relevant next product. Generate ONLY the message content, no explanations or metadata.
`;

    const content = await ai.generate(prompt, { temperature: 0.7 });
    return { content: content.trim(), type, tone };
  }

  // ── Lead Scoring ─────────────────────────────────────────────────────────────

  async scoreLead(leadId: string, orgId: string): Promise<LeadScoreResult> {
    const cacheKey = `ai:score:${leadId}`;
    const cached = await cache.get<LeadScoreResult>(cacheKey);
    if (cached) return cached;

    const lead = await getLeadContext(leadId, orgId);
    const ai = getAIProvider();

    const prompt = `
Score this health & wellness lead/customer's likelihood to purchase or repurchase (0-100).

Lead Data:
- Status: ${lead.status}
- Wellness focus: ${lead.wellnessFocus ?? 'Unknown'}
- Estimated Value: $${lead.estimatedValue ?? 0}
- Lead Source: ${lead.leadSource}
- Total Activities: ${lead.activities.length}
- Activity Types: ${[...new Set(lead.activities.map((a) => a.type))].join(', ') || 'None'}
- Has Demo: ${lead.activities.some((a) => a.type === 'DEMO') ? 'Yes' : 'No'}
- Notes Count: ${lead.notes.length}
- Purchase count: ${lead.purchases.length}
- Purchase history:
${formatPurchaseHistory(lead.purchases)}

Weigh repeat purchases and upcoming replenishment dates as strong positive signals.

Return JSON only:
{
  "score": 75,
  "confidence": 0.82,
  "reasons": ["Repeat purchaser", "High estimated value", "Multiple touchpoints"]
}
`;

    const raw = await ai.generate(prompt, {
      systemPrompt: 'You are a precise scoring AI for a health & wellness product company. Return valid JSON only.',
      temperature: 0.2,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned invalid scoring JSON');
    const result = JSON.parse(jsonMatch[0]) as LeadScoreResult;
    result.score = Math.max(0, Math.min(100, result.score));
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    await prisma.leadScore.create({
      data: {
        leadId,
        score: result.score,
        confidence: result.confidence,
        reasons: result.reasons,
        modelUsed: ai.modelId,
      },
    });

    await cache.set(cacheKey, result, SCORE_CACHE_TTL);
    return result;
  }

  // ── Semantic Search ──────────────────────────────────────────────────────────

  async semanticSearch(orgId: string, query: string, limit = 10) {
    return embeddingService.semanticSearch(orgId, query, limit);
  }

  // ── RAG Chat ─────────────────────────────────────────────────────────────────

  async ragChat(orgId: string, requesterId: string, messages: RagChatMessage[]): Promise<RagChatResult> {
    const userMessage = messages[messages.length - 1]?.content ?? '';
    const ai = getAIProvider();

    const taskResult = await this.tryHandleTaskIntent(orgId, userMessage, ai).catch((err) => {
      logger.error({ err }, 'Task intent handling failed, falling back to normal chat');
      return null;
    });
    if (taskResult) return taskResult;

    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Gather grounded, structured CRM data — never rely on semantic search alone,
    //    since questions like "who needs follow-up" or "who's due for a refill" aren't
    //    about note similarity, they're about fields the vector index doesn't rank on.
    const [totalLeads, searchResults, orgLeads, upcoming, replenishmentsDue] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId, isArchived: false } }),
      embeddingService.semanticSearch(orgId, userMessage, 5).catch(() => []),
      prisma.lead.findMany({
        where: { organizationId: orgId, isArchived: false },
        select: {
          id: true,
          name: true,
          company: true,
          status: true,
          wellnessFocus: true,
          leadSource: true,
          estimatedValue: true,
          currency: true,
          tags: true,
          owner: { select: { firstName: true, lastName: true } },
          leadScores: { take: 1, orderBy: { createdAt: 'desc' }, select: { score: true } },
          purchases: { select: { quantity: true, product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.activity.findMany({
        where: { lead: { organizationId: orgId }, scheduledAt: { gte: now, lte: inWeek }, completedAt: null },
        include: {
          lead: { select: { id: true, name: true, company: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 30,
      }),
      prisma.purchase.findMany({
        where: { organizationId: orgId, status: 'COMPLETED', nextReplenishmentAt: { gte: now, lte: inTwoWeeks } },
        include: {
          lead: { select: { id: true, name: true, company: true } },
          product: { select: { name: true, category: true } },
        },
        orderBy: { nextReplenishmentAt: 'asc' },
        take: 30,
      }),
    ]);

    // 2. Fetch qualitative context (notes/activities/purchases) for semantically matched leads
    const leadIds = searchResults.map((r) => r.leadId);
    const matchedLeads = leadIds.length
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds } },
          include: {
            notes: { take: 3, orderBy: { createdAt: 'desc' } },
            activities: { take: 5, orderBy: { createdAt: 'desc' } },
            leadScores: { take: 1, orderBy: { createdAt: 'desc' } },
            purchases: { take: 5, orderBy: { purchasedAt: 'desc' }, include: { product: true } },
          },
        })
      : [];

    const snapshotDoc = orgLeads.length
      ? orgLeads
          .map((l) => {
            const value = l.estimatedValue ? `${l.currency} ${Number(l.estimatedValue).toLocaleString()}` : 'unknown value';
            const score = l.leadScores[0]?.score;
            const products = l.purchases.length ? l.purchases.map((p) => `${p.product.name} x${p.quantity}`).join(', ') : 'none';
            return `- ${l.name} (${l.company ?? 'no company'}) | status: ${l.status} | wellness focus: ${l.wellnessFocus ?? 'unknown'} | source: ${l.leadSource} | value: ${value} | owner: ${l.owner.firstName} ${l.owner.lastName} | score: ${score ?? 'unscored'} | products bought: ${products} | tags: ${l.tags.join(', ') || 'none'}`;
          })
          .join('\n')
      : 'No leads exist in the CRM yet.';

    const followUpDoc = upcoming.length
      ? upcoming
          .map(
            (a) =>
              `- ${a.lead.name} (${a.lead.company ?? 'no company'}): "${a.title}" scheduled ${a.scheduledAt!.toDateString()}, assigned to ${a.user.firstName} ${a.user.lastName}`,
          )
          .join('\n')
      : 'None scheduled in the next 7 days.';

    const replenishmentDoc = replenishmentsDue.length
      ? replenishmentsDue
          .map(
            (p) =>
              `- ${p.lead.name} (${p.lead.company ?? 'no company'}): ${p.product.name} (${p.product.category}) due for replenishment ${p.nextReplenishmentAt!.toDateString()}`,
          )
          .join('\n')
      : 'None due in the next 14 days.';

    const qualitativeDoc = matchedLeads.length
      ? matchedLeads
          .map((l) => {
            const score = l.leadScores[0]?.score;
            return [
              `Lead: ${l.name} (${l.company ?? 'No company'})`,
              `Status: ${l.status} | Wellness focus: ${l.wellnessFocus ?? 'N/A'} | Score: ${score ?? 'Not scored'}`,
              `Purchases: ${l.purchases.map((p) => `${p.product.name} x${p.quantity}`).join('; ') || 'None'}`,
              `Activities: ${l.activities.map((a) => a.title).join('; ') || 'None'}`,
              `Notes: ${l.notes.map((n) => n.content).join(' | ') || 'None'}`,
            ].join('\n');
          })
          .join('\n\n---\n\n')
      : 'No notes or activities closely matched this question.';

    const historyText = messages
      .slice(-6) // last 3 turns
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `
You are LeadPilot AI, the CRM assistant for a health & wellness products company. Your job is to help nurture leads based on
the products they've purchased — replenishment timing, cross-sell opportunities, and their wellness focus — not generic sales talk.
Answer the user's question using ONLY the CRM data below.
Never claim leads don't exist, or that the database is empty, if the snapshot below lists them — trust the snapshot over anything else.
Be concise and actionable. Reference specific leads and products by name when relevant.

CRM Snapshot (${orgLeads.length} of ${totalLeads} total active leads, most recent first):
${snapshotDoc}

Upcoming follow-ups in the next 7 days:
${followUpDoc}

Product replenishments due in the next 14 days:
${replenishmentDoc}

Notes/activities/purchases most relevant to this question:
${qualitativeDoc}

Conversation:
${historyText}

Answer:`;

    const answer = await ai.generate(prompt, {
      systemPrompt: 'You are a helpful CRM AI assistant for a health & wellness product company. Be factual, concise, and cite specific leads/products when possible. Ground every claim in the CRM data provided — do not contradict it.',
      temperature: 0.5,
      maxTokens: 1024,
    });

    const sources = searchResults.map((r) => ({
      leadId: r.leadId,
      leadName: r.name,
      snippet: r.snippet,
    }));

    return { answer: answer.trim(), sources };
  }

  // ── Task creation via chat ──────────────────────────────────────────────────

  private async tryHandleTaskIntent(orgId: string, userMessage: string, ai: AIProvider): Promise<RagChatResult | null> {
    const today = new Date().toISOString().slice(0, 10);
    const extractionPrompt = `Today's date is ${today}.
You extract task/reminder/follow-up creation requests from a single CRM chat message. Only set "createTask" to true if the message explicitly asks to create, schedule, assign, or set a task, reminder, follow-up, call, or meeting for a lead.

Respond with JSON only, no prose, in exactly this shape:
{"createTask": boolean, "leadName": string|null, "title": string|null, "assigneeName": string|null, "dueDate": string|null, "activityType": "CALL"|"EMAIL"|"MEETING"|"DEMO"|"TASK"|null}

Rules:
- "leadName" is the name of the lead/customer/company the task is about. Required for createTask to be true.
- "assigneeName" is the person the task should be assigned to (e.g. "assign it to Priya", "have Alex call them"). Use null if no one is named — it will default to the lead's owner.
- "dueDate" must be an ISO date (YYYY-MM-DD), resolved relative to today's date. Use null if not mentioned.
- "title" is a short imperative task title. Use null to auto-generate one.
- If the message is just a question and not a request to create something, respond with {"createTask": false, "leadName": null, "title": null, "assigneeName": null, "dueDate": null, "activityType": null}.

Message: "${userMessage.replace(/"/g, "'")}"`;

    const raw = await ai.generate(extractionPrompt, {
      systemPrompt: 'You output only valid JSON, nothing else.',
      temperature: 0,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    let intent: TaskIntent;
    try {
      intent = JSON.parse(match[0]) as TaskIntent;
    } catch {
      return null;
    }
    if (!intent.createTask) return null;

    if (!intent.leadName) {
      return {
        answer: "I can create that task, but I need to know which lead it's for. Could you tell me the lead's name?",
        sources: [],
      };
    }

    const lead = await resolveLeadByName(orgId, intent.leadName);
    if (!lead) {
      return {
        answer: `I couldn't find a lead matching "${intent.leadName}" in your CRM, so I didn't create the task. Double-check the name and try again.`,
        sources: [],
      };
    }

    let assignee = intent.assigneeName ? await resolveAssigneeByName(orgId, intent.assigneeName) : null;
    if (!assignee) {
      assignee = await prisma.user.findUnique({
        where: { id: lead.ownerId },
        select: { id: true, firstName: true, lastName: true },
      });
    }
    if (!assignee) {
      return {
        answer: `I found the lead "${lead.name}" but couldn't determine who to assign the task to.`,
        sources: [{ leadId: lead.id, leadName: lead.name, snippet: '' }],
      };
    }

    const activityType = intent.activityType && VALID_ACTIVITY_TYPES.has(intent.activityType) ? intent.activityType : 'TASK';
    const title = intent.title?.trim() || `Follow up with ${lead.name}`;
    const scheduledAt = intent.dueDate && !Number.isNaN(Date.parse(intent.dueDate)) ? new Date(intent.dueDate) : undefined;

    const activity = await prisma.activity.create({
      data: { type: activityType, title, scheduledAt, leadId: lead.id, userId: assignee.id },
    });

    await prisma.notification
      .create({
        data: {
          userId: assignee.id,
          organizationId: orgId,
          title: 'New task assigned',
          body: `${title} — ${lead.name}${scheduledAt ? ` (due ${scheduledAt.toDateString()})` : ''}`,
          type: 'task_assigned',
          metadata: { leadId: lead.id, activityId: activity.id },
        },
      })
      .catch((err) => logger.error({ err }, 'Failed to create task-assignment notification'));

    const dueText = scheduledAt ? ` due ${scheduledAt.toDateString()}` : '';
    return {
      answer: `Done — created "${title}" for ${lead.name}, assigned to ${assignee.firstName} ${assignee.lastName}${dueText}.`,
      sources: [{ leadId: lead.id, leadName: lead.name, snippet: title }],
      taskCreated: {
        activityId: activity.id,
        leadId: lead.id,
        leadName: lead.name,
        title,
        type: activityType,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        assignedTo: { id: assignee.id, firstName: assignee.firstName, lastName: assignee.lastName },
      },
    };
  }
}
