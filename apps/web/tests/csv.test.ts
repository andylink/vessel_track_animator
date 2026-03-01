import { describe, expect, it } from 'vitest';
import { parseTrackCsv } from '../lib/csv';

describe('parseTrackCsv', () => {
  it('parses valid csv rows', () => {
    const csv = ['Lat,Long,Timestamp', '50.1,-1.2,2026-01-01T00:00:00Z', '50.2,-1.1,2026-01-01T00:10:00Z'].join('\n');
    const result = parseTrackCsv(csv);
    expect(result.points).toHaveLength(2);
    expect(result.geojson.geometry.type).toBe('LineString');
  });

  it('parses semicolon-delimited vessel export timestamps', () => {
    const csv = [
      'Timestamp;Lat;Long;COG(Degree);SOG(Knot);HDG(Degree);',
      '12-Feb-26 13:45:11;52.6435266313235;2.00636598684025;51.0236220472441;7.2;46.7716535433071;',
      '12-Feb-26 13:45:43;52.6442405846255;2.00775244664976;51.0236220472441;7.4;46.7716535433071;'
    ].join('\n');

    const result = parseTrackCsv(csv);
    expect(result.points).toHaveLength(2);
    expect(result.points[0].timestamp).toBe('2026-02-12T13:45:11.000Z');
  });

  it('throws for missing columns', () => {
    expect(() => parseTrackCsv('x,y\n1,2')).toThrowError(/Lat and Long/);
  });
});
