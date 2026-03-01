import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  CESIUM_ION_TOKEN: z.string().optional(),
  AIS_PROVIDER: z.string().default('stub'),
  AIS_API_KEY: z.string().optional()
});

export type VesselEnv = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse({
  CESIUM_ION_TOKEN: process.env.CESIUM_ION_TOKEN,
  AIS_PROVIDER: process.env.AIS_PROVIDER,
  AIS_API_KEY: process.env.AIS_API_KEY
});
