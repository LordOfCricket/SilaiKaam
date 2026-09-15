import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const serviceEnvSchema = baseEnvSchema.extend({
  USER_SERVICE_PORT: z.coerce.number().int().positive().default(3102),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  return loadEnv(serviceEnvSchema);
}
