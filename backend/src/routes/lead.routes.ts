import { Router } from 'express';
import multer from 'multer';
import {
  listLeads, getLead, createLead, updateLead, deleteLead,
  importLeads, exportLeads, getDashboardStats,
} from '../controllers/lead.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { createLeadSchema, updateLeadSchema, leadFiltersSchema } from '../validators/lead.validator';
import { AuditAction } from '@prisma/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// Static routes MUST come before /:id to avoid being shadowed
router.get('/stats/dashboard', getDashboardStats);
router.get('/export/csv', auditLog({ action: AuditAction.EXPORT, entity: 'lead', getEntityId: () => 'bulk' }), exportLeads);
router.post('/import/csv', upload.single('file'), auditLog({ action: AuditAction.IMPORT, entity: 'lead', getEntityId: () => 'bulk' }), importLeads);

router.get('/', validate(leadFiltersSchema, 'query'), listLeads);
router.get('/:id', getLead);

router.post(
  '/',
  validate(createLeadSchema),
  auditLog({ action: AuditAction.CREATE, entity: 'lead', getEntityId: (_req, _res) => 'new' }),
  createLead,
);

router.patch(
  '/:id',
  validate(updateLeadSchema),
  auditLog({ action: AuditAction.UPDATE, entity: 'lead', getEntityId: (req) => req.params.id }),
  updateLead,
);

router.delete(
  '/:id',
  auditLog({ action: AuditAction.DELETE, entity: 'lead', getEntityId: (req) => req.params.id }),
  deleteLead,
);

export default router;
