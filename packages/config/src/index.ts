import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

// Base environment schema: variables every app/service may rely on.
// Apps/services can extend this schema locally for their own additional vars.
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  RABBITMQ_URL: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function loadEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }
  return result.data;
}

export function getBaseEnv(): BaseEnv {
  return loadEnv(baseEnvSchema);
}
