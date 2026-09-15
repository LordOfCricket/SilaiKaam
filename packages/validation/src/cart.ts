import { z } from 'zod';

export const MAX_CART_QUANTITY = 10;

export const cartQuantitySchema = z.number().int().min(1).max(MAX_CART_QUANTITY);

export const addProductCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: cartQuantitySchema,
});

export const addBuyFitCartItemSchema = addProductCartItemSchema.extend({
  fitProfileId: z.string().uuid(),
  selectedFittingServiceIds: z
    .array(z.string().uuid())
    .min(1, 'Select at least one fitting service.'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});
