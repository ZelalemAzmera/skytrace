'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { PLANET_X_PRESETS, PlanetXParams, usePlanetX } from '../../hooks/usePlanetX';
import { useSkyStore } from '../../store/skyStore';
import { formatRA, formatDec } from '../../lib/astrometry';

const FIELDS: { key: keyof typeof PLANET_X_PRESETS[string]; label: string; unit: string; step: number }[] = [
  { key: 'a', label: 'Semi-major axis', unit: 'AU', step: 10 },
  { key: 'e', label: 'Eccentricity', unit: '', step: 0.01 },
  { key: 'inc', label: 'Inclination', unit: '°', step: 1 },
  { key: 'node', label: 'Ascending node', unit: '°', step: 1 },
  { key: 'arg_peri', label: 'Arg. of perihelion', unit: '°', step: 1 },
  { key: 'm0', label: 'Mean anomaly @ 2026-01-01', unit: '°', step: 1 },
  { key: 'mass_earth', label: 'Mass (assumed)', unit: 'M⊕', step: 0.5 },
];

const STEPS = ['7 d', '30 d', '90 d', '1 y'];
const fmt = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d });

export default function PlanetXPanel({ onClose }: { onClose: () => void }) {
  const presetNames = Object.keys(PLANET_X_PRESETS);
  const [preset, setPreset] = useState(presetNames[0]);
  const [vals, setVals] = useState({ ...PLANET_X_PRESETS[presetNames[0]] });
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2036-01-01');
  const [step, setStep] = useState('30 d');
  const [applied, setApplied] = useState<PlanetXParams | null>(null);
  const [idx, setIdx] = useState(0);
  const setMarker = useSkyStore((s) => s.setPlanetXMarker);

  const run = () => setApplied({ start, end, step, ...vals });
  useEffect(run, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error } = usePlanetX(applied);
  const track = data?.track ?? [];
  const pt = track[Math.min(idx, Math.max(track.length - 1, 0))];

  useEffect(() => { setIdx(0); }, [data]);
  useEffect(() => {
    setMarker(pt ? { ra: pt.ra_deg, dec: pt.dec_deg, name: 'Planet X (hypothetical)' } : null);
  }, [pt, setMarker]);
  useEffect(() => () => setMarker(null), [setMarker]);

  // Top-down orbit diagram (ecliptic x,y), Sun at centre
  const diagram = useMemo(() => {
    if (!data) return null;
    const R = Math.max(...data.orbit_path.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) * 1.08;
    const S = 150;
    const sx = (x: number) => S + (x / R) * S * 0.95;
    const sy = (y: number) => S - (y / R) * S * 0.95;
    const path = data.orbit_path.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
    return { sx, sy, path, neptune: (30 / R) * S * 0.95, S };
  }, [data]);

  const set = (k: string, v: number) => setVals((p) => ({ ...p, [k]: v }));
  const sm = data?.summary;

  return (
    <div className="absolute top-16 right-4 z-40 w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto glass-panel p-4 backdrop-blur-md pointer-events-auto text-[var(--text-primary)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-bold">Planet X (hypothetical)</div>
          <div className="text-[10px] font-mono text-[#ff3df2]">Assumed orbit — not a detection</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)]" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>

      {/* Inputs */}
      <select
        value={preset}
        onChange={(e) => { setPreset(e.target.value); setVals({ ...PLANET_X_PRESETS[e.target.value] }); }}
        className="w-full mb-2 bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs"
      >
        {presetNames.map((n) => <option key={n}>{n}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-[10px] font-mono text-[var(--text-muted)]">
            {f.label} {f.unit && `(${f.unit})`}
            <input
              type="number" step={f.step} value={vals[f.key]}
              onChange={(e) => set(f.key, parseFloat(e.target.value))}
              className="w-full bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <label className="text-[10px] font-mono text-[var(--text-muted)]">From
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-1 py-1 text-xs" />
        </label>
        <label className="text-[10px] font-mono text-[var(--text-muted)]">To
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-1 py-1 text-xs" />
        </label>
        <label className="text-[10px] font-mono text-[var(--text-muted)]">Step
          <select value={step} onChange={(e) => setStep(e.target.value)} className="w-full bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-1 py-1 text-xs">
            {STEPS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <button onClick={run} className="w-full mb-3 py-1.5 rounded-lg bg-[var(--accent-cyan)] text-[#060810] text-xs font-bold">Calculate</button>

      {isLoading && <div className="text-xs text-[var(--text-secondary)]">Calculating…</div>}
      {error && <div className="text-xs text-[var(--danger)]">{(error as Error).message}</div>}

      {data && sm && pt && diagram && (
        <>
          {/* Timeline */}
          <div className="mb-3">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-[var(--text-muted)]">Timeline</span>
              <span className="text-[var(--accent-gold)]">{pt.datetime_utc.slice(0, 10)}</span>
            </div>
            <input type="range" min={0} max={track.length - 1} value={idx} onChange={(e) => setIdx(parseInt(e.target.value, 10))} className="w-full" />
          </div>

          {/* Orbit diagram */}
          <svg viewBox="0 0 300 300" className="w-full rounded-lg bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] mb-3">
            <circle cx={diagram.S} cy={diagram.S} r={Math.max(diagram.neptune, 1.5)} fill="none" stroke="#4dd0e1" strokeWidth="0.8" opacity="0.7" />
            <path d={diagram.path} fill="none" stroke="#ff3df2" strokeWidth="1.2" opacity="0.8" />
            <circle cx={diagram.S} cy={diagram.S} r="3" fill="#fff07c" />
            <circle cx={diagram.sx(pt.x_au)} cy={diagram.sy(pt.y_au)} r="5" fill="#ff3df2" stroke="#fff" strokeWidth="1" />
            <text x="6" y="14" fontSize="9" fill="#9aa4bf">top-down, ecliptic · cyan = Neptune (30 AU)</text>
          </svg>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="rounded-lg border border-[var(--border-subtle)] p-2">
              <div className="text-[10px] uppercase text-[var(--accent-cyan)] mb-1">Orbit size</div>
              <div>a = {fmt(sm.semi_major_axis_au, 0)} AU</div>
              <div>Perihelion {fmt(sm.perihelion_au, 0)} AU</div>
              <div>Aphelion {fmt(sm.aphelion_au, 0)} AU</div>
              <div>Period {fmt(sm.period_years, 0)} yr</div>
            </div>
            <div className="rounded-lg border border-[var(--border-subtle)] p-2">
              <div className="text-[10px] uppercase text-[var(--accent-cyan)] mb-1">Mass (assumed)</div>
              <div>{fmt(sm.mass_earth, 1)} M⊕</div>
              <div>{fmt(sm.mass_jupiter, 3)} M♃</div>
              <div>Hill radius {fmt(sm.hill_radius_perihelion_au, 1)}–{fmt(sm.hill_radius_aphelion_au, 1)} AU</div>
            </div>
            <div className="col-span-2 rounded-lg border border-[var(--border-subtle)] p-2">
              <div className="text-[10px] uppercase text-[var(--accent-cyan)] mb-1">Location on {pt.datetime_utc.slice(0, 10)}</div>
              <div>Sun distance {fmt(pt.distance_au, 1)} AU · speed {fmt(pt.speed_kms, 3)} km/s</div>
              <div>Earth distance {fmt(pt.geocentric_distance_au, 1)} AU</div>
              <div>RA {formatRA(pt.ra_deg)} · Dec {formatDec(pt.dec_deg)}</div>
              <div className="text-[var(--text-muted)]">xyz = ({fmt(pt.x_au, 1)}, {fmt(pt.y_au, 1)}, {fmt(pt.z_au, 1)}) AU</div>
              <div className="text-[#ff3df2] mt-1">Magenta marker on the sphere shows this direction.</div>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{data.assumptions.note} {sm.mass_note}</p>
        </>
      )}
    </div>
  );
}