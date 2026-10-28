# SkyTrace — Architecture Blueprint
### *Explore the sky. Compare the evidence. Follow the changes.*

> **Document Status:** v2.0 — NASA Space Apps Challenge 2026
> **Challenge:** Planet X and SPHEREx
> **Last Updated:** Post reverse-engineering of Solar System Scope & SPHEREx Scope 3D

---

## Table of Contents

1. [Mission Statement and Vision](#1-mission-statement-and-vision)
2. [Scientific Context](#2-scientific-context)
3. [Reverse-Engineered Physics and Math Core](#3-reverse-engineered-physics-and-math-core)
4. [Product Definition and Features](#4-product-definition-and-features)
5. [UI / UX Design - Premium Dark Theme](#5-ui--ux-design--premium-dark-theme)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Backend Architecture - Hexagonal Design](#8-backend-architecture--hexagonal-design)
9. [Data Layer and Database Architecture](#9-data-layer-and-database-architecture)
10. [Data Pipeline - FITS to Web](#10-data-pipeline--fits-to-web)
11. [Tech Stack - Full Justification](#11-tech-stack--full-justification)
12. [API Contract](#12-api-contract)
13. [Security, Performance and Scalability](#13-security-performance-and-scalability)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Competitive Differentiation Strategy](#15-competitive-differentiation-strategy)
16. [Implementation Plan](#16-implementation-plan)

---

## 1. Mission Statement and Vision

**SkyTrace** is a public-facing, evidence-first astronomical investigation tool that transforms NASA's SPHEREx infrared sky survey data into an interactive, comparative, and scientifically honest exploration experience for anyone - from a curious student to a citizen scientist.

### Core Promise

> *Turn difficult astronomical FITS image data into an interactive investigation that anyone can follow, verify, and trust - powered by the same physics engines found in professional-grade 3D sky simulators.*

### What SkyTrace IS NOT
- Not a planet discovery claim engine
- Not a static image gallery
- Not a "we found Planet X" sensationalism platform
- Not dependent on mock or fake data

### What SkyTrace IS
- A real-data investigation tool using live SPHEREx QR3 observations from NASA IRSA
- A 3D celestial sphere + orrery built on the same Three.js physics pipeline as SPHEREx Scope 3D
- A time-travel comparison engine (blink + slider comparison of different epochs)
- A 102-band spectral energy distribution viewer with real LVF wavelength physics
- A candidate evidence viewer with measurement-backed confidence scores
- A scientifically honest platform that surfaces limitations alongside all findings

---

## 2. Scientific Context

### 2.1 SPHEREx Mission Profile

| Parameter | Value |
|-----------|-------|
| **Full Name** | Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer |
| **Launch Date** | March 11, 2025 |
| **Survey Type** | All-sky infrared survey |
| **Wavelength Range** | 0.75 to 5.0 micrometers (near-infrared) |
| **Spectral Bands** | 102 bands (linear variable filter detectors) |
| **Detector Arrays** | 6 HgCdTe detector arrays |
| **Sky Cadence** | ~6 months full-sky repeat |
| **Image Format** | Multi-Extension FITS (MEF), 2040x2040 pixels (~70 MB/file) |
| **Data Release (2026)** | Quick Release 3 (QR3) - DOI: 10.26131/IRSA662 |
| **Archive** | NASA/IPAC IRSA - irsa.ipac.caltech.edu |
| **Cloud Mirror** | s3://nasa-irsa-spherex/qr3/ |

### 2.2 FITS File Structure (MEF)

Each SPHEREx Level 2 FITS file contains these Header Data Units:

| HDU | Name | Contents |
|-----|------|---------|
| 0 | PRIMARY | Header metadata only (no data array) |
| 1 | IMAGE | Science image (2040x2040 float32 pixels) |
| 2 | FLAGS | Per-pixel quality flags (bad/saturated/cosmic) |
| 3 | VARIANCE | Per-pixel noise estimates (for SNR calculation) |
| 4 | ZODI | Zodiacal light background model |
| 5 | PSF | Point Spread Function spatial cube |
| 6 | WCS-WAVE | Wavelength-to-pixel spatial mapping |

WCS headers map pixel positions to ICRS J2000 sky coordinates (RA/Dec).

### 2.3 The Planet X Scientific Context

SPHEREx repeated infrared sky observations can reveal:

| Object Type | SPHEREx Detection Method |
|-------------|--------------------------|
| Comets | Brightness variation + apparent motion across epochs |
| Asteroids | Proper motion detectable between observations |
| Brown Dwarfs | Infrared excess emission + parallax motion |
| Variable Stars | Photometric flux variability across time |
| Hypothetical TNOs | Very slow proper motion over 6-month cadence |

### 2.4 Data Access Points

| Resource | URL |
|----------|-----|
| SPHEREx at IRSA | irsa.ipac.caltech.edu/Missions/spherex.html |
| SIA2 Query API | irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3 |
| IBE Direct Access | irsa.ipac.caltech.edu/ibe/data/spherex/qr3/ |
| AWS S3 Mirror | s3://nasa-irsa-spherex/qr3/ |
| MOST Solar System | IRSA Moving Object Search Tool |
| Archive User Guide | caltech-ipac.github.io/spherex-archive-documentation |

---

## 3. Reverse-Engineered Physics and Math Core

> **Source 1:** Solar System Scope (solarsystemscope.com) - Unity IL2CPP WebAssembly, hybrid WebGL/Three.js rendering, VSOP87 planetary theory, deferred chunked asset loading.
> **Source 2:** SPHEREx Scope 3D (sites.google.com/view/spherex-scope-3d-nasa-space-ap) - Single-page app, Three.js r128, Chart.js, 102-band LVF model, astrometric unit vectors, parallax depth, blink comparator, synthetic spectral signatures.

These are the **exact physics functions and formulas** we MUST port into SkyTrace.

---

### 3.1 SPHEREx 102-Band Linear Variable Filter (LVF) Wavelength Progression

The SPHEREx instrument uses a logarithmic wavelength spacing across 102 spectral channels distributed over 6 HgCdTe detector arrays.

**Formula (reverse-engineered from SPHEREx Scope 3D source):**

```
lambda_i = 0.75 * (5.0 / 0.75)^((i - 1) / 101)     for i = 1..102
```

Where:
- lambda_1 = 0.75 um (first band, start of near-IR)
- lambda_102 = 5.0 um (last band, mid-IR thermal)
- The ratio 5.0 / 0.75 = 6.667 drives the logarithmic progression
- Total span: 0.75 to 5.0 micrometers

**Detector Array Boundaries:**

| Array | Band Range | Wavelength Range |
|-------|-----------|-----------------|
| Array 1 | Bands 1-17 | 0.75 - 1.10 um |
| Array 2 | Bands 18-34 | 1.10 - 1.63 um |
| Array 3 | Bands 35-51 | 1.63 - 2.42 um |
| Array 4 | Bands 52-68 | 2.42 - 3.58 um |
| Array 5 | Bands 69-85 | 3.58 - 4.32 um |
| Array 6 | Bands 86-102 | 4.32 - 5.00 um |

**Implementation (TypeScript):**

```typescript
function spherexWavelength(bandIndex: number): number {
  // bandIndex: 1-indexed (1..102)
  return 0.75 * Math.pow(5.0 / 0.75, (bandIndex - 1) / 101);
}

const SPHEREX_WAVELENGTHS: number[] = Array.from(
  { length: 102 }, (_, i) => spherexWavelength(i + 1)
);
```

**Implementation (Python):**

```python
import numpy as np

def spherex_wavelengths() -> np.ndarray:
    """Generate the 102-band SPHEREx LVF wavelength array in micrometers."""
    i = np.arange(1, 103)
    return 0.75 * (5.0 / 0.75) ** ((i - 1) / 101)

SPHEREX_WAVELENGTHS = spherex_wavelengths()
```

---

### 3.2 Astrometric Unit Vector (Celestial Sphere Projection)

Converts a sky position (RA, Dec) in ICRS J2000 into a 3D Cartesian unit vector on the surface of the celestial sphere. Used by Three.js to place stars, candidates, and SPHEREx tile centers on the 3D sphere.

**Formula (reverse-engineered from SPHEREx Scope 3D):**

```
alpha = RA in radians
delta = Dec in radians

u_hat = (cos(delta)*cos(alpha),  cos(delta)*sin(alpha),  sin(delta))
```

**Implementation (TypeScript + Three.js):**

```typescript
import * as THREE from 'three';

function icrsToUnitVector(raDeg: number, decDeg: number, radiusAU = 1.0): THREE.Vector3 {
  const ra  = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  return new THREE.Vector3(
    radiusAU * Math.cos(dec) * Math.cos(ra),
    radiusAU * Math.cos(dec) * Math.sin(ra),
    radiusAU * Math.sin(dec)
  );
}

function unitVectorToICRS(v: THREE.Vector3): { raDeg: number; decDeg: number } {
  const decDeg = THREE.MathUtils.radToDeg(Math.asin(v.z / v.length()));
  const raDeg  = THREE.MathUtils.radToDeg(Math.atan2(v.y, v.x));
  return { raDeg: (raDeg + 360) % 360, decDeg };
}
```

---

### 3.3 Parallax Depth Calculator

Used to compute the physical distance to an object from its measured parallax shift between SPHEREx observations separated by ~6 months.

**Formula (reverse-engineered from SPHEREx Scope 3D):**

```
delta_theta = pixel_shift * pixel_scale_arcsec_per_pixel
parallax_arcsec = delta_theta / 2
distance_parsec = 1.0 / parallax_arcsec
distance_AU     = distance_parsec * 206265
distance_LY     = distance_parsec * 3.2616
```

**Implementation (TypeScript):**

```typescript
const SPHEREX_PIXEL_SCALE_ARCSEC = 6.2; // arcsec/pixel (SPHEREx nominal)

function computeParallaxDistance(pixelShift: number): {
  parallaxArcsec: number;
  distanceParsec: number;
  distanceAU: number;
  distanceLY: number;
} {
  const deltaTheta = pixelShift * SPHEREX_PIXEL_SCALE_ARCSEC;
  const parallax   = deltaTheta / 2.0;
  const distParsec = parallax > 0 ? 1.0 / parallax : Infinity;
  return {
    parallaxArcsec: parallax,
    distanceParsec: distParsec,
    distanceAU:     distParsec * 206265,
    distanceLY:     distParsec * 3.2616,
  };
}
```

---

### 3.4 Synthetic Spectral Signature Models

SPHEREx Scope 3D contains four built-in spectral templates used to classify detected candidates. We port all four.

**Template 1 - Methane Ice / Cold TNO / Planet X Candidate:**

```javascript
function methaneIceSpectrum(wavelengths) {
  return wavelengths.map(lam => {
    let flux = 0.8 * Math.exp(-Math.pow(lam - 1.7, 2) / 0.1);
    if (Math.abs(lam - 2.3) < 0.15) flux *= 0.3;  // CH4 band 1
    if (Math.abs(lam - 3.4) < 0.15) flux *= 0.2;  // CH4 band 2
    return Math.max(0, flux);
  });
}
```

**Template 2 - Y-Dwarf (failed star, 300-500 K):**

```javascript
function yDwarfSpectrum(wavelengths) {
  return wavelengths.map(lam => {
    let flux = Math.pow(lam, -5) / (Math.exp(1.4388 / (lam * 0.04)) - 1);
    flux = flux / Math.max(...wavelengths.map(l =>
      Math.pow(l, -5) / (Math.exp(1.4388 / (l * 0.04)) - 1)));
    if (Math.abs(lam - 1.5) < 0.1 || Math.abs(lam - 2.0) < 0.1) flux *= 0.4;
    if (Math.abs(lam - 1.4) < 0.1 || Math.abs(lam - 1.9) < 0.1) flux *= 0.5;
    return Math.max(0, flux);
  });
}
```

**Template 3 - Redshifted Galaxy (z~0.3-2.0):**

```javascript
function redshiftedGalaxySpectrum(wavelengths, redshift = 1.0) {
  return wavelengths.map(lam => {
    const lamRest = lam / (1 + redshift);
    if (lamRest < 0.0912) return 0;
    let flux = lamRest < 0.4 ? 0.3 : 1.0;
    if (Math.abs(lamRest - 0.3727) < 0.005) flux += 0.4;
    if (Math.abs(lamRest - 0.6563) < 0.005) flux += 0.6;
    return flux * Math.exp(-Math.pow(lam - 2.0, 2) / 2.0);
  });
}
```

**Template 4 - Active Comet:**

```javascript
function cometSpectrum(wavelengths) {
  return wavelengths.map(lam => {
    let dust = 0.6 * Math.pow(lam, -0.5);
    let h2o  = 0.9 * Math.exp(-Math.pow(lam - 2.9, 2) / 0.04);
    let co2  = 0.5 * Math.exp(-Math.pow(lam - 4.3, 2) / 0.05);
    return dust + h2o + co2;
  });
}
```

**Python equivalents (backend template fitting):**

```python
import numpy as np

def methane_ice_template(wavelengths: np.ndarray) -> np.ndarray:
    flux = 0.8 * np.exp(-((wavelengths - 1.7) ** 2) / 0.1)
    flux[np.abs(wavelengths - 2.3) < 0.15] *= 0.3
    flux[np.abs(wavelengths - 3.4) < 0.15] *= 0.2
    return np.clip(flux, 0, None)

def y_dwarf_template(wavelengths: np.ndarray, T_eff: float = 400.0) -> np.ndarray:
    c2 = 1.4388e4  # um*K
    flux = wavelengths**-5 / (np.exp(c2 / (wavelengths * T_eff)) - 1)
    flux /= flux.max()
    for lam0, width, depth in [(1.5, 0.1, 0.4), (2.0, 0.1, 0.4),
                                (1.4, 0.1, 0.5), (1.9, 0.1, 0.5)]:
        flux[np.abs(wavelengths - lam0) < width] *= depth
    return flux

def comet_template(wavelengths: np.ndarray) -> np.ndarray:
    dust = 0.6 * wavelengths**-0.5
    h2o  = 0.9 * np.exp(-((wavelengths - 2.9)**2) / 0.04)
    co2  = 0.5 * np.exp(-((wavelengths - 4.3)**2) / 0.05)
    return dust + h2o + co2
```

---

### 3.5 Three.js Celestial Sphere Scene (From SPHEREx Scope 3D)

```javascript
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(60, W/H, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

// 1. CELESTIAL SPHERE
const sphereGeo = new THREE.SphereGeometry(100, 64, 64);
const sphereMat = new THREE.MeshPhongMaterial({
  color: 0x001133, transparent: true, opacity: 0.15,
  side: THREE.BackSide
});
scene.add(new THREE.Mesh(sphereGeo, sphereMat));

// 2. STAR FIELD via BufferGeometry
function addStarCatalog(stars) {
  const positions = new Float32Array(stars.length * 3);
  const colors    = new Float32Array(stars.length * 3);
  stars.forEach((star, i) => {
    const v = icrsToUnitVector(star.ra, star.dec, 98);
    positions.set([v.x, v.y, v.z], i * 3);
    const mag_norm = Math.max(0, Math.min(1, (9 - star.mag) / 9));
    colors.set([mag_norm, mag_norm * 0.95, mag_norm * 0.85], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Points(geo,
    new THREE.PointsMaterial({ size: 0.5, vertexColors: true })));
}

// 3. SPHEREx SCAN LINE (animated)
function addSPHERExScanPath() {
  const points = new THREE.EllipseCurve(0, 0, 95, 95, 0, 2*Math.PI)
    .getPoints(360).map(p => new THREE.Vector3(p.x, 0, p.y));
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xFF6600, linewidth: 2 })
  ));
}

// 4. CANDIDATE MARKERS
function addCandidateMarker(raDeg, decDeg, confidence) {
  const pos  = icrsToUnitVector(raDeg, decDeg, 100);
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.2, 32),
    new THREE.MeshBasicMaterial({
      color: confidence > 0.7 ? 0xFF6600 : 0x22C55E,
      side: THREE.DoubleSide
    })
  );
  mesh.position.copy(pos);
  mesh.lookAt(new THREE.Vector3(0, 0, 0));
  scene.add(mesh);
}

// 5. ORRERY - inner solar system
function buildOrrery() {
  const AU = 5;
  [
    { a: 0.387, color: 0x888888 },  // Mercury
    { a: 0.723, color: 0xDDAA44 },  // Venus
    { a: 1.000, color: 0x3388FF },  // Earth
    { a: 1.524, color: 0xCC4422 },  // Mars
    { a: 5.203, color: 0xBB9944 },  // Jupiter
  ].forEach(({ a, color }) => {
    const pts = new THREE.EllipseCurve(0,0, a*AU, a*AU, 0, 2*Math.PI)
      .getPoints(128).map(p => new THREE.Vector3(p.x, 0, p.y));
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
    ));
  });
}
```

---

### 3.6 Solar System Scope Physics - Kepler + Julian Date

**Kepler's equation (eccentric anomaly solver):**

```typescript
function solveKepler(M: number, e: number, tolerance = 1e-8): number {
  let E = M;
  for (let iter = 0; iter < 100; iter++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

function keplerToCartesian(
  a: number, e: number, i: number, omega: number, Omega: number, M: number
): THREE.Vector3 {
  const E  = solveKepler(M, e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const r    = a * (1 - e * Math.cos(E));
  const x_pf = r * Math.cos(nu);
  const y_pf = r * Math.sin(nu);
  const ci = Math.cos(i), si = Math.sin(i);
  const co = Math.cos(omega), so = Math.sin(omega);
  const cO = Math.cos(Omega), sO = Math.sin(Omega);
  return new THREE.Vector3(
    (cO*co - sO*so*ci)*x_pf + (-cO*so - sO*co*ci)*y_pf,
    (sO*co + cO*so*ci)*x_pf + (-sO*so + cO*co*ci)*y_pf,
    (so*si)*x_pf + (co*si)*y_pf
  );
}
```

**Julian Date (Meeus "Astronomical Algorithms"):**

```typescript
function julianDate(date: Date = new Date()): number {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60) / 24;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0; // T from J2000
}
```

---

### 3.7 2D Blink Comparator Engine (Canvas)

```typescript
class BlinkComparator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imgA: HTMLImageElement;
  private imgB: HTMLImageElement;
  private showingA = true;
  private intervalId: number | null = null;
  private blinkMs = 800;
  private candidates: Candidate[] = [];
  private wcs: WCSTransform;

  start(): void {
    this.intervalId = window.setInterval(() => {
      this.showingA = !this.showingA;
      this.draw();
    }, this.blinkMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private draw(): void {
    const img = this.showingA ? this.imgA : this.imgB;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    this.drawCandidateOverlays();
    this.drawEpochLabel();
  }

  private drawCandidateOverlays(): void {
    this.candidates.forEach(c => {
      const [px, py] = this.wcs.sky2pix(c.ra, c.dec);
      const radius   = 8 + c.confidenceScore * 10;
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = c.confidenceScore > 0.7 ? '#FF6600' : '#22C55E';
      this.ctx.lineWidth   = 2;
      this.ctx.stroke();
      // Crosshair ticks
      this.ctx.beginPath();
      this.ctx.moveTo(px - radius - 4, py); this.ctx.lineTo(px - radius + 2, py);
      this.ctx.moveTo(px + radius - 2, py); this.ctx.lineTo(px + radius + 4, py);
      this.ctx.moveTo(px, py - radius - 4); this.ctx.lineTo(px, py - radius + 2);
      this.ctx.moveTo(px, py + radius - 2); this.ctx.lineTo(px, py + radius + 4);
      this.ctx.strokeStyle = '#FFFFFF44';
      this.ctx.stroke();
      this.ctx.fillStyle = '#FF6600';
      this.ctx.font      = '10px JetBrains Mono';
      this.ctx.fillText(`SNR ${c.snrChange.toFixed(1)}`, px + radius + 5, py + 4);
    });
  }

  private drawEpochLabel(): void {
    const label = this.showingA ? 'EPOCH A' : 'EPOCH B';
    this.ctx.fillStyle = this.showingA ? '#3B82F6' : '#F97316';
    this.ctx.font      = 'bold 14px JetBrains Mono';
    this.ctx.fillText(label, 10, 20);
  }

  drawSlider(splitX: number): void {
    const W = this.canvas.width, H = this.canvas.height;
    this.ctx.save();
    this.ctx.beginPath(); this.ctx.rect(0, 0, splitX, H); this.ctx.clip();
    this.ctx.drawImage(this.imgA, 0, 0, W, H);
    this.ctx.restore();
    this.ctx.save();
    this.ctx.beginPath(); this.ctx.rect(splitX, 0, W - splitX, H); this.ctx.clip();
    this.ctx.drawImage(this.imgB, 0, 0, W, H);
    this.ctx.restore();
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth   = 2;
    this.ctx.beginPath(); this.ctx.moveTo(splitX, 0); this.ctx.lineTo(splitX, H); this.ctx.stroke();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath(); this.ctx.arc(splitX, H/2, 14, 0, 2*Math.PI); this.ctx.fill();
    this.ctx.fillStyle = '#000';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('↔', splitX, H/2 + 5);
  }
}
```

---

### 3.8 WCS Coordinate Transform (Pixel <-> Sky)

```typescript
interface WCSHeader {
  CRPIX1: number; CRPIX2: number;
  CRVAL1: number; CRVAL2: number;
  CD1_1: number; CD1_2: number;
  CD2_1: number; CD2_2: number;
}

class WCSTransform {
  constructor(private header: WCSHeader) {}

  sky2pix(raDeg: number, decDeg: number): [number, number] {
    const cosD = Math.cos(this.header.CRVAL2 * Math.PI / 180);
    const dRA  = (raDeg  - this.header.CRVAL1) * cosD;
    const dDec = decDeg - this.header.CRVAL2;
    const { CD1_1, CD1_2, CD2_1, CD2_2, CRPIX1, CRPIX2 } = this.header;
    const det = CD1_1 * CD2_2 - CD1_2 * CD2_1;
    return [
      (CD2_2 * dRA - CD1_2 * dDec) / det + (CRPIX1 - 1),
      (CD1_1 * dDec - CD2_1 * dRA) / det + (CRPIX2 - 1),
    ];
  }

  pix2sky(px: number, py: number): [number, number] {
    const { CD1_1, CD1_2, CD2_1, CD2_2, CRPIX1, CRPIX2, CRVAL1, CRVAL2 } = this.header;
    const dx = px - (CRPIX1 - 1), dy = py - (CRPIX2 - 1);
    const cosD = Math.cos(CRVAL2 * Math.PI / 180);
    const raDeg  = CRVAL1 + (CD1_1 * dx + CD1_2 * dy) / cosD;
    const decDeg = CRVAL2 + (CD2_1 * dx + CD2_2 * dy);
    return [(raDeg + 360) % 360, decDeg];
  }
}
```

---

### 3.9 False-Color Infrared Composite

```python
import numpy as np
from astropy.visualization import ZScaleInterval

def assemble_false_color(band_red, band_green, band_blue) -> np.ndarray:
    """Produces uint8 RGB array from 3 SPHEREx band stacks."""
    def normalize(arr):
        vmin, vmax = ZScaleInterval().get_limits(arr[np.isfinite(arr)])
        return ((np.clip(arr, vmin, vmax) - vmin) / (vmax - vmin) * 255).astype(np.uint8)
    return np.stack([normalize(band_red), normalize(band_green), normalize(band_blue)], axis=-1)
```

| Channel | Band Range | Wavelength | Physical Meaning |
|---------|-----------|------------|-----------------|
| Red | Bands 80-90 | ~4.0-4.5 um | Thermal IR - warm/cool objects, dust |
| Green | Bands 45-55 | ~2.3-2.7 um | Near-IR - molecular absorption (CO2, CO) |
| Blue | Bands 10-20 | ~0.95-1.15 um | Near visible - stellar photospheres |

---

### 3.10 Confidence Scoring Model

```
score = (
    snr_score         * 0.40  +
    multiband_score   * 0.25  +
    compactness_score * 0.20  +
    quality_score     * 0.15
)

snr_score         = min(1.0, (|SNR| - 5) / 15)    # 5-sigma=0, 20-sigma=1
multiband_score   = n_confirming_bands / 102
compactness_score = 1 - (area_px / pi*r^2)
quality_score     = clean_pixel_fraction_at_detection

0.0-0.3 Very Low | 0.3-0.6 Moderate | 0.6-0.8 High | 0.8-1.0 Very High

Caveats always shown:
- "This detection uses automated algorithms, not expert human review"
- "Full scientific confirmation requires independent follow-up"
- "SPHEREx calibration uncertainty at this wavelength: X%"
- MOST cross-match result (known object or not found)
```

---

## 4. Product Definition and Features

### 4.1 Feature Map

**A. 3D Sky Explorer (Core + WOW Factor)**
- Three.js celestial sphere with real star positions (Hipparcos catalog)
- Live SPHEREx scan path animation (orange sweeping line)
- Candidate markers as glowing rings at detected source positions
- Redshift wedge: radial depth from parallax, colored depth visualization
- Inner solar system orrery with Keplerian orbits
- Click-to-investigate: click any sphere point to load region

**B. Time-Travel Comparison (Core MVP)**
- Coordinate search (RA/Dec) or object name lookup
- IRSA SIA2 archive query returning observation list with dates
- Synchronized before/after image viewer (WCS-locked pixel grid)
- Draggable slider comparison mode (split-screen with handle)
- Blink comparison mode (canvas-based, 800ms default interval)
- Wavelength band selector (all 102 SPHEREx bands with wavelength in um)
- False-color infrared composite display

**C. Spectral Energy Distribution Viewer (Core + Differentiator)**
- 102-band Chart.js SED plot for selected candidates
- Spectral template overlay: methane ice / Y-dwarf / galaxy / comet
- Template chi-squared fitting to classify candidate type
- Interactive hover showing exact band wavelength and flux value

**D. Candidate Explorer (Core MVP)**
- Automated source detection from difference image
- Candidate list ranked by SNR-weighted confidence score
- WCS-projected overlay circles on canvas with SNR labels
- Artifact probability warning flags prominently shown

**E. Evidence Panel (Core MVP)**
- Observation dates and Modified Julian Dates (MJD)
- Sky coordinates in RA/Dec ICRS
- Measured flux change (delta-flux +/- sigma_flux)
- Signal-to-Noise Ratio of detected change
- Parallax distance estimate (from pixel shift + pixel scale)
- Per-pixel quality flag breakdown
- Confidence score 0.0-1.0 with plain-English explanation
- Spectral type classification from template fit + chi-squared
- MOST solar system cross-match result
- Direct links to IRSA source FITS files

**F. AI Astronomy Assistant (Stretch)**
- Plain-English explanation of selected observations
- Evidence-grounded answers via Gemini API

---

## 5. UI / UX Design - Premium Dark Theme

### 5.1 Design Philosophy

SkyTrace must be the most visually stunning submission. The aesthetic principle: **"You are inside the data."**

### 5.2 Color System

```css
:root {
  --color-void:        #01030A;
  --color-deep:        #06090F;
  --color-surface:     #0B1021;
  --color-surface-alt: #111827;
  --color-border:      #1E2D45;
  --color-border-glow: #1E3A8A44;

  --color-plasma:       #3B82F6;
  --color-plasma-glow:  #3B82F620;
  --color-infrared:     #F97316;
  --color-infrared-glow:#F9731620;
  --color-candidate:    #22C55E;
  --color-alert-high:   #EF4444;
  --color-warning:      #F59E0B;
  --color-nebula:       #8B5CF6;

  --color-text-primary:   #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-muted:     #475569;
  --color-text-data:      #7DD3FC;
}
```

### 5.3 Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root {
  --font-ui:   'Inter', system-ui, sans-serif;
  --font-data: 'JetBrains Mono', monospace;
}
```

### 5.4 Glassmorphism Panel System

```css
.panel {
  background: linear-gradient(135deg, rgba(11,16,33,0.85) 0%, rgba(6,9,15,0.90) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(30,45,69,0.6);
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(59,130,246,0.05), 0 8px 32px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.04);
}
.panel--glow {
  box-shadow: 0 0 0 1px rgba(59,130,246,0.15), 0 0 30px rgba(59,130,246,0.08),
              0 8px 32px rgba(0,0,0,0.5);
}
.panel--infrared-glow {
  box-shadow: 0 0 0 1px rgba(249,115,22,0.15), 0 0 40px rgba(249,115,22,0.10),
              0 8px 32px rgba(0,0,0,0.5);
}
```

### 5.5 Micro-Animations

```css
@keyframes candidatePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.08); }
}
.candidate-ring { animation: candidatePulse 2s ease-in-out infinite; }

@keyframes dataFlash {
  0%   { color: var(--color-infrared); }
  100% { color: var(--color-text-data); }
}
.data-value.updated { animation: dataFlash 0.6s ease-out; }
```

### 5.6 Layout Architecture

```
+---------------------------------------------------------------+
|  HEADER GLASS STRIP                                           |
|  [SkyTrace]  [Explorer] [Compare] [Candidates]  [AI]          |
+----------------------------------+----------------------------+
|                                  |                            |
|  3D CELESTIAL SPHERE             |  SIDE PANEL                |
|  (Three.js, full height)         |  [ Region Search ]         |
|                                  |  [ RA/Dec Input  ]         |
|  * . . . * (star field)          |  [ Observation   ]         |
|    O (candidate ring)            |  [ Timeline      ]         |
|  . . . ---- scan line ------     |                            |
|                                  |                            |
+----------------------------------+----------------------------+
|  COMPARISON VIEWER (BlinkViewer Canvas)                       |
|  [BLINK] [SLIDER] [DIFF] [FALSE-COLOR]   [Pause  800ms ----] |
|  +----------------------------------------------------+       |
|  |  EPOCH A  (FITS image + candidate overlays)        |       |
|  +----------------------------------------------------+       |
+---------------------------------------------------------------+
|  WAVELENGTH PICKER  [=====|=============]  Band 52  2.42 um  |
|  0.75um  Array1  Array2  Array3  Array4  Array5  Array6  5um  |
+----------------------------------+----------------------------+
|  CANDIDATE LIST                  |  SED CHART (102 bands)    |
|  [#1 SNR:12.4 conf:0.91]         |  [flux vs wavelength]     |
|  [#2 SNR:8.1  conf:0.67]         |  [methane ice template]   |
|  [#3 SNR:5.3  conf:0.41]         |                           |
+----------------------------------+----------------------------+
```

---

## 6. System Architecture Overview

### 6.1 High-Level Architecture

```
USER BROWSER
  Three.js 3D Celestial Sphere + Orrery
  BlinkViewer + SliderComparator (Canvas)
  SED Chart (Chart.js 102 bands)
  Evidence Panel + Confidence Gauge (D3)
        |
        | HTTPS + WebSocket
        |
SKYTRACE BACKEND  Python 3.12 + FastAPI + Hexagonal Architecture
  [FastAPI Routers - Inbound Adapters]
    |
  [Use Cases: QuerySkyRegion | CompareObs | SearchCandidates | Evidence | SED]
    |
  [Domain: SkyRegion | Observation | FITSImage | Candidate | Evidence | SpectralSED]
    |
  [Outbound Adapters: IRSA SIA2 | IBE | astropy | NumPy | Redis | SQLite]
        |
NASA/IPAC IRSA Archive          Local Persistence + Cache
  SPHEREx QR3 FITS Files        SQLite (observation metadata)
  SIA2 Programmatic Query       Redis (PNG tiles + SED data)
  IBE Cutout Service
  MOST Moving Object Tool
```

### 6.2 Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 3D Engine | Three.js r137 | Same as SPHEREx Scope 3D; proven approach |
| Spectral Chart | Chart.js 4 | Same as SPHEREx Scope 3D; 102-band SED |
| Blink Engine | Canvas 2D | Same as SPHEREx Scope 3D; pixel-perfect |
| Backend | Hexagonal (Ports/Adapters) | IRSA changes isolated from domain |
| Frontend | Next.js 14 App Router | SSR for share links; TypeScript |
| Backend Framework | FastAPI + Python 3.12 | Async I/O; astropy/NumPy |
| Primary DB | SQLite + SQLAlchemy async | Zero-ops hackathon |
| Cache | Redis | Expensive FITS pipeline; sub-ms cached reads |

---

## 7. Frontend Architecture

### 7.1 Technology Stack

| Library | Version | Role |
|---------|---------|------|
| Next.js | 14.x | App Router, SSR, TypeScript |
| Three.js | r137 | 3D celestial sphere + orrery |
| Chart.js | 4.x | 102-band SED chart |
| Radix UI | Latest | Accessible base primitives |
| Framer Motion | 11.x | Evidence panel, transitions |
| Zustand | 4.x | Global state management |
| TanStack Query | v5 | Server state and caching |
| D3.js | 7.x | Confidence gauge |
| Canvas API | HTML5 | Blink engine |
| Vanilla CSS Modules | - | Design system |

### 7.2 Component Structure

```
app/
  layout.tsx                 Root layout
  page.tsx                   Landing: 3D sphere hero
  explore/page.tsx           Sky Region Explorer
  compare/[obs1]/[obs2]/     Comparison viewer (CORE)
  candidate/[id]/page.tsx    Evidence Panel + SED
  components/
    sky3d/
      CelestialSphere.tsx    Three.js scene root
      StarField.tsx          Hipparcos stars via BufferGeometry
      SPHERExScanPath.tsx    Animated scan line
      CandidateMarkers.tsx   Orange ring overlays
      RedshiftWedge.tsx      Radial depth visualization
      Orrery.tsx             Solar system with Keplerian orbits
    comparison/
      BlinkViewer.tsx        Canvas blink engine (CORE)
      SliderComparator.tsx   Draggable split panel
      DifferenceImage.tsx    False-color difference display
      WavelengthPicker.tsx   102-band selector
    spectral/
      SEDChart.tsx           Chart.js 102-band SED plot
      SpectralTemplatePicker Template overlay selector
    candidate/
      CandidateList.tsx      Ranked confidence list
      EvidencePanel.tsx      Side drawer with measurements
      ConfidenceGauge.tsx    D3 arc confidence indicator
      ParallaxDistance.tsx   Distance estimate display
    shared/
      FITSScaler.tsx         Scaling controls
      CoordDisplay.tsx       Multi-format RA/Dec display
```

### 7.3 Zustand State Slices

```typescript
// skySlice
{ ra: number; dec: number; radius: number;
  selectedRegion: SkyRegion | null; observations: Observation[] }

// comparisonSlice
{ obs1: Observation | null; obs2: Observation | null;
  band: number; wavelengthUm: number;
  mode: 'blink' | 'slider' | 'difference' | 'falsecolor';
  scaling: ScalingMode; blinkInterval: number; sliderX: number }

// candidateSlice
{ candidates: Candidate[]; selectedId: string | null;
  minConfidence: number; sortBy: 'confidence' | 'snr' }

// evidenceSlice
{ measurements: Measurement[]; flags: Record<string, boolean>;
  caveats: string[]; irsaLinks: IrsaLink[];
  sedData: SpectralSED | null;
  bestFitTemplate: string | null }
```

---

## 8. Backend Architecture - Hexagonal Design

### 8.1 Domain Entities

```python
@dataclass
class SkyRegion:
    ra: float; dec: float; radius_deg: float; label: str | None = None

@dataclass
class Observation:
    id: str; epoch_mjd: float; band: int; wavelength_um: float
    quality_pct: float; fits_url: str; obs_date: str; data_release: str

@dataclass
class FITSImage:
    data: np.ndarray; variance: np.ndarray; flags: np.ndarray
    wcs_header: dict; epoch_mjd: float; band: int; wavelength_um: float

@dataclass
class SpectralSED:
    wavelengths: np.ndarray    # 102 values in um
    fluxes: np.ndarray
    errors: np.ndarray
    best_fit_template: str     # 'methane_ice' | 'y_dwarf' | 'galaxy' | 'comet'
    chi2: float

@dataclass
class Candidate:
    id: str; ra: float; dec: float
    pixel_x: float; pixel_y: float
    snr_change: float; delta_flux: float; delta_flux_sigma: float
    motion_arcsec: float; parallax_distance_pc: float | None
    artifact_probability: float; confidence_score: float
    most_match: bool; most_object_name: str | None
    spectral_template: str | None

@dataclass
class Evidence:
    id: str; candidate_id: str
    narrative: str; measurements: list[dict]
    caveats: list[str]; irsa_links: list[dict]
    quality_flags: dict[str, bool]
    sed: SpectralSED | None
```

Domain Services:
- `CoordinateService` - ICRS validation, format conversion, unit vector calculation
- `ConfidenceScorer` - SNR + quality + multi-band -> float 0.0-1.0
- `ArtifactChecker` - Real source vs artifact classification
- `ParallaxCalculator` - Pixel shift -> physical distance
- `SpectralTemplateFitter` - chi-squared fit of 102-band data to 4 templates

### 8.2 Directory Structure

```
backend/
  src/
    domain/
      entities/   sky_region | observation | fits_image | candidate | evidence | spectral_sed
      services/   coordinate_service | confidence_scorer | artifact_checker
                  parallax_calculator | spectral_template_fitter
      exceptions.py
    application/
      ports/
        inbound.py   IQuerySkyRegion | ICompareObservations | IGetSED
        outbound.py  IFITSImageSource | ICacheService | IImageProcessor
      use_cases/
        query_sky_region.py
        compare_observations.py
        search_candidates.py
        generate_evidence.py
        get_sed.py
    infrastructure/
      adapters/
        irsa_sia_adapter.py
        irsa_ibe_adapter.py
        astropy_fits_adapter.py
        numpy_processor.py
        spectral_extractor.py
        most_adapter.py
        redis_cache.py
        sqlite_repository.py
      api/v1/
        routers/   observations | compare | candidates | evidence | tiles | sed
        schemas.py
      db/  models.py | session.py
      config.py
  tests/unit/  tests/integration/
  main.py
  pyproject.toml
```

---

## 9. Data Layer and Database Architecture

### 9.1 Entity-Relationship Diagram

```
SkyRegion (1:N) Observation (1:N) Comparison (1:N) Candidate (1:1) Evidence
   id UUID          id UUID           id UUID           id UUID         id UUID
   ra float         region_id FK      obs_a_id FK       comparison_id   candidate_id
   dec float        epoch_mjd         obs_b_id FK       ra, dec         narrative
   radius_deg       band_index        band int          snr_change      caveats JSON
   label str?       wavelength_um     processing_ms     delta_flux      irsa_links
                    fits_url                            confidence      quality_flags
                    quality_pct                         most_match      sed_json
                    data_release                        most_object     spectral_type
                    obs_date                            parallax_dist   chi2_fit
```

### 9.2 Redis Cache Key Schema

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `obs_meta:{sha256(ra,dec,radius)}` | SIA2 JSON | 1 hour |
| `fits_tile:{obs_id}:{band}:{scaling}` | base64 PNG | 24 hours |
| `comparison:{a_id}:{b_id}:{band}` | CompResult JSON | 12 hours |
| `candidates:{comparison_id}` | Candidate[] JSON | 12 hours |
| `evidence:{candidate_id}` | Evidence JSON | 24 hours |
| `sed:{candidate_id}:{band_range}` | SED JSON (102 points) | 24 hours |
| `rate_limit:{ip}` | sliding counter | 60 seconds |

---

## 10. Data Pipeline - FITS to Web

### 10.1 Twelve-Stage Processing Pipeline

**Stage 1: RETRIEVAL**
IRSA IBE API cutout via httpx async GET
`?center={ra},{dec}&size=0.2` (0.2-degree cutout)

**Stage 2: PARSING (astropy.io.fits)**
Open MEF file, extract IMAGE + FLAGS + VARIANCE, parse WCS headers.

**Stage 3: QUALITY MASKING**
`science_masked = np.ma.masked_where(flags != 0, science_data)`

**Stage 4: WCS ALIGNMENT (reproject)**
`reproject_interp((image_b, wcs_b), wcs_a, shape_out=image_a.shape)`

**Stage 5: BACKGROUND SUBTRACTION (photutils)**
`bkg = Background2D(image, box_size=50)` then subtract.

**Stage 6: IMAGE SUBTRACTION (NumPy)**
`difference = image_a_clean - image_b_aligned_clean`
`snr_map = difference / sqrt(variance_a + variance_b_reprojected)`

**Stage 7: SOURCE DETECTION (DAOStarFinder)**
`sources = DAOStarFinder(fwhm=3.0, threshold=5.0*std)(snr_map - median)`
Only sources with |SNR| > 5.0 (5-sigma threshold).

**Stage 8: PARALLAX CALCULATION**
For each candidate with motion detected: compute `parallax_distance_pc`.

**Stage 9: SPECTRAL SED EXTRACTION**
Aperture photometry at candidate position across all fetched bands.
Chi-squared template fitting -> spectral type classification.

**Stage 10: CONFIDENCE SCORING**
`ConfidenceScorer.score(snr, quality_pct, most_match, multi_band)`

**Stage 11: PNG TILE RENDERING (astropy + Pillow)**
ZScale normalize -> uint8 -> PIL.Image -> PNG -> base64 -> Redis cache.
Also render false-color composite (R/G/B from 3 band groups).

**Stage 12: JSON RESPONSE**
Return `{image_a_url, image_b_url, difference_url, falsecolor_url, wcs, candidates[], sed_data, metadata}`.

---

## 11. Tech Stack - Full Justification

### 11.1 Frontend

| Technology | Version | Why |
|------------|---------|-----|
| Next.js | 14.x | SSR + TypeScript |
| Three.js | r137 | Same as SPHEREx Scope 3D |
| Chart.js | 4.x | Same as SPHEREx Scope 3D |
| Zustand | 4.x | Investigation state model |
| TanStack Query | v5 | Caching + background refetch |
| D3.js | 7.x | Confidence gauge |
| Framer Motion | 11.x | Evidence panel animation |
| Radix UI | Latest | Accessible primitives |

### 11.2 Backend

| Technology | Version | Why |
|------------|---------|-----|
| Python | 3.12 | Astropy/NumPy ecosystem |
| FastAPI | 0.111 | Async; Pydantic v2 |
| astropy | 6.x | FITS, WCS, coordinates |
| pyvo | 1.5 | Official SIA2 library |
| reproject | 0.13 | WCS-aware reprojection |
| photutils | 1.12 | DAOStarFinder + aperture photometry |
| scipy | 1.13 | Chi-squared template fitting |
| httpx | 0.27 | Async HTTP |
| Redis | 7.x | Sub-ms reads + Pub/Sub |
| matplotlib | 3.9 | RdBu_r difference images |

### 11.3 DevOps

| Tool | Purpose |
|------|---------|
| Docker Compose | Local dev: all services |
| Vercel | Frontend deployment |
| Railway | Backend + Redis deployment |
| GitHub Actions | CI: ruff + mypy + pytest |
| uv | Python deps management |

---

## 12. API Contract

### 12.1 REST Endpoints

```
GET  /api/v1/observations
     ?ra=float &dec=float &radius=float &start_date=ISO? &band=int?
     -> { observations: Observation[], total: int }

GET  /api/v1/compare
     ?obs_a=str &obs_b=str &band=int
     -> ComparisonResult { image_a_url, image_b_url, difference_url,
                           falsecolor_url, wcs, candidates[], metadata }

GET  /api/v1/tiles/{obs_id}
     ?band=int? &scaling=linear|log|sqrt|zscale &colormap=str?
     -> PNG image binary

GET  /api/v1/candidates
     ?comparison_id=str &min_confidence=float? &sort_by=confidence|snr?
     -> { candidates: Candidate[], total: int }

GET  /api/v1/candidates/{id}/evidence
     -> Evidence { narrative, measurements[], caveats[], irsa_links[], sed }

GET  /api/v1/candidates/{id}/sed
     -> { wavelengths: number[], fluxes: number[], errors: number[],
          bestFitTemplate: str, chi2: float,
          templates: { methane_ice: number[], y_dwarf: number[],
                       galaxy: number[], comet: number[] } }

GET  /api/v1/most-check
     ?ra=float &dec=float &epoch_mjd=float
     -> { match: bool, object_name?: str, object_type?: str }

GET  /api/v1/wavelengths
     -> { bands: { index: int, wavelength_um: float, array: int }[] }

WS   /ws/processing/{job_id}
     Server -> Client: { progress: float, stage: str, message: str }
```

### 12.2 TypeScript Schemas

```typescript
interface Candidate {
  id: string; ra: number; dec: number;
  pixelX: number; pixelY: number;
  snrChange: number; deltaFlux: number; deltaFluxSigma: number;
  motionArcsec: number; parallaxDistancePc: number | null;
  artifactProbability: number; confidenceScore: number;
  mostMatch: boolean; mostObjectName: string | null;
  spectralTemplate: 'methane_ice' | 'y_dwarf' | 'galaxy' | 'comet' | null;
}

interface SpectralSED {
  wavelengths: number[];
  fluxes: number[];
  errors: number[];
  bestFitTemplate: string;
  chi2: number;
  templates: Record<string, number[]>;
}

interface Evidence {
  id: string; candidateId: string;
  narrative: string;
  measurements: { label: string; value: string; unit: string }[];
  caveats: string[];
  irsaLinks: { label: string; url: string }[];
  qualityFlags: Record<string, boolean>;
  sed: SpectralSED | null;
}
```

---

## 13. Security, Performance and Scalability

### 13.1 Security Controls

| Concern | Mitigation |
|---------|-----------|
| CORS with IRSA | All IRSA calls proxied through backend |
| API credentials | Backend env vars only |
| Coordinate injection | RA/Dec validated to ICRS ranges |
| FITS URL validation | Only IRSA domain URLs; strict whitelist |
| Rate limiting | Redis sliding window; max 10 IRSA calls/min/IP |
| SQL injection | SQLAlchemy ORM parameterized queries |

### 13.2 Performance Targets

| Operation | Target P95 | Strategy |
|-----------|-----------|---------|
| Observation search | < 500ms | Redis 1h cache of SIA2 results |
| FITS tile (first) | < 3s | IBE cutout + NumPy + immediate cache |
| FITS tile (cached) | < 50ms | Redis 24h PNG cache |
| Comparison (first) | < 10s | Async pipeline + WebSocket progress |
| Comparison (cached) | < 100ms | Redis 12h result cache |
| Blink toggle | < 16ms | Pre-loaded canvas, requestAnimationFrame |
| SED extraction (first) | < 5s | Multi-band aperture photometry |
| SED (cached) | < 30ms | Redis 24h SED cache |
| 3D sphere | 60 fps | Three.js BufferGeometry everywhere |

### 13.3 Scalability Path

| Phase | Database | Workers | Cache |
|-------|---------|---------|-------|
| Hackathon | SQLite | Single uvicorn | Redis 7 |
| Phase 2 | PostgreSQL | Multiple replicas | Redis Cluster |
| Phase 3 | PostgreSQL | Celery task queue | Redis + S3 |
| Phase 4 | PostgreSQL | AWS Lambda tiles | S3 + CloudFront |

---

## 14. Deployment Architecture

### 14.1 Production (Hackathon)

```
Vercel (Frontend CDN)               Railway (Backend PaaS)
+-------------------+               +--------------------------+
| Next.js 14 App    | <-- REST -->  | FastAPI + uvicorn        |
| Global CDN        | <-- WSock --> | Redis (Railway addon)     |
| Auto HTTPS/TLS    |               | SQLite (persistent vol.)  |
+-------------------+               +-----------+--------------+
                                                |
                                    +-----------v----------+
                                    | NASA/IPAC IRSA       |
                                    | SPHEREx QR3 Data     |
                                    +----------------------+
```

### 14.2 Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:8000"
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      REDIS_URL: "redis://redis:6379"
      DATABASE_URL: "sqlite+aiosqlite:///./data/skytrace.db"
      IRSA_SIA2_URL: "https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3"
      IRSA_IBE_URL: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3"
      IRSA_MOST_URL: "https://irsa.ipac.caltech.edu/applications/MOST"
    volumes: ["./backend/data:/app/data"]
    depends_on: [redis]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis_data:/data"]

volumes:
  redis_data:
```

---

## 15. Competitive Differentiation Strategy

### 15.1 What We Have That Others Don't

| Generic Submission | SkyTrace |
|-------------------|----------|
| Display astronomical images | Live SPHEREx QR3 data from NASA IRSA |
| Basic date selector | WCS-aligned blink + slider comparison engine |
| Static 3D scene | Three.js sphere using same engine as SPHEREx Scope 3D |
| Show detected dots | Evidence trail with confidence + spectral classification |
| No spectral analysis | 102-band SED + template fitting (methane ice, Y-dwarf, comet) |
| No distance info | Parallax distance calculator from pixel motion |
| Beautiful theme only | Premium UI AND scientifically defensible workflow |
| Mock data | Working end-to-end pipeline on real IRSA data |

### 15.2 Judging Criterion Mapping

| Criterion | SkyTrace Approach |
|-----------|--------------------|
| **Impact** | Enables citizen science with real NASA SPHEREx data |
| **Creativity** | 102-band SED + parallax distances + template classification |
| **Technical** | Hexagonal + FITS pipeline + WCS + photometry + Three.js + spectral physics |
| **Feasibility** | Working end-to-end on live IRSA data |
| **Presentation** | Premium deep-space UI, 3D sphere, live demo |

---

## 16. Implementation Plan

### Phase 0 - Setup and Validation (Hours 0-4)

**Goal:** All infrastructure running, real SPHEREx data confirmed accessible.

```
[ ] Create Git monorepo: frontend/ + backend/ + docker-compose.yml
[ ] Backend: uv init, install all dependencies
[ ] Frontend: npx create-next-app@14 frontend --typescript --app
[ ] Frontend: npm install three chart.js @types/three framer-motion zustand @tanstack/react-query d3
[ ] Docker Compose: all 3 services start cleanly (3000/8000/6379)
[ ] IRSA SIA2 validation test: pyvo search at Orion (RA=83.8, Dec=-5.4)
[ ] FITS parse test: download 1 file, confirm astropy reads all 6 HDUs
[ ] Verify SPHEREX_WAVELENGTHS: lambda_1=0.75, lambda_102=5.0
[ ] Pre-cache 3 featured sky regions for landing page
[ ] Confirm team roles: Backend lead | 3D lead | UI lead | Science/QA
```

---

### Phase 1 - Scientific Backend Pipeline (Hours 4-14)

**Goal:** Working /api/v1/compare returning real JSON from real IRSA data.

#### 1A. Domain Entities and Services (Hours 4-6)

```
[ ] All domain entities as Python @dataclass (no FastAPI/Redis imports)
[ ] CoordinateService: ICRS validation, deg<->rad, unit vector
[ ] ParallaxCalculator.compute(pixel_shift, pixel_scale_arcsec) -> distance_pc
[ ] ConfidenceScorer.score(snr, quality_pct, most_match, n_bands) -> float + caveats
[ ] SpectralTemplateFitter: all 4 templates (methane_ice, y_dwarf, comet, galaxy)
[ ] ArtifactChecker: compactness + symmetry heuristic
[ ] Unit tests for all domain services
```

#### 1B. IRSA Adapters (Hours 6-9)

```python
# IRSASIAAdapter
async def search(self, ra, dec, radius) -> list[Observation]:
    service = pyvo.dal.SIA2Service(self.sia2_url)
    results = service.search(pos=(ra, dec), size=radius)
    return [self._to_observation(r) for r in results]

# IRSAIBEAdapter
async def fetch_cutout(self, ra, dec, size_deg=0.2) -> bytes:
    url = f"{self.ibe_url}/cutout?center={ra},{dec}&size={size_deg}"
    async with httpx.AsyncClient() as client:
        return (await client.get(url, timeout=30)).content

# AstropyFITSAdapter
def parse(self, fits_bytes: bytes) -> FITSImage:
    with fits.open(BytesIO(fits_bytes)) as hdul:
        return FITSImage(
            data=hdul['IMAGE'].data.astype(np.float32),
            variance=hdul['VARIANCE'].data.astype(np.float32),
            flags=hdul['FLAGS'].data,
            wcs_header=dict(hdul['IMAGE'].header),
            epoch_mjd=hdul[0].header.get('MJD-OBS', 0.0),
            band=hdul[0].header.get('BAND', 1),
            wavelength_um=SPHEREX_WAVELENGTHS[hdul[0].header.get('BAND',1)-1]
        )
```

#### 1C. Image Processing Pipeline (Hours 9-12)

```python
class NumpyImageProcessor:
    async def align(self, a, b):
        b_aligned, _ = reproject_interp((b.data, WCS(b.wcs_header)),
                                        WCS(a.wcs_header), a.data.shape)
        return a, replace(b, data=b_aligned)

    async def subtract(self, a, b):
        diff  = a.data - b.data
        sigma = np.sqrt(a.variance + b.variance)
        return diff / np.where(sigma > 0, sigma, 1)

    async def detect_sources(self, snr_map, threshold_sigma=5.0):
        _, median, std = sigma_clipped_stats(snr_map, sigma=3.0)
        return DAOStarFinder(fwhm=3.0, threshold=threshold_sigma*std)(snr_map-median)

class SpectralExtractor:
    async def extract_sed(self, px, py, band_images) -> SpectralSED:
        fluxes, errors = [], []
        for img in band_images:
            aperture = CircularAperture((px, py), r=5.0)
            phot = aperture_photometry(img.data, aperture, error=np.sqrt(img.variance))
            fluxes.append(float(phot['aperture_sum'][0]))
            errors.append(float(phot['aperture_sum_err'][0]))
        best, chi2 = self._template_fitter.fit(np.array(fluxes))
        return SpectralSED(SPHEREX_WAVELENGTHS[:len(fluxes)], fluxes, errors, best, chi2)
```

#### 1D. FastAPI Routes (Hours 12-14)

```
[ ] GET /api/v1/observations - SIA2 search
[ ] GET /api/v1/compare      - Full 12-stage pipeline
[ ] GET /api/v1/tiles/{id}   - PNG tile + Redis cache
[ ] GET /api/v1/wavelengths  - Full SPHEREX_WAVELENGTHS table
[ ] WS  /ws/processing/{id}  - Real-time progress via Redis Pub/Sub
[ ] Integration test: real RA/Dec -> candidates with SED
```

---

### Phase 2 - 3D Celestial Sphere Frontend (Hours 14-22)

**Goal:** Beautiful interactive Three.js sphere as the app centerpiece.

#### 2A. Three.js Scene Foundation (Hours 14-17)

```
[ ] WebGLRenderer antialias, alpha:true, fill viewport
[ ] PerspectiveCamera(60, W/H, 0.1, 1000), position (0,0,150)
[ ] OrbitControls: autoRotate=true speed=0.3, min/maxDistance=[60,200]
[ ] Celestial sphere: SphereGeometry(100,64,64) BackSide opacity=0.12
[ ] Milky Way: 8000 random points on great circle + 3000 scattered
[ ] Star field: Hipparcos subset, icrsToUnitVector(), BufferGeometry Points
[ ] RA/Dec grid: great circles at 0h,2h,4h RA and 0,+-30,+-60 Dec
[ ] requestAnimationFrame loop with OrbitControls.update()
```

#### 2B. SPHEREx Scene Layers (Hours 17-20)

```
[ ] SPHERExScanPath: animated orange ring, scanAngle += 0.001/frame
[ ] CandidateMarkers: RingGeometry at icrsToUnitVector(ra,dec,100)
    - lookAt(scene.position) to face camera
    - orange if confidence > 0.7, green otherwise
    - opacity oscillation for pulse effect
    - click -> dispatch candidateSelected -> open Evidence Panel
[ ] RedshiftWedge: candidates with parallax_distance_pc
    - depth = 10 + 80*(1-exp(-distance/1000))
    - hue = 0.7*(1-depth/90) -> blue=far, red=near
    - depth legend gradient on left edge
[ ] Orrery: EllipseCurve orbits + keplerToCartesian planet positions
    - positions updated every frame using julianDate(now)
```

#### 2C. Scene Interactivity (Hours 20-22)

```
[ ] Raycaster on mousemove: highlight nearest star/candidate
[ ] Glassmorphism tooltip: name, RA/Dec, SPHEREx data
[ ] Click to investigate: ray intersect sphere -> pix2sky() -> navigate
[ ] Touch: pinch-zoom, drag-rotate (OrbitControls)
```

---

### Phase 3 - Comparison and SED Frontend (Hours 22-32)

**Goal:** Complete blink/slider/diff viewer + SED chart.

#### 3A. BlinkViewer Canvas Component (Hours 22-25)

```
[ ] BlinkComparator class as specified in section 3.7
[ ] Mode tabs: BLINK | SLIDER | DIFFERENCE | FALSE COLOR
[ ] Candidate overlays: WCSTransform.sky2pix() -> canvas.arc() rings
[ ] Keyboard shortcuts: Space=pause/play, A/B=freeze on epoch
[ ] Blink speed slider: 200-2000ms with live label
[ ] Epoch badge: animated fade between blue EPOCH A and orange EPOCH B
```

#### 3B. Wavelength Picker (Hours 25-26)

```
[ ] Horizontal range input: min=1 max=102 step=1
[ ] Visual track: CSS gradient deep-blue to deep-red
[ ] Detector array labels Array1..Array6 at boundaries
[ ] Current band: large number + exact lambda in um
[ ] On change: reload tile images, glow animation
```

#### 3C. SED Chart (Hours 26-29)

```
[ ] Chart.js dark theme, X-axis log scale 0.75-5.0 um
[ ] Candidate SED: solid orange line
[ ] Error bars: scatter with error bar plugin
[ ] 4 template overlays: methane(blue) | y-dwarf(amber) | galaxy(purple) | comet(green)
[ ] Best fit: solid with glow + "BEST FIT" badge
[ ] Chi-squared value displayed
[ ] Click chart point: jumps to that band in WavelengthPicker
[ ] Hover tooltip: band index, lambda, flux, error, SNR
[ ] Detector array shading: 6 alternating bands behind chart
```

#### 3D. Candidate List and Evidence Panel (Hours 29-32)

```
[ ] CandidateList: sorted by confidence, color bar, spectral badge, MOST flag
[ ] Filter slider: minConfidence 0.0-1.0
[ ] EvidencePanel: Framer Motion spring slide from right
    - RA/Dec in JetBrains Mono
    - D3 arc confidence gauge color-coded
    - Measurements: delta-flux, SNR, parallax distance (pc/AU/ly)
    - Spectral type badge (large)
    - Chi-squared fit quality
    - MOST result: green KNOWN OBJECT or amber UNMATCHED
    - Caveats: amber icon, always visible, cannot be hidden
    - IRSA links: direct FITS file buttons
    - Mini SED sparkline 60px tall
```

---

### Phase 4 - Sky Explorer and Landing (Hours 32-38)

**Goal:** Complete user journey A: search -> observations -> compare.

#### 4A. Sky Region Explorer (Hours 32-35)

```
[ ] Search bar: RA/Dec input or object name (Simbad lookup)
[ ] Observation timeline: horizontal time axis, quality color dots
[ ] Select 2 obs -> "Compare These" button
[ ] Band filter: by wavelength range or array
[ ] Mini Three.js preview of sky area
```

#### 4B. Landing Page Hero (Hours 35-38)

```
[ ] Full-viewport CelestialSphere as background
[ ] Glassmorphism hero panel:
    "SkyTrace - Explore the sky. Compare the evidence."
    [-> Start Exploring] button
[ ] 3 featured observation cards (pre-cached at startup)
[ ] Floating stat badges: "102 spectral bands" | "0.75-5 um" | "SPHEREx QR3"
[ ] Animated particle field in background (very slow drift)
```

---

### Phase 5 - Polish and Differentiation (Hours 38-44)

```
[ ] False-color composite view: 3-band RGB, special falsecolor mode
[ ] Difference image: matplotlib RdBu colormap (red=increase, blue=decrease)
[ ] MOST cross-match badge for every candidate
[ ] AI Astronomy Assistant (stretch): Gemini API, evidence-grounded Q&A
[ ] Artifact warning: yellow banner when artifactProbability > 0.5
[ ] WebSocket progress bar: stage names during pipeline
    "Fetching FITS... Aligning WCS... Detecting sources... Extracting SED..."
[ ] Share link: /compare/{obs_a}/{obs_b}?band=52&candidate=abc123
[ ] Mobile responsive: stacked layout on < 768px
[ ] Export: "Download candidate list as CSV"
[ ] Citation badge: "Data: SPHEREx QR3 (DOI: 10.26131/IRSA662)"
```

---

### Phase 6 - Deployment and Submission (Hours 44-48)

```
[ ] Vercel: connect frontend/, set NEXT_PUBLIC_API_URL
[ ] Railway: deploy backend + Redis, set all IRSA env vars
[ ] End-to-end smoke test on production:
    Search Orion (RA=83.8, Dec=-5.4) -> Observations -> Compare -> Candidates -> SED
[ ] Fix any production bugs (CORS, SSL, Railway sleep)
[ ] Rehearse 3-minute demo: Journey A -> B -> C
[ ] Record demo video (required): full A->B->C journey with narration
[ ] README.md: architecture diagram, setup, data citation, team names
[ ] Project description: highlight real data, scientific honesty, spectral physics
[ ] Submit at spaceappschallenge.org
```

---

### Risk Mitigation Table

| Risk | Probability | Mitigation |
|------|------------|-----------|
| IRSA SIA2 returns no QR3 data for region | Medium | Pre-identify 5 good regions; hard-code fallback coordinates |
| FITS parse failure on unexpected MEF structure | Low | Validate in Phase 0; fallback to test FITS |
| Three.js < 60 fps | Low | BufferGeometry everywhere; cap sphere geometry resolution |
| Redis unavailable in deployment | Low | Graceful fallback: recompute on request |
| IRSA API rate limit hit | Medium | Redis caching 24h TTL; 10 calls/min/IP limit |
| SED data too sparse (few bands in QR3) | Medium | Interpolate between bands; show uncertainty clearly |
| AI assistant out of time | High (likely) | Explicitly a stretch goal; core complete by hour 38 |

---

## Appendix A - SPHEREx Data Resources

| Resource | URL |
|----------|-----|
| SPHEREx at IRSA | https://irsa.ipac.caltech.edu/Missions/spherex.html |
| Archive User Guide | https://caltech-ipac.github.io/spherex-archive-documentation |
| Intro Tutorial | https://caltech-ipac.github.io/irsa-tutorials/spherex-intro |
| Source Discovery Demo | https://caltech-ipac.github.io/irsa-tutorials/spherex-source-discovery-tool-demo |
| SIA2 Endpoint (QR3) | https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3 |
| IBE File Access (QR3) | https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/ |
| AWS S3 Mirror | s3://nasa-irsa-spherex/qr3/ |
| MOST Moving Object Tool | https://irsa.ipac.caltech.edu/applications/MOST |
| QR3 DOI (cite in submission) | 10.26131/IRSA662 |

## Appendix B - Python Dependencies

```toml
[project]
name = "skytrace-backend"
version = "2.0.0"
requires-python = ">=3.12"

[project.dependencies]
fastapi = "^0.111"
uvicorn = {extras = ["standard"], version = "^0.30"}
httpx = "^0.27"
pydantic = "^2.7"
pydantic-settings = "^2.3"
astropy = "^6.1"
pyvo = "^1.5"
reproject = "^0.13"
photutils = "^1.12"
numpy = "^1.26"
scipy = "^1.13"
Pillow = "^10.3"
matplotlib = "^3.9"
redis = {extras = ["hiredis"], version = "^5.0"}
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}
aiosqlite = "^0.20"

[dependency-groups]
dev = ["pytest>=8", "pytest-asyncio>=0.23", "httpx>=0.27",
       "ruff>=0.4", "mypy>=1.10"]
```

## Appendix C - Frontend Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "three": "^0.137.0",
    "@types/three": "^0.137.0",
    "chart.js": "^4.x",
    "d3": "^7.x",
    "framer-motion": "^11.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-slider": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest"
  }
}
```

---

*SkyTrace Blueprint v2.0 - NASA Space Apps Challenge 2026*
*"Explore the sky. Compare the evidence. Follow the changes."*
*Physics reverse-engineered from Solar System Scope and SPHEREx Scope 3D.*
*Data: SPHEREx QR3 (DOI: 10.26131/IRSA662) from NASA/IPAC IRSA*
