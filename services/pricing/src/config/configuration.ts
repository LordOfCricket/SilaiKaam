import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const serviceEnvSchema = baseEnvSchema.extend({
  PRICING_SERVICE_PORT: z.coerce.number().int().positive().default(3108),
});

export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  return loadEnv(serviceEnvSchema);
}
