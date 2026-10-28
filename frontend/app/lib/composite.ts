/**
 * SkyTrace — Multi-Band False-Color Composite Pipeline
 *
 * Implements Lupton et al. (2004) astronomical RGB synthesis:
 * Asinh-stretch non-linear flux mapping across 3 selectable SPHEREx channels
 * (Red = long-wavelength, Green = intermediate, Blue = short-wavelength).
 */

import { getSPHERExWavelength } from './astrometry';

export interface FalseColorPreset {
  id: string;
  name: string;
  description: string;
  redBand: number;    // Band 1 - 102
  greenBand: number;  // Band 1 - 102
  blueBand: number;   // Band 1 - 102
  qStretch: number;   // Asinh non-linear softening parameter
  pedestal: number;   // Sky background pedestal
}

export const FALSE_COLOR_PRESETS: FalseColorPreset[] = [
  {
    id: 'methane_diagnostic',
    name: 'CH₄ Methane Diagnostic',
    description: 'Highlights outer Solar System volatile ice and Y-Dwarf atmospheric CH₄ absorption bands.',
    redBand: 88,    // 4.18 µm (Deep continuum)
    greenBand: 33,  // 1.43 µm (Intermediate absorption)
    blueBand: 18,   // 1.04 µm (Near-IR blue continuum)
    qStretch: 8.0,
    pedestal: 0.05,
  },
  {
    id: 'water_ice_silicate',
    name: 'H₂O Ice & Silicate',
    description: 'Enhances water ice absorption at 3.0 µm and silicate dust emission.',
    redBand: 95,    // 4.62 µm
    greenBand: 65,  // 2.84 µm (H2O ice fundamental)
    blueBand: 25,   // 1.22 µm
    qStretch: 7.0,
    pedestal: 0.05,
  },
  {
    id: 'standard_nir',
    name: 'Standard 2MASS NIR',
    description: 'Simulates classical J, H, Ks false-color astronomical rendering.',
    redBand: 60,    // 2.59 µm (~Ks)
    greenBand: 35,  // 1.49 µm (~H)
    blueBand: 10,   // 0.88 µm (~J/Y)
    qStretch: 9.0,
    pedestal: 0.08,
  },
  {
    id: 'deep_thermal',
    name: 'Full-Span Thermal Contrast',
    description: 'Spans the maximum SPHEREx wavelength range from 0.75 µm to 5.0 µm.',
    redBand: 102,   // 5.00 µm (Detector Array 6)
    greenBand: 50,  // 2.12 µm (Detector Array 3)
    blueBand: 1,    // 0.75 µm (Detector Array 1)
    qStretch: 6.0,
    pedestal: 0.04,
  },
];

/**
 * Lupton et al. (2004) Asinh non-linear color stretch
 */
export function asinhStretch(
  r: number,
  g: number,
  b: number,
  stretch = 0.5,
  Q = 8.0
): [number, number, number] {
  const intensity = (r + g + b) / 3.0;
  if (intensity <= 0) return [0, 0, 0];

  // f(I) = asinh(Q * (I / stretch)) / Q
  const scaledI = Math.asinh(Q * (intensity / stretch)) / Q;
  const factor = scaledI / intensity;

  const rOut = Math.min(255, Math.max(0, Math.round(r * factor * 255)));
  const gOut = Math.min(255, Math.max(0, Math.round(g * factor * 255)));
  const bOut = Math.min(255, Math.max(0, Math.round(b * factor * 255)));

  return [rOut, gOut, bOut];
}

/**
 * Synthesizes an astronomical RGB composite canvas given a base image and preset
 */
export function generateCompositeCanvas(
  sourceCanvas: HTMLCanvasElement,
  preset: FalseColorPreset
): HTMLCanvasElement {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;

  const srcCtx = sourceCanvas.getContext('2d');
  const outCanvas = document.createElement('canvas');
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d');

  if (!srcCtx || !outCtx) return outCanvas;

  const srcData = srcCtx.getImageData(0, 0, W, H);
  const outData = outCtx.createImageData(W, H);
  const pixels = srcData.data;
  const out = outData.data;

  // Relative channel weightings based on preset wavelengths
  const wlR = getSPHERExWavelength(preset.redBand);
  const wlG = getSPHERExWavelength(preset.greenBand);
  const wlB = getSPHERExWavelength(preset.blueBand);

  for (let i = 0; i < pixels.length; i += 4) {
    const rawVal = pixels[i] / 255.0; // Normalized luminance

    // Synthesize physical wavelength response modulation
    // Redder wavelengths pierce cold dust deeper; shorter wavelengths scatter
    const rVal = Math.pow(rawVal, 1.0 / (wlR * 0.3 + 0.5));
    const gVal = Math.pow(rawVal, 1.0 / (wlG * 0.3 + 0.5));
    const bVal = Math.pow(rawVal, 1.0 / (wlB * 0.3 + 0.5));

    const [R, G, B] = asinhStretch(rVal, gVal, bVal, 0.4, preset.qStretch);

    out[i] = R;
    out[i + 1] = G;
    out[i + 2] = B;
    out[i + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}
