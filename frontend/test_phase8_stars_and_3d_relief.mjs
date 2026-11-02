import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\zelal\\.gemini\\antigravity\\brain\\a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function run() {
  console.log('🚀 Launching Chromium for visual verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📡 Navigating to http://localhost:3000/explore...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // Wait for Three.js canvas & textures

  // 1. Sky Survey View: Realistic circular stars, NO square boxes
  console.log('📸 Capturing Sky Survey View (Clean circular stars, no boxes)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sky_survey_realistic_stars_no_boxes.png') });
  console.log('✅ Captured sky_survey_realistic_stars_no_boxes.png');

  // 2. Switch to SPHEREx View Mode
  console.log('🔭 Switching to SPHEREx View Mode...');
  const spherexBtn = page.locator('button:has-text("SPHEREx")').first();
  await spherexBtn.click();
  await page.waitForTimeout(3000); // Wait for camera lerp & model orientation

  console.log('📸 Capturing SPHEREx View (3D Light Frustum & 3D Topological Image Relief)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'spherex_3d_frustum_and_image_relief.png') });
  console.log('✅ Captured spherex_3d_frustum_and_image_relief.png');

  // 3. Toggle 3D Optical Teardown
  console.log('⚡ Toggling 3D Optical Teardown Mode...');
  const teardownBtn = page.locator('button:has-text("3D Optical Teardown")').first();
  await teardownBtn.click();
  await page.waitForTimeout(2500); // Wait for smooth exploded view animation

  console.log('📸 Capturing SPHEREx 3D Optical Teardown Exploded View...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'spherex_3d_optical_teardown_exploded.png') });
  console.log('✅ Captured spherex_3d_optical_teardown_exploded.png');

  await browser.close();
  console.log('🎉 Visual verification completed successfully!');
}

run().catch((err) => {
  console.error('❌ Error during visual verification:', err);
  process.exit(1);
});

