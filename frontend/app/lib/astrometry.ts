import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Converts ICRS J2000 coordinates (RA, Dec in degrees) to a 3D Vector on a sphere of radius R.
 * Coordinate convention:
 * Y is North Celestial Pole (Dec = +90°)
 * X is Vernal Equinox (RA = 0°, Dec = 0°)
 * Z is RA = 90°, Dec = 0°
 */
export function icrsToUnitVector(raDeg: number, decDeg: number, radius = 100): THREE.Vector3 {
  const raRad = raDeg * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  return new THREE.Vector3(
    radius * Math.cos(decRad) * Math.cos(raRad),
    radius * Math.sin(decRad),
    radius * Math.cos(decRad) * Math.sin(raRad)
  );
}

/**
 * Inverse conversion: 3D point on or near sphere -> (RA, Dec in degrees)
 */
export function vectorToIcrs(vec: THREE.Vector3): { ra: number; dec: number } {
  const r = vec.length();
  if (r === 0) return { ra: 0, dec: 0 };

  const decRad = Math.asin(Math.max(-1, Math.min(1, vec.y / r)));
  let raRad = Math.atan2(vec.z, vec.x);
  if (raRad < 0) raRad += 2 * Math.PI;

  return {
    ra: raRad * RAD2DEG,
    dec: decRad * RAD2DEG,
  };
}

/**
 * Converts Equatorial (RA, Dec) to Galactic coordinates (l, b in degrees)
 * IAU 1958 standard definition:
 * North Galactic Pole: RA = 192.85948°, Dec = 27.12825°
 * Galactic Center: l0 = 32.93192°
 */
export function equatorialToGalactic(raDeg: number, decDeg: number): { l: number; b: number } {
  const alphaG = 192.85948 * DEG2RAD;
  const deltaG = 27.12825 * DEG2RAD;
  const l0 = 122.93192 * DEG2RAD; // Galactic longitude of North Celestial Pole

  const alpha = raDeg * DEG2RAD;
  const delta = decDeg * DEG2RAD;

  const sinB = Math.sin(delta) * Math.sin(deltaG) + Math.cos(delta) * Math.cos(deltaG) * Math.cos(alpha - alphaG);
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));

  const y = Math.cos(delta) * Math.sin(alpha - alphaG);
  const x = Math.sin(delta) * Math.cos(deltaG) - Math.cos(delta) * Math.sin(deltaG) * Math.cos(alpha - alphaG);

  let l = l0 - Math.atan2(y, x);
  while (l < 0) l += 2 * Math.PI;
  while (l >= 2 * Math.PI) l -= 2 * Math.PI;

  return {
    l: l * RAD2DEG,
    b: b * RAD2DEG,
  };
}

/**
 * Converts Equatorial (RA, Dec) to Ecliptic coordinates (lambda, beta in degrees)
 * Standard obliquity of ecliptic J2000 eps = 23.4392911°
 */
export function equatorialToEcliptic(raDeg: number, decDeg: number): { lambda: number; beta: number } {
  const eps = 23.4392911 * DEG2RAD;
  const alpha = raDeg * DEG2RAD;
  const delta = decDeg * DEG2RAD;

  const sinBeta = Math.sin(delta) * Math.cos(eps) - Math.cos(delta) * Math.sin(eps) * Math.sin(alpha);
  const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));

  const y = Math.sin(delta) * Math.sin(eps) + Math.cos(delta) * Math.cos(eps) * Math.sin(alpha);
  const x = Math.cos(delta) * Math.cos(alpha);

  let lambda = Math.atan2(y, x);
  if (lambda < 0) lambda += 2 * Math.PI;

  return {
    lambda: lambda * RAD2DEG,
    beta: beta * RAD2DEG,
  };
}

/**
 * Format decimal degrees into sexagesimal RA (HH:MM:SS.ss)
 */
export function formatRA(raDeg: number): string {
  let normalized = raDeg % 360;
  if (normalized < 0) normalized += 360;
  const hoursDecimal = normalized / 15;
  const hours = Math.floor(hoursDecimal);
  const minutesDecimal = (hoursDecimal - hours) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = (minutesDecimal - minutes) * 60;
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Format decimal degrees into sexagesimal Dec (+-DD° MM' SS.s")
 */
export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const deg = Math.floor(abs);
  const minutesDecimal = (abs - deg) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = (minutesDecimal - minutes) * 60;
  return `${sign}${deg.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toFixed(1).padStart(4, '0')}"`;
}

/**
 * SPHEREx Linear Variable Filter 102-band formula:
 * lambda_i = 0.75 * (5.0 / 0.75)^((i - 1) / 101)  for i in [1..102]
 */
export function getSPHERExWavelength(bandIndex: number): number {
  const clamped = Math.max(1, Math.min(102, Math.round(bandIndex)));
  return 0.75 * Math.pow(5.0 / 0.75, (clamped - 1) / 101);
}

/**
 * Maps SPHEREx wavelength (0.75 - 5.0 µm) to a representative false-color hexadecimal string and CSS color
 */
export function getWavelengthColor(wavelengthUm: number): { hex: number; css: string; name: string } {
  if (wavelengthUm < 1.1) {
    // Near-IR Band 1 (0.75 - 1.1 µm): Deep Violet/Indigo
    return { hex: 0x8A2BE2, css: '#8A2BE2', name: 'Near-IR (B1)' };
  } else if (wavelengthUm < 1.8) {
    // Near-IR Band 2 (1.1 - 1.8 µm): Cyan/Ice Blue
    return { hex: 0x00E5FF, css: '#00E5FF', name: 'Near-IR (B2)' };
  } else if (wavelengthUm < 2.5) {
    // Short-wave IR Band 3 (1.8 - 2.5 µm): Amber/Gold
    return { hex: 0xFFD166, css: '#FFD166', name: 'SWIR (B3)' };
  } else if (wavelengthUm < 3.8) {
    // Mid-wave IR Band 4 (2.5 - 3.8 µm): Radiant Orange
    return { hex: 0xFF6B35, css: '#FF6B35', name: 'MWIR (B4)' };
  } else {
    // Thermal IR Band 5/6 (3.8 - 5.0 µm): Deep Crimson
    return { hex: 0xEF476F, css: '#EF476F', name: 'Thermal-IR (B5/6)' };
  }
}

/**
 * Julian Date from JavaScript Date
 */
export function getJulianDate(date: Date = new Date()): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Kepler's equation solver for eccentric anomaly E:
 * M = E - e * sin(E)
 */
export function solveKepler(M: number, e: number, tolerance = 1e-8): number {
  let E = M;
  for (let iter = 0; iter < 100; iter++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/**
 * Keplerian orbital elements to 3D Cartesian position (Solar System Scope physics)
 */
export function keplerToCartesian(
  a: number,
  e: number,
  iDeg: number,
  omegaDeg: number,
  OmegaDeg: number,
  MDeg: number,
  scale = 5
): THREE.Vector3 {
  const i = iDeg * DEG2RAD;
  const omega = omegaDeg * DEG2RAD;
  const Omega = OmegaDeg * DEG2RAD;
  const M = MDeg * DEG2RAD;

  const E = solveKepler(M, e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  const r = a * (1 - e * Math.cos(E)) * scale;
  const x_pf = r * Math.cos(nu);
  const y_pf = r * Math.sin(nu);

  const ci = Math.cos(i);
  const si = Math.sin(i);
  const co = Math.cos(omega);
  const so = Math.sin(omega);
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);

  const Px = cO * co - sO * so * ci;
  const Py = sO * co + cO * so * ci;
  const Pz = so * si;

  const Qx = -cO * so - sO * co * ci;
  const Qy = -sO * so + cO * co * ci;
  const Qz = co * si;

  return new THREE.Vector3(
    x_pf * Px + y_pf * Qx,
    x_pf * Pz + y_pf * Qz,
    x_pf * Py + y_pf * Qy
  );
}

/**
 * Major solar system planetary orbital elements (semi-major axis AU, eccentricity, inclination deg, periapsis deg, node deg, mean anomaly rate deg/day)
 */
export const PLANET_ORBITS = [
  { name: 'Mercury', a: 0.387, e: 0.2056, i: 7.00, omega: 29.12, Omega: 48.33, color: 0x9E9E9E, size: 0.6, periodDays: 87.97 },
  { name: 'Venus',   a: 0.723, e: 0.0068, i: 3.39, omega: 54.88, Omega: 76.68, color: 0xFFD166, size: 0.9, periodDays: 224.70 },
  { name: 'Earth',   a: 1.000, e: 0.0167, i: 0.00, omega: 114.21, Omega: 0.00, color: 0x00E5FF, size: 1.0, periodDays: 365.26 },
  { name: 'Mars',    a: 1.524, e: 0.0934, i: 1.85, omega: 286.50, Omega: 49.56, color: 0xFF6B35, size: 0.7, periodDays: 686.98 },
  { name: 'Jupiter', a: 5.204, e: 0.0485, i: 1.30, omega: 273.87, Omega: 100.46, color: 0xDDAA44, size: 1.8, periodDays: 4332.59 },
];

/**
 * Bright Navigation & Reference Star Catalog (Hipparcos subset)
 */
export interface CatalogStar {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  colorHex: number;
  spectralType: string;
}

export const BRIGHT_STARS: CatalogStar[] = [
  { name: 'Sirius', ra: 101.287, dec: -16.716, mag: -1.46, colorHex: 0xA0C4FF, spectralType: 'A1V' },
  { name: 'Canopus', ra: 95.988, dec: -52.696, mag: -0.74, colorHex: 0xFDF0D5, spectralType: 'F0II' },
  { name: 'Rigil Kentaurus', ra: 219.902, dec: -60.834, mag: -0.27, colorHex: 0xFFE066, spectralType: 'G2V' },
  { name: 'Arcturus', ra: 213.915, dec: 19.182, mag: -0.05, colorHex: 0xFF9E00, spectralType: 'K1.5III' },
  { name: 'Vega', ra: 279.235, dec: 38.784, mag: 0.03, colorHex: 0xC0D6DF, spectralType: 'A0V' },
  { name: 'Capella', ra: 79.172, dec: 45.998, mag: 0.08, colorHex: 0xFFE066, spectralType: 'G3III' },
  { name: 'Rigel', ra: 78.634, dec: -8.202, mag: 0.13, colorHex: 0x80B918, spectralType: 'B8Ia' },
  { name: 'Procyon', ra: 114.825, dec: 5.225, mag: 0.38, colorHex: 0xFDF0D5, spectralType: 'F5IV' },
  { name: 'Betelgeuse', ra: 88.793, dec: 7.407, mag: 0.50, colorHex: 0xFF5400, spectralType: 'M1-2Ia' },
  { name: 'Achernar', ra: 24.429, dec: -57.237, mag: 0.46, colorHex: 0x90E0EF, spectralType: 'B6Vep' },
  { name: 'Hadar', ra: 210.956, dec: -60.373, mag: 0.61, colorHex: 0x90E0EF, spectralType: 'B1III' },
  { name: 'Altair', ra: 297.696, dec: 8.868, mag: 0.77, colorHex: 0xE8F1F2, spectralType: 'A7V' },
  { name: 'Acrux', ra: 186.649, dec: -63.099, mag: 0.76, colorHex: 0x90E0EF, spectralType: 'B0.5IV' },
  { name: 'Aldebaran', ra: 68.980, dec: 16.509, mag: 0.86, colorHex: 0xFF7900, spectralType: 'K5III' },
  { name: 'Antares', ra: 247.352, dec: -26.432, mag: 1.06, colorHex: 0xFF3600, spectralType: 'M1.5Iab' },
  { name: 'Spica', ra: 201.298, dec: -11.161, mag: 0.98, colorHex: 0x90E0EF, spectralType: 'B1III' },
  { name: 'Pollux', ra: 116.329, dec: 28.026, mag: 1.14, colorHex: 0xFFB703, spectralType: 'K0III' },
  { name: 'Fomalhaut', ra: 344.413, dec: -29.622, mag: 1.16, colorHex: 0xE8F1F2, spectralType: 'A3V' },
  { name: 'Deneb', ra: 310.358, dec: 45.280, mag: 1.25, colorHex: 0xE8F1F2, spectralType: 'A2Ia' },
  { name: 'Mimosa', ra: 191.930, dec: -59.689, mag: 1.25, colorHex: 0x90E0EF, spectralType: 'B0.5III' },
  { name: 'Regulus', ra: 152.093, dec: 11.967, mag: 1.36, colorHex: 0x90E0EF, spectralType: 'B8IVn' },
  { name: 'Castor', ra: 113.650, dec: 31.888, mag: 1.58, colorHex: 0xE8F1F2, spectralType: 'A1V' },
  { name: 'Bellatrix', ra: 81.283, dec: 6.350, mag: 1.64, colorHex: 0x90E0EF, spectralType: 'B2III' },
  { name: 'Alnilam', ra: 84.053, dec: -1.202, mag: 1.69, colorHex: 0x90E0EF, spectralType: 'B0Ia' },
  { name: 'Alnitak', ra: 85.190, dec: -1.943, mag: 1.74, colorHex: 0x90E0EF, spectralType: 'O9.7Ib' },
  { name: 'Alioth', ra: 193.507, dec: 55.960, mag: 1.77, colorHex: 0xE8F1F2, spectralType: 'A1III' },
  { name: 'Dubhe', ra: 165.932, dec: 61.751, mag: 1.79, colorHex: 0xFFB703, spectralType: 'K0III' },
  { name: 'Mirfak', ra: 51.081, dec: 49.861, mag: 1.82, colorHex: 0xFDF0D5, spectralType: 'F5Ib' },
  { name: 'Polaris', ra: 37.955, dec: 89.264, mag: 1.98, colorHex: 0xFDF0D5, spectralType: 'F7Ib' },
];

/**
 * Standard Sky Presets for Instant Exploration
 */
export const SKY_PRESETS = [
  {
    name: 'Orion Nebula (M42)',
    ra: 83.8221,
    dec: -5.3911,
    description: 'Active star-forming region rich in young stellar objects and brown dwarfs.',
    category: 'Nebula' as const,
  },
  {
    name: 'Pleiades Cluster (M45)',
    ra: 56.75,
    dec: 24.1167,
    description: 'Open star cluster with reflection nebulae and high proper-motion candidate stars.',
    category: 'Star Cluster' as const,
  },
  {
    name: 'Galactic Center (Sgr A*)',
    ra: 266.4168,
    dec: -29.0078,
    description: 'Extremely dense stellar field and supermassive black hole horizon.',
    category: 'Galactic' as const,
  },
  {
    name: 'North Ecliptic Pole (NEP)',
    ra: 270.0,
    dec: 66.56,
    description: 'SPHEREx deep survey calibration field with over 100 overlapping passes.',
    category: 'Deep Survey' as const,
  },
  {
    name: 'South Ecliptic Pole (SEP)',
    ra: 90.0,
    dec: -66.56,
    description: 'SPHEREx deep survey southern continuous viewing zone.',
    category: 'Deep Survey' as const,
  },
  {
    name: 'Andromeda Galaxy (M31)',
    ra: 10.6847,
    dec: 41.2687,
    description: 'Nearest major spiral galaxy; spatial distribution of red giant branch and IR sources.',
    category: 'Deep Survey' as const,
  },
];
