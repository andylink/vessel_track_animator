import type { RenderRequest } from '@vessel/shared/geo';

export interface RenderJobData extends RenderRequest {
  jobId: string;
  outputPath: string;
}

export interface ApiRouteFile {
  id: string;
  points: Array<{ lat: number; lon: number; timestamp: string }>;
}
