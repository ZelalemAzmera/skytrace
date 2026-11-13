import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\zelal\\.gemini\\antigravity\\brain\\a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function run() {
  console.log('🚀 Launching Chromium for Solar System Scope Target Selector verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📡 Navigating to http://localhost:3000/explore...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Collapse bottom drawer if open to give unobstructed view of southern sky
  const collapseBtn = page.locator('button:has-text("Collapse Instrument Panels")').first();
  if (await collapseBtn.isVisible()) {
    console.log('📉 Collapsing bottom drawer...');
    await collapseBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1. Slew to Antares (exact coordinate from user screenshot: RA 247.3528, Dec -26.4320)
  console.log('🎯 Entering Antares coordinates (from user screenshot)...');
  const raInput = page.locator('input[placeholder="RA deg"]').first();
  const decInput = page.locator('input[placeholder="Dec deg"]').first();
  await raInput.fill('247.3528');
  await decInput.fill('-26.4320');
  const slewBtn = page.locator('button:has-text("Slew")').first();
  await slewBtn.click();
  await page.waitForTimeout(2500);

  console.log('📸 Capturing new Solar System Scope Target Selector on Antares...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_new_target_selector_antares.png') });
  console.log('✅ Captured solarsystemscope_new_target_selector_antares.png');

  // 2. Select Pleiades Cluster
  console.log('✨ Clicking Pleiades Cluster preset...');
  const pleiadesBtn = page.locator('button:has-text("Pleiades Cluster")').first();
  if (await pleiadesBtn.isVisible()) {
    await pleiadesBtn.click({ force: true });
    await page.waitForTimeout(2500);
    console.log('📸 Capturing Selector on Pleiades Cluster...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_new_target_selector_pleiades.png') });
    console.log('✅ Captured solarsystemscope_new_target_selector_pleiades.png');
  }

  // 3. Switch to SPHEREx view mode to verify spacecraft & 3D frustum remain intact
  console.log('🛰️ Switching to SPHEREx mode...');
  const spherexModeBtn = page.locator('button:has-text("SPHEREx")').first();
  if (await spherexModeBtn.isVisible()) {
    await spherexModeBtn.click({ force: true });
    await page.waitForTimeout(2500);
    console.log('📸 Capturing SPHEREx Mode...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_spherex_mode_verified.png') });
    console.log('✅ Captured solarsystemscope_spherex_mode_verified.png');
  }

  await browser.close();
  console.log('🎉 Target Selector visual verification completed successfully!');
}

run().catch((err) => {
  console.error('❌ Error during visual verification:', err);
  process.exit(1);
});
