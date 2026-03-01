import type { TrackPoint } from '@vessel/shared/geo';

export interface AisClient {
  getTrack(params: { mmsi: string; start: string; end: string }): Promise<TrackPoint[]>;
}

export class StubAisClient implements AisClient {
  async getTrack(params: { mmsi: string; start: string; end: string }): Promise<TrackPoint[]> {
    const startTs = Date.parse(params.start);
    const endTs = Date.parse(params.end);
    const total = Number.isFinite(startTs) && Number.isFinite(endTs) ? 120 : 90;

    return Array.from({ length: total }, (_, index) => {
      const ratio = index / Math.max(1, total - 1);
      return {
        lat: 25.77 + Math.sin(ratio * Math.PI * 2) * 0.3,
        lon: -80.18 + ratio * 0.8,
        timestamp: new Date(startTs + (endTs - startTs) * ratio).toISOString()
      };
    });
  }
}

export function createAisClient(): AisClient {
  return new StubAisClient();
  // TODO: wire AIS_PROVIDER to real implementation.
}
