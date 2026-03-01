'use client';

import { useRef, useState } from 'react';

export function FileDrop({ onUploaded }: { onUploaded: (routeId: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as { routeId: string };
      onUploaded(payload.routeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-dashed border-slate-600 p-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadFile(file);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded bg-slate-800 px-3 py-2 text-sm"
      >
        {busy ? 'Uploading...' : 'Choose CSV'}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      <p className="mt-2 text-xs text-slate-400">Expected columns: Lat, Long, Timestamp</p>
    </div>
  );
}
