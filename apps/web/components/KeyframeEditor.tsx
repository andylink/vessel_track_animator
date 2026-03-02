"use client";

import { useEffect, useMemo, useState } from "react";

export type Keyframe = {
  id: string;
  label: string;
  time: string;
  easing: string;
  heading: number;
  pitch: number;
  altitude: number;
};

type LabelItem = { id: string; title: string; time: string };
type OverlayItem = { id: string; title: string; type: "text" | "image"; time: string };

type TimelineTrack = {
  id: string;
  title: string;
  color: string;
  markers?: Array<{ id: string; time: string }>
};

export const DEFAULT_KEYFRAMES: Keyframe[] = [
  { id: "kf-1", label: "Wide establishing shot", time: "00:08", easing: "Ease In", heading: 10, pitch: -20, altitude: 4800 },
  { id: "kf-2", label: "Zoom to departure", time: "00:14", easing: "Ease In", heading: 55, pitch: -28, altitude: 3600 },
  { id: "kf-3", label: "Pull out to overview", time: "00:22", easing: "Ease Out", heading: 100, pitch: -15, altitude: 5200 },
  { id: "kf-4", label: "Low angle approach", time: "00:45", easing: "Linear", heading: 140, pitch: -5, altitude: 2800 }
];

const LABELS: LabelItem[] = [
  { id: "lbl-1", title: "Departure: Marina di Portofino", time: "00:00" },
  { id: "lbl-2", title: "Strait of Bonifacio", time: "00:28" },
  { id: "lbl-3", title: "Arrival: Calvi, Corsica", time: "00:52" }
];

const OVERLAYS: OverlayItem[] = [
  { id: "ov-1", title: "Title Card", type: "text", time: "00:00" },
  { id: "ov-2", title: "Yacht Photo", type: "image", time: "00:05" },
  { id: "ov-3", title: "Distance Traveled", type: "text", time: "00:20" },
  { id: "ov-4", title: "End Credits", type: "text", time: "00:55" }
];

const TIMELINE: TimelineTrack[] = [
  { id: "trk-1", title: "Full passage", color: "bg-cyan-700", markers: [{ id: "m1", time: "00:10" }, { id: "m2", time: "00:24" }, { id: "m3", time: "00:48" }] },
  { id: "trk-2", title: "Camera", color: "bg-amber-500/80", markers: [{ id: "m4", time: "00:14" }] },
  { id: "trk-3", title: "Labels", color: "bg-slate-600/80", markers: [{ id: "m5", time: "00:00" }, { id: "m6", time: "00:28" }] },
  { id: "trk-4", title: "Text Overlays", color: "bg-emerald-600/80", markers: [{ id: "m7", time: "00:00" }, { id: "m8", time: "00:20" }, { id: "m9", time: "00:55" }] },
  { id: "trk-5", title: "Images", color: "bg-indigo-600/80", markers: [{ id: "m10", time: "00:05" }] }
];

type KeyframeEditorProps = {
  keyframes: Keyframe[];
  onChange: (next: Keyframe[]) => void;
};

export function KeyframeEditor({ keyframes, onChange }: KeyframeEditorProps) {
  const [sourceTab, setSourceTab] = useState<"csv" | "ais">("csv");
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string>(keyframes[1]?.id ?? keyframes[0]?.id ?? "");
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSpeed, setShowSpeed] = useState(true);
  const [showCompass, setShowCompass] = useState(true);
  const [frameRate, setFrameRate] = useState(30);
  const [duration, setDuration] = useState("01:00");

  const activeKeyframe = useMemo(() => {
    const found = keyframes.find((item) => item.id === selectedKeyframeId);
    return found ?? keyframes[0];
  }, [keyframes, selectedKeyframeId]);

  useEffect(() => {
    if (!selectedKeyframeId && keyframes.length > 0) {
      setSelectedKeyframeId(keyframes[0].id);
    }
  }, [keyframes, selectedKeyframeId]);

  function updateKeyframe(patch: Partial<Keyframe>) {
    if (!selectedKeyframeId) return;
    onChange(keyframes.map((item) => (item.id === selectedKeyframeId ? { ...item, ...patch } : item)));
  }

  function parseTimeToSeconds(time: string) {
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return 0;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    return minutes * 60 + seconds;
  }

  function formatSecondsToTime(total: number) {
    const clamped = Math.max(0, Math.min(total, 59 * 60 + 59));
    const minutes = Math.floor(clamped / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(clamped % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function addKeyframe() {
    const last = keyframes[keyframes.length - 1];
    const nextSeconds = last ? parseTimeToSeconds(last.time) + 5 : 0;
    const next: Keyframe = {
      id: `kf-${Date.now()}`,
      label: `Keyframe ${keyframes.length + 1}`,
      time: formatSecondsToTime(nextSeconds),
      easing: "Ease In",
      heading: last?.heading ?? 0,
      pitch: last?.pitch ?? 0,
      altitude: last?.altitude ?? 3000
    };
    setSelectedKeyframeId(next.id);
    onChange([...keyframes, next]);
  }

  if (!activeKeyframe) {
    return null;
  }

  return (
    <aside className="flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <section className="space-y-3 overflow-auto pr-1">
        <div className="flex items-center justify-between text-sm font-medium text-slate-200">
          <span>Data Source</span>
          <span className="text-xs text-slate-400">atlantic_crossing_2025.csv</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            className={`rounded px-3 py-2 ${sourceTab === "csv" ? "bg-cyan-700 text-white" : "bg-slate-800"}`}
            type="button"
            onClick={() => setSourceTab("csv")}
          >
            CSV Upload
          </button>
          <button
            className={`rounded px-3 py-2 ${sourceTab === "ais" ? "bg-cyan-700 text-white" : "bg-slate-800"}`}
            type="button"
            onClick={() => setSourceTab("ais")}
          >
            AIS API
          </button>
        </div>
        <div className="rounded border border-dashed border-slate-700 bg-slate-950 px-3 py-6 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-200">Drop CSV or click to browse</p>
          <p>lat, lon, timestamp columns required</p>
        </div>
        <div className="space-y-2 text-sm">
          <label className="text-slate-300">Vessel name</label>
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            defaultValue="S/Y Odyssey"
          />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="text-slate-300">Trail style</label>
              <select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2">
                <option>Solid line</option>
                <option>Dashed line</option>
                <option>Glow</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-slate-300">Color</label>
              <input type="color" defaultValue="#32b2f6" className="mt-1 h-[42px] w-full rounded border border-slate-700 bg-slate-950" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between text-sm font-medium text-slate-200">
          <span>Camera Keyframes</span>
          <span className="text-xs text-slate-400">00:00 / 01:00:00</span>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950/40">
          {keyframes.map((kf) => (
            <button
              key={kf.id}
              type="button"
              onClick={() => setSelectedKeyframeId(kf.id)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-800/70 ${
                selectedKeyframeId === kf.id ? "bg-slate-800/80" : ""
              }`}
            >
              <span className="text-xs text-slate-400">{kf.time}</span>
              <span className="flex-1 text-slate-200">{kf.label}</span>
              <span className="text-[11px] text-slate-400">{kf.easing}</span>
            </button>
          ))}
        </div>
        <button className="w-full rounded bg-slate-800 px-3 py-2 text-sm" type="button" onClick={addKeyframe}>
          + Add Keyframe
        </button>
      </section>

      <section className="space-y-3 rounded border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-sm font-medium text-slate-200">Editing: {activeKeyframe.label}</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <label className="text-slate-300">Label</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              value={activeKeyframe.label}
              onChange={(event) => updateKeyframe({ label: event.target.value })}
            />
          </div>
          <div>
            <label className="text-slate-300">Time</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              value={activeKeyframe.time}
              onChange={(event) => updateKeyframe({ time: event.target.value })}
            />
          </div>
          <div>
            <label className="text-slate-300">Easing</label>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              value={activeKeyframe.easing}
              onChange={(event) => updateKeyframe({ easing: event.target.value })}
            >
              <option>Ease In</option>
              <option>Ease Out</option>
              <option>Ease In-Out</option>
              <option>Linear</option>
            </select>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <ControlSlider
            label="Heading"
            value={activeKeyframe.heading}
            suffix="deg"
            min={0}
            max={360}
            onChange={(value) => updateKeyframe({ heading: value })}
          />
          <ControlSlider
            label="Pitch"
            value={activeKeyframe.pitch}
            suffix="deg"
            min={-90}
            max={90}
            onChange={(value) => updateKeyframe({ pitch: value })}
          />
          <ControlSlider
            label="Altitude / Zoom"
            value={activeKeyframe.altitude}
            suffix="m"
            min={0}
            max={6000}
            onChange={(value) => updateKeyframe({ altitude: value })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-200">Timeline</div>
        <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-300">
          {TIMELINE.map((track) => (
            <div key={track.id} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">{track.title}</span>
                <div className={`h-2 w-2 rounded-full ${track.color}`} />
              </div>
              <div className="relative mt-2 h-2 rounded bg-slate-800">
                <div className={`absolute left-0 top-0 h-2 rounded ${track.color} transition-all`} style={{ width: "92%" }} />
                {track.markers?.map((marker, index) => (
                  <div key={marker.id} className="absolute -top-1 h-4 w-1 rounded bg-white/80" style={{ left: `${10 + index * 18}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-slate-200">
          <span>Labels</span>
          <span className="text-xs text-slate-400">{LABELS.length}</span>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950/40">
          {LABELS.map((label) => (
            <div key={label.id} className="flex items-center justify-between px-3 py-2 text-sm text-slate-200">
              <span>{label.title}</span>
              <span className="text-xs text-slate-400">{label.time}</span>
            </div>
          ))}
        </div>
        <button className="w-full rounded border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-200" type="button">
          + Add Label
        </button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-slate-200">
          <span>Overlays</span>
          <span className="text-xs text-slate-400">{OVERLAYS.length}</span>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950/40">
          {OVERLAYS.map((overlay) => (
            <div key={overlay.id} className="flex items-center justify-between px-3 py-2 text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <span className="rounded border border-slate-700 px-2 py-1 text-[11px] uppercase text-slate-300">
                  {overlay.type === "text" ? "Text" : "Image"}
                </span>
                <span>{overlay.title}</span>
              </div>
              <span className="text-xs text-slate-400">{overlay.time}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button className="rounded bg-slate-800 px-3 py-2" type="button">
            + Text
          </button>
          <button className="rounded bg-slate-800 px-3 py-2" type="button">
            + Image
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-sm font-medium text-slate-200">Export Settings</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-slate-300">Resolution</label>
            <select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2">
              <option>1920 x 1080 (1080p)</option>
              <option>3840 x 2160 (4K)</option>
              <option>1280 x 720 (720p)</option>
            </select>
          </div>
          <div>
            <label className="text-slate-300">Format</label>
            <select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2">
              <option>MP4 (H.264)</option>
              <option>WebM</option>
              <option>Image sequence</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-slate-300">Frame rate</label>
            <input
              type="range"
              min={12}
              max={60}
              step={1}
              value={frameRate}
              onChange={(event) => setFrameRate(Number(event.target.value))}
              className="w-full"
            />
            <div className="mt-1 text-xs text-slate-400">{frameRate} fps</div>
          </div>
          <div>
            <label className="text-slate-300">Duration</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-slate-300">Speed</label>
            <select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2">
              <option>Auto (fit)</option>
              <option>1x</option>
              <option>2x</option>
              <option>0.5x</option>
            </select>
          </div>
          <div className="space-y-2 pt-5 text-sm">
            <Toggle label="Show watermark" value={showWatermark} onChange={setShowWatermark} />
            <Toggle label="Show speed indicator" value={showSpeed} onChange={setShowSpeed} />
            <Toggle label="Show compass" value={showCompass} onChange={setShowCompass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button className="rounded bg-cyan-700 px-3 py-2 font-medium text-white" type="button">
            Preview Render
          </button>
          <button className="rounded bg-emerald-700 px-3 py-2 font-medium text-white" type="button">
            Export Video
          </button>
        </div>
      </section>
    </aside>
  );
}

function ControlSlider({
  label,
  value,
  suffix,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="text-slate-400">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-600" />
      <span>{label}</span>
    </label>
  );
}
