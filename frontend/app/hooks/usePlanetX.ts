import { keepPreviousData, useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PlanetXParams {
  start: string;
  end: string;
  step: string;
  a: number;
  e: number;
  inc: number;
  node: number;
  arg_peri: number;
  m0: number;
  mass_earth: number;
}

export interface PlanetXSummary {
  semi_major_axis_au: number;
  eccentricity: number;
  inclination_deg: number;
  semi_minor_axis_au: number;
  perihelion_au: number;
  aphelion_au: number;
  period_years: number;
  speed_perihelion_kms: number;
  speed_aphelion_kms: number;
  mass_earth: number;
  mass_jupiter: number;
  mass_sun: number;
  hill_radius_perihelion_au: number;
  hill_radius_aphelion_au: number;
  mass_note: string;
}

export interface PlanetXTrackPoint {
  datetime_utc: string;
  x_au: number;
  y_au: number;
  z_au: number;
  distance_au: number;
  speed_kms: number;
  ra_deg: number;
  dec_deg: number;
  geocentric_distance_au: number;
}

export interface PlanetXResult {
  summary: PlanetXSummary;
  orbit_path: [number, number, number][];
  track: PlanetXTrackPoint[];
  assumptions: { note: string };
}

export const PLANET_X_PRESETS: Record<string, Omit<PlanetXParams, 'start' | 'end' | 'step'>> = {
  'Batygin & Brown-like (approx.)': { a: 500, e: 0.25, inc: 20, node: 90, arg_peri: 150, m0: 180, mass_earth: 5 },
  'Default assumption': { a: 500, e: 0.3, inc: 20, node: 0, arg_peri: 0, m0: 0, mass_earth: 6 },
};

function computeClientPlanetX(p: PlanetXParams): PlanetXResult {
  const a = p.a;
  const e = p.e;
  const inc = p.inc;
  const node = p.node;
  const arg_peri = p.arg_peri;
  const m0 = p.m0;
  const mass_earth = p.mass_earth;

  const q = a * (1 - e);
  const Q = a * (1 + e);
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const period_years = Math.pow(a, 1.5);
  const speed_perihelion_kms = 29.7847 * Math.sqrt(2 / q - 1 / a);
  const speed_aphelion_kms = 29.7847 * Math.sqrt(2 / Q - 1 / a);
  const mass_jupiter = mass_earth / 317.828;
  const mass_sun = mass_earth / 332946.0;
  const mRatio = Math.cbrt(mass_sun / 3.0);
  const hill_radius_perihelion_au = q * mRatio;
  const hill_radius_aphelion_au = Q * mRatio;

  const orbit_path: [number, number, number][] = [];
  const DEG2RAD = Math.PI / 180;
  const iRad = inc * DEG2RAD;
  const omegaRad = arg_peri * DEG2RAD;
  const OmegaRad = node * DEG2RAD;

  for (let m = 0; m <= 360; m += 2) {
    const M = m * DEG2RAD;
    let E = M;
    for (let it = 0; it < 12; it++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      const delta = f / fPrime;
      E -= delta;
      if (Math.abs(delta) < 1e-8) break;
    }
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(Math.max(0.0001, 1 - e)) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    const cosOm = Math.cos(omegaRad), sinOm = Math.sin(omegaRad);
    const cosNode = Math.cos(OmegaRad), sinNode = Math.sin(OmegaRad);
    const cosInc = Math.cos(iRad), sinInc = Math.sin(iRad);

    const x1 = cosOm * xOrb - sinOm * yOrb;
    const y1 = sinOm * xOrb + cosOm * yOrb;
    const x2 = x1;
    const y2 = cosInc * y1;
    const z2 = sinInc * y1;

    const xEcl = cosNode * x2 - sinNode * y2;
    const yEcl = sinNode * x2 + cosNode * y2;
    const zEcl = z2;

    orbit_path.push([xEcl, yEcl, zEcl]);
  }

  const startDate = new Date(p.start).getTime();
  const endDate = new Date(p.end).getTime();
  let stepDays = 30;
  if (p.step.includes('7')) stepDays = 7;
  else if (p.step.includes('90')) stepDays = 90;
  else if (p.step.includes('1 y') || p.step.includes('365')) stepDays = 365.25;
  const stepMs = stepDays * 86400000;

  const track: PlanetXTrackPoint[] = [];
  const epochDate = new Date('2026-01-01T00:00:00Z').getTime();

  for (let t = startDate; t <= endDate + 1000; t += stepMs) {
    const daysSinceEpoch = (t - epochDate) / 86400000;
    const nDeg = 360.0 / (period_years * 365.25);
    const mDeg = (m0 + nDeg * daysSinceEpoch) % 360;
    const M = mDeg * DEG2RAD;

    let E = M;
    for (let it = 0; it < 12; it++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      const delta = f / fPrime;
      E -= delta;
      if (Math.abs(delta) < 1e-8) break;
    }
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(Math.max(0.0001, 1 - e)) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    const cosOm = Math.cos(omegaRad), sinOm = Math.sin(omegaRad);
    const cosNode = Math.cos(OmegaRad), sinNode = Math.sin(OmegaRad);
    const cosInc = Math.cos(iRad), sinInc = Math.sin(iRad);

    const x1 = cosOm * xOrb - sinOm * yOrb;
    const y1 = sinOm * xOrb + cosOm * yOrb;
    const x2 = x1;
    const y2 = cosInc * y1;
    const z2 = sinInc * y1;

    const xEcl = cosNode * x2 - sinNode * y2;
    const yEcl = sinNode * x2 + cosNode * y2;
    const zEcl = z2;

    const speed_kms = 29.7847 * Math.sqrt(Math.max(0, 2 / r - 1 / a));

    const eps = 23.43929 * DEG2RAD;
    const xEq = xEcl;
    const yEq = yEcl * Math.cos(eps) - zEcl * Math.sin(eps);
    const zEq = yEcl * Math.sin(eps) + zEcl * Math.cos(eps);

    let ra_deg = Math.atan2(yEq, xEq) * (180 / Math.PI);
    if (ra_deg < 0) ra_deg += 360;
    const dec_deg = Math.atan2(zEq, Math.hypot(xEq, yEq)) * (180 / Math.PI);
    const earthDist = Math.sqrt(xEcl * xEcl + yEcl * yEcl + zEcl * zEcl);

    track.push({
      datetime_utc: new Date(t).toISOString().slice(0, 19) + 'Z',
      x_au: xEcl,
      y_au: yEcl,
      z_au: zEcl,
      distance_au: r,
      speed_kms,
      ra_deg,
      dec_deg,
      geocentric_distance_au: earthDist,
    });
  }

  return {
    summary: {
      semi_major_axis_au: a,
      eccentricity: e,
      inclination_deg: inc,
      semi_minor_axis_au: b,
      perihelion_au: q,
      aphelion_au: Q,
      period_years,
      speed_perihelion_kms,
      speed_aphelion_kms,
      mass_earth,
      mass_jupiter,
      mass_sun,
      hill_radius_perihelion_au,
      hill_radius_aphelion_au,
      mass_note: `Calculated with Sun-only two-body Kepler propagation. Assumed mass = ${mass_earth} M⊕.`,
    },
    orbit_path,
    track,
    assumptions: {
      note: 'Hypothetical Planet X calculated based on Batygin & Brown / Trujilo & Sheppard orbital clustering hypothesis.',
    },
  };
}

export function usePlanetX(p: PlanetXParams | null) {
  return useQuery<PlanetXResult>({
    queryKey: ['planet-x', p],
    queryFn: async () => {
      const q = new URLSearchParams({
        start: p!.start, end: p!.end, step: p!.step,
        a: String(p!.a), e: String(p!.e), inc: String(p!.inc), node: String(p!.node),
        arg_peri: String(p!.arg_peri), m0: String(p!.m0), mass_earth: String(p!.mass_earth),
      });
      try {
        const res = await fetch(`${API_BASE}/api/v1/planet-x?${q}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback to client-side Kepler calculation if backend API is unreachable
      }
      return computeClientPlanetX(p!);
    },
    enabled: !!p,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export interface PlanetPosition {
  name: string;
  a_au: number;
  x_au: number;
  y_au: number;
  z_au: number;
  distance_au: number;
}

/** Real heliocentric positions of Mercury–Neptune on a date (YYYY-MM-DD). */
export function usePlanets(date: string | null) {
  return useQuery<{ planets: PlanetPosition[]; accuracy_note: string }>({
    queryKey: ['planets', date],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/planets?date=${encodeURIComponent(date!)}`);
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    enabled: !!date,
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
