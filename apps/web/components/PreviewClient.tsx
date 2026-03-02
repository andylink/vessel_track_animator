'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { VesselType } from '@vessel/shared/geo';
import { GlobeViewer } from '@/components/GlobeViewer';
import { TimelineControls } from '@/components/TimelineControls';
import { resampleTrack, smoothTrack, totalDistanceKm, type TimedPosition } from '@/lib/trackOps';

type LocationInfo = {
  title: string;
  country: string;
  countryCode?: string;
};

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
  const [renderError, setRenderError] = useState<string>('');
  const [followCamera, setFollowCamera] = useState(false);
  const [cinematic, setCinematic] = useState(true);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);

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
    if (samples.length === 0) {
      return;
    }
    const first = samples[0];
    void (async () => {
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${first.lat}&longitude=${first.lon}&localityLanguage=en`
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          city?: string;
          locality?: string;
          principalSubdivision?: string;
          countryName?: string;
          countryCode?: string;
        };
        const title =
          payload.city || payload.locality || payload.principalSubdivision || payload.countryName || 'Unknown location';
        const country = payload.countryName || 'Unknown country';
        setLocationInfo({ title, country, countryCode: payload.countryCode?.toLowerCase() });
      } catch (error) {
        console.error('Reverse geocoding failed', error);
      }
    })();
  }, [samples]);

  useEffect(() => {
    if (!playing || samples.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      let reachedEnd = false;
      setProgress((current) => {
        const next = current + 0.0025 * speed;
        if (next >= 1) {
          reachedEnd = true;
          return 1;
        }
        return next;
      });
      if (reachedEnd) {
        setPlaying(false);
      }
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
    setRenderError('');
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId, vesselType, aspect: '16:9', fps: 30, music: true })
    });
    if (!response.ok) {
      setRenderError(await response.text());
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
        onReset={() => {
          setPlaying(false);
          setProgress(0);
        }}
        followCamera={followCamera}
        onFollowChange={(next) => setFollowCamera(next)}
        cinematic={cinematic}
        onCinematicChange={(next) => setCinematic(next)}
      />
      <div className="relative">
        <GlobeViewer
          samples={samples}
          vesselType={vesselType}
          progress={progress}
          playing={playing}
          followCamera={followCamera}
          cinematic={cinematic}
        />
        {locationInfo && progress < 0.12 ? (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded bg-slate-900/90 px-3 py-2 shadow-lg">
            {locationInfo.countryCode ? (
              <img
                src={`https://flagcdn.com/w80/${locationInfo.countryCode}.png`}
                alt={locationInfo.country}
                className="h-8 w-12 rounded border border-slate-700 object-cover"
              />
            ) : null}
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-200">{locationInfo.title}</span>
              <span className="text-[11px] text-slate-300">{locationInfo.country}</span>
            </div>
          </div>
        ) : null}
      </div>
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
      {renderError ? <p className="text-sm text-rose-400">{renderError}</p> : null}
    </main>
  );
}
