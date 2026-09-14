import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const serviceEnvSchema = baseEnvSchema.extend({
  ASSIGNMENT_SERVICE_PORT: z.coerce.number().int().positive().default(3107),
});

export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  return loadEnv(serviceEnvSchema);
}
