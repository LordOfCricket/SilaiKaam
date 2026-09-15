import { z } from 'zod';

export const placeOrderSchema = z.object({
  addressId: z.string().uuid('Select a delivery address.'),
  idempotencyKey: z.string().uuid(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
