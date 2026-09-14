import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  // Placeholder for local dev only. Production deploys MUST set this to the
  // real SilaiKaam domain via env var — it is not known at development time.
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
