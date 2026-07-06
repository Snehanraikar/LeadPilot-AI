import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createActivitySchema, createNoteSchema } from '../validators/activity.validator';
import { ActivityService } from '../services/activity.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

const router = Router();
const svc = new ActivityService();

router.use(authenticate);

// Org-wide activity feed
router.get('/activities', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { activities, meta } = await svc.getOrgFeed(req.user!.orgId, page, limit);
  sendSuccess(res, activities, 200, meta);
});

// Timeline
router.get('/leads/:leadId/timeline', async (req, res) => {
  const timeline = await svc.getTimeline(req.params.leadId, req.user!.orgId);
  sendSuccess(res, timeline);
});

// Activities
router.post('/leads/:leadId/activities', validate(createActivitySchema), async (req, res) => {
  const activity = await svc.createActivity(req.params.leadId, req.user!.orgId, req.user!.sub, req.body);
  sendCreated(res, activity);
});

router.patch('/activities/:id', async (req, res) => {
  const activity = await svc.updateActivity(req.params.id, req.user!.sub, req.body);
  sendSuccess(res, activity);
});

router.delete('/activities/:id', async (req, res) => {
  await svc.deleteActivity(req.params.id, req.user!.sub);
  sendNoContent(res);
});

// Notes
router.post('/leads/:leadId/notes', validate(createNoteSchema), async (req, res) => {
  const note = await svc.createNote(req.params.leadId, req.user!.orgId, req.user!.sub, req.body);
  sendCreated(res, note);
});

router.delete('/notes/:id', async (req, res) => {
  await svc.deleteNote(req.params.id, req.user!.sub);
  sendNoContent(res);
});

// Follow-ups
router.get('/follow-ups', async (req, res) => {
  const items = await svc.getUpcomingFollowUps(req.user!.orgId, req.user!.sub);
  sendSuccess(res, items);
});

export default router;
