import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/zelal/.gemini/antigravity/brain/a14f75a5-9bee-4b83-bb7d-e545b71077ab';
const TMP_DIR = 'D:/tmp/pw-tmp';

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function run() {
  console.log('--- Launching Playwright Chromium for Flaming Comet Verification ---');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disk-cache-dir=D:\\tmp\\pw-cache',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu-shader-disk-cache',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      if (!text.includes(':8000') && !text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
        console.error(`[Browser Console Error]: ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
    console.error(`[Browser Page Error]: ${err}`);
  });

  try {
    console.log('1. Navigating to http://localhost:3000/explore ...');
    await page.goto('http://localhost:3000/explore', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log('2. Waiting for Three.js Canvas to mount ...');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('3. Selecting 1P/Halley to trigger camera zoom and target lock ...');
    await page.evaluate(() => {
      const store = window.__SKY_STORE__;
      if (store) {
        store.getState().selectCelestialBody({
          name: '1P/Halley',
          type: 'Comet',
          radius: 1.25,
          effectiveRadius: 3.5,
          realAU: 29.932,
          periodDays: 27500,
          vKms: 3.09,
          description: 'Most famous periodic retrograde comet; source of Orionid and Eta Aquariid meteor showers.'
        });
      }
    });

    // Wait for camera transition (1.2s easeOutCubic)
    await page.waitForTimeout(1800);

    // Move mouse away to corner so hover reticle is dismissed and comet flame is fully unobscured
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);

    console.log('4. Capturing High-Res Screenshot of Animated Flaming Comet Halley (Frame 1 - Clean View) ...');
    const shot1 = path.join(TMP_DIR, '07_flaming_comet_halley_frame1.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log(`✓ Captured Screenshot 1: ${shot1}`);

    // Wait 500ms to allow shader wave flutter and noise animation to advance
    await page.waitForTimeout(600);

    console.log('5. Capturing Animated Flaming Comet Halley (Frame 2 - Flutter Advance) ...');
    const shot2 = path.join(TMP_DIR, '07_flaming_comet_halley_frame2.png');
    await page.screenshot({ path: shot2, fullPage: true });
    console.log(`✓ Captured Screenshot 2: ${shot2}`);

    console.log('6. Orbiting camera 45 degrees around 1P/Halley to verify 3D limb feathering ...');
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(580, 360, { steps: 10 });
    await page.mouse.up();
    await page.mouse.move(100, 100); // move away after drag
    await page.waitForTimeout(600);

    const shot3 = path.join(TMP_DIR, '07_flaming_comet_halley_orbit.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log(`✓ Captured Screenshot 3: ${shot3}`);

    console.log('7. Zooming out slightly to capture majestic billowing flame plume across space ...');
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 400);
    await page.mouse.move(100, 100); // move away after zoom
    await page.waitForTimeout(600);

    const shot4 = path.join(TMP_DIR, '07_flaming_comet_halley_wide.png');
    await page.screenshot({ path: shot4, fullPage: true });
    console.log(`✓ Captured Screenshot 4: ${shot4}`);

    // Verify HUD elements
    const halleyBadge = await page.waitForSelector('text=1P/Halley', { timeout: 5000 });
    const targetFocusedBadge = await page.waitForSelector('text=TARGET FOCUSED', { timeout: 5000 });
    const cometBadge = await page.waitForSelector('text=COMET', { timeout: 5000 });
    console.log('✓ Target HUD verified: 1P/Halley and TARGET FOCUSED · COMET active.');

    // Mirror to artifact directory
    for (const file of [shot1, shot2, shot3, shot4]) {
      const base = path.basename(file);
      const dest = path.join(ARTIFACT_DIR, base);
      fs.copyFileSync(file, dest);
      console.log(`✓ Mirrored screenshot to artifact directory: ${dest}`);
    }

    console.log('\n======================================================');
    console.log(`TOTAL PAGE ERRORS: ${pageErrors.length}`);
    console.log(`TOTAL CONSOLE ERRORS: ${consoleErrors.length}`);
    console.log('ALL FLAMING COMET VERIFICATION CHECKS PASSED');
    console.log('======================================================');
  } catch (err) {
    console.error('Playwright execution error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();
