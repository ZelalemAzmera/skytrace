/**
 * SkyTrace — NASA Space Apps Challenge Benchmark Targets Catalog
 * Official evaluation benchmarks for the "Planet X and SPHEREx" challenge:
 * 1. Barnard's Star (High Proper Motion Star, 10.39″/yr)
 * 2. WISE 0855−0714 (Coldest Sub-Brown Dwarf / Rogue Planet, 8.1″/yr, 449 mas parallax)
 * 3. Epsilon Indi B (Binary Brown Dwarf System, 4.7″/yr, 275.8 mas parallax)
 * 4. RW Aurigae (T Tauri Circumstellar Dust Variable, Δm ~ 2.8 mag, zero motion)
 * 5. R Draconis (Mira Pulsating Variable Red Giant, Δm ~ 5.5 mag, zero motion)
 * Plus: Planet X Search Sector Alpha (Batygin & Brown Outer Solar System Corridor)
 */

export interface BenchmarkTarget {
  id: string;
  name: string;
  designation: string;
  ra: number; // J2000 Right Ascension in decimal degrees
  dec: number; // J2000 Declination in decimal degrees
  category: 'High-PM Star' | 'Brown Dwarf' | 'Variable Star' | 'Planet X Candidate';
  phenomenon: 'proper_motion' | 'parallax_hop' | 'flux_drop' | 'pulsating_flare' | 'ice_absorption';
  badge: string;
  badgeColor: string;
  description: string;
  distanceLightYears?: number;
  properMotionArcsecYr?: number;
  expectedShiftPx: number; // At 6.2 arcsec/px plate scale over 6 months
  magDelta?: number;
  suggestedBand: number; // 1..102
  diagnosticWindow: string;
  epochA_fluxMultiplier: number;
  epochB_fluxMultiplier: number;
  epochShiftVectorPx: { dx: number; dy: number };
  scientificCaveat: string;
}

export const BENCHMARK_TARGETS: BenchmarkTarget[] = [
  {
    id: 'barnard',
    name: "Barnard's Star",
    designation: 'GJ 699 / V2500 Oph',
    ra: 269.452,
    dec: 4.693,
    category: 'High-PM Star',
    phenomenon: 'proper_motion',
    badge: 'Fastest Proper Motion',
    badgeColor: '#00E5FF',
    description:
      'Fastest proper motion star known in the sky (10.39″/yr). Across the 6-month SPHEREx survey cadence, it hops ~0.84 pixels against fixed background stars.',
    distanceLightYears: 5.96,
    properMotionArcsecYr: 10.39,
    expectedShiftPx: 0.84,
    suggestedBand: 18, // 1.25 um (J-band)
    diagnosticWindow: '1.25 µm Near-IR Stellar Continuum',
    epochA_fluxMultiplier: 1.0,
    epochB_fluxMultiplier: 1.0,
    epochShiftVectorPx: { dx: -0.82, dy: 0.18 },
    scientificCaveat:
      'Verified with Gaia DR3 astrometry. High proper motion dominates over annual parallax motion.',
  },
  {
    id: 'wise0855',
    name: 'WISE 0855−0714',
    designation: 'WISE J085510.83−071442.5',
    ra: 133.795,
    dec: -7.245,
    category: 'Brown Dwarf',
    phenomenon: 'parallax_hop',
    badge: 'Coldest Sub-Brown Dwarf',
    badgeColor: '#38BDF8',
    description:
      'Coldest known sub-stellar object (T ~ 250 K), only 7.27 ly away. Faint in near-IR but luminous in SPHEREx thermal bands (4–5 µm). Exhibits large proper motion (8.1″/yr) and massive annual parallax (449 mas).',
    distanceLightYears: 7.27,
    properMotionArcsecYr: 8.1,
    expectedShiftPx: 1.15,
    suggestedBand: 73, // 3.05 um H2O / thermal
    diagnosticWindow: '3.05 – 4.5 µm Atmospheric H2O Ice & CH4 Vapor',
    epochA_fluxMultiplier: 1.0,
    epochB_fluxMultiplier: 1.0,
    epochShiftVectorPx: { dx: 0.95, dy: -0.65 },
    scientificCaveat:
      'Discovered via multi-epoch WISE/Spitzer blinking. Water ice cloud atmospheric features detected in mid-infrared.',
  },
  {
    id: 'eps_indi_b',
    name: 'Epsilon Indi B',
    designation: 'eps Ind Ba / eps Ind Bb',
    ra: 330.840,
    dec: -56.786,
    category: 'Brown Dwarf',
    phenomenon: 'parallax_hop',
    badge: 'Binary Brown Dwarf',
    badgeColor: '#A855F7',
    description:
      'Binary brown dwarf pair at 11.8 ly. Displays pronounced annual parallax (275.8 mas) and high proper motion (4.7″/yr), demonstrating multi-epoch astrometric hopping.',
    distanceLightYears: 11.8,
    properMotionArcsecYr: 4.7,
    expectedShiftPx: 0.65,
    suggestedBand: 33, // 1.65 um CH4
    diagnosticWindow: '1.65 µm Atmospheric Methane Feature',
    epochA_fluxMultiplier: 1.0,
    epochB_fluxMultiplier: 1.0,
    epochShiftVectorPx: { dx: 0.58, dy: -0.30 },
    scientificCaveat:
      'Resolved into T1 + T6 binary sub-stellar pair. Ideal benchmark for SPHEREx methane absorption discrimination.',
  },
  {
    id: 'rw_aur',
    name: 'RW Aurigae',
    designation: 'RW Aur A+B (T Tauri Variable)',
    ra: 76.956,
    dec: 30.401,
    category: 'Variable Star',
    phenomenon: 'flux_drop',
    badge: 'Dust Eclipsing Binary',
    badgeColor: '#F59E0B',
    description:
      'Young binary star system undergoing dramatic, deep photometric eclipses (ΔV ~ 2–3 mag) caused by circumstellar protoplanetary dust occultations. Zero spatial motion, but intense brightness blinking.',
    distanceLightYears: 530.0,
    properMotionArcsecYr: 0.02,
    expectedShiftPx: 0.0,
    magDelta: 2.8,
    suggestedBand: 50, // 2.15 um Ks
    diagnosticWindow: '2.15 µm Circumstellar Dust & Silicate Absorption',
    epochA_fluxMultiplier: 1.0,
    epochB_fluxMultiplier: 0.22, // Deep 78% flux drop
    epochShiftVectorPx: { dx: 0.0, dy: 0.0 },
    scientificCaveat:
      'Tidal stream perturbations cause prolonged obscuration by warped inner protoplanetary disk material.',
  },
  {
    id: 'r_dra_mira',
    name: 'R Draconis',
    designation: 'HD 149214 / Mira Variable',
    ra: 248.168,
    dec: 66.755,
    category: 'Variable Star',
    phenomenon: 'pulsating_flare',
    badge: 'Pulsating Mira Variable',
    badgeColor: '#EF4444',
    description:
      'Pulsating Mira-type red giant with a 245-day cycle. Undergoes extreme multi-magnitude periodic flux swings between SPHEREx 6-month survey epochs without spatial displacement.',
    distanceLightYears: 2100.0,
    properMotionArcsecYr: 0.03,
    expectedShiftPx: 0.0,
    magDelta: 5.5,
    suggestedBand: 60, // 2.8 um
    diagnosticWindow: '2.8 µm Thermal Infrared Pulsation Peak',
    epochA_fluxMultiplier: 0.15,
    epochB_fluxMultiplier: 1.0, // Pulsation peak
    epochShiftVectorPx: { dx: 0.0, dy: 0.0 },
    scientificCaveat:
      'Stellar radial pulsation drives dramatic infrared luminosity variation accompanied by circumstellar dust condensation.',
  },
  {
    id: 'planet_x_alpha',
    name: 'Planet X Search Sector Alpha',
    designation: 'Batygin & Brown Sector (Sedna Recovery)',
    ra: 54.125,
    dec: 12.342,
    category: 'Planet X Candidate',
    phenomenon: 'ice_absorption',
    badge: 'Outer Solar System Perturber',
    badgeColor: '#10B981',
    description:
      'Predicted orbital corridor for a distant massive outer Solar System perturber. Exhibits characteristic solid-state methane and water ice absorption across SPHEREx channels 70–90.',
    distanceLightYears: 0.005, // > 350 AU
    properMotionArcsecYr: 0.08,
    expectedShiftPx: 0.12,
    suggestedBand: 88, // 4.26 um CH4/CO2 Ice
    diagnosticWindow: '4.26 µm Solid-State Methane Surface Ice',
    epochA_fluxMultiplier: 1.0,
    epochB_fluxMultiplier: 1.0,
    epochShiftVectorPx: { dx: 0.11, dy: -0.05 },
    scientificCaveat:
      'Hypothetical 5–10 Earth-mass body in a 400–800 AU eccentric orbit. High-confidence detection requires 6-month parallax corroboration and solid CH4 ice spectral signature.',
  },
];

/**
 * Resolves a target by ID, name, or coordinates.
 */
export function findBenchmarkTarget(idOrName: string): BenchmarkTarget | undefined {
  const norm = idOrName.trim().toLowerCase();
  return BENCHMARK_TARGETS.find(
    (b) =>
      b.id.toLowerCase() === norm ||
      b.name.toLowerCase().includes(norm) ||
      b.designation.toLowerCase().includes(norm)
  );
}

/**
 * Formats decimal degrees to Sexagesimal Right Ascension (HH:MM:SS.ss).
 */
export function degreesToRaSexagesimal(raDeg: number): string {
  const normRa = ((raDeg % 360) + 360) % 360;
  const totalHours = normRa / 15.0;
  const hours = Math.floor(totalHours);
  const totalMinutes = (totalHours - hours) * 60.0;
  const minutes = Math.floor(totalMinutes);
  const seconds = (totalMinutes - minutes) * 60.0;
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Formats decimal degrees to Sexagesimal Declination (±DD:MM:SS.s).
 */
export function degreesToDecSexagesimal(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const deg = Math.floor(abs);
  const totalMinutes = (abs - deg) * 60.0;
  const minutes = Math.floor(totalMinutes);
  const seconds = (totalMinutes - minutes) * 60.0;
  return `${sign}${deg.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}′ ${seconds.toFixed(1).padStart(4, '0')}″`;
}

/**
 * Parses coordinate input supporting both Decimal Degrees ("83.82, -5.39")
 * and Sexagesimal ("08:55:10.8 -07:14:42.5" or "08h55m10s -07d14m42s").
 */
export function parseAstronomicalCoordinates(input: string): { ra: number; dec: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct decimal degrees: "83.82, -5.39" or "83.82 -5.39"
  const decMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/);
  if (decMatch) {
    const ra = parseFloat(decMatch[1]);
    const dec = parseFloat(decMatch[2]);
    if (ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
      return { ra, dec };
    }
  }

  // 2. Sexagesimal: "08:55:10.8 -07:14:42.5" or "08 55 10.8 -07 14 42.5" or "08h55m10s -07d14m42s"
  const sexMatch = trimmed.match(
    /^\s*(\d+)(?:[:\s]|h)\s*(\d+)(?:[:\s]|m)\s*(\d+(?:\.\d+)?)(?:s)?\s*[,]?\s*([+-]?\d+)(?:[:\s]|d|°)\s*(\d+)(?:[:\s]|m|′)\s*(\d+(?:\.\d+)?)(?:s|″)?\s*$/i
  );
  if (sexMatch) {
    const h = parseFloat(sexMatch[1]);
    const m = parseFloat(sexMatch[2]);
    const s = parseFloat(sexMatch[3]);
    const dSign = sexMatch[4].startsWith('-') ? -1 : 1;
    const d = Math.abs(parseFloat(sexMatch[4]));
    const dm = parseFloat(sexMatch[5]);
    const ds = parseFloat(sexMatch[6]);

    const ra = (h + m / 60.0 + s / 3600.0) * 15.0;
    const dec = dSign * (d + dm / 60.0 + ds / 3600.0);

    if (ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
      return { ra, dec };
    }
  }

  return null;
}
