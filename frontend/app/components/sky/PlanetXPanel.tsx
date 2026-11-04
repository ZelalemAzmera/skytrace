'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { PLANET_X_PRESETS, PlanetXParams, usePlanetX, usePlanets } from '../../hooks/usePlanetX';
import { useSkyStore } from '../../store/skyStore';
import { formatRA, formatDec } from '../../lib/astrometry';
import { PLANET_COLORS, SCENE_MAX, eclipticToPlane, warpRadius } from '../../lib/planetXScale';

type Vals = typeof PLANET_X_PRESETS[string];

const FIELDS: { key: keyof Vals; label: string; unit: string; step: number }[] = [
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
const RINGS = [1, 10, 100, 1000];

export default function PlanetXPanel({ onClose }: { onClose: () => void }) {
  const presetNames = Object.keys(PLANET_X_PRESETS);
  const [preset, setPreset] = useState(presetNames[0]);
  const [vals, setVals] = useState<Vals>({ ...PLANET_X_PRESETS[presetNames[0]] });
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2036-01-01');
  const [step, setStep] = useState('30 d');
  const [applied, setApplied] = useState<PlanetXParams | null>(null);
  const [idx, setIdx] = useState(0);
  const setMarker = useSkyStore((s) => s.setPlanetXMarker);
  const setScene = useSkyStore((s) => s.setPlanetXScene);

  // Live recalculation: any changed number is applied ~0.35 s after the last keystroke.
  useEffect(() => {
    const nums = Object.values(vals);
    if (nums.some((n) => typeof n !== 'number' || Number.isNaN(n))) return;
    const t = setTimeout(() => setApplied({ start, end, step, ...vals }), 350);
    return () => clearTimeout(t);
  }, [vals, start, end, step]);

  const { data, isFetching, error } = usePlanetX(applied);
  const track = data?.track ?? [];
  const pt = track[Math.min(idx, Math.max(track.length - 1, 0))];
  const { data: planetData } = usePlanets(pt ? pt.datetime_utc.slice(0, 10) : null);

  // Ghost of the previous orbit, so a changed number is visible as a before/after.
  const lastPath = useRef<[number, number, number][] | null>(null);
  const [ghost, setGhost] = useState<[number, number, number][] | null>(null);
  useEffect(() => {
    if (!data) return;
    const prev = lastPath.current;
    if (prev && JSON.stringify(prev) !== JSON.stringify(data.orbit_path)) setGhost(prev);
    lastPath.current = data.orbit_path;
    setIdx((i) => Math.min(i, Math.max(data.track.length - 1, 0)));
  }, [data]);

  // Sky-direction marker on the celestial sphere
  useEffect(() => {
    setMarker(pt ? { ra: pt.ra_deg, dec: pt.dec_deg, name: 'Planet X (hypothetical)' } : null);
  }, [pt, setMarker]);

  // Orbit + planets for the 3D globe
  useEffect(() => {
    if (!data || !pt || !planetData) return;
    setScene({
      path: data.orbit_path,
      pos: [pt.x_au, pt.y_au, pt.z_au],
      planets: planetData.planets.map((p) => ({ name: p.name, a: p.a_au, pos: [p.x_au, p.y_au, p.z_au] as [number, number, number] })),
    });
  }, [data, pt, planetData, setScene]);
  useEffect(() => () => { setMarker(null); setScene(null); }, [setMarker, setScene]);

  // 2D top-down comparison (same log radial scale as the 3D globe)
  const S = 150;
  const k = (S * 0.95) / SCENE_MAX;
  const xy = (x: number, y: number): [number, number] => {
    const [px, py] = eclipticToPlane(x, y);
    return [S + px * k, S - py * k];
  };
  const toPath = (pts: [number, number, number][]) =>
    pts.map(([x, y], i) => { const [sx, sy] = xy(x, y); return `${i ? 'L' : 'M'}${sx.toFixed(1)},${sy.toFixed(1)}`; }).join(' ');
  const mainPath = useMemo(() => (data ? toPath(data.orbit_path) : ''), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const ghostPath = useMemo(() => (ghost ? toPath(ghost) : ''), [ghost]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: string, v: number) => setVals((p) => ({ ...p, [key]: v }));
  const sm = data?.summary;

  return (
    <div className="absolute top-16 right-4 z-40 w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto glass-panel p-4 backdrop-blur-md pointer-events-auto text-[var(--text-primary)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-bold">Planet X (hypothetical)</div>
          <div className="text-[10px] font-mono text-[#ff3df2]">Assumed orbit — not a detection · updates live {isFetching && '…'}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)]" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>

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
              type="number" step={f.step} value={Number.isNaN(vals[f.key]) ? '' : vals[f.key]}
              onChange={(e) => set(f.key, parseFloat(e.target.value))}
              className="w-full bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
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

      {error && <div className="text-xs text-[var(--danger)] mb-2">{(error as Error).message}</div>}

      {data && sm && pt && (
        <>
          <div className="mb-3">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-[var(--text-muted)]">Timeline</span>
              <span className="text-[var(--accent-gold)]">{pt.datetime_utc.slice(0, 10)}</span>
            </div>
            <input type="range" min={0} max={track.length - 1} value={Math.min(idx, track.length - 1)} onChange={(e) => setIdx(parseInt(e.target.value, 10))} className="w-full" />
          </div>

          {/* Top-down comparison with the planets (log radial scale) */}
          <svg viewBox="0 0 300 300" className="w-full rounded-lg bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)] mb-1">
            {RINGS.map((r) => (
              <g key={r}>
                <circle cx={S} cy={S} r={warpRadius(r) * k} fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="2 3" />
                <text x={S + warpRadius(r) * k * 0.7071 + 2} y={S + warpRadius(r) * k * 0.7071 + 8} fontSize="7" fill="#7f8aa8">{r} AU</text>
              </g>
            ))}
            {planetData?.planets.map((p) => (
              <circle key={p.name} cx={S} cy={S} r={warpRadius(p.a_au) * k} fill="none" stroke={PLANET_COLORS[p.name]} strokeOpacity="0.5" />
            ))}
            {ghostPath && <path d={ghostPath} fill="none" stroke="#9aa4bf" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />}
            <path d={mainPath} fill="none" stroke="#ff3df2" strokeWidth="1.4" />
            <circle cx={S} cy={S} r="3" fill="#fff07c" />
            {planetData?.planets.map((p) => {
              const [cx, cy] = xy(p.x_au, p.y_au);
              return <circle key={p.name} cx={cx} cy={cy} r="2.6" fill={PLANET_COLORS[p.name]}><title>{p.name} · {p.distance_au.toFixed(2)} AU</title></circle>;
            })}
            {(() => { const [cx, cy] = xy(pt.x_au, pt.y_au); return <circle cx={cx} cy={cy} r="5" fill="#ff3df2" stroke="#fff" strokeWidth="1"><title>Planet X</title></circle>; })()}
            <text x="6" y="12" fontSize="8.5" fill="#9aa4bf">top-down · log distance scale · planets on {pt.datetime_utc.slice(0, 10)}</text>
            {ghostPath && <text x="6" y="292" fontSize="8.5" fill="#9aa4bf">dashed = previous orbit (before your last change)</text>}
          </svg>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-3 text-[9px] font-mono">
            {Object.entries(PLANET_COLORS).map(([n, c]) => (
              <span key={n} className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />{n}</span>
            ))}
            <span className="flex items-center gap-1 text-[#ff3df2]"><span className="inline-block w-2 h-2 rounded-full bg-[#ff3df2]" />Planet X</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="rounded-lg border border-[var(--border-subtle)] p-2">
              <div className="text-[10px] uppercase text-[var(--accent-cyan)] mb-1">Orbit size</div>
              <div>a = {fmt(sm.semi_major_axis_au, 0)} AU</div>
              <div>Perihelion {fmt(sm.perihelion_au, 0)} AU</div>
              <div>Aphelion {fmt(sm.aphelion_au, 0)} AU</div>
              <div>Period {fmt(sm.period_years, 0)} yr</div>
              <div className="text-[var(--text-muted)]">= {fmt(sm.aphelion_au / 30.11, 1)}× Neptune&apos;s orbit</div>
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
              <div className="text-[#ff3df2] mt-1">Globe: the orbit, the planets and Planet X are drawn on the same log scale; the magenta ring on the sky shows its direction.</div>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{data.assumptions.note} {sm.mass_note} Planet positions: astropy built-in ephemeris (≈ arc-minute accuracy).</p>
        </>
      )}
    </div>
  );
}