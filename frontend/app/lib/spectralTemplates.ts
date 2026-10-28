import { getSPHERExWavelength } from './astrometry';

export interface SpectralPoint {
  bandIndex: number;
  wavelengthUm: number;
  flux: number;
  uncertainty: number;
}

export interface SpectralTemplate {
  name: string;
  description: string;
  color: string;
  classificationBadge: string;
  fluxes: number[]; // 102 normalized flux values
}

// Generate the 102 SPHEREx wavelengths
export const SPHEREX_WAVELENGTHS = Array.from({ length: 102 }, (_, i) =>
  getSPHERExWavelength(i + 1)
);

/**
 * 1. Ultra-Cool Y-Dwarf Brown Dwarf Template (T ~ 400 K)
 * Dominant features: Deep CH4 (1.65 um, 3.3 um) and H2O (1.4 um, 1.9 um, 2.7 um) absorption
 */
function generateYDwarfFluxes(wavelengths: number[]): number[] {
  return wavelengths.map((wl) => {
    // Planckian base (T = 450 K)
    const h = 6.626e-34;
    const c = 3.0e8;
    const k = 1.38e-23;
    const lambdaM = wl * 1e-6;
    const exponent = (h * c) / (lambdaM * k * 450);
    const planck = exponent < 70 ? 1 / (Math.pow(lambdaM, 5) * (Math.exp(exponent) - 1)) : 0;

    // Molecular absorption bands
    const ch4_1 = Math.exp(-Math.pow((wl - 1.66) / 0.12, 2) * 5.0);
    const ch4_2 = Math.exp(-Math.pow((wl - 3.32) / 0.25, 2) * 6.5);
    const h2o_1 = Math.exp(-Math.pow((wl - 1.40) / 0.15, 2) * 4.0);
    const h2o_2 = Math.exp(-Math.pow((wl - 1.90) / 0.18, 2) * 4.5);
    const h2o_3 = Math.exp(-Math.pow((wl - 2.70) / 0.22, 2) * 5.5);
    const nh3 = Math.exp(-Math.pow((wl - 2.95) / 0.16, 2) * 4.0);

    const absorption = Math.max(0.02, 1.0 - (ch4_1 + ch4_2 + h2o_1 + h2o_2 + h2o_3 + nh3) * 0.45);
    return planck * absorption;
  });
}

/**
 * 2. Methane Ice Template (Volatile-Rich TNO / Planet X Candidate)
 * Dominant features: Solar reflectance with narrow sharp solid-state CH4 ice bands
 */
function generateMethaneIceFluxes(wavelengths: number[]): number[] {
  return wavelengths.map((wl) => {
    // Solar 5778 K reflected continuum with red slope (organic tholins)
    const slope = 0.5 + (wl - 0.75) * 0.45;
    // Solid CH4 absorption complexes at 1.67, 1.79, 2.32, 3.32 um
    const ice1 = Math.exp(-Math.pow((wl - 1.67) / 0.06, 2) * 4.0);
    const ice2 = Math.exp(-Math.pow((wl - 1.79) / 0.05, 2) * 4.5);
    const ice3 = Math.exp(-Math.pow((wl - 2.32) / 0.08, 2) * 5.5);
    const ice4 = Math.exp(-Math.pow((wl - 3.32) / 0.18, 2) * 7.0);

    const iceAbsorption = Math.max(0.05, 1.0 - (ice1 * 0.5 + ice2 * 0.5 + ice3 * 0.7 + ice4 * 0.85));
    return slope * iceAbsorption;
  });
}

/**
 * 3. High-Redshift Galaxy Template (z ~ 6.5)
 * Dominant features: Complete neutral hydrogen Lyman-break drop below 0.91 um, redshifted [O III] + H-alpha
 */
function generateHighZGalaxyFluxes(wavelengths: number[]): number[] {
  return wavelengths.map((wl) => {
    // Lyman break drop
    const lymanDrop = wl < 0.91 ? 0.03 : 1.0;
    // Stellar continuum
    const continuum = Math.pow(wl / 1.0, 0.4);
    // Redshifted rest-frame optical emission lines at z=6.5
    // [O III] 5007 A -> 3.755 um
    const o3 = Math.exp(-Math.pow((wl - 3.755) / 0.05, 2) * 8.0) * 1.8;
    // H-alpha 6563 A -> 4.922 um
    const hAlpha = Math.exp(-Math.pow((wl - 4.922) / 0.05, 2) * 8.0) * 2.2;

    return (continuum + o3 + hAlpha) * lymanDrop;
  });
}

/**
 * 4. Comet / Active Asteroid Template
 * Dominant features: Solar continuum with water ice sublimation feature at 3.0 um and CO2 gas at 4.26 um
 */
function generateCometFluxes(wavelengths: number[]): number[] {
  return wavelengths.map((wl) => {
    // Reflected solar spectrum (1/lambda^4 Rayleigh + dust scattering)
    const dustContinuum = 1.0 + (wl - 0.75) * 0.2;
    // H2O ice absorption
    const h2oIce = Math.exp(-Math.pow((wl - 3.05) / 0.22, 2) * 4.0);
    // CO2 gas emission
    const co2Gas = Math.exp(-Math.pow((wl - 4.26) / 0.06, 2) * 6.0) * 1.5;

    return Math.max(0.05, dustContinuum * (1.0 - h2oIce * 0.6) + co2Gas);
  });
}

function normalizeTemplate(fluxes: number[]): number[] {
  const max = Math.max(...fluxes) || 1;
  return fluxes.map((f) => f / max);
}

export const SPECTRAL_TEMPLATES: SpectralTemplate[] = [
  {
    name: 'Y-Dwarf Brown Dwarf',
    description: 'Sub-stellar object (T < 500 K) with prominent atmospheric methane & water vapor bands.',
    color: '#FF9E00',
    classificationBadge: 'Brown Dwarf (Y-Dwarf)',
    fluxes: normalizeTemplate(generateYDwarfFluxes(SPHEREX_WAVELENGTHS)),
  },
  {
    name: 'Methane Ice (TNO / Planet X)',
    description: 'Reflective solar spectrum with solid CH4 surface ice absorption (Sedna / Eris class).',
    color: '#00E5FF',
    classificationBadge: 'Planet X Candidate (CH4 Ice)',
    fluxes: normalizeTemplate(generateMethaneIceFluxes(SPHEREX_WAVELENGTHS)),
  },
  {
    name: 'High-z Starburst Galaxy (z ~ 6.5)',
    description: 'Ancient distant galaxy with Lyman-break dropout and redshifted nebular emission lines.',
    color: '#9D4EDD',
    classificationBadge: 'High-Redshift Galaxy (z > 6)',
    fluxes: normalizeTemplate(generateHighZGalaxyFluxes(SPHEREX_WAVELENGTHS)),
  },
  {
    name: 'Comet / Active Centaur',
    description: 'Dusty solar coma with 3.0 um water-ice absorption and 4.26 um CO2 gas emission.',
    color: '#06D6A0',
    classificationBadge: 'Solar System Comet / Centaur',
    fluxes: normalizeTemplate(generateCometFluxes(SPHEREX_WAVELENGTHS)),
  },
];

export interface FitResult {
  bestTemplate: SpectralTemplate;
  reducedChiSquare: number;
  scaleFactor: number;
  fittedFluxes: number[];
  allFits: { name: string; reducedChiSquare: number; scaleFactor: number }[];
}

/**
 * Fits measured candidate SED to the 4 synthetic templates using least-squares scaling
 */
export function fitSpectralEnergyDistribution(
  measuredFluxes: number[],
  uncertainties: number[]
): FitResult {
  const n = measuredFluxes.length;
  const allFits = SPECTRAL_TEMPLATES.map((tmpl) => {
    let sumNum = 0;
    let sumDen = 0;

    for (let i = 0; i < n; i++) {
      const f = measuredFluxes[i];
      const t = tmpl.fluxes[i];
      const err = uncertainties[i] || 0.05;
      const w = 1.0 / (err * err);

      sumNum += f * t * w;
      sumDen += t * t * w;
    }

    const scale = sumDen > 0 ? sumNum / sumDen : 1.0;

    let chiSq = 0;
    for (let i = 0; i < n; i++) {
      const diff = measuredFluxes[i] - scale * tmpl.fluxes[i];
      const err = uncertainties[i] || 0.05;
      chiSq += (diff * diff) / (err * err);
    }

    const reducedChiSq = Math.max(0.1, chiSq / Math.max(1, n - 1));

    return {
      name: tmpl.name,
      template: tmpl,
      reducedChiSquare: Math.round(reducedChiSq * 100) / 100,
      scaleFactor: scale,
    };
  });

  allFits.sort((a, b) => a.reducedChiSquare - b.reducedChiSquare);
  const best = allFits[0];

  return {
    bestTemplate: best.template,
    reducedChiSquare: best.reducedChiSquare,
    scaleFactor: best.scaleFactor,
    fittedFluxes: best.template.fluxes.map((f) => f * best.scaleFactor),
    allFits: allFits.map((f) => ({
      name: f.name,
      reducedChiSquare: f.reducedChiSquare,
      scaleFactor: f.scaleFactor,
    })),
  };
}

/**
 * Generates synthetic measured 102-band fluxes with noise for testing and demonstration
 */
export function generateSyntheticCandidateSED(
  templateName: 'Y-Dwarf Brown Dwarf' | 'Methane Ice (TNO / Planet X)' | 'High-z Starburst Galaxy (z ~ 6.5)' | 'Comet / Active Centaur' = 'Methane Ice (TNO / Planet X)',
  snr = 15.0
): { measuredFluxes: number[]; uncertainties: number[] } {
  const tmpl =
    SPECTRAL_TEMPLATES.find((t) => t.name === templateName) || SPECTRAL_TEMPLATES[1];

  const measuredFluxes: number[] = [];
  const uncertainties: number[] = [];

  tmpl.fluxes.forEach((flux) => {
    const sigma = Math.max(0.02, flux / snr);
    // Gaussian random perturbation
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const noisyFlux = Math.max(0.01, flux + z * sigma);

    measuredFluxes.push(Math.round(noisyFlux * 1000) / 1000);
    uncertainties.push(Math.round(sigma * 1000) / 1000);
  });

  return { measuredFluxes, uncertainties };
}
