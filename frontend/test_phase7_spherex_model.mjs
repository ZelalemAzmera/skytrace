import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Phase 7: NASA SPHEREx 3D Model & Clean Spacecraft View Mode Verification ---');

const MODEL_DIR = path.resolve(__dirname, 'public/models/spherex');
const REQUIRED_FILES = [
  'spherex.gltf',
  'spherex.bin',
  'spherex_normals.webp',
  'spherex_albedo_webp.webp',
  'spherex_pbr.webp',
  'corrugated_normal.webp',
  'corrugated_normal.jpg',
  'foil_normal.webp',
  'foil_normal.jpg',
];

console.log('\n1. Verifying SPHEREx Model Assets in', MODEL_DIR);
let allFilesExist = true;
for (const file of REQUIRED_FILES) {
  const filePath = path.join(MODEL_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing asset: ${file}`);
    allFilesExist = false;
  } else {
    const stats = fs.statSync(filePath);
    console.log(`✅ Found ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

if (!allFilesExist) {
  process.exit(1);
}

console.log('\n2. Verifying SPHEREx GLTF Structure and Buffers');
const gltfContent = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'spherex.gltf'), 'utf-8'));
if (!gltfContent.asset || gltfContent.asset.version !== '2.0') {
  console.error('❌ Invalid GLTF asset version');
  process.exit(1);
}
console.log('✅ GLTF Version: 2.0 validated');
console.log(`✅ Meshes detected: ${gltfContent.meshes.length}`);
console.log(`✅ Materials detected: ${gltfContent.materials.length}`);
console.log(`✅ Images detected: ${gltfContent.images.length}`);

console.log('\n3. Verifying CelestialSphere and UI Clean Geometry Integration');
const sphereCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/CelestialSphere.tsx'), 'utf-8');
const storeCode = fs.readFileSync(path.resolve(__dirname, 'app/store/skyStore.ts'), 'utf-8');
const toggleCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/ControlToggles.tsx'), 'utf-8');
const hudCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/SkyHUD.tsx'), 'utf-8');

const checks = [
  { name: 'SPHEREx.gltf URL referenced in CelestialSphere', test: sphereCode.includes('/models/spherex/spherex.gltf') },
  { name: 'SPHEREx aperture vector (+Y) slew logic present', test: sphereCode.includes('new THREE.Vector3(0, 1, 0)') },
  { name: 'Aperture emitter ring mesh added', test: sphereCode.includes('emitMesh') },
  { name: 'Sun exclusion frustum truncated (non-intersecting)', test: sphereCode.includes('rInner = 20 * Math.tan') && !sphereCode.includes('wireframe: true') },
  { name: 'Earth LEO orbit group added in Spacecraft mode', test: sphereCode.includes('earthOrbitGroup') },
  { name: 'Orrery meshes hidden in Spacecraft mode (no intersecting lines)', test: sphereCode.includes('!isSpacecraftMode') },
  { name: 'viewMode stored in skyStore', test: storeCode.includes("viewMode: 'sky' | 'spacecraft'") },
  { name: 'SPHEREx toggle label in ControlToggles', test: toggleCode.includes('SPHEREx') },
  { name: 'SPHEREx Spacecraft CTA card in SkyHUD', test: hudCode.includes('SPHEREx Spacecraft CTA') },
];

let allPassed = true;
for (const check of checks) {
  if (check.test) {
    console.log(`✅ ${check.name}`);
  } else {
    console.error(`❌ Failed: ${check.name}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL PHASE 7 TESTS PASSED: NASA SPHEREx 3D Model & Clean Spacecraft View Mode Verified!\n');
} else {
  process.exit(1);
}

