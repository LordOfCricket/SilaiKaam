import { z } from 'zod';

const REVIEW_TARGET_TYPES = ['PRODUCT', 'FITTING', 'CUSTOM_STITCHING'] as const;

export const createReviewSchema = z.object({
  orderItemId: z.string().uuid(),
  targetType: z.enum(REVIEW_TARGET_TYPES),
  rating: z.number().int().min(1, 'Rating must be at least 1.').max(5, 'Rating must be at most 5.'),
  title: z.string().max(120).optional(),
  comment: z.string().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  comment: z.string().max(1000).optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
