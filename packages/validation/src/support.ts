import { z } from 'zod';

const SUPPORT_CATEGORIES = ['ORDER', 'FITTING', 'DELIVERY', 'PRODUCT', 'ACCOUNT', 'OTHER'] as const;

export const createSupportTicketSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  orderId: z.string().uuid().optional(),
  subject: z.string().min(3, 'Subject is required.').max(120),
  description: z.string().min(10, 'Please describe the issue in a bit more detail.').max(2000),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const createSupportMessageSchema = z.object({
  message: z.string().min(1, 'Please enter a message.').max(2000),
});
export type CreateSupportMessageInput = z.infer<typeof createSupportMessageSchema>;
