import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\zelal\\.gemini\\antigravity\\brain\\a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function run() {
  console.log('🚀 Launching Chromium for Orion Nebula capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📡 Navigating to http://localhost:3000/explore...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Collapse bottom drawer
  const collapseBtn = page.locator('button:has-text("Collapse Instrument Panels")').first();
  if (await collapseBtn.isVisible()) {
    await collapseBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click Orion Nebula preset
  console.log('✨ Clicking Orion Nebula preset button...');
  const orionBtn = page.locator('button:has-text("Orion Nebula")').first();
  await orionBtn.click({ force: true });
  await page.waitForTimeout(3500); // Wait for smooth camera slew

  console.log('📸 Capturing Selector on Orion Nebula...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'solarsystemscope_new_target_selector_orion.png') });
  console.log('✅ Captured solarsystemscope_new_target_selector_orion.png');

  await browser.close();
  console.log('🎉 Orion Nebula verification complete!');
}

run().catch((err) => {
  console.error('❌ Error during visual verification:', err);
  process.exit(1);
});
