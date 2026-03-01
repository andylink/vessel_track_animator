'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VesselType } from '@vessel/shared/geo';
import { FileDrop } from '@/components/FileDrop';
import { VesselTypePicker } from '@/components/VesselTypePicker';

export default function LandingPage() {
  const router = useRouter();
  const [routeId, setRouteId] = useState<string>('');
  const [vesselType, setVesselType] = useState<VesselType>('cruise');
  const [mmsi, setMmsi] = useState('');
  const [start, setStart] = useState('2026-01-10T00:00');
  const [end, setEnd] = useState('2026-01-10T12:00');
  const [loadingAis, setLoadingAis] = useState(false);
  const previewDisabled = useMemo(() => !routeId, [routeId]);

  async function requestAisTrack() {
    setLoadingAis(true);
    try {
      const response = await fetch('/api/ais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mmsi, start: new Date(start).toISOString(), end: new Date(end).toISOString() })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as { routeId: string };
      setRouteId(payload.routeId);
    } finally {
      setLoadingAis(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold">VesselAnimator</h1>
      <p className="text-slate-300">Upload CSV route data or generate a stub AIS track, then preview and render.</p>

      <section className="grid gap-6 rounded border border-slate-800 bg-slate-900/40 p-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Upload CSV</h2>
          <FileDrop onUploaded={setRouteId} />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">AIS Selector (stub provider)</h2>
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="MMSI/IMO"
            value={mmsi}
            onChange={(event) => setMmsi(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
            <input
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <button
            className="rounded bg-slate-800 px-3 py-2"
            type="button"
            onClick={() => void requestAisTrack()}
            disabled={loadingAis}
          >
            {loadingAis ? 'Fetching AIS...' : 'Fetch AIS Route'}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-medium">Vessel Personalization</h2>
        <VesselTypePicker value={vesselType} onChange={setVesselType} />
      </section>

      <div className="flex items-center gap-3">
        <span className="rounded bg-slate-800 px-3 py-2 text-sm">Route: {routeId || 'none selected'}</span>
        <button
          type="button"
          disabled={previewDisabled}
          className="rounded bg-cyan-700 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => router.push(`/preview?routeId=${routeId}&vesselType=${vesselType}`)}
        >
          Preview Animation
        </button>
      </div>
    </main>
  );
}
