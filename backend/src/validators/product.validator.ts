import { z } from 'zod';
import { ProductCategory, PurchaseStatus } from '@prisma/client';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  category: z.nativeEnum(ProductCategory),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  replenishmentDays: z.number().int().min(1).max(730).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createPurchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(1000).default(1),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  status: z.nativeEnum(PurchaseStatus).optional(),
  purchasedAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;
