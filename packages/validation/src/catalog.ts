import { z } from 'zod';

export const productSortSchema = z.enum(['relevance', 'price_asc', 'price_desc', 'newest']);

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  size: z.string().trim().max(20).optional(),
  color: z.string().trim().max(30).optional(),
  sort: productSortSchema.default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(48).default(12),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
