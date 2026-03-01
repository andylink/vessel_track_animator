import * as turf from '@turf/turf';

export interface TimedPosition {
  lat: number;
  lon: number;
  timestamp: number;
}

export function smoothTrack(samples: TimedPosition[]): TimedPosition[] {
  if (samples.length < 3) {
    return samples;
  }
  const input = turf.lineString(samples.map((sample) => [sample.lon, sample.lat]));
  const smoothed = turf.bezierSpline(input, { sharpness: 0.7 });
  const duration = samples[samples.length - 1].timestamp - samples[0].timestamp;
  return smoothed.geometry.coordinates.map((coord, index, all) => ({
    lon: coord[0],
    lat: coord[1],
    timestamp: samples[0].timestamp + Math.floor((duration * index) / Math.max(1, all.length - 1))
  }));
}

export function resampleTrack(samples: TimedPosition[], points = 240): TimedPosition[] {
  if (samples.length < 2 || points <= 2) {
    return samples;
  }
  const route = turf.lineString(samples.map((sample) => [sample.lon, sample.lat]));
  const totalKm = turf.length(route, { units: 'kilometers' });
  const start = samples[0].timestamp;
  const end = samples[samples.length - 1].timestamp;

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1);
    const pos = turf.along(route, totalKm * ratio, { units: 'kilometers' });
    const [lon, lat] = pos.geometry.coordinates;
    return {
      lon,
      lat,
      timestamp: Math.round(start + (end - start) * ratio)
    };
  });
}

export function interpolatePosition(samples: TimedPosition[], frameRatio: number): TimedPosition {
  if (samples.length === 0) {
    return { lat: 0, lon: 0, timestamp: Date.now() };
  }
  if (samples.length === 1) {
    return samples[0];
  }

  const clampedRatio = Math.min(1, Math.max(0, frameRatio));
  const rawIndex = clampedRatio * (samples.length - 1);
  const left = Math.floor(rawIndex);
  const right = Math.min(samples.length - 1, left + 1);
  const alpha = rawIndex - left;

  const start = samples[left];
  const end = samples[right];

  return {
    lat: start.lat + (end.lat - start.lat) * alpha,
    lon: start.lon + (end.lon - start.lon) * alpha,
    timestamp: Math.round(start.timestamp + (end.timestamp - start.timestamp) * alpha)
  };
}

export function nearestIndex(samples: TimedPosition[], target: TimedPosition): number {
  let minDistance = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  samples.forEach((sample, index) => {
    const dLat = sample.lat - target.lat;
    const dLon = sample.lon - target.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function haversineKm(a: TimedPosition, b: TimedPosition): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function totalDistanceKm(samples: TimedPosition[]): number {
  if (samples.length < 2) {
    return 0;
  }
  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    total += haversineKm(samples[index - 1], samples[index]);
  }
  return total;
}
