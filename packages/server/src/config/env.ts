import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Google Gemini Configuration (never hardcode)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),

  // Firebase Admin Configuration (never hardcode)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Static files serving path for single container deployment
  CLIENT_DIST_PATH: z.string().optional()
});

export type EnvConfig = z.infer<typeof EnvSchema>;

function loadEnv(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment variable validation failed:');
    for (const error of result.error.errors) {
      console.error(`- ${error.path.join('.')}: ${error.message}`);
    }
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = loadEnv();
