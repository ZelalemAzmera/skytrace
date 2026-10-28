import assert from 'assert';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function icrsToUnitVector(raDeg, decDeg, radius = 100) {
  const raRad = raDeg * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  return {
    x: radius * Math.cos(decRad) * Math.cos(raRad),
    y: radius * Math.sin(decRad),
    z: radius * Math.cos(decRad) * Math.sin(raRad)
  };
}

function vectorToIcrs(vec) {
  const r = Math.hypot(vec.x, vec.y, vec.z);
  if (r === 0) return { ra: 0, dec: 0 };
  const decRad = Math.asin(Math.max(-1, Math.min(1, vec.y / r)));
  let raRad = Math.atan2(vec.z, vec.x);
  if (raRad < 0) raRad += 2 * Math.PI;
  return {
    ra: raRad * RAD2DEG,
    dec: decRad * RAD2DEG,
  };
}

function equatorialToGalactic(raDeg, decDeg) {
  const alphaG = 192.85948 * DEG2RAD;
  const deltaG = 27.12825 * DEG2RAD;
  const l0 = 122.93192 * DEG2RAD; // Galactic longitude of NCP

  const alpha = raDeg * DEG2RAD;
  const delta = decDeg * DEG2RAD;

  const sinB = Math.sin(delta) * Math.sin(deltaG) + Math.cos(delta) * Math.cos(deltaG) * Math.cos(alpha - alphaG);
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));

  const y = Math.cos(delta) * Math.sin(alpha - alphaG);
  const x = Math.sin(delta) * Math.cos(deltaG) - Math.cos(delta) * Math.sin(deltaG) * Math.cos(alpha - alphaG);

  let l = l0 - Math.atan2(y, x);
  while (l < 0) l += 2 * Math.PI;
  while (l >= 2 * Math.PI) l -= 2 * Math.PI;

  return { l: l * RAD2DEG, b: b * RAD2DEG };
}

function equatorialToEcliptic(raDeg, decDeg) {
  const eps = 23.4392911 * DEG2RAD;
  const alpha = raDeg * DEG2RAD;
  const delta = decDeg * DEG2RAD;

  const sinBeta = Math.sin(delta) * Math.cos(eps) - Math.cos(delta) * Math.sin(eps) * Math.sin(alpha);
  const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));

  const y = Math.sin(delta) * Math.sin(eps) + Math.cos(delta) * Math.cos(eps) * Math.sin(alpha);
  const x = Math.cos(delta) * Math.cos(alpha);

  let lambda = Math.atan2(y, x);
  if (lambda < 0) lambda += 2 * Math.PI;

  return { lambda: lambda * RAD2DEG, beta: beta * RAD2DEG };
}

function getSPHERExWavelength(bandIndex) {
  const clamped = Math.max(1, Math.min(102, Math.round(bandIndex)));
  return 0.75 * Math.pow(5.0 / 0.75, (clamped - 1) / 101);
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

console.log('--- Testing Phase 2 Astronomical Engine ---');

// Test 1: ICRS -> 3D Vector -> ICRS Roundtrip
const testPoints = [
  { ra: 0, dec: 0 },
  { ra: 83.8221, dec: -5.3911 },  // Orion
  { ra: 266.4168, dec: -29.0078 }, // Galactic Center
  { ra: 56.75, dec: 24.1167 },   // Pleiades
  { ra: 37.955, dec: 89.264 },   // Polaris
];

for (const pt of testPoints) {
  const v = icrsToUnitVector(pt.ra, pt.dec, 100);
  const back = vectorToIcrs(v);
  assert(Math.abs(back.ra - pt.ra) < 1e-4, `RA mismatch: ${back.ra} vs ${pt.ra}`);
  assert(Math.abs(back.dec - pt.dec) < 1e-4, `Dec mismatch: ${back.dec} vs ${pt.dec}`);
}
console.log('✓ Test 1: ICRS 3D Vector round-trip passed for 5 celestial landmarks');

// Test 2: Galactic Coordinates of Sgr A*
const gc = equatorialToGalactic(266.4168, -29.0078);
console.log(`Galactic Center (l, b): l=${gc.l.toFixed(3)}°, b=${gc.b.toFixed(3)}°`);
assert(Math.abs(gc.l) < 1.0 || Math.abs(gc.l - 360) < 1.0, 'Sgr A* should be at l ≈ 0°');
assert(Math.abs(gc.b) < 1.0, 'Sgr A* should be at b ≈ 0°');
console.log('✓ Test 2: Galactic coordinate transformation verified');

// Test 3: SPHEREx 102 spectroscopic bands
const b1 = getSPHERExWavelength(1);
const b102 = getSPHERExWavelength(102);
assert(Math.abs(b1 - 0.75) < 1e-5, `Band 1 must be 0.75 um, got ${b1}`);
assert(Math.abs(b102 - 5.00) < 1e-5, `Band 102 must be 5.00 um, got ${b102}`);
console.log(`✓ Test 3: SPHEREx 102-band formula verified (Band 1: ${b1.toFixed(3)} µm -> Band 102: ${b102.toFixed(3)} µm)`);

// Test 4: Kepler equation solver
for (let e = 0.01; e < 0.9; e += 0.1) {
  const M = 1.25;
  const E = solveKepler(M, e);
  const checkM = E - e * Math.sin(E);
  assert(Math.abs(checkM - M) < 1e-7, `Kepler residual too high: ${checkM - M}`);
}
console.log('✓ Test 4: Kepler equation solver verified across eccentricities 0.01 to 0.81');

console.log('All Phase 2 Astrometry & Physics tests PASSED successfully!');
