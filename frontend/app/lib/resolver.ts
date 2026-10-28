export interface ResolvedTarget {
  name: string;
  ra: number;
  dec: number;
  category: 'Planet X Candidate' | 'Brown Dwarf' | 'Deep Survey' | 'Nebula' | 'Star Cluster' | 'Galaxy' | 'High-PM Star';
  description: string;
  suggestedBand?: number;
}

/**
 * Curated Astronomical Target Catalog for Instant Exploration
 * Contains coordinates, physical classifications, and recommended SPHEREx diagnostic bands.
 */
export const ASTRONOMICAL_CATALOG: ResolvedTarget[] = [
  // 1. Planet X & Kuiper Belt Candidates
  {
    name: 'Sedna (90377 Sedna)',
    ra: 56.452,
    dec: 7.892,
    category: 'Planet X Candidate',
    description: 'Extremely distant sednoid (perihelion 76 AU, aphelion ~937 AU) exhibiting solid-state methane and water ice.',
    suggestedBand: 50, // 2.15 um Ks
  },
  {
    name: 'Planet X Search Field Alpha',
    ra: 54.125,
    dec: 12.342,
    category: 'Planet X Candidate',
    description: 'Batygin & Brown predicted orbital plane search sector for a distant Neptune-mass planet.',
    suggestedBand: 88, // 4.26 um CO2/Ice
  },
  {
    name: 'Makemake (136472 Makemake)',
    ra: 196.211,
    dec: 28.145,
    category: 'Planet X Candidate',
    description: 'Classical Kuiper Belt dwarf planet with bright methane ice absorption bands.',
    suggestedBand: 33, // 1.65 um CH4
  },
  // 2. High Proper Motion & Brown Dwarfs
  {
    name: 'WISE 0855-0714 (Y-Dwarf)',
    ra: 133.786,
    dec: -7.244,
    category: 'Brown Dwarf',
    description: 'Fourth closest star system to the Sun (~2.2 pc); coldest known sub-stellar brown dwarf (T ~ 250 K).',
    suggestedBand: 73, // 3.05 um H2O
  },
  {
    name: 'Barnard\'s Star',
    ra: 269.452,
    dec: 4.693,
    category: 'High-PM Star',
    description: 'Highest proper motion star known (10.3 arcsec/year) with measurable annual parallax.',
    suggestedBand: 18, // 1.25 um J
  },
  {
    name: 'Luhman 16 (WISE 1049-5319)',
    ra: 162.328,
    dec: -53.319,
    category: 'Brown Dwarf',
    description: 'Binary brown dwarf system at only 2.0 pc distance; prime target for SPHEREx atmospheric variability.',
    suggestedBand: 33, // 1.65 um CH4
  },
  // 3. Calibration & Survey Fields
  {
    name: 'North Ecliptic Pole (NEP)',
    ra: 270.0,
    dec: 66.56,
    category: 'Deep Survey',
    description: 'Continuous Viewing Zone for SPHEREx and JWST with over 100 overlapping survey passes.',
    suggestedBand: 50,
  },
  {
    name: 'South Ecliptic Pole (SEP)',
    ra: 90.0,
    dec: -66.56,
    category: 'Deep Survey',
    description: 'Southern calibration field and deep multi-epoch baseline.',
    suggestedBand: 50,
  },
  {
    name: 'Galactic Center (Sgr A*)',
    ra: 266.4168,
    dec: -29.0078,
    category: 'Galaxy',
    description: 'Milky Way supermassive black hole horizon embedded in dense infrared stellar populations.',
    suggestedBand: 88,
  },
  // 4. Iconic Nebulae & Galaxies
  {
    name: 'Orion Nebula (M42)',
    ra: 83.8221,
    dec: -5.3911,
    category: 'Nebula',
    description: 'Active starburst nursery teeming with young stellar objects, protostars, and nascent brown dwarfs.',
    suggestedBand: 50,
  },
  {
    name: 'Pleiades Cluster (M45)',
    ra: 56.75,
    dec: 24.1167,
    category: 'Star Cluster',
    description: 'Young open cluster surrounded by blue reflection nebulae; benchmark for stellar rotation.',
    suggestedBand: 18,
  },
  {
    name: 'Andromeda Galaxy (M31)',
    ra: 10.6847,
    dec: 41.2687,
    category: 'Galaxy',
    description: 'Nearest major spiral galaxy; ideal for resolving infrared asymptotic giant branch stars.',
    suggestedBand: 33,
  },
  {
    name: 'Crab Nebula (M1)',
    ra: 83.6331,
    dec: 22.0145,
    category: 'Nebula',
    description: 'Supernova remnant with high-energy synchrotron radiation and pulsar wind nebula.',
    suggestedBand: 102,
  },
];

/**
 * Searches the astronomical catalog for matching targets by query string.
 * Supports fuzzy name matching, category filtering, and direct coordinate parsing (e.g. "83.82, -5.39").
 */
export function searchCatalog(query: string): ResolvedTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Check if query is direct decimal coordinates (e.g. "83.82, -5.39" or "83.82 -5.39")
  const coordMatch = q.match(/^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    const ra = parseFloat(coordMatch[1]);
    const dec = parseFloat(coordMatch[2]);
    if (ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
      return [
        {
          name: `Custom Pointing (${ra.toFixed(3)}°, ${dec >= 0 ? `+${dec.toFixed(3)}` : dec.toFixed(3)}°)`,
          ra,
          dec,
          category: 'Deep Survey',
          description: `User-specified equatorial coordinates RA=${ra}°, Dec=${dec}°.`,
        },
      ];
    }
  }

  // Filter curated catalog by name, category, or description
  return ASTRONOMICAL_CATALOG.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
}

/**
 * Resolves celestial object coordinates via CDS Sesame / SIMBAD Name Resolver API,
 * falling back to curated local catalog if offline.
 */
export async function resolveObjectName(name: string): Promise<ResolvedTarget | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // 1. Check local catalog first
  const localMatch = ASTRONOMICAL_CATALOG.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase() || t.name.toLowerCase().startsWith(trimmed.toLowerCase())
  );
  if (localMatch) {
    return localMatch;
  }

  // 2. Query CDS Sesame Name Resolver
  try {
    const url = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(trimmed)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      // Parse Sesame XML for <jradeg> and <jdedeg>
      const raMatch = text.match(/<jradeg>([\d\.\+\-]+)<\/jradeg>/);
      const decMatch = text.match(/<jdedeg>([\d\.\+\-]+)<\/jdedeg>/);

      if (raMatch && decMatch) {
        const ra = parseFloat(raMatch[1]);
        const dec = parseFloat(decMatch[1]);
        return {
          name: trimmed,
          ra: Math.round(ra * 10000) / 10000,
          dec: Math.round(dec * 10000) / 10000,
          category: 'Deep Survey',
          description: `Resolved via CDS SIMBAD / Sesame astronomical catalog.`,
        };
      }
    }
  } catch {
    // Graceful fallback to searchCatalog
  }

  // 3. Fallback partial matching
  const searchResults = searchCatalog(trimmed);
  return searchResults.length > 0 ? searchResults[0] : null;
}
