import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const gatewayEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export function loadGatewayEnv(): GatewayEnv {
  return loadEnv(gatewayEnvSchema);
}
