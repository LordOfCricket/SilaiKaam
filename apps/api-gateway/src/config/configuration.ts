import { baseEnvSchema, loadEnv } from '@silaikaam/config';
import { z } from 'zod';

const gatewayEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  IDENTITY_SERVICE_URL: z.string().url().default('http://localhost:3101'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3102'),
  CATALOG_SERVICE_URL: z.string().url().default('http://localhost:3104'),
  ORDER_SERVICE_URL: z.string().url().default('http://localhost:3105'),
  FITTING_SERVICE_URL: z.string().url().default('http://localhost:3106'),
  // No insecure default on purpose — a real secret must be set explicitly.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be set to a random string of at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export function loadGatewayEnv(): GatewayEnv {
  return loadEnv(gatewayEnvSchema);
}
