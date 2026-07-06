import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';

const router = Router();
const svc = new NotificationService();

router.use(authenticate);

router.get('/', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { notifications, unreadCount, meta } = await svc.list(req.user!.sub, page, limit);
  sendSuccess(res, { notifications, unreadCount }, 200, meta);
});

router.patch('/read-all', async (req, res) => {
  await svc.markAllRead(req.user!.sub);
  sendSuccess(res, { message: 'All notifications marked as read' });
});

router.patch('/:id/read', async (req, res) => {
  const notification = await svc.markRead(req.params.id, req.user!.sub);
  sendSuccess(res, notification);
});

export default router;
