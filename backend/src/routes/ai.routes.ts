import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { AiService } from '../services/ai.service';
import { sendSuccess } from '../utils/response';

const router = Router();
const aiSvc = new AiService();

router.use(authenticate, aiRateLimiter);

const followUpSchema = z.object({
  type: z.enum(['email', 'whatsapp', 'call_script']),
  tone: z.enum(['professional', 'friendly', 'persuasive']),
});

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) }),
  ).min(1).max(20),
});

// Lead Summary
router.post('/leads/:leadId/summary', async (req, res) => {
  const result = await aiSvc.generateSummary(req.params.leadId, req.user!.orgId);
  sendSuccess(res, result);
});

// Follow-up Generator
router.post('/leads/:leadId/follow-up', validate(followUpSchema), async (req, res) => {
  const { type, tone } = req.body as { type: 'email' | 'whatsapp' | 'call_script'; tone: 'professional' | 'friendly' | 'persuasive' };
  const result = await aiSvc.generateFollowUp(req.params.leadId, req.user!.orgId, type, tone);
  sendSuccess(res, result);
});

// Lead Scoring
router.post('/leads/:leadId/score', async (req, res) => {
  const result = await aiSvc.scoreLead(req.params.leadId, req.user!.orgId);
  sendSuccess(res, result);
});

// Semantic Search
router.get('/search', validate(searchSchema, 'query'), async (req, res) => {
  const { q, limit } = req.query as unknown as { q: string; limit: number };
  const results = await aiSvc.semanticSearch(req.user!.orgId, q, limit);
  sendSuccess(res, results);
});

// RAG Chat
router.post('/chat', validate(chatSchema), async (req, res) => {
  const { messages } = req.body as { messages: Array<{ role: 'user' | 'assistant'; content: string }> };
  const result = await aiSvc.ragChat(req.user!.orgId, req.user!.sub, messages);
  sendSuccess(res, result);
});

export default router;
