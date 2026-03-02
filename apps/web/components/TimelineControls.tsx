'use client';

export function TimelineControls({
  playing,
  speed,
  onPlayPause,
  onSpeedChange,
  onReset,
  followCamera,
  onFollowChange,
  cinematic,
  onCinematicChange
}: {
  playing: boolean;
  speed: number;
  onPlayPause: () => void;
  onSpeedChange: (next: number) => void;
  onReset: () => void;
  followCamera: boolean;
  onFollowChange: (next: boolean) => void;
  cinematic: boolean;
  onCinematicChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-700 bg-slate-900/70 p-3">
      <button className="rounded bg-cyan-700 px-3 py-2 text-sm" onClick={onPlayPause} type="button">
        {playing ? 'Pause' : 'Play'}
      </button>
      <label className="text-sm">Speed</label>
      <input
        type="range"
        min={0.25}
        max={4}
        step={0.25}
        value={speed}
        onChange={(event) => onSpeedChange(Number(event.target.value))}
      />
      <span className="w-12 text-right text-sm">{speed.toFixed(2)}x</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={followCamera}
          onChange={(event) => onFollowChange(event.target.checked)}
        />
        Follow camera
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={cinematic}
          onChange={(event) => onCinematicChange(event.target.checked)}
        />
        Cinematic
      </label>
      <button className="rounded border border-slate-600 px-3 py-2 text-sm" onClick={onReset} type="button">
        Reset
      </button>
    </div>
  );
}
