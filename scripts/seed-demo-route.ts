import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';

async function run() {
  const routeId = `demo-${uuid().slice(0, 8)}`;
  const points = Array.from({ length: 120 }, (_, index) => {
    const ratio = index / 119;
    return {
      lat: 25.78 + Math.sin(ratio * Math.PI * 2) * 0.1,
      lon: -80.18 + ratio * 0.45,
      timestamp: new Date(1700000000000 + index * 60000).toISOString()
    };
  });

  await fs.mkdir('/tmp/routes', { recursive: true });
  await fs.writeFile(path.join('/tmp/routes', `${routeId}.json`), JSON.stringify({ id: routeId, points }), 'utf8');

  console.log(routeId);
}

void run();
