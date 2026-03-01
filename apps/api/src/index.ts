import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { env } from '@vessel/shared/env';
import type { ApiRouteFile } from './types';
import { RENDER_JOB_NAME, renderQueue, renderWorker } from './jobs/renderQueue';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.API_PORT || 3001);

app.use(cors());
app.use(express.json());
app.use('/downloads', express.static('/tmp/exports'));

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseTimestamp(rawTime: string, fallbackMs: number): string {
  if (!rawTime) {
    return new Date(fallbackMs).toISOString();
  }

  const parsed = Date.parse(rawTime);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  const match = rawTime.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, secondRaw] = match;
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
      monthRaw.toLowerCase()
    );

    if (monthIndex >= 0) {
      const day = Number(dayRaw);
      const year = 2000 + Number(yearRaw);
      const hour = Number(hourRaw);
      const minute = Number(minuteRaw);
      const second = Number(secondRaw);
      const timestampMs = Date.UTC(year, monthIndex, day, hour, minute, second);
      if (!Number.isNaN(timestampMs)) {
        return new Date(timestampMs).toISOString();
      }
    }
  }

  return new Date(fallbackMs).toISOString();
}

function parseCsvRows(csvRaw: string): ApiRouteFile['points'] {
  const lines = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV must include header and records');
  }

  const delimiter = detectDelimiter(lines[0]);

  const headers = lines[0]
    .split(delimiter)
    .map((cell) => cell.trim().toLowerCase())
    .map((cell) => cell.replace(/^"|"$/g, ''));

  const latIndex = headers.findIndex((header) => header.includes('lat'));
  const lonIndex = headers.findIndex((header) => ['lon', 'lng', 'long'].some((token) => header.includes(token)));
  const tsIndex = headers.findIndex((header) => ['time', 'date', 'timestamp'].some((token) => header.includes(token)));

  if (latIndex < 0 || lonIndex < 0) {
    throw new Error('CSV requires Lat and Long columns');
  }

  const points = lines.slice(1).flatMap((line, index) => {
    const cells = line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const lat = Number(cells[latIndex]);
    const lon = Number(cells[lonIndex]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }
    const raw = tsIndex >= 0 ? cells[tsIndex] : '';
    const timestamp = parseTimestamp(raw, 1700000000000 + index * 60000);
    return [{ lat, lon, timestamp }];
  });

  if (points.length < 2) {
    throw new Error('Need at least two valid rows');
  }

  return points;
}

async function saveRoute(points: ApiRouteFile['points']) {
  const id = uuid();
  const file: ApiRouteFile = { id, points };
  const routePath = path.join('/tmp/routes', `${id}.json`);
  await fs.mkdir('/tmp/routes', { recursive: true });
  await fs.writeFile(routePath, JSON.stringify(file), 'utf8');
  return id;
}

function seedTrack(startIso: string, endIso: string): ApiRouteFile['points'] {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  const frames = 180;
  return Array.from({ length: frames }, (_, index) => {
    const ratio = index / (frames - 1);
    return {
      lat: 50.89 + Math.sin(ratio * Math.PI * 2) * 0.15,
      lon: -1.41 + ratio * 0.5,
      timestamp: new Date(start + (end - start) * ratio).toISOString()
    };
  });
}

class StubAisProvider {
  async fetchTrack(_mmsi: string, start: string, end: string) {
    return seedTrack(start, end);
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api' });
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Missing file');
    }
    const csv = req.file.buffer.toString('utf8');
    const points = parseCsvRows(csv);
    const routeId = await saveRoute(points);
    return res.json({ routeId, points: points.length });
  } catch (error) {
    return res.status(400).send(error instanceof Error ? error.message : 'Upload failed');
  }
});

app.post('/ais', async (req, res) => {
  try {
    const { mmsi, start, end } = req.body as { mmsi: string; start: string; end: string };
    if (!start || !end) {
      return res.status(400).send('start and end are required');
    }

    const provider = new StubAisProvider();
    const points = env.AIS_API_KEY ? await provider.fetchTrack(mmsi ?? '', start, end) : seedTrack(start, end);
    const routeId = await saveRoute(points);
    return res.json({ routeId, points: points.length, provider: env.AIS_API_KEY ? env.AIS_PROVIDER : 'stub' });
  } catch (error) {
    return res.status(400).send(error instanceof Error ? error.message : 'AIS fetch failed');
  }
});

app.post('/render', async (req, res) => {
  try {
    const { routeId, vesselType, aspect = '16:9', fps = 30, music = false } = req.body as {
      routeId: string;
      vesselType: 'cruise' | 'yacht' | 'cargo';
      aspect?: '16:9' | '9:16';
      fps?: number;
      music?: boolean;
    };

    if (!routeId || !vesselType) {
      return res.status(400).send('routeId and vesselType are required');
    }

    const jobId = uuid();
    const queuedJob = await renderQueue.add(
      RENDER_JOB_NAME,
      {
      jobId,
      routeId,
      vesselType,
      aspect,
      fps,
      music,
      outputPath: `/tmp/exports/${jobId}.mp4`
      },
      { jobId }
    );

    return res.json({ jobId: String(queuedJob.id), status: 'queued' });
  } catch (error) {
    return res.status(500).send(error instanceof Error ? error.message : 'Render submit failed');
  }
});

app.get('/render/:jobId', async (req, res) => {
  const job = await renderQueue.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).send('Job not found');
  }

  const state = await job.getState();
  const response: Record<string, unknown> = { jobId: job.id, status: state };
  if (state === 'failed') {
    response.error = job.failedReason ?? 'Render failed';
  }
  if (state === 'completed') {
    response.downloadUrl = `http://localhost:3001/downloads/${req.params.jobId}.mp4`;
  }
  return res.json(response);
});

app.get('/routes/:routeId', async (req, res) => {
  try {
    const routePath = path.join('/tmp/routes', `${req.params.routeId}.json`);
    const content = await fs.readFile(routePath, 'utf8');
    return res.type('application/json').send(content);
  } catch {
    return res.status(404).send('Route not found');
  }
});

renderWorker.on('failed', (job, error) => {
  console.error('Render job failed', job?.id, error);
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
