import { Request, Response } from 'express';
import { LeadService } from '../services/lead.service';
import { LeadFiltersDto } from '../validators/lead.validator';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

const leadService = new LeadService();

/**
 * @swagger
 * /api/leads:
 *   get:
 *     tags: [Leads]
 *     summary: List leads with pagination and filters
 *     security:
 *       - bearerAuth: []
 */
export async function listLeads(req: Request, res: Response): Promise<void> {
  const { leads, meta } = await leadService.list(req.user!.orgId, req.query as unknown as LeadFiltersDto);
  sendSuccess(res, leads, 200, meta);
}

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Get a single lead by ID
 *     security:
 *       - bearerAuth: []
 */
export async function getLead(req: Request, res: Response): Promise<void> {
  const lead = await leadService.getById(req.params.id, req.user!.orgId);
  sendSuccess(res, lead);
}

/**
 * @swagger
 * /api/leads:
 *   post:
 *     tags: [Leads]
 *     summary: Create a new lead
 *     security:
 *       - bearerAuth: []
 */
export async function createLead(req: Request, res: Response): Promise<void> {
  const lead = await leadService.create(req.user!.orgId, req.user!.sub, req.body);
  sendCreated(res, lead);
}

/**
 * @swagger
 * /api/leads/{id}:
 *   patch:
 *     tags: [Leads]
 *     summary: Update a lead
 *     security:
 *       - bearerAuth: []
 */
export async function updateLead(req: Request, res: Response): Promise<void> {
  const lead = await leadService.update(req.params.id, req.user!.orgId, req.body);
  sendSuccess(res, lead);
}

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     tags: [Leads]
 *     summary: Archive a lead (soft delete)
 *     security:
 *       - bearerAuth: []
 */
export async function deleteLead(req: Request, res: Response): Promise<void> {
  await leadService.delete(req.params.id, req.user!.orgId);
  sendNoContent(res);
}

export async function importLeads(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV file is required' } });
    return;
  }
  const result = await leadService.bulkImportCsv(req.user!.orgId, req.user!.sub, req.file.buffer);
  sendSuccess(res, result);
}

export async function exportLeads(req: Request, res: Response): Promise<void> {
  const csv = await leadService.exportCsv(req.user!.orgId, req.query as unknown as LeadFiltersDto);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
}

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const stats = await leadService.getDashboardStats(req.user!.orgId);
  sendSuccess(res, stats);
}
