import { z } from 'zod';
import { ActivityType } from '@prisma/client';

export const createActivitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  scheduledAt: z.coerce.date().optional(),
  duration: z.number().int().min(1).max(480).optional(),
  outcome: z.string().max(2000).optional(),
});

export const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().default(false),
});

export type CreateActivityDto = z.infer<typeof createActivitySchema>;
export type CreateNoteDto = z.infer<typeof createNoteSchema>;
