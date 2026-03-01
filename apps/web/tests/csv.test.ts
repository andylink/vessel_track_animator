import { describe, expect, it } from 'vitest';
import { parseTrackCsv } from '../lib/csv';

describe('parseTrackCsv', () => {
  it('parses valid csv rows', () => {
    const csv = ['Lat,Long,Timestamp', '50.1,-1.2,2026-01-01T00:00:00Z', '50.2,-1.1,2026-01-01T00:10:00Z'].join('\n');
    const result = parseTrackCsv(csv);
    expect(result.points).toHaveLength(2);
    expect(result.geojson.geometry.type).toBe('LineString');
  });

  it('throws for missing columns', () => {
    expect(() => parseTrackCsv('x,y\n1,2')).toThrowError(/Lat and Long/);
  });
});
