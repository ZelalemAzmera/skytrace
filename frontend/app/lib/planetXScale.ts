import * as THREE from 'three';
import { PLANET_ORBITS } from './astrometry';

/**
 * Shared logarithmic radial scale used to show Planet X (hundreds of AU) together with the planets
 * (0.4 – 30 AU) in one view. Directions are exact; only the distance from the Sun is compressed.
 */
const R0_AU = 0.5;
const RMAX_AU = 1200;
export const SCENE_MAX = 88; // scene units at RMAX_AU (celestial sphere radius is 100)
const OBLIQUITY = (23.4392911 * Math.PI) / 180;

export const warpRadius = (rAU: number): number =>
  Math.min(97, (SCENE_MAX * Math.log1p(Math.max(rAU, 0) / R0_AU)) / Math.log1p(RMAX_AU / R0_AU));

export const PLANET_COLORS: Record<string, string> = {
  Mercury: '#9E9E9E',
  Venus: '#FFD166',
  Earth: '#00E5FF',
  Mars: '#FF6B35',
  Jupiter: '#DDAA44',
  Saturn: '#E6C88A',
  Uranus: '#7DE3F4',
  Neptune: '#4F7CFF',
};

/** Heliocentric ecliptic (AU) -> warped position in the 3D scene (aligned with the RA/Dec sphere axes). */
export function eclipticToScene(x: number, y: number, z: number): THREE.Vector3 {
  const r = Math.hypot(x, y, z);
  if (r === 0) return new THREE.Vector3();
  const f = warpRadius(r) / r;
  const X = x * f, Y = y * f, Z = z * f;
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  const Yeq = c * Y - s * Z;
  const Zeq = s * Y + c * Z;
  return new THREE.Vector3(X, Zeq, Yeq); // scene: x = X, y = north (Z_eq), z = Y_eq
}

/** Heliocentric ecliptic (AU) -> warped top-down (x, y) in scene units. */
export function eclipticToPlane(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y);
  if (r === 0) return [0, 0];
  const f = warpRadius(r) / r;
  return [x * f, y * f];
}

export interface PlanetXSceneData {
  path: [number, number, number][];
  pos: [number, number, number];
  planets: { name: string; a: number; pos: [number, number, number] }[];
}

/**
 * Orrery visual radius for a real heliocentric distance, so Planet X is drawn on the SAME compressed
 * scale as the planets in the 3D orrery (which uses a hand-calibrated `a` per planet, not real AU).
 * Piecewise-linear in log10(AU) through the planets' (realAU -> visual a) table; beyond Neptune it
 * continues at ORRERY_OUTER_SLOPE visual units per decade, so Planet X always lies outside Neptune.
 */
const ORRERY_OUTER_SLOPE = 9.0;
const ORRERY_OUTER_CAP = 97.0;
const ORRERY_TABLE = PLANET_ORBITS
  .filter((o) => o.category === 'Planet')
  .map((o) => ({ lr: Math.log10(o.realAU), v: o.a }))
  .sort((p, q) => p.lr - q.lr);

export function orreryRadiusFromAU(rAU: number): number {
  if (rAU <= 0) return 0;
  const lr = Math.log10(rAU);
  const t = ORRERY_TABLE;
  const last = t[t.length - 1];
  if (lr >= last.lr) return Math.min(ORRERY_OUTER_CAP, last.v + ORRERY_OUTER_SLOPE * (lr - last.lr));
  if (lr <= t[0].lr) return t[0].v * (rAU / Math.pow(10, t[0].lr));
  for (let i = 1; i < t.length; i++) {
    if (lr <= t[i].lr) {
      const f = (lr - t[i - 1].lr) / (t[i].lr - t[i - 1].lr);
      return t[i - 1].v + f * (t[i].v - t[i - 1].v);
    }
  }
  return last.v;
}

/** Heliocentric ecliptic AU -> position inside orreryGroup (same axis mapping as keplerToCartesian: x, z, y). */
export function eclipticToOrrery(x: number, y: number, z: number): THREE.Vector3 {
  const r = Math.hypot(x, y, z);
  if (r === 0) return new THREE.Vector3();
  const f = orreryRadiusFromAU(r) / r;
  return new THREE.Vector3(x * f, z * f, y * f);
}