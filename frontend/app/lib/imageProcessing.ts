/**
 * SkyTrace — Astronomical Image Processing & Colormap Engine
 * Provides WiseView and Aladin Lite grade non-linear stretches, colormaps,
 * and difference imaging for multi-epoch SPHEREx infrared image cutouts.
 */

export type StretchMode = 'asinh' | 'log' | 'linear';
export type ColormapMode = 'inverted_bw' | 'grayscale' | 'viridis' | 'inferno' | 'cool_warm';

/**
 * Applies the Lupton et al. (2004) Asinh non-linear stretch.
 * Preserves color balance and faint background structures while compressing bright stellar cores.
 * I_out = asinh(Q * (I - min) / (max - min)) / asinh(Q)
 */
export function asinhStretch(val: number, minVal: number, maxVal: number, Q: number = 8.0): number {
  if (maxVal <= minVal) return 0;
  const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
  return Math.asinh(Q * norm) / Math.asinh(Q);
}

/**
 * Applies logarithmic stretch.
 * I_out = log(1 + a * norm) / log(1 + a)
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
    // Cubic polynomial approximations for Viridis
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
// Negative values (dimmer in B) -> Blue, Zero -> Neutral Slate Gray, Positive values (brighter in B) -> Bright Amber/Red
const LUT_COOL_WARM: ColormapLUT = (() => {
  const lut = createLUT();
  for (let i = 0; i < 256; i++) {
    const t = i / 255.0; // 0.0 = max negative, 0.5 = zero diff, 1.0 = max positive
    if (t < 0.5) {
      const s = 1.0 - t * 2.0; // 1.0 at 0, 0.0 at 0.5
      lut.r[i] = Math.round(30 + (1.0 - s) * 70);
      lut.g[i] = Math.round(90 + (1.0 - s) * 30);
      lut.b[i] = Math.round(180 + s * 75);
    } else {
      const s = (t - 0.5) * 2.0; // 0.0 at 0.5, 1.0 at 1.0
      lut.r[i] = Math.round(100 + s * 155);
      lut.g[i] = Math.round(120 - s * 70);
      lut.b[i] = Math.round(120 - s * 90);
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
 * Synthesizes a high-fidelity 128x128 SPHEREx infrared calibrated test cutout
 * for any given benchmark target or arbitrary sky region.
 * Employs physical PSF convolution, Gaussian detector noise, static background stars,
 * and precise epoch-specific proper motion and photometric flux changes.
 */
export function generateSyntheticCutout(
  targetId: string,
  epoch: 1 | 2,
  size: number = 128
): { rawPixels: Float32Array; dataUrl: string } {
  const raw = new Float32Array(size * size);
  const cx = size / 2;
  const cy = size / 2;

  // 1. Realistic Infrared Background & Poisson/Gaussian Noise
  // Fixed deterministic seed based on target name for stable repeatable reproduction
  let seed = 1337;
  for (let i = 0; i < targetId.length; i++) seed = (seed * 31 + targetId.charCodeAt(i)) >>> 0;
  if (epoch === 2) seed = (seed * 17 + 42) >>> 0;

  function pseudoRandom(): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296.0;
  }

  const bgLevel = 18.0;
  for (let i = 0; i < raw.length; i++) {
    // Box-Muller Gaussian noise
    const u1 = Math.max(1e-6, pseudoRandom());
    const u2 = pseudoRandom();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    raw[i] = Math.max(0, bgLevel + z * 2.8);
  }

  // 2. Fixed Stationary Background Stars / Galaxies (same in both Epoch 1 and Epoch 2)
  // These demonstrate that the background stays completely locked in place!
  const staticObjects = [
    { x: cx - 34, y: cy - 28, flux: 180.0, sigma: 1.2 },
    { x: cx + 42, y: cy - 38, flux: 240.0, sigma: 1.4 },
    { x: cx - 45, y: cy + 36, flux: 140.0, sigma: 1.1 },
    { x: cx + 38, y: cy + 42, flux: 320.0, sigma: 1.5 },
    { x: cx - 18, y: cy + 50, flux: 95.0, sigma: 1.0 },
    { x: cx + 52, y: cy - 12, flux: 110.0, sigma: 1.1 },
    { x: cx - 48, y: cy - 48, flux: 75.0, sigma: 0.9 },
  ];

  for (const obj of staticObjects) {
    addPSF(raw, size, obj.x, obj.y, obj.flux, obj.sigma);
  }

  // 3. Target Source Behavior based on targetId and epoch
  if (targetId === 'barnard') {
    // Barnard's Star: Rapid proper motion. Hops along dx = -0.82 px, dy = +0.18 px
    const x = epoch === 1 ? cx - 0.41 : cx + 0.41;
    const y = epoch === 1 ? cy + 0.09 : cy - 0.09;
    addPSF(raw, size, x, y, 420.0, 1.35);
  } else if (targetId === 'wise0855') {
    // WISE 0855: Cold sub-brown dwarf. Visible as a faint dot hopping dx = +0.95 px, dy = -0.65 px
    const x = epoch === 1 ? cx - 0.48 : cx + 0.47;
    const y = epoch === 1 ? cy + 0.33 : cy - 0.32;
    addPSF(raw, size, x, y, 160.0, 1.25);
  } else if (targetId === 'eps_indi_b') {
    // Epsilon Indi B: Binary brown dwarf pair hopping dx = +0.58 px, dy = -0.30 px
    const x = epoch === 1 ? cx - 0.29 : cx + 0.29;
    const y = epoch === 1 ? cy + 0.15 : cy - 0.15;
    addPSF(raw, size, x, y, 290.0, 1.3);
  } else if (targetId === 'rw_aur') {
    // RW Aurigae: Zero spatial motion, but deep dust eclipse between epochs!
    // Epoch 1 = Full Brightness (450), Epoch 2 = Deep Obscuration (100)
    const flux = epoch === 1 ? 460.0 : 105.0;
    addPSF(raw, size, cx, cy, flux, 1.4);
  } else if (targetId === 'r_dra_mira') {
    // R Draconis: Mira variable pulsation. Zero spatial motion, massive periodic brightness swing!
    // Epoch 1 = Minimum (80), Epoch 2 = Maximum (520)
    const flux = epoch === 1 ? 75.0 : 510.0;
    addPSF(raw, size, cx, cy, flux, 1.45);
  } else if (targetId === 'planet_x_alpha') {
    // Planet X Corridor: Faint candidate drifting very slowly (0.12 px) with subtle CH4 absorption
    const x = epoch === 1 ? cx - 0.06 : cx + 0.06;
    const y = epoch === 1 ? cy + 0.03 : cy - 0.02;
    addPSF(raw, size, x, y, 130.0, 1.15);
  } else {
    // Generic coordinate region with a moving test candidate
    const x = epoch === 1 ? cx - 0.5 : cx + 0.5;
    const y = epoch === 1 ? cy - 0.3 : cy + 0.3;
    addPSF(raw, size, x, y, 220.0, 1.3);
  }

  // 4. Render to an HTML Canvas and export Base64 Data URL
  // Uses Inverted B&W stretch for clean astronomical default
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

function addPSF(
  raw: Float32Array,
  size: number,
  px: number,
  py: number,
  peakFlux: number,
  sigma: number
): void {
  const rad = Math.ceil(sigma * 3.5);
  const minX = Math.max(0, Math.floor(px - rad));
  const maxX = Math.min(size - 1, Math.ceil(px + rad));
  const minY = Math.max(0, Math.floor(py - rad));
  const maxY = Math.min(size - 1, Math.ceil(py + rad));

  const twoSigma2 = 2.0 * sigma * sigma;

  for (let y = minY; y <= maxY; y++) {
    const dy2 = (y - py) * (y - py);
    for (let x = minX; x <= maxX; x++) {
      const dx2 = (x - px) * (x - px);
      const dist2 = dx2 + dy2;
      const flux = peakFlux * Math.exp(-dist2 / twoSigma2);
      raw[y * size + x] += flux;
    }
  }
}
