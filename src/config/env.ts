import { z } from "zod";

try {
  process.loadEnvFile();
} catch {}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
});

export const env = envSchema.parse(process.env);
