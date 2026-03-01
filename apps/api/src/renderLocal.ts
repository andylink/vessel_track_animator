import { v4 as uuid } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RENDER_JOB_NAME, renderQueue } from './jobs/renderQueue';

async function run() {
  const routeId = `seed-${uuid().slice(0, 8)}`;
  const routePath = path.join('/tmp/routes', `${routeId}.json`);
  await fs.mkdir('/tmp/routes', { recursive: true });

  const points = Array.from({ length: 120 }, (_, index) => {
    const ratio = index / 119;
    return {
      lat: 25.77 + Math.sin(ratio * Math.PI * 2) * 0.2,
      lon: -80.2 + ratio * 0.6,
      timestamp: new Date(1700000000000 + index * 60000).toISOString()
    };
  });

  await fs.writeFile(routePath, JSON.stringify({ id: routeId, points }), 'utf8');

  const jobId = uuid();
  await renderQueue.add(RENDER_JOB_NAME, {
    jobId,
    routeId,
    vesselType: 'cargo',
    aspect: '16:9',
    fps: 30,
    music: true,
    outputPath: `/tmp/exports/${jobId}.mp4`
  });

  console.log(`Queued render job ${jobId} for route ${routeId}`);
}

void run();
