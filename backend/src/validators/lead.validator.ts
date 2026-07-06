import { z } from 'zod';
import { WellnessFocus, LeadSource, LeadStatus } from '@prisma/client';

export const createLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  wellnessFocus: z.nativeEnum(WellnessFocus).optional(),
  jobTitle: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  leadSource: z.nativeEnum(LeadSource).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  estimatedValue: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  tags: z.array(z.string()).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  ownerId: z.string().cuid().optional(),
});

export const leadFiltersSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  wellnessFocus: z.nativeEnum(WellnessFocus).optional(),
  ownerId: z.string().optional(),
  search: z.string().max(200).optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  tags: z.string().optional(), // comma-separated
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type LeadFiltersDto = z.infer<typeof leadFiltersSchema>;
