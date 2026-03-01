'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { VesselType } from '@vessel/shared/geo';
import { GlobeViewer } from '@/components/GlobeViewer';
import { TimelineControls } from '@/components/TimelineControls';
import { resampleTrack, smoothTrack, totalDistanceKm, type TimedPosition } from '@/lib/trackOps';

const DEFAULT_TYPE: VesselType = 'cruise';

export function PreviewClient() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get('routeId');
  const vesselType = (searchParams.get('vesselType') as VesselType) || DEFAULT_TYPE;

  const [samples, setSamples] = useState<TimedPosition[]>([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [renderJob, setRenderJob] = useState<string>('');

  useEffect(() => {
    if (!routeId) {
      return;
    }
    void (async () => {
      const response = await fetch(`/api/routes/${routeId}`);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { points: Array<{ lat: number; lon: number; timestamp: string }> };
      const parsed = payload.points.map((point) => ({
        lat: point.lat,
        lon: point.lon,
        timestamp: Date.parse(point.timestamp)
      }));
      setSamples(resampleTrack(smoothTrack(parsed), 280));
    })();
  }, [routeId]);

  useEffect(() => {
    if (!playing || samples.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setProgress((current) => (current + 0.0025 * speed > 1 ? 0 : current + 0.0025 * speed));
    }, 33);
    return () => window.clearInterval(timer);
  }, [playing, samples.length, speed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        setSpeed((value) => Math.min(4, value + 0.25));
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        setSpeed((value) => Math.max(0.25, value - 0.25));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const distance = useMemo(() => totalDistanceKm(samples), [samples]);

  async function renderMp4() {
    if (!routeId) {
      return;
    }
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId, vesselType, aspect: '16:9', fps: 30, music: true })
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { jobId: string };
    setRenderJob(payload.jobId);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4">
      <h1 className="text-2xl font-semibold">Preview</h1>
      <p className="text-sm text-slate-300">Space: play/pause, ←/→ speed, route length: {distance.toFixed(2)} km</p>
      <TimelineControls
        playing={playing}
        speed={speed}
        onPlayPause={() => setPlaying((value) => !value)}
        onSpeedChange={setSpeed}
      />
      <GlobeViewer samples={samples} vesselType={vesselType} progress={progress} playing={playing} />
      <div className="flex items-center gap-3">
        <button type="button" className="rounded bg-emerald-700 px-4 py-2" onClick={() => void renderMp4()}>
          Render 4K MP4
        </button>
        {renderJob ? (
          <a className="text-cyan-300 underline" href={`/api/render/${renderJob}`}>
            Check job {renderJob}
          </a>
        ) : null}
      </div>
    </main>
  );
}
