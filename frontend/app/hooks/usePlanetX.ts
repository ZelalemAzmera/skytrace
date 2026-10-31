import { useQuery } from '@tanstack/react-query';

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

export function usePlanetX(p: PlanetXParams | null) {
  return useQuery<PlanetXResult>({
    queryKey: ['planet-x', p],
    queryFn: async () => {
      const q = new URLSearchParams({
        start: p!.start, end: p!.end, step: p!.step,
        a: String(p!.a), e: String(p!.e), inc: String(p!.inc), node: String(p!.node),
        arg_peri: String(p!.arg_peri), m0: String(p!.m0), mass_earth: String(p!.mass_earth),
      });
      const res = await fetch(`${API_BASE}/api/v1/planet-x?${q}`);
      if (!res.ok) {
        let detail = res.statusText;
        try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
        throw new Error(String(detail));
      }
      return res.json();
    },
    enabled: !!p,
    staleTime: 10 * 60 * 1000,
  });
}