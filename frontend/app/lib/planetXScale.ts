import * as THREE from 'three';

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