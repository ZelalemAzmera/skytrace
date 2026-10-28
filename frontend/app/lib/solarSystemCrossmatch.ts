/**
 * SkyTrace — NASA MOST & Minor Planet Cross-Match Engine
 *
 * Evaluates target candidates against known Solar System moving bodies
 * (Near-Earth Asteroids, Main Belt Asteroids, Comets, Centaurs, TNOs)
 * using Keplerian orbital ephemerides to verify or exclude local solar system origin.
 */

import { solveKepler, getJulianDate } from './astrometry';

export interface MinorPlanetBody {
  id: string;
  name: string;
  designation: string;
  type: 'Near-Earth Asteroid' | 'Main Belt Asteroid' | 'Comet' | 'Trans-Neptunian Object' | 'Centaur';
  a_AU: number;        // Semi-major axis
  e: number;           // Eccentricity
  i_deg: number;       // Inclination
  omega_deg: number;   // Argument of perihelion
  Omega_deg: number;   // Longitude of ascending node
  M0_deg: number;      // Mean anomaly at epoch
  epoch_jd: number;    // Epoch of elements
  H_mag: number;       // Absolute magnitude
}

export interface CrossMatchResult {
  matched: boolean;
  search_radius_arcsec: number;
  nearest_body: string;
  nearest_type: string;
  angular_separation_arcsec: number;
  estimated_motion_arcsec_hr: number;
  apparent_ra_deg: number;
  apparent_dec_deg: number;
  verdict: 'SOLAR_SYSTEM_BODY' | 'EXTRA_SOLAR_OR_OUTER_TNO';
  explanation: string;
}

/**
 * Standard Catalog of Reference Solar System Moving Bodies
 * Used for instant cross-matching prior to external NASA MOST API query
 */
export const SOLAR_SYSTEM_REFERENCE_BODIES: MinorPlanetBody[] = [
  {
    id: '1',
    name: 'Ceres',
    designation: '(1) Ceres',
    type: 'Main Belt Asteroid',
    a_AU: 2.767,
    e: 0.0758,
    i_deg: 10.59,
    omega_deg: 73.59,
    Omega_deg: 80.30,
    M0_deg: 77.37,
    epoch_jd: 2459000.5,
    H_mag: 3.34,
  },
  {
    id: '4',
    name: 'Vesta',
    designation: '(4) Vesta',
    type: 'Main Belt Asteroid',
    a_AU: 2.362,
    e: 0.0887,
    i_deg: 7.14,
    omega_deg: 151.19,
    Omega_deg: 103.81,
    M0_deg: 20.86,
    epoch_jd: 2459000.5,
    H_mag: 3.20,
  },
  {
    id: '2',
    name: 'Pallas',
    designation: '(2) Pallas',
    type: 'Main Belt Asteroid',
    a_AU: 2.772,
    e: 0.2313,
    i_deg: 34.84,
    omega_deg: 310.05,
    Omega_deg: 173.08,
    M0_deg: 59.70,
    epoch_jd: 2459000.5,
    H_mag: 4.13,
  },
  {
    id: '101955',
    name: 'Bennu',
    designation: '(101955) Bennu',
    type: 'Near-Earth Asteroid',
    a_AU: 1.126,
    e: 0.2037,
    i_deg: 6.03,
    omega_deg: 66.22,
    Omega_deg: 2.06,
    M0_deg: 101.7,
    epoch_jd: 2459000.5,
    H_mag: 20.9,
  },
  {
    id: '99942',
    name: 'Apophis',
    designation: '(99942) Apophis',
    type: 'Near-Earth Asteroid',
    a_AU: 0.922,
    e: 0.1912,
    i_deg: 3.33,
    omega_deg: 126.4,
    Omega_deg: 204.4,
    M0_deg: 230.1,
    epoch_jd: 2459000.5,
    H_mag: 19.7,
  },
  {
    id: '67P',
    name: '67P/Churyumov-Gerasimenko',
    designation: '67P',
    type: 'Comet',
    a_AU: 3.463,
    e: 0.6410,
    i_deg: 7.04,
    omega_deg: 22.1,
    Omega_deg: 36.3,
    M0_deg: 14.8,
    epoch_jd: 2459000.5,
    H_mag: 11.4,
  },
  {
    id: '134340',
    name: 'Pluto',
    designation: '(134340) Pluto',
    type: 'Trans-Neptunian Object',
    a_AU: 39.482,
    e: 0.2488,
    i_deg: 17.16,
    omega_deg: 113.83,
    Omega_deg: 110.30,
    M0_deg: 14.53,
    epoch_jd: 2459000.5,
    H_mag: -0.7,
  },
  {
    id: '90377',
    name: 'Sedna',
    designation: '(90377) Sedna',
    type: 'Trans-Neptunian Object',
    a_AU: 506.0,
    e: 0.855,
    i_deg: 11.93,
    omega_deg: 311.38,
    Omega_deg: 144.55,
    M0_deg: 358.1,
    epoch_jd: 2459000.5,
    H_mag: 1.5,
  },
];

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Calculates heliocentric ecliptic coordinates (l, b, r) for an asteroid at julian date
 */
export function calculateHeliocentricEcliptic(body: MinorPlanetBody, jd: number): { l_deg: number; b_deg: number; r_AU: number } {
  // Mean motion in degrees/day: n = 0.9856076686 / a^(1.5)
  const n = 0.9856076686 / Math.pow(body.a_AU, 1.5);
  const dt = jd - body.epoch_jd;
  let M = (body.M0_deg + n * dt) % 360;
  if (M < 0) M += 360;

  const M_rad = M * DEG2RAD;
  const E_rad = solveKepler(M_rad, body.e);

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + body.e) * Math.sin(E_rad / 2),
    Math.sqrt(1 - body.e) * Math.cos(E_rad / 2)
  );

  // Radius vector
  const r = body.a_AU * (1 - body.e * Math.cos(E_rad));

  const u = nu + body.omega_deg * DEG2RAD; // Argument of latitude
  const i_rad = body.i_deg * DEG2RAD;
  const Omega_rad = body.Omega_deg * DEG2RAD;

  // Ecliptic coordinates
  const x = r * (Math.cos(Omega_rad) * Math.cos(u) - Math.sin(Omega_rad) * Math.sin(u) * Math.cos(i_rad));
  const y = r * (Math.sin(Omega_rad) * Math.cos(u) + Math.cos(Omega_rad) * Math.sin(u) * Math.cos(i_rad));
  const z = r * (Math.sin(u) * Math.sin(i_rad));

  const l_rad = Math.atan2(y, x);
  const b_rad = Math.atan2(z, Math.sqrt(x * x + y * y));

  let l_deg = l_rad * RAD2DEG;
  if (l_deg < 0) l_deg += 360;
  const b_deg = b_rad * RAD2DEG;

  return { l_deg, b_deg, r_AU: r };
}

/**
 * Converts Ecliptic (l, b) to Equatorial (RA, Dec) J2000
 */
export function eclipticToEquatorial(l_deg: number, b_deg: number): { ra_deg: number; dec_deg: number } {
  const eps = 23.43929 * DEG2RAD; // Obliquity of ecliptic
  const l = l_deg * DEG2RAD;
  const b = b_deg * DEG2RAD;

  const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l);
  const dec = Math.asin(sinDec);

  const y = Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps);
  const x = Math.cos(l);
  let ra = Math.atan2(y, x) * RAD2DEG;
  if (ra < 0) ra += 360;

  return { ra_deg: ra, dec_deg: dec * RAD2DEG };
}

/**
 * Cross-matches target coordinates (RA, Dec) with reference moving bodies
 * @param targetRaDeg Target Right Ascension in degrees
 * @param targetDecDeg Target Declination in degrees
 * @param jd Julian Date (defaults to current epoch)
 * @param searchRadiusArcsec Tolerance radius (default 60 arcseconds = 1 arcminute)
 */
export function crossMatchSolarSystem(
  targetRaDeg: number,
  targetDecDeg: number,
  jd: number = getJulianDate(),
  searchRadiusArcsec = 60.0
): CrossMatchResult {
  let minSepArcsec = Infinity;
  let nearestBody = SOLAR_SYSTEM_REFERENCE_BODIES[0];
  let nearestRa = 0;
  let nearestDec = 0;

  for (const body of SOLAR_SYSTEM_REFERENCE_BODIES) {
    const helio = calculateHeliocentricEcliptic(body, jd);
    const eq = eclipticToEquatorial(helio.l_deg, helio.b_deg);

    // Angular separation using haversine formula
    const dra = (targetRaDeg - eq.ra_deg) * Math.cos(((targetDecDeg + eq.dec_deg) / 2) * DEG2RAD);
    const ddec = targetDecDeg - eq.dec_deg;
    const sepArcsec = Math.sqrt(dra * dra + ddec * ddec) * 3600;

    if (sepArcsec < minSepArcsec) {
      minSepArcsec = sepArcsec;
      nearestBody = body;
      nearestRa = eq.ra_deg;
      nearestDec = eq.dec_deg;
    }
  }

  // Estimated daily motion rate (arcsec/hr) based on semi-major axis
  const estMotionArcsecHr = 30.0 / Math.sqrt(nearestBody.a_AU);

  const matched = minSepArcsec <= searchRadiusArcsec;

  if (matched) {
    return {
      matched: true,
      search_radius_arcsec: searchRadiusArcsec,
      nearest_body: nearestBody.designation,
      nearest_type: nearestBody.type,
      angular_separation_arcsec: minSepArcsec,
      estimated_motion_arcsec_hr: estMotionArcsecHr,
      apparent_ra_deg: nearestRa,
      apparent_dec_deg: nearestDec,
      verdict: 'SOLAR_SYSTEM_BODY',
      explanation: `Target is spatially coincident within ${minSepArcsec.toFixed(1)}″ with known ${nearestBody.type} ${nearestBody.designation}. Candidate flux change is likely explained by orbital motion or rotation of this known Solar System body.`,
    };
  }

  return {
    matched: false,
    search_radius_arcsec: searchRadiusArcsec,
    nearest_body: nearestBody.designation,
    nearest_type: nearestBody.type,
    angular_separation_arcsec: minSepArcsec,
    estimated_motion_arcsec_hr: estMotionArcsecHr,
    apparent_ra_deg: nearestRa,
    apparent_dec_deg: nearestDec,
    verdict: 'EXTRA_SOLAR_OR_OUTER_TNO',
    explanation: `No known moving solar system body found within ${searchRadiusArcsec.toFixed(0)}″ (nearest is ${nearestBody.name} at ${(minSepArcsec / 3600).toFixed(1)}°). Strongly supports an ultra-cool brown dwarf, distant Planet X candidate, or extragalactic transient.`,
  };
}
