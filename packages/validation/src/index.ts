import { z } from 'zod';

export { z };

export * from './auth';
export * from './customer';
export * from './fit-profile';
export * from './catalog';
export * from './fitting-request';
export * from './cart';
export * from './order';
export * from './fitting-workflow';
export * from './review';
export * from './support';
export * from './cancellation';
export * from './dispute';

// Generic, domain-agnostic schemas.

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
