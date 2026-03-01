import { describe, expect, it } from 'vitest';
import { interpolatePosition, resampleTrack, smoothTrack } from '../lib/trackOps';

const input = [
  { lat: 50, lon: -1.5, timestamp: 1_700_000_000_000 },
  { lat: 50.2, lon: -1.2, timestamp: 1_700_000_060_000 },
  { lat: 50.3, lon: -0.8, timestamp: 1_700_000_120_000 }
];

describe('trackOps', () => {
  it('resamples to requested count', () => {
    const samples = resampleTrack(input, 40);
    expect(samples).toHaveLength(40);
  });

  it('interpolates middle point', () => {
    const position = interpolatePosition(input, 0.5);
    expect(position.lat).toBeGreaterThan(50);
    expect(position.lon).toBeLessThan(-1);
  });

  it('smoothTrack keeps timeline bounds', () => {
    const smoothed = smoothTrack(input);
    expect(smoothed[0].timestamp).toBe(input[0].timestamp);
    expect(smoothed[smoothed.length - 1].timestamp).toBe(input[input.length - 1].timestamp);
  });
});
