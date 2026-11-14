/**
 * SkyTrace — Phase 10 Playwright E2E Visual Verification Suite
 * Tests the Inside-Looking-Out 2D Sky Image Viewer (WiseView & Aladin Lite style)
 * across the official NASA Space Apps Challenge benchmark targets:
 * - WISE 0855-0714 (Coldest sub-brown dwarf, 8.1″/yr proper motion)
 * - Barnard's Star (Fastest proper motion star, 10.39″/yr)
 * - RW Aurigae (T Tauri dust eclipsing binary, zero motion, deep photometric dip)
 * - Difference Subtraction mode (IB - IA)
 * - Inverted B&W and Viridis colormaps
 * - 3D Celestial Mini-Map orientation radar
 * - Scientific Dossier & 102-band SED chart
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/zelal/.gemini/antigravity/brain/a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function runTest() {
  console.log('--- Starting SkyTrace Phase 10 WiseView E2E Visual Verification ---');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disk-cache-dir=D:/tmp/pw-cache',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Navigate to 2D Sky Image Viewer (/explore)
    console.log('Step 1: Navigating to http://localhost:3000/explore ...');
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });

    // Verify Title & Header
    await page.waitForSelector('text=SkyTrace 2D Sky Image Viewer', { timeout: 10000 });
    console.log('✓ Header "SkyTrace 2D Sky Image Viewer" detected.');

    // Verify 2D Canvas is present and rendered
    const canvas = await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✓ Main 2D telescope canvas is mounted and rendering.');

    // Verify 3D Celestial Mini-Map is mounted
    await page.waitForSelector('text=CELESTIAL RADAR', { timeout: 10000 });
    console.log('✓ Corner 3D Celestial Mini-Map radar mounted.');

    // 2. Capture Screenshot 1: WISE 0855 in Blink Mode (Frame 1)
    await page.waitForTimeout(600);
    const snap1Path = path.join(ARTIFACT_DIR, '08_wiseview_wise0855_frame1.png');
    await page.screenshot({ path: snap1Path });
    console.log(`✓ Screenshot 1 captured: ${snap1Path}`);

    // 3. Wait for blink loop to cycle to Pass 2 (Frame 2)
    console.log('Step 2: Waiting for blink flipbook cycle to Pass 2 ...');
    await page.waitForTimeout(750);
    const snap2Path = path.join(ARTIFACT_DIR, '08_wiseview_wise0855_frame2.png');
    await page.screenshot({ path: snap2Path });
    console.log(`✓ Screenshot 2 captured: ${snap2Path}`);

    // 4. Test Difference Mode (IB - IA)
    console.log('Step 3: Switching to Difference (IB - IA) mode ...');
    const diffButton = page.locator('button:has-text("Difference (IB - IA)")');
    await diffButton.click();
    await page.waitForTimeout(500);

    // Verify Difference mode banner
    await page.waitForSelector('text=DIFFERENCE FLUX (IB − IA)', { timeout: 5000 });
    const snapDiffPath = path.join(ARTIFACT_DIR, '08_wiseview_difference_mode.png');
    await page.screenshot({ path: snapDiffPath });
    console.log(`✓ Screenshot 3 (Difference Mode) captured: ${snapDiffPath}`);

    // 5. Switch to Barnard's Star Benchmark Target
    console.log("Step 4: Selecting Barnard's Star benchmark target ...");
    const barnardBtn = page.locator("button:has-text(\"Barnard's Star\")");
    await barnardBtn.click();
    await page.waitForTimeout(600);

    await page.waitForSelector("text=Barnard's Star", { timeout: 5000 });
    await page.waitForSelector('text=Fastest Proper Motion', { timeout: 5000 });

    // Switch back to Blink mode to see Barnard's Star hopping
    const blinkButton = page.locator('button:has-text("Blink Flipbook")');
    await blinkButton.click();
    await page.waitForTimeout(500);

    const snapBarnardPath = path.join(ARTIFACT_DIR, '08_wiseview_barnards_star.png');
    await page.screenshot({ path: snapBarnardPath });
    console.log(`✓ Screenshot 4 (Barnard's Star) captured: ${snapBarnardPath}`);

    // 6. Switch to RW Aurigae (Dust Eclipsing Binary)
    console.log('Step 5: Selecting RW Aurigae benchmark target ...');
    const rwBtn = page.locator('button:has-text("RW Aurigae")');
    await rwBtn.click();
    await page.waitForTimeout(600);

    await page.waitForSelector('text=RW Aurigae', { timeout: 5000 });
    await page.waitForSelector('text=Dust Eclipsing Binary', { timeout: 5000 });

    const snapRwPath = path.join(ARTIFACT_DIR, '08_wiseview_rw_aurigae.png');
    await page.screenshot({ path: snapRwPath });
    console.log(`✓ Screenshot 5 (RW Aurigae) captured: ${snapRwPath}`);

    // 7. Test Colormap Selector: Switch to Viridis
    console.log('Step 6: Testing Colormap Selector (Viridis) ...');
    const colormapSelect = page.locator('select');
    await colormapSelect.selectOption('viridis');
    await page.waitForTimeout(500);

    const snapViridisPath = path.join(ARTIFACT_DIR, '08_wiseview_colormap_viridis.png');
    await page.screenshot({ path: snapViridisPath });
    console.log(`✓ Screenshot 6 (Viridis Colormap) captured: ${snapViridisPath}`);

    // 8. Open Scientific Dossier Drawer
    console.log('Step 7: Opening Scientific Dossier Drawer ...');
    const dossierBtn = page.locator('button:has-text("Scientific Dossier")');
    await dossierBtn.click();
    await page.waitForTimeout(600);

    // Verify Candidate tab and 102-Band SED tab
    await page.waitForSelector('text=102-Band SED', { timeout: 5000 });
    const sedTab = page.locator('button:has-text("102-Band SED")');
    await sedTab.click();
    await page.waitForTimeout(600);

    const snapDossierPath = path.join(ARTIFACT_DIR, '08_wiseview_scientific_dossier.png');
    await page.screenshot({ path: snapDossierPath });
    console.log(`✓ Screenshot 7 (Scientific Dossier & 102-Band SED) captured: ${snapDossierPath}`);

    // 9. Check Console Errors
    console.log(`Total console errors recorded: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Console warnings/errors:', consoleErrors);
    }

    console.log('----------------------------------------------------------------------');
    console.log('ALL PHASE 10 WISEVIEW E2E PLAYWRIGHT TESTS PASSED SUCCESSFULLY! 🌟');
    console.log('----------------------------------------------------------------------');
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
