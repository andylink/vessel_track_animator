import type { Feature, LineString } from 'geojson';
import type { TrackPoint } from '@vessel/shared/geo';

const LAT_KEYS = ['lat', 'latitude'];
const LON_KEYS = ['lon', 'lng', 'long', 'longitude'];
const TIME_KEYS = ['time', 'timestamp', 'date', 'datetime'];

function splitCsvLine(line: string): string[] {
  return line
    .split(',')
    .map((cell) => cell.trim())
    .map((cell) => cell.replace(/^"|"$/g, ''));
}

function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) => candidates.some((key) => header.includes(key)));
}

export interface ParsedRoute {
  points: TrackPoint[];
  geojson: Feature<LineString>;
  samples: Array<{ lat: number; lon: number; timestamp: number }>;
}

export function parseTrackCsv(csvRaw: string): ParsedRoute {
  const rows = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error('CSV must include header and at least one row');
  }

  const headers = splitCsvLine(rows[0]).map((header) => header.toLowerCase());
  const latIndex = findColumn(headers, LAT_KEYS);
  const lonIndex = findColumn(headers, LON_KEYS);
  const tsIndex = findColumn(headers, TIME_KEYS);

  if (latIndex < 0 || lonIndex < 0) {
    throw new Error('CSV requires Lat and Long columns');
  }

  const points: TrackPoint[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const cells = splitCsvLine(rows[index]);
    const lat = Number(cells[latIndex]);
    const lon = Number(cells[lonIndex]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }
    const rawTime = tsIndex >= 0 ? cells[tsIndex] : '';
    const timestamp = rawTime && !Number.isNaN(Date.parse(rawTime)) ? new Date(rawTime).toISOString() : new Date(1700000000000 + index * 60000).toISOString();
    points.push({ lat, lon, timestamp });
  }

  if (points.length < 2) {
    throw new Error('At least two valid coordinate rows are required');
  }

  const geojson: Feature<LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.lon, point.lat])
    }
  };

  return {
    points,
    geojson,
    samples: points.map((point) => ({
      lat: point.lat,
      lon: point.lon,
      timestamp: Date.parse(point.timestamp)
    }))
  };
}
