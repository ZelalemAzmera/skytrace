import { chromium } from 'playwright';
import path from 'path';

async function run() {
  console.log('Launching browser to capture SPHEREx view...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/explore...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

  console.log('Waiting 3.5s for WebGL scene to load...');
  await page.waitForTimeout(3500);

  // Take Sky Survey screenshot
  const artifactDir = 'C:/Users/zelal/.gemini/antigravity/brain/a14f75a5-9bee-4b83-bb7d-e545b71077ab';
  await page.screenshot({ path: path.join(artifactDir, 'sky_survey_view.png') });
  console.log('Saved sky_survey_view.png');

  // Find and click the SPHEREx mode button
  console.log('Clicking SPHEREx view mode button...');
  const spherexBtn = page.getByRole('button', { name: 'SPHEREx', exact: true });
  await spherexBtn.click();

  console.log('Waiting 3s for smooth camera transition into SPHEREx orbit...');
  await page.waitForTimeout(3000);

  const spacecraftScreenshotPath = path.join(artifactDir, 'spherex_spacecraft_clean_view.png');
  await page.screenshot({ path: spacecraftScreenshotPath });
  console.log('Saved spherex_spacecraft_clean_view.png');

  // Try clicking Collapse Instrument Panels to capture full unobstructed view
  try {
    const collapseBtn = page.getByRole('button', { name: /Collapse Instrument Panels/i });
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, 'spherex_collapsed_panels_view.png') });
      console.log('Saved spherex_collapsed_panels_view.png');
    }
  } catch (e) {
    console.log('Could not collapse panels:', e.message);
  }

  // Click on a target preset to verify slewing
  console.log('Clicking target preset Orion Nebula...');
  const targetBtn = await page.getByRole('button', { name: /Orion Nebula/i });
  if (await targetBtn.isVisible()) {
    await targetBtn.click();
    console.log('Waiting 2s for slewing quaternion transition...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'spherex_slewed_view.png') });
    console.log('Saved spherex_slewed_view.png');
  }

  await browser.close();
  console.log('Visual capture complete!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
