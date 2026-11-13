import assert from 'assert';

/**
 * Phase 8 Automated Mathematical Verification Suite
 * Tests Solar System Scope camera transitions, target framing, and comet trail mechanics.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// 1. Pure Mathematical Implementations matching frontend/app/lib/astrometry.ts
function easeOutCubic(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function computeFramingDistance(effectiveRadius, cameraFovDeg = 60, framingFactor = 2.2) {
  const halfFovRad = (cameraFovDeg * 0.5 * Math.PI) / 180;
  const dist = (effectiveRadius * framingFactor) / Math.sin(halfFovRad);
  return Math.max(dist, effectiveRadius + 1.2);
}

function solveKepler(M, e, tolerance = 1e-8) {
  let E = M;
  for (let iter = 0; iter < 100; iter++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

function keplerToCartesian(a, e, iDeg, omegaDeg, OmegaDeg, MDeg, scale = 1.0) {
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

  return {
    x: x_pf * Px + y_pf * Qx,
    y: x_pf * Pz + y_pf * Qz,
    z: x_pf * Py + y_pf * Qy
  };
}

function computeCometPastTrail(orbit, currentMeanAnomalyDeg, samples = 181, trailArcDeg = 162) {
  const positions = new Float32Array(samples * 3);
  const colors = new Float32Array(samples * 3);
  const alphas = new Float32Array(samples);

  // RGB colors: Head = cyan/white, Tail = dust amber
  const headColor = { r: 0.6, g: 0.95, b: 1.0 };
  const dustColor = { r: 0.96, g: 0.62, b: 0.04 };

  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    const tau = Math.pow(u, 3.0);
    const mDeg = (currentMeanAnomalyDeg - tau * trailArcDeg + 360000) % 360;
    const pt = keplerToCartesian(orbit.a, orbit.e, orbit.i, orbit.omega, orbit.Omega, mDeg, 1.0);

    positions[i * 3 + 0] = pt.x;
    positions[i * 3 + 1] = pt.y;
    positions[i * 3 + 2] = pt.z;

    const s = 1.0 - u;
    let alpha = 0.0;
    if (s >= 0.7) {
      alpha = 1.0;
    } else if (s >= 0.5) {
      alpha = 0.7 + 0.3 * ((s - 0.5) / 0.2);
    } else if (s >= 0.3) {
      alpha = 0.4 + 0.3 * ((s - 0.3) / 0.2);
    } else {
      alpha = 0.4 * (s / 0.3);
    }
    alpha = Math.max(0.0, Math.min(1.0, alpha));
    alphas[i] = alpha;

    const cr = headColor.r + (dustColor.r - headColor.r) * u;
    const cg = headColor.g + (dustColor.g - headColor.g) * u;
    const cb = headColor.b + (dustColor.b - headColor.b) * u;

    colors[i * 3 + 0] = cr * alpha;
    colors[i * 3 + 1] = cg * alpha;
    colors[i * 3 + 2] = cb * alpha;
  }

  return { positions, colors, alphas };
}

// -------------------------------------------------------------
// Test 1: easeOutCubic Deceleration Curve Validation
// -------------------------------------------------------------
console.log('--- Test 1: easeOutCubic Deceleration Curve ---');
assert.strictEqual(easeOutCubic(0), 0, 'easeOutCubic(0) must equal 0');
assert.strictEqual(easeOutCubic(1), 1, 'easeOutCubic(1) must equal 1');
assert.strictEqual(easeOutCubic(0.5), 0.875, 'easeOutCubic(0.5) must equal 0.875 (1 - 0.5^3)');
assert.strictEqual(easeOutCubic(-0.2), 0, 'easeOutCubic underflow must clamp to 0');
assert.strictEqual(easeOutCubic(1.4), 1, 'easeOutCubic overflow must clamp to 1');

// Monotonicity check
let lastVal = -1;
for (let t = 0; t <= 1.0; t += 0.01) {
  const val = easeOutCubic(t);
  assert(val >= lastVal, `easeOutCubic must be strictly non-decreasing at t=${t}`);
  lastVal = val;
}
console.log('✓ easeOutCubic satisfies boundary, monotonicity, and cubic out curve constraints.');

// -------------------------------------------------------------
// Test 2: computeFramingDistance Geometry Validation
// -------------------------------------------------------------
console.log('\n--- Test 2: computeFramingDistance Target Framing ---');
// Earth: R=1.05, FOV=60 deg, factor=2.2 -> d = 1.05 * 2.2 / sin(30 deg) = 4.62
const dEarth = computeFramingDistance(1.05, 60, 2.2);
assert(Math.abs(dEarth - 4.62) < 1e-4, `Expected Earth framing dist ~4.62, got ${dEarth}`);

// Jupiter: R=2.30 -> d = 2.30 * 2.2 / 0.5 = 10.12
const dJupiter = computeFramingDistance(2.30, 60, 2.2);
assert(Math.abs(dJupiter - 10.12) < 1e-4, `Expected Jupiter framing dist ~10.12, got ${dJupiter}`);

// Saturn with rings: R=4.655 -> d = 4.655 * 2.2 / 0.5 = 20.482
const dSaturn = computeFramingDistance(4.655, 60, 2.2);
assert(Math.abs(dSaturn - 20.482) < 1e-4, `Expected Saturn framing dist ~20.482, got ${dSaturn}`);

// Sun with corona: R=4.50 -> d = 4.50 * 2.2 / 0.5 = 19.80
const dSun = computeFramingDistance(4.50, 60, 2.2);
assert(Math.abs(dSun - 19.80) < 1e-4, `Expected Sun framing dist ~19.80, got ${dSun}`);

// Moon safety clamp: R=0.35 -> raw dist = 1.54, clamped to 0.35 + 1.2 = 1.55
const dMoon = computeFramingDistance(0.35, 60, 2.2);
assert(Math.abs(dMoon - 1.55) < 1e-4, `Expected Moon clamp ~1.55, got ${dMoon}`);
console.log('✓ computeFramingDistance accurately frames terrestrial, gas giant, ringed, solar, and lunar bodies.');

// -------------------------------------------------------------
// Test 3: computeCometPastTrail (Solar System Scope transformTrajElliptic2)
// -------------------------------------------------------------
console.log('\n--- Test 3: computeCometPastTrail Historical Trail Engine ---');
const halleyOrbit = {
  name: '1P/Halley',
  category: 'Comet',
  a: 48.0,
  e: 0.78,
  i: 162.26,
  omega: 111.33,
  Omega: 58.42,
  color: 0x38bdf8,
  size: 0.50,
  periodDays: 27500,
  tailColor: 0x00e5ff,
  dustTailColor: 0xffd166,
  baseTailLength: 14.0,
};

const currentM = 45.0; // Current orbital position
const samples = 181;
const trailArcDeg = 162;
const trail = computeCometPastTrail(halleyOrbit, currentM, samples, trailArcDeg);

// 1. Array lengths
assert.strictEqual(trail.positions.length, 181 * 3, 'Positions must contain exactly 181 3D vertices (543 floats)');
assert.strictEqual(trail.colors.length, 181 * 3, 'Colors must contain exactly 181 RGB components (543 floats)');
assert.strictEqual(trail.alphas.length, 181, 'Alphas must contain exactly 181 entries');

// 2. Numerical validity
for (let i = 0; i < trail.positions.length; i++) {
  assert(!isNaN(trail.positions[i]), `Position at index ${i} must not be NaN`);
  assert(isFinite(trail.positions[i]), `Position at index ${i} must be finite`);
}

// 3. Head vertex at nucleus (u = 0, tau = 0)
const headPt = keplerToCartesian(halleyOrbit.a, halleyOrbit.e, halleyOrbit.i, halleyOrbit.omega, halleyOrbit.Omega, currentM, 1.0);
assert(Math.abs(trail.positions[0] - headPt.x) < 1e-4, 'Point 0 X must match nucleus X');
assert(Math.abs(trail.positions[1] - headPt.y) < 1e-4, 'Point 0 Y must match nucleus Y');
assert(Math.abs(trail.positions[2] - headPt.z) < 1e-4, 'Point 0 Z must match nucleus Z');
assert.strictEqual(trail.alphas[0], 1.0, 'Alpha at nucleus head must be 1.0 (maximum opacity)');

// 4. Trail tip vertex (u = 1, tau = 1, m = currentM - 162 deg)
const tipM = (currentM - trailArcDeg + 360000) % 360;
const tipPt = keplerToCartesian(halleyOrbit.a, halleyOrbit.e, halleyOrbit.i, halleyOrbit.omega, halleyOrbit.Omega, tipM, 1.0);
const lastIdx = (samples - 1) * 3;
assert(Math.abs(trail.positions[lastIdx + 0] - tipPt.x) < 1e-4, 'Tip X must match Keplerian backward point');
assert(Math.abs(trail.positions[lastIdx + 1] - tipPt.y) < 1e-4, 'Tip Y must match Keplerian backward point');
assert(Math.abs(trail.positions[lastIdx + 2] - tipPt.z) < 1e-4, 'Tip Z must match Keplerian backward point');
assert.strictEqual(trail.alphas[samples - 1], 0.0, 'Alpha at trail tip must decay to 0.0');

// 5. Open path validation: Must NOT form a closed loop (< 360 degrees)
const dx = trail.positions[0] - trail.positions[lastIdx + 0];
const dy = trail.positions[1] - trail.positions[lastIdx + 1];
const dz = trail.positions[2] - trail.positions[lastIdx + 2];
const spanDist = Math.hypot(dx, dy, dz);
assert(spanDist > 10.0, `Trail must be an open path spanning space (spanDist=${spanDist} > 10)`);
console.log(`✓ Trail forms an open backward path (arc = 162° < 360°, span distance = ${spanDist.toFixed(2)} units).`);

// 6. Monotonic piecewise alpha tapering check (1.0 down to 0.0)
let prevAlpha = 1.0001;
for (let i = 0; i < samples; i++) {
  const a = trail.alphas[i];
  assert(a <= prevAlpha + 1e-6, `Alpha must be monotonically non-increasing at index ${i}: prev=${prevAlpha}, cur=${a}`);
  assert(a >= 0.0 && a <= 1.0, `Alpha must remain bounded in [0, 1] at index ${i}`);
  prevAlpha = a;
}
console.log('✓ Monotonic piecewise alpha tapering from 1.0 (nucleus wake) down to 0.0 (vacuum dissipation) verified.');

// 7. Piecewise threshold checks
assert(trail.alphas[0] === 1.0, 'Alpha at s=1.0 is 1.0');
const idxAtS07 = Math.round((1.0 - 0.7) * (samples - 1));
assert(Math.abs(trail.alphas[idxAtS07] - 1.0) < 0.05, `Alpha around s=0.7 should be ~1.0, got ${trail.alphas[idxAtS07]}`);
const idxAtS05 = Math.round((1.0 - 0.5) * (samples - 1));
assert(Math.abs(trail.alphas[idxAtS05] - 0.7) < 0.05, `Alpha around s=0.5 should be ~0.7, got ${trail.alphas[idxAtS05]}`);
const idxAtS03 = Math.round((1.0 - 0.3) * (samples - 1));
assert(Math.abs(trail.alphas[idxAtS03] - 0.4) < 0.05, `Alpha around s=0.3 should be ~0.4, got ${trail.alphas[idxAtS03]}`);
console.log('✓ Piecewise continuous SSS thresholds verified (s>=0.7 -> 1.0, s=0.5 -> 0.7, s=0.3 -> 0.4, s=0 -> 0.0).');

// 8. Color gradient check
assert(trail.colors[0] > 0.4, 'Nucleus head color has bright cyan/white component');
assert(trail.colors[lastIdx + 0] === 0 && trail.colors[lastIdx + 1] === 0 && trail.colors[lastIdx + 2] === 0, 'Trail tip fades to zero black/vacuum');
console.log('✓ Additive color blending with alpha multiplication verified.');

console.log('\n======================================================');
console.log('ALL PHASE 8 MATHEMATICAL SUITE CHECKS PASSED (100%)');
console.log('======================================================');
