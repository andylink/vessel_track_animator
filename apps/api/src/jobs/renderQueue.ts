import { Queue, Worker } from 'bullmq';
import path from 'node:path';
import { renderJob } from '../render/renderer';
import type { RenderJobData } from '../types';

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379)
};

export const RENDER_JOB_NAME = 'render' as const;

export const renderQueue = new Queue<RenderJobData, unknown, typeof RENDER_JOB_NAME>('render-queue', {
  connection: redisConnection
});

export const renderWorker = new Worker<RenderJobData, unknown, typeof RENDER_JOB_NAME>(
  'render-queue',
  async (job) => {
    const routePath = path.join('/tmp/routes', `${job.data.routeId}.json`);
    await renderJob({
      jobId: job.data.jobId,
      routePath,
      fps: job.data.fps ?? 30,
      music: Boolean(job.data.music)
    });
    return { outputPath: `/tmp/exports/${job.data.jobId}.mp4` };
  },
  {
    connection: redisConnection
  }
);
