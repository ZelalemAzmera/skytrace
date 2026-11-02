import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\zelal\\.gemini\\antigravity\\brain\\a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function run() {
  console.log('🚀 Launching Chromium for Solar System Scope Orrery verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📡 Navigating to http://localhost:3000/explore...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // Wait for Three.js canvas & textures

  // 1. Sky Survey View: Calibrated Solar System Scope Orrery
  console.log('📸 Capturing Full Calibrated Solar System Orrery...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_calibrated_orrery.png') });
  console.log('✅ Captured solarsystemscope_calibrated_orrery.png');

  // 2. Drag / rotate camera slightly to showcase 3D planetary inclination & comet tails
  console.log('🔄 Orbiting camera for dynamic 3D angle of comet tails & asteroid belt...');
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2 - 80, { steps: 20 });
    await page.mouse.up();
  }
  await page.waitForTimeout(2000);

  console.log('📸 Capturing 3D Perspective with Comets & Asteroid Belt...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_asteroid_belt_and_comets.png') });
  console.log('✅ Captured solarsystemscope_asteroid_belt_and_comets.png');

  // 3. Switch to SPHEREx View Mode to verify SPHEREx is 100% intact and unaffected
  console.log('🔭 Switching to SPHEREx Spacecraft View Mode...');
  const spherexBtn = page.locator('button:has-text("SPHEREx")').first();
  await spherexBtn.click();
  await page.waitForTimeout(3000); // Wait for camera lerp & model orientation

  console.log('📸 Capturing SPHEREx Mode (Spacecraft, LEO Earth, 3D Frustum & 3D Image Relief)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'spherex_spacecraft_view_mode_verified.png') });
  console.log('✅ Captured spherex_spacecraft_view_mode_verified.png');

  // 4. Toggle 3D Optical Teardown to verify cutaway still works
  console.log('⚡ Toggling 3D Optical Teardown Mode...');
  const teardownBtn = page.locator('button:has-text("3D Optical Teardown")').first();
  await teardownBtn.click();
  await page.waitForTimeout(2500);

  console.log('📸 Capturing SPHEREx 3D Optical Teardown verification...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'spherex_teardown_verification.png') });
  console.log('✅ Captured spherex_teardown_verification.png');

  await browser.close();
  console.log('🎉 Solar System Scope Orrery verification completed successfully!');
}

run().catch((err) => {
  console.error('❌ Error during visual verification:', err);
  process.exit(1);
});
