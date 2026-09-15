import { z } from 'zod';

const DISPUTE_TYPES = [
  'FIT_ISSUE',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'MISSING_ITEM',
  'QUALITY_ISSUE',
  'DELIVERY_ISSUE',
  'OTHER',
] as const;

export const createDisputeSchema = z.object({
  type: z.enum(DISPUTE_TYPES),
  orderItemId: z.string().uuid().optional(),
  description: z.string().min(10, 'Please describe the issue in a bit more detail.').max(2000),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
