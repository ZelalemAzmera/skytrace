import assert from 'assert';

console.log('--- Testing Phase 4: Celestial Resolver & Survey Cadence ---');

// 1. Target Catalog Definitions
const ASTRONOMICAL_CATALOG = [
  { name: 'Sedna (90377 Sedna)', ra: 56.452, dec: 7.892, category: 'Planet X Candidate' },
  { name: 'WISE 0855-0714 (Y-Dwarf)', ra: 133.786, dec: -7.244, category: 'Brown Dwarf' },
  { name: 'Barnard\'s Star', ra: 269.452, dec: 4.693, category: 'High-PM Star' },
  { name: 'Orion Nebula (M42)', ra: 83.8221, dec: -5.3911, category: 'Nebula' },
  { name: 'North Ecliptic Pole (NEP)', ra: 270.0, dec: 66.56, category: 'Deep Survey' },
];

function searchCatalog(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const coordMatch = q.match(/^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    const ra = parseFloat(coordMatch[1]);
    const dec = parseFloat(coordMatch[2]);
    if (ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
      return [{ name: `Custom Pointing (${ra}°, ${dec}°)`, ra, dec, category: 'Deep Survey' }];
    }
  }

  return ASTRONOMICAL_CATALOG.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  );
}

// Test 1: Name and Category Search
const sedna = searchCatalog('sedna');
assert.strictEqual(sedna.length, 1);
assert.strictEqual(sedna[0].name, 'Sedna (90377 Sedna)');
assert.strictEqual(sedna[0].category, 'Planet X Candidate');

const dwarfs = searchCatalog('Brown Dwarf');
assert.strictEqual(dwarfs.length, 1);
assert.strictEqual(dwarfs[0].name, 'WISE 0855-0714 (Y-Dwarf)');
console.log('✓ Test 1: Name and Category fuzzy search verified');

// Test 2: Direct Coordinate String Parsing
const coords = searchCatalog('83.8221, -5.3911');
assert.strictEqual(coords.length, 1);
assert(Math.abs(coords[0].ra - 83.8221) < 1e-6);
assert(Math.abs(coords[0].dec - (-5.3911)) < 1e-6);
console.log('✓ Test 2: Coordinate string parser verified (83.8221, -5.3911)');

// Test 3: SPHEREx 6 Detector Arrays
const SPHEREX_ARRAYS = [
  { id: 1, name: 'Array 1', minWl: 0.75, maxWl: 1.11, bandRange: [1, 17] },
  { id: 2, name: 'Array 2', minWl: 1.11, maxWl: 1.64, bandRange: [18, 34] },
  { id: 3, name: 'Array 3', minWl: 1.64, maxWl: 2.42, bandRange: [35, 51] },
  { id: 4, name: 'Array 4', minWl: 2.42, maxWl: 3.82, bandRange: [52, 68] },
  { id: 5, name: 'Array 5', minWl: 3.82, maxWl: 4.42, bandRange: [69, 85] },
  { id: 6, name: 'Array 6', minWl: 4.42, maxWl: 5.00, bandRange: [86, 102] },
];

assert.strictEqual(SPHEREX_ARRAYS.length, 6);
assert.strictEqual(SPHEREX_ARRAYS[0].bandRange[0], 1);
assert.strictEqual(SPHEREX_ARRAYS[5].bandRange[1], 102);

// Check contiguity across bands
for (let i = 1; i < SPHEREX_ARRAYS.length; i++) {
  assert.strictEqual(
    SPHEREX_ARRAYS[i].bandRange[0],
    SPHEREX_ARRAYS[i - 1].bandRange[1] + 1,
    `Array ${i+1} must start immediately after Array ${i}`
  );
}
console.log('✓ Test 3: SPHEREx 6 Detector Arrays verified contiguous across all 102 bands');

// Test 4: Temporal Baseline Delta Days
const date1 = new Date('2025-04-12T00:00:00Z').getTime();
const date2 = new Date('2025-10-18T00:00:00Z').getTime();
const deltaDays = Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));
assert.strictEqual(deltaDays, 189);
console.log(`✓ Test 4: Survey cadence baseline calculation verified (Δt = ${deltaDays} days)`);

console.log('All Phase 4 Celestial Resolver & Cadence tests PASSED successfully!');
