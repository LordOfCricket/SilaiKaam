import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Services/apps run via `pnpm --filter <pkg> run dev`, which sets `cwd` to
// that package's own directory — so a plain loadDotenv() only ever sees a
// package-local .env. Fall back to the monorepo root .env for shared vars
// (DATABASE_URL, JWT_SECRET, ...). `override: false` (dotenv default) means
// already-set process.env values (real deploy env, or a package-local .env
// loaded above) always win.
loadDotenv();
loadDotenv({ path: path.resolve(process.cwd(), '../../.env') });

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
