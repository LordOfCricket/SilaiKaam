import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const serviceEnvSchema = baseEnvSchema.extend({
  IDENTITY_SERVICE_PORT: z.coerce.number().int().positive().default(3101),
});

export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  return loadEnv(serviceEnvSchema);
}
