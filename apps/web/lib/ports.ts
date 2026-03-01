import * as turf from '@turf/turf';

export const DEMO_PORTS = [
  { name: 'Southampton', lat: 50.899, lon: -1.404 },
  { name: 'Miami', lat: 25.778, lon: -80.179 },
  { name: 'Rotterdam', lat: 51.944, lon: 4.133 }
] as const;

export function isNearPort(position: { lat: number; lon: number }, thresholdKm = 15) {
  const current = turf.point([position.lon, position.lat]);
  for (const port of DEMO_PORTS) {
    const portPoint = turf.point([port.lon, port.lat]);
    const km = turf.distance(current, portPoint, { units: 'kilometers' });
    if (km <= thresholdKm) {
      return { near: true, port };
    }
  }
  return { near: false as const, port: null };
}
