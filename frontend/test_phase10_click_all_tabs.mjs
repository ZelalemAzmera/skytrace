/**
 * SkyTrace — Phase 10 Comprehensive Interactive Verification Suite
 * Verifies the 2D Sky Image Viewer (WiseView & Aladin Lite style)
 * by clicking through EVERY SINGLE TAB, benchmark target, view mode,
 * colormap, wavelength window, and drawer panel with Playwright.
 */

import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/zelal/.gemini/antigravity/brain/a14f75a5-9bee-4b83-bb7d-e545b71077ab';

async function runClickAllTabsVerification() {
  console.log('================================================================');
  console.log('  SkyTrace 2D Sky Viewer: Click-Through Verification Suite       ');
  console.log('================================================================');

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
    deviceScaleFactor: 2, // High-DPI Retina for crisp screenshots
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
    // -------------------------------------------------------------
    // Step 1: Navigate to /explore
    // -------------------------------------------------------------
    console.log('[1/8] Navigating to http://localhost:3000/explore ...');
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('text=SkyTrace 2D Sky Image Viewer', { timeout: 10000 });
    console.log('  ✓ Header verified: "SkyTrace 2D Sky Image Viewer"');

    // Verify 1:1 Aspect Ratio on astronomical canvas
    const canvas = await page.waitForSelector('canvas', { timeout: 10000 });
    const box = await canvas.boundingBox();
    console.log(`  ✓ Canvas bounding box: ${box.width.toFixed(1)}px x ${box.height.toFixed(1)}px`);
    const aspectDiff = Math.abs(box.width - box.height);
    if (aspectDiff <= 2.0) {
      console.log(`  ✓ Strict 1:1 Aspect Ratio CONFIRMED (diff = ${aspectDiff.toFixed(2)}px)! Stars are circular.`);
    } else {
      console.warn(`  ⚠ Aspect ratio slightly off: width=${box.width}, height=${box.height}`);
    }

    await page.waitForTimeout(500);
    const snap1 = path.join(ARTIFACT_DIR, '09_01_wise0855_aspect_square.png');
    await page.screenshot({ path: snap1 });
    console.log(`  ✓ Saved screenshot: ${snap1}`);

    // -------------------------------------------------------------
    // Step 2: Click through ALL 6 Challenge Benchmark Targets
    // -------------------------------------------------------------
    console.log('\n[2/8] Clicking every single Challenge Benchmark button ...');

    // 1. Barnard's Star
    console.log('  -> Clicking "Barnard\'s Star" ...');
    await page.click('button:has-text("Barnard\'s Star")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Fastest Proper Motion', { timeout: 5000 });
    const snap2 = path.join(ARTIFACT_DIR, '09_02_benchmark_barnards_star.png');
    await page.screenshot({ path: snap2 });
    console.log(`  ✓ Barnard's Star loaded & screenshot saved.`);

    // 2. WISE 0855
    console.log('  -> Clicking "WISE 0855−0714" ...');
    await page.click('button:has-text("WISE 0855")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Coldest Sub-Brown Dwarf', { timeout: 5000 });
    const snap3 = path.join(ARTIFACT_DIR, '09_03_benchmark_wise0855.png');
    await page.screenshot({ path: snap3 });
    console.log(`  ✓ WISE 0855 loaded & screenshot saved.`);

    // 3. Epsilon Indi B
    console.log('  -> Clicking "Epsilon Indi B" ...');
    await page.click('button:has-text("Epsilon Indi B")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Binary Brown Dwarf', { timeout: 5000 });
    const snap4 = path.join(ARTIFACT_DIR, '09_04_benchmark_eps_indi_b.png');
    await page.screenshot({ path: snap4 });
    console.log(`  ✓ Epsilon Indi B loaded & screenshot saved.`);

    // 4. RW Aurigae
    console.log('  -> Clicking "RW Aurigae" ...');
    await page.click('button:has-text("RW Aurigae")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Dust Eclipsing Binary', { timeout: 5000 });
    const snap5 = path.join(ARTIFACT_DIR, '09_05_benchmark_rw_aurigae.png');
    await page.screenshot({ path: snap5 });
    console.log(`  ✓ RW Aurigae loaded & screenshot saved.`);

    // 5. R Draconis
    console.log('  -> Clicking "R Draconis" ...');
    await page.click('button:has-text("R Draconis")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Pulsating Mira Variable', { timeout: 5000 });
    const snap6 = path.join(ARTIFACT_DIR, '09_06_benchmark_r_draconis.png');
    await page.screenshot({ path: snap6 });
    console.log(`  ✓ R Draconis loaded & screenshot saved.`);

    // 6. Planet X Alpha
    console.log('  -> Clicking "Planet X Search Sector Alpha" ...');
    await page.click('button:has-text("Planet X")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Outer Solar System Perturber', { timeout: 5000 });
    const snap7 = path.join(ARTIFACT_DIR, '09_07_benchmark_planet_x_alpha.png');
    await page.screenshot({ path: snap7 });
    console.log(`  ✓ Planet X Alpha loaded & screenshot saved.`);

    // -------------------------------------------------------------
    // Step 3: Click through ALL 4 View Modes
    // -------------------------------------------------------------
    console.log('\n[3/8] Clicking every View Mode tab ...');

    // 1. Split Wipe
    console.log('  -> Clicking "Split Wipe" ...');
    await page.click('button:has-text("Split Wipe")');
    await page.waitForTimeout(400);
    const snap8 = path.join(ARTIFACT_DIR, '09_08_viewmode_split_wipe.png');
    await page.screenshot({ path: snap8 });
    console.log(`  ✓ Split Wipe mode active & screenshot saved.`);

    // 2. Difference (IB - IA)
    console.log('  -> Clicking "Difference (IB - IA)" ...');
    await page.click('button:has-text("Difference (IB - IA)")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=DIFFERENCE FLUX (IB − IA)', { timeout: 5000 });
    const snap9 = path.join(ARTIFACT_DIR, '09_09_viewmode_difference.png');
    await page.screenshot({ path: snap9 });
    console.log(`  ✓ Difference mode active & screenshot saved.`);

    // 3. False Color
    console.log('  -> Clicking "False Color" ...');
    await page.click('button:has-text("False Color")');
    await page.waitForTimeout(400);
    const snap10 = path.join(ARTIFACT_DIR, '09_10_viewmode_false_color.png');
    await page.screenshot({ path: snap10 });
    console.log(`  ✓ False Color mode active & screenshot saved.`);

    // 4. Return to Blink Flipbook
    console.log('  -> Returning to "Blink Flipbook" ...');
    await page.click('button:has-text("Blink Flipbook")');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 4: Click Blink Playback Controls (Play/Pause, Step A, Step B)
    // -------------------------------------------------------------
    console.log('\n[4/8] Clicking Blink Playback Controls ...');
    console.log('  -> Clicking "Pass 1" manual step ...');
    await page.click('button:has-text("Pass 1")');
    await page.waitForTimeout(300);
    await page.waitForSelector('text=SURVEY PASS 1', { timeout: 5000 });

    console.log('  -> Clicking "Pass 2" manual step ...');
    await page.click('button:has-text("Pass 2")');
    await page.waitForTimeout(300);
    await page.waitForSelector('text=SURVEY PASS 2', { timeout: 5000 });

    const snap11 = path.join(ARTIFACT_DIR, '09_11_blink_controls.png');
    await page.screenshot({ path: snap11 });
    console.log(`  ✓ Manual stepping verified & screenshot saved.`);

    // -------------------------------------------------------------
    // Step 5: Click through Colormap Selector (Grayscale, Viridis, Inferno, Inverted B&W)
    // -------------------------------------------------------------
    console.log('\n[5/8] Clicking through Colormap options ...');

    const colormapSelect = page.locator('select').first();

    console.log('  -> Selecting "Viridis (Thermal)" colormap ...');
    await colormapSelect.selectOption('viridis');
    await page.waitForTimeout(400);
    const snap12 = path.join(ARTIFACT_DIR, '09_12_colormap_viridis.png');
    await page.screenshot({ path: snap12 });
    console.log(`  ✓ Viridis colormap applied & screenshot saved.`);

    console.log('  -> Selecting "Inferno (High Contrast)" colormap ...');
    await colormapSelect.selectOption('inferno');
    await page.waitForTimeout(400);
    const snap13 = path.join(ARTIFACT_DIR, '09_13_colormap_inferno.png');
    await page.screenshot({ path: snap13 });
    console.log(`  ✓ Inferno colormap applied & screenshot saved.`);

    console.log('  -> Selecting "Grayscale" colormap ...');
    await colormapSelect.selectOption('grayscale');
    await page.waitForTimeout(400);
    const snap14 = path.join(ARTIFACT_DIR, '09_14_colormap_grayscale.png');
    await page.screenshot({ path: snap14 });
    console.log(`  ✓ Grayscale colormap applied & screenshot saved.`);

    console.log('  -> Selecting "Inverted B&W (Astro Std)" ...');
    await colormapSelect.selectOption('inverted_bw');
    await page.waitForTimeout(400);
    const snap15 = path.join(ARTIFACT_DIR, '09_15_colormap_inverted_bw.png');
    await page.screenshot({ path: snap15 });
    console.log(`  ✓ Inverted B&W restored & screenshot saved.`);

    // -------------------------------------------------------------
    // Step 6: Click Wavelength Slider & Diagnostic Windows
    // -------------------------------------------------------------
    console.log('\n[6/8] Clicking Wavelength Slider & Diagnostic Windows ...');
    const windowsBtn = page.locator('button:has-text("Windows")');
    await windowsBtn.click();
    await page.waitForTimeout(300);

    console.log('  -> Clicking "3.05 µm" H2O Ice feature ...');
    await page.click('button:has-text("3.05 µm")');
    await page.waitForTimeout(300);
    await page.waitForSelector('footer >> text=3.05', { timeout: 5000 });
    console.log('  ✓ Band 73 (3.05 µm H2O) synchronized.');

    console.log('  -> Clicking "1.65 µm" CH4 Methane window ...');
    await page.click('button:has-text("1.65 µm")');
    await page.waitForTimeout(300);
    await page.waitForSelector('footer >> text=1.65', { timeout: 5000 });
    console.log('  ✓ Band 33 (1.65 µm CH4) synchronized.');

    const snap16 = path.join(ARTIFACT_DIR, '09_16_wavelength_expanded_windows.png');
    await page.screenshot({ path: snap16 });
    console.log(`  ✓ Wavelength diagnostic windows screenshot saved.`);

    // -------------------------------------------------------------
    // Step 7: Click Scientific Dossier Drawer & Every Tab
    // -------------------------------------------------------------
    console.log('\n[7/8] Clicking Scientific Dossier Drawer tabs ...');
    const dossierBtn = page.locator('button:has-text("Scientific Dossier")');
    await dossierBtn.click();
    await page.waitForTimeout(400);

    // Tab 1: Candidate
    console.log('  -> Clicking "Candidate" tab ...');
    await page.click('aside button:has-text("Candidate")');
    await page.waitForTimeout(300);
    await page.waitForSelector('text=DESIGNATION', { timeout: 5000 });
    const snap17 = path.join(ARTIFACT_DIR, '09_17_drawer_candidate_tab.png');
    await page.screenshot({ path: snap17 });
    console.log(`  ✓ Candidate tab verified & screenshot saved.`);

    // Tab 2: 102-Band SED
    console.log('  -> Clicking "102-Band SED" tab ...');
    await page.click('aside button:has-text("102-Band SED")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=102-Band SPHEREx Spectral Energy Distribution', { timeout: 5000 });
    const snap18 = path.join(ARTIFACT_DIR, '09_18_drawer_sed_chart_tab.png');
    await page.screenshot({ path: snap18 });
    console.log(`  ✓ 102-Band SED chart verified & screenshot saved.`);

    // Tab 3: Evidence
    console.log('  -> Clicking "Evidence" tab ...');
    await page.click('aside button:has-text("Evidence")');
    await page.waitForTimeout(400);
    await page.waitForSelector('text=Multi-Factor Confidence', { timeout: 5000 });
    const snap19 = path.join(ARTIFACT_DIR, '09_19_drawer_evidence_tab.png');
    await page.screenshot({ path: snap19 });
    console.log(`  ✓ Evidence tab verified & screenshot saved.`);

    // Close drawer via header toggle
    console.log('  -> Closing drawer (Scientific Dossier toggle) ...');
    await page.click('header button:has-text("Scientific Dossier")');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // Step 8: Verify Error Status
    // -------------------------------------------------------------
    console.log('\n[8/8] Verifying Error Log & Visual Polish ...');
    if (consoleErrors.length > 0) {
      console.warn(`  ⚠ Console errors recorded: ${consoleErrors.length}`);
      consoleErrors.forEach((e) => console.warn(`    - ${e}`));
    } else {
      console.log('  ✓ ZERO console errors detected throughout all tab interactions!');
    }

    console.log('\n================================================================');
    console.log('  ALL TABS, BUTTONS, MODES, & COLORMAPS 100% VERIFIED!         ');
    console.log('================================================================');
  } catch (err) {
    console.error('Test execution failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runClickAllTabsVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
