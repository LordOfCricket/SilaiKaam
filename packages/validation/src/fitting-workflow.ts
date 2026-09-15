import { z } from 'zod';

export const respondActionRequestSchema = z.object({
  responseText: z.string().min(1, 'Please provide a response.').max(1000),
});

export type RespondActionRequestInput = z.infer<typeof respondActionRequestSchema>;
