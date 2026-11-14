/**
 * SkyTrace — High-Fidelity Astronomical Image Processing Engine
 * Provides WiseView and Aladin Lite grade non-linear stretches, colormaps,
 * and high-resolution (512x512) multi-epoch SPHEREx infrared image cutouts.
 */

export type StretchMode = 'asinh' | 'log' | 'linear';
export type ColormapMode = 'inverted_bw' | 'grayscale' | 'viridis' | 'inferno' | 'cool_warm';

/**
 * Applies the Lupton et al. (2004) Asinh non-linear stretch.
 * Preserves color balance and faint background structures while compressing bright stellar cores.
 */
export function asinhStretch(val: number, minVal: number, maxVal: number, Q: number = 8.0): number {
  if (maxVal <= minVal) return 0;
  const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
  return Math.asinh(Q * norm) / Math.asinh(Q);
}

/**
 * Applies logarithmic stretch.
 */
export function logStretch(val: number, minVal: number, maxVal: number, a: number = 1000.0): number {
  if (maxVal <= minVal) return 0;
  const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
  return Math.log(1.0 + a * norm) / Math.log(1.0 + a);
}

/**
 * Applies standard linear stretch with clipping.
 */
export function linearStretch(val: number, minVal: number, maxVal: number): number {
  if (maxVal <= minVal) return 0;
  return Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
}

/**
 * Pre-computes 256-entry RGB colormap Lookup Tables (LUTs).
 */
export interface ColormapLUT {
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
}

function createLUT(): ColormapLUT {
  return {
    r: new Uint8Array(256),
    g: new Uint8Array(256),
    b: new Uint8Array(256),
  };
}

// 1. Inverted B&W: Standard astronomical convention (0.0 -> white 255, 1.0 -> dark 0)
const LUT_INVERTED_BW: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    const v = 255 - i;
    lut.r[i] = v;
    lut.g[i] = v;
    lut.b[i] = v;
  }
  return lut;
})();

// 2. Grayscale: Classic dark background (0.0 -> black 0, 1.0 -> white 255)
const LUT_GRAYSCALE: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    lut.r[i] = i;
    lut.g[i] = i;
    lut.b[i] = i;
  }
  return lut;
})();

// 3. Viridis: Perceptually uniform scientific colormap (deep purple -> teal -> yellow)
const LUT_VIRIDIS: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    const t = i / 255.0;
    const r = Math.max(0, Math.min(255, Math.round((-0.038 + 2.05 * t - 1.25 * t * t) * 255)));
    const g = Math.max(0, Math.min(255, Math.round((0.005 + 0.98 * t + 0.12 * t * t) * 255)));
    const b = Math.max(0, Math.min(255, Math.round((0.28 + 0.95 * t - 1.85 * t * t + 0.65 * t * t * t) * 255)));
    lut.r[i] = r;
    lut.g[i] = g;
    lut.b[i] = b;
  }
  return lut;
})();

// 4. Inferno: High-contrast thermal blackbody gradient (black -> purple -> red -> yellow)
const LUT_INFERNO: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    const t = i / 255.0;
    const r = Math.max(0, Math.min(255, Math.round((t < 0.35 ? t * 2.8 : 0.98 + (t - 0.35) * 0.03) * 255)));
    const g = Math.max(0, Math.min(255, Math.round((t < 0.5 ? 0 : (t - 0.5) * 2.0) * 255)));
    const b = Math.max(0, Math.min(255, Math.round((t < 0.3 ? t * 2.5 : Math.max(0, 0.75 - (t - 0.3) * 1.5)) * 255)));
    lut.r[i] = r;
    lut.g[i] = g;
    lut.b[i] = b;
  }
  return lut;
})();

// 5. Cool/Warm: Diverging colormap specifically designed for Difference Imaging (I_B - I_A)
const LUT_COOL_WARM: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    const t = i / 255.0;
    if (t < 0.5) {
      const s = 1.0 - t * 2.0;
      lut.r[i] = Math.round(20 + (1.0 - s) * 70);
      lut.g[i] = Math.round(70 + (1.0 - s) * 50);
      lut.b[i] = Math.round(200 + s * 55);
    } else {
      const s = (t - 0.5) * 2.0;
      lut.r[i] = Math.round(90 + s * 165);
      lut.g[i] = Math.round(110 - s * 70);
      lut.b[i] = Math.round(110 - s * 90);
    }
  }
  return lut;
})();

export function getColormapLUT(mode: ColormapMode): ColormapLUT {
  switch (mode) {
    case 'inverted_bw':
      return LUT_INVERTED_BW;
    case 'grayscale':
      return LUT_GRAYSCALE;
    case 'viridis':
      return LUT_VIRIDIS;
    case 'inferno':
      return LUT_INFERNO;
    case 'cool_warm':
      return LUT_COOL_WARM;
    default:
      return LUT_INVERTED_BW;
  }
}

/**
 * Computes difference image data between two raw 2D pixel arrays:
 * diff = ArrayB - ArrayA
 * Returns normalized values scaled into 0..255 with zero-point at 128.
 */
export function computeDifferencePixels(
  pixelsA: Float32Array,
  pixelsB: Float32Array,
  contrastScale: number = 3.5
): Uint8Array {
  const len = pixelsA.length;
  const diff = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    const delta = (pixelsB[i] - pixelsA[i]) * contrastScale;
    const mapped = Math.round(128 + delta * 127);
    diff[i] = Math.max(0, Math.min(255, mapped));
  }

  return diff;
}

/**
 * Adds an astronomical Point Spread Function (PSF) using a Moffat / Gaussian profile
 * with optional diffraction spikes for bright stars.
 */
function addAstronomicalPSF(
  raw: Float32Array,
  size: number,
  px: number,
  py: number,
  peakFlux: number,
  fwhm: number,
  addSpikes: boolean = false
): void {
  const sigma = fwhm / 2.355;
  const radius = Math.ceil(fwhm * 4.0);
  const minX = Math.max(0, Math.floor(px - radius));
  const maxX = Math.min(size - 1, Math.ceil(px + radius));
  const minY = Math.max(0, Math.floor(py - radius));
  const maxY = Math.min(size - 1, Math.ceil(py + radius));

  const beta = 3.5; // Moffat power index for astronomical seeing
  const alpha2 = (fwhm * fwhm) / (4.0 * (Math.pow(2.0, 1.0 / beta) - 1.0));

  for (let y = minY; y <= maxY; y++) {
    const dy2 = (y - py) * (y - py);
    const rowOffset = y * size;
    for (let x = minX; x <= maxX; x++) {
      const dx2 = (x - px) * (x - px);
      const r2 = dx2 + dy2;

      // Moffat seeing profile
      const flux = peakFlux * Math.pow(1.0 + r2 / alpha2, -beta);
      raw[rowOffset + x] += flux;
    }
  }

  // 4-point telescope diffraction spikes for very bright benchmark stars
  if (addSpikes && peakFlux > 250.0) {
    const spikeLen = Math.min(size / 3, Math.round(fwhm * 12.0));
    const spikeFlux = peakFlux * 0.08;
    for (let d = 1; d <= spikeLen; d++) {
      const falloff = spikeFlux / Math.pow(d * 0.35 + 1.0, 1.4);
      if (falloff < 1.0) break;
      if (px + d < size) raw[Math.round(py) * size + Math.round(px + d)] += falloff;
      if (px - d >= 0) raw[Math.round(py) * size + Math.round(px - d)] += falloff;
      if (py + d < size) raw[Math.round(py + d) * size + Math.round(px)] += falloff;
      if (py - d >= 0) raw[Math.round(py - d) * size + Math.round(px)] += falloff;
    }
  }
}

/**
 * Adds an elliptical background galaxy profile (Sérsic profile).
 */
function addBackgroundGalaxy(
  raw: Float32Array,
  size: number,
  px: number,
  py: number,
  peakFlux: number,
  re: number,
  axisRatio: number,
  paDeg: number
): void {
  const rad = Math.ceil(re * 3.5);
  const minX = Math.max(0, Math.floor(px - rad));
  const maxX = Math.min(size - 1, Math.ceil(px + rad));
  const minY = Math.max(0, Math.floor(py - rad));
  const maxY = Math.min(size - 1, Math.ceil(py + rad));

  const paRad = (paDeg * Math.PI) / 180.0;
  const cosPa = Math.cos(paRad);
  const sinPa = Math.sin(paRad);

  for (let y = minY; y <= maxY; y++) {
    const dy = y - py;
    const rowOffset = y * size;
    for (let x = minX; x <= maxX; x++) {
      const dx = x - px;
      // Rotate into galaxy major/minor axes
      const xMaj = dx * cosPa + dy * sinPa;
      const yMin = (-dx * sinPa + dy * cosPa) / axisRatio;
      const r = Math.sqrt(xMaj * xMaj + yMin * yMin);

      // Exponential disk profile (Sérsic n = 1)
      const flux = peakFlux * Math.exp(-1.678 * (r / re));
      raw[rowOffset + x] += flux;
    }
  }
}

/**
 * Synthesizes a high-resolution 512x512 SPHEREx infrared calibrated telescope cutout.
 * Features realistic astronomical point sources, diffraction spikes, stationary background galaxies,
 * Gaussian detector noise, and precise physical proper motion hops or photometric eclipses!
 */
export function generateSyntheticCutout(
  targetId: string,
  epoch: 1 | 2,
  size: number = 512
): { rawPixels: Float32Array; dataUrl: string } {
  const raw = new Float32Array(size * size);
  const cx = size / 2;
  const cy = size / 2;

  // Stable seed based on target name
  let seed = 20261114;
  for (let i = 0; i < targetId.length; i++) seed = (seed * 31 + targetId.charCodeAt(i)) >>> 0;
  if (epoch === 2) seed = (seed * 37 + 101) >>> 0;

  function pseudoRandom(): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296.0;
  }

  // 1. Realistic Infrared Sky Background & Detector Readout Noise
  const bgLevel = 22.0;
  for (let i = 0; i < raw.length; i++) {
    const u1 = Math.max(1e-6, pseudoRandom());
    const u2 = pseudoRandom();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    raw[i] = Math.max(0, bgLevel + z * 3.2);
  }

  // 2. Fixed Stationary Background Stars & Galaxies (Identical in both Epoch 1 & 2)
  // Demonstrates that deep-space background stays completely frozen in place!
  const fixedFieldStars = [
    { x: cx - 140, y: cy - 110, flux: 380.0, fwhm: 4.8, spikes: true },
    { x: cx + 160, y: cy - 150, flux: 490.0, fwhm: 5.2, spikes: true },
    { x: cx - 180, y: cy + 140, flux: 290.0, fwhm: 4.4, spikes: false },
    { x: cx + 150, y: cy + 165, flux: 580.0, fwhm: 5.8, spikes: true },
    { x: cx - 70, y: cy + 190, flux: 190.0, fwhm: 3.8, spikes: false },
    { x: cx + 205, y: cy - 45, flux: 220.0, fwhm: 4.0, spikes: false },
    { x: cx - 195, y: cy - 185, flux: 160.0, fwhm: 3.6, spikes: false },
    { x: cx + 75, y: cy - 195, flux: 140.0, fwhm: 3.4, spikes: false },
    { x: cx - 115, y: cy + 65, flux: 120.0, fwhm: 3.2, spikes: false },
    { x: cx + 115, y: cy + 85, flux: 175.0, fwhm: 3.8, spikes: false },
    { x: cx - 45, y: cy - 165, flux: 110.0, fwhm: 3.2, spikes: false },
    { x: cx + 185, y: cy + 80, flux: 135.0, fwhm: 3.5, spikes: false },
  ];

  for (const s of fixedFieldStars) {
    addAstronomicalPSF(raw, size, s.x, s.y, s.flux, s.fwhm, s.spikes);
  }

  // Stationary background galaxies
  const fixedGalaxies = [
    { x: cx - 155, y: cy + 85, flux: 130.0, re: 14.0, axisRatio: 0.55, pa: 35.0 },
    { x: cx + 120, y: cy - 95, flux: 160.0, re: 18.0, axisRatio: 0.8, pa: 110.0 },
    { x: cx - 80, y: cy - 75, flux: 95.0, re: 11.0, axisRatio: 0.45, pa: 70.0 },
  ];

  for (const g of fixedGalaxies) {
    addBackgroundGalaxy(raw, size, g.x, g.y, g.flux, g.re, g.axisRatio, g.pa);
  }

  // 3. Central Benchmark Target Source Behavior
  // Prominently placed in the center of the field so users can easily see it!
  if (targetId === 'barnard') {
    // Barnard's Star: Rapid proper motion. Hops along dx = -14.0 px, dy = +4.0 px over 6-mo
    const hopDx = 14.0;
    const hopDy = -4.0;
    const x = epoch === 1 ? cx - hopDx / 2 : cx + hopDx / 2;
    const y = epoch === 1 ? cy - hopDy / 2 : cy + hopDy / 2;
    addAstronomicalPSF(raw, size, x, y, 780.0, 5.6, true);
  } else if (targetId === 'wise0855') {
    // WISE 0855: Cold sub-brown dwarf. Visible as a distinct faint infrared point source
    // that hops by dx = +16.0 px, dy = -11.0 px between epochs!
    const hopDx = 16.0;
    const hopDy = -11.0;
    const x = epoch === 1 ? cx - hopDx / 2 : cx + hopDx / 2;
    const y = epoch === 1 ? cy - hopDy / 2 : cy + hopDy / 2;
    addAstronomicalPSF(raw, size, x, y, 420.0, 4.4, false);
  } else if (targetId === 'eps_indi_b') {
    // Epsilon Indi B: Binary brown dwarf pair hopping by dx = +12.0 px, dy = -6.0 px
    const hopDx = 12.0;
    const hopDy = -6.0;
    const x = epoch === 1 ? cx - hopDx / 2 : cx + hopDx / 2;
    const y = epoch === 1 ? cy - hopDy / 2 : cy + hopDy / 2;
    addAstronomicalPSF(raw, size, x, y, 540.0, 4.8, true);
  } else if (targetId === 'rw_aur') {
    // RW Aurigae: Zero spatial motion, but deep dust eclipse between epochs!
    // Epoch 1 = Full Brightness (750.0), Epoch 2 = Deep Obscuration (140.0) -> 81% drop!
    const flux = epoch === 1 ? 760.0 : 145.0;
    addAstronomicalPSF(raw, size, cx, cy, flux, 5.4, epoch === 1);
  } else if (targetId === 'r_dra_mira') {
    // R Draconis: Mira variable pulsation. Zero spatial motion, massive periodic swing!
    // Epoch 1 = Minimum (110.0), Epoch 2 = Maximum (840.0 with spikes)
    const flux = epoch === 1 ? 110.0 : 850.0;
    addAstronomicalPSF(raw, size, cx, cy, flux, 5.6, epoch === 2);
  } else if (targetId === 'planet_x_alpha') {
    // Planet X Corridor: Distant slow-moving candidate drifting subtly (dx = 4.0 px)
    const hopDx = 4.0;
    const hopDy = -2.0;
    const x = epoch === 1 ? cx - hopDx / 2 : cx + hopDx / 2;
    const y = epoch === 1 ? cy - hopDy / 2 : cy + hopDy / 2;
    addAstronomicalPSF(raw, size, x, y, 310.0, 4.2, false);
  } else {
    // Generic custom pointing target with moving candidate
    const hopDx = 10.0;
    const hopDy = -6.0;
    const x = epoch === 1 ? cx - hopDx / 2 : cx + hopDx / 2;
    const y = epoch === 1 ? cy - hopDy / 2 : cy + hopDy / 2;
    addAstronomicalPSF(raw, size, x, y, 480.0, 4.8, true);
  }

  // 4. Render to an HTML Canvas with Inverted B&W stretch for clean astronomical default
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let dataUrl = '';

  if (canvas) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(size, size);
      const lut = LUT_INVERTED_BW;

      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] < min) min = raw[i];
        if (raw[i] > max) max = raw[i];
      }

      for (let i = 0; i < raw.length; i++) {
        const stretched = asinhStretch(raw[i], min, max, 8.0);
        const idx = Math.min(255, Math.floor(stretched * 255));
        const p = i * 4;
        imgData.data[p] = lut.r[idx];
        imgData.data[p + 1] = lut.g[idx];
        imgData.data[p + 2] = lut.b[idx];
        imgData.data[p + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      dataUrl = canvas.toDataURL('image/png');
    }
  }

  return { rawPixels: raw, dataUrl };
}
