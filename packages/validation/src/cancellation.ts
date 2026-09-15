import { z } from 'zod';

const CANCELLATION_REASONS = [
  'CUSTOMER_CHANGED_MIND',
  'ORDERED_BY_MISTAKE',
  'DELIVERY_TOO_LATE',
  'WRONG_ITEM',
  'OTHER',
] as const;

export const cancelOrderSchema = z.object({
  reason: z.enum(CANCELLATION_REASONS),
  note: z.string().max(500).optional(),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
