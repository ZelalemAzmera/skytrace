/**
 * SkyTrace — Phase 10 Benchmark Math & Coordinate Test Suite
 * Tests astronomical coordinate parsing, benchmark target attributes,
 * Lupton Asinh stretch functions, and difference image calculations.
 */

import assert from 'assert';
import {
  BENCHMARK_TARGETS,
  findBenchmarkTarget,
  parseAstronomicalCoordinates,
  degreesToRaSexagesimal,
  degreesToDecSexagesimal,
} from './app/lib/benchmarkTargets.ts';

import {
  asinhStretch,
  logStretch,
  linearStretch,
  getColormapLUT,
  computeDifferencePixels,
} from './app/lib/imageProcessing.ts';

console.log('--- Starting SkyTrace Phase 10 Benchmark Math Verification ---');

// Test 1: Verify all 5 official challenge benchmark targets + Planet X corridor exist
console.log('Test 1: Validating official NASA Challenge Benchmark Targets...');
assert.strictEqual(BENCHMARK_TARGETS.length >= 6, true, 'Must have at least 6 benchmark targets');

const requiredIds = ['barnard', 'wise0855', 'eps_indi_b', 'rw_aur', 'r_dra_mira', 'planet_x_alpha'];
for (const id of requiredIds) {
  const target = findBenchmarkTarget(id);
  assert.ok(target, `Target ${id} must exist in catalog`);
  assert.ok(target.ra >= 0 && target.ra <= 360, `Target ${id} RA must be in [0, 360]`);
  assert.ok(target.dec >= -90 && target.dec <= 90, `Target ${id} Dec must be in [-90, 90]`);
  assert.ok(target.suggestedBand >= 1 && target.suggestedBand <= 102, `Target ${id} band must be in 1..102`);
  assert.ok(target.diagnosticWindow.length > 0, `Target ${id} must have a diagnostic window`);
}
console.log('✓ All 6 benchmark targets verified with valid astrophysical parameters.');

// Test 2: Decimal Degree Coordinate Parsing
console.log('Test 2: Testing Decimal Degree Coordinate Parsing...');
const coord1 = parseAstronomicalCoordinates('133.795, -7.245');
assert.ok(coord1, 'Must parse comma-separated decimal coords');
assert.strictEqual(Math.abs(coord1.ra - 133.795) < 0.001, true);
assert.strictEqual(Math.abs(coord1.dec - (-7.245)) < 0.001, true);

const coord2 = parseAstronomicalCoordinates('269.452 4.693');
assert.ok(coord2, 'Must parse space-separated decimal coords');
assert.strictEqual(Math.abs(coord2.ra - 269.452) < 0.001, true);
assert.strictEqual(Math.abs(coord2.dec - 4.693) < 0.001, true);
console.log('✓ Decimal coordinate parsing passed.');

// Test 3: Sexagesimal Coordinate Parsing (WiseView / Aladin style)
console.log('Test 3: Testing Sexagesimal Coordinate Parsing (HH:MM:SS, ±DD:MM:SS)...');
const coordSex = parseAstronomicalCoordinates('08h55m10.8s -07d14m42.5s');
assert.ok(coordSex, 'Must parse sexagesimal coordinates with h/m/s and d/m/s tags');
// 08h 55m 10.8s = (8 + 55/60 + 10.8/3600) * 15 = 133.795 deg
assert.strictEqual(Math.abs(coordSex.ra - 133.795) < 0.01, true);
// -07d 14m 42.5s = -(7 + 14/60 + 42.5/3600) = -7.245 deg
assert.strictEqual(Math.abs(coordSex.dec - (-7.245)) < 0.01, true);

// Sexagesimal formatting round-trip
const raStr = degreesToRaSexagesimal(133.795);
const decStr = degreesToDecSexagesimal(-7.245);
assert.strictEqual(raStr.includes('08h'), true, 'RA sexagesimal must contain 08h');
assert.strictEqual(decStr.includes('-07°'), true, 'Dec sexagesimal must contain -07°');
console.log('✓ Sexagesimal coordinate conversion & parsing passed.');

// Test 4: Lupton Asinh Non-Linear Stretch & Colormaps
console.log('Test 4: Testing Asinh Stretch & Colormap LUTs...');
const sMin = asinhStretch(10, 10, 100, 8.0);
const sMid = asinhStretch(55, 10, 100, 8.0);
const sMax = asinhStretch(100, 10, 100, 8.0);
assert.strictEqual(sMin, 0.0, 'Min value must stretch to 0.0');
assert.strictEqual(sMax, 1.0, 'Max value must stretch to 1.0');
assert.strictEqual(sMid > 0.5, true, 'Asinh must boost faint/mid tones higher than linear (sMid > 0.5)');

// Colormap LUT length and boundaries
const lutInverted = getColormapLUT('inverted_bw');
assert.strictEqual(lutInverted.r.length, 256, 'LUT must have 256 entries');
assert.strictEqual(lutInverted.r[0], 255, 'Inverted B&W at index 0 must be white 255');
assert.strictEqual(lutInverted.r[255], 0, 'Inverted B&W at index 255 must be black 0');

const lutViridis = getColormapLUT('viridis');
assert.strictEqual(lutViridis.r.length, 256);

const lutCoolWarm = getColormapLUT('cool_warm');
assert.strictEqual(lutCoolWarm.r.length, 256);
console.log('✓ Asinh non-linear stretch and colormap LUTs passed.');

// Test 5: Difference Image Calculation (IB - IA)
console.log('Test 5: Testing Difference Image Subtraction...');
const pixA = new Float32Array([10, 20, 50, 80]);
const pixB = new Float32Array([10, 20, 50, 80]); // Identical stationary stars
const diffZero = computeDifferencePixels(pixA, pixB);
for (let i = 0; i < diffZero.length; i++) {
  assert.strictEqual(diffZero[i], 128, 'Zero difference must map exactly to neutral gray 128');
}

const pixB_hopped = new Float32Array([10, 5, 50, 120]); // Hopped star
const diffHopped = computeDifferencePixels(pixA, pixB_hopped);
assert.strictEqual(diffHopped[1] < 128, true, 'Negative flux delta must be < 128');
assert.strictEqual(diffHopped[3] > 128, true, 'Positive flux delta must be > 128');
console.log('✓ Difference image dipole calculation passed.');

console.log('---------------------------------------------------------------');
console.log('ALL PHASE 10 BENCHMARK MATH & IMAGE PROCESSING TESTS PASSED! 🚀');
console.log('---------------------------------------------------------------');
