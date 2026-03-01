'use client';

import type { VesselType } from '@vessel/shared/geo';

const OPTIONS: Array<{ id: VesselType; label: string }> = [
  { id: 'cruise', label: 'Cruise' },
  { id: 'yacht', label: 'Yacht' },
  { id: 'cargo', label: 'Cargo' }
];

export function VesselTypePicker({
  value,
  onChange
}: {
  value: VesselType;
  onChange: (value: VesselType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded border px-3 py-2 text-sm ${
            value === option.id ? 'border-cyan-400 bg-cyan-900/30' : 'border-slate-700 bg-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
