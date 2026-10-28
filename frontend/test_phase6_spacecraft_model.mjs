import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Phase 6: Spacecraft 3D Model & Dual View Mode Verification ---');

const MODEL_DIR = path.resolve(__dirname, 'public/models/spitzer');
const REQUIRED_FILES = [
  'SPITZER.gltf',
  'spitzer.bin',
  'spitzer_albedo.jpg',
  'spitzer_normal.png',
  'spitzer_pbr.jpg',
  'foil_normal.png',
];

console.log('\n1. Verifying Model Assets in', MODEL_DIR);
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

console.log('\n2. Verifying GLTF Structure and Buffers');
const gltfContent = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'SPITZER.gltf'), 'utf-8'));
if (!gltfContent.asset || gltfContent.asset.version !== '2.0') {
  console.error('❌ Invalid GLTF asset version');
  process.exit(1);
}
console.log('✅ GLTF Version: 2.0 validated');
console.log(`✅ Meshes detected: ${gltfContent.meshes.length}`);
console.log(`✅ Materials detected: ${gltfContent.materials.length}`);
console.log(`✅ Images detected: ${gltfContent.images.length}`);

console.log('\n3. Verifying CelestialSphere and Store Integration');
const sphereCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/CelestialSphere.tsx'), 'utf-8');
const storeCode = fs.readFileSync(path.resolve(__dirname, 'app/store/skyStore.ts'), 'utf-8');
const toggleCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/ControlToggles.tsx'), 'utf-8');
const hudCode = fs.readFileSync(path.resolve(__dirname, 'app/components/sky/SkyHUD.tsx'), 'utf-8');

const checks = [
  { name: 'GLTFLoader imported in CelestialSphere', test: sphereCode.includes('GLTFLoader') },
  { name: 'SPITZER.gltf URL referenced', test: sphereCode.includes('/models/spitzer/SPITZER.gltf') },
  { name: 'Spacecraft slew quaternion logic present', test: sphereCode.includes('spacecraftGroup.quaternion.slerp') },
  { name: 'Boresight ray mesh added', test: sphereCode.includes('boresightRay') },
  { name: 'Sun exclusion cone added', test: sphereCode.includes('sunExclusionCone') },
  { name: 'viewMode added to skyStore', test: storeCode.includes("viewMode: 'sky' | 'spacecraft'") },
  { name: 'Observation Mode switcher in ControlToggles', test: toggleCode.includes('Observation Mode') },
  { name: 'Spacecraft Telemetry Card in SkyHUD', test: hudCode.includes('Spitzer Spacecraft CTA') },
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
  console.log('\n🎉 ALL PHASE 6 TESTS PASSED: NASA Spitzer 3D Model & Dual View Modes Verified!\n');
} else {
  process.exit(1);
}
