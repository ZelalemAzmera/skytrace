# SkyTrace — NASA SPHEREx Discovery Platform

> **NASA Space Apps Challenge 2026 — Track: Planet X and SPHEREx**  
> *Autonomous Multi-Epoch Transient Detection, 102-Band Spectroscopic Diagnostics, and 3D Celestial Discovery Platform*

[![Tests](https://img.shields.io/badge/pytest-18%20passed-06D6A0?style=for-the-badge&logo=pytest)](file:///d:/Projects/Personal%20Projects/Sky%20Trace/backend)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-00E5FF?style=for-the-badge&logo=next.js)](file:///d:/Projects/Personal%20Projects/Sky%20Trace/frontend)
[![SPHEREx Channels](https://img.shields.io/badge/SPHEREx-102%20Spectral%20Bands-FF6B35?style=for-the-badge)](file:///d:/Projects/Personal%20Projects/Sky%20Trace/frontend/app/lib/astrometry.ts)
[![Data DOI](https://img.shields.io/badge/DOI-10.26131%2FIRSA662-FFD166?style=for-the-badge)](https://doi.org/10.26131/IRSA662)

---

## 🌌 Overview

**SkyTrace** is an advanced open-source astronomical platform built for the NASA Space Apps Challenge 2026. It enables astronomers, citizen scientists, and autonomous discovery pipelines to explore NASA's **SPHEREx Quick Release 3 (QR3)** all-sky spectral survey ($0.75 - 5.0\,\mu\text{m}$, 102 spectroscopic channels, 6.2″/pixel astrometric scale).

The platform combines multi-epoch differential photometry, Keplerian orbital mechanics, Astropy TAN World Coordinate System (WCS) transformations, and 102-band Spectral Energy Distribution (SED) template fitting to identify high-confidence candidates for:
1. **Hypothetical Planet X / Ninth Planet** (distant Trans-Neptunian Objects with methane/water ice absorption and slow retrograde parallax).
2. **Ultra-Cool Sub-Stellar Brown Dwarfs** (atmospheric methane and water vapor absorption at $T < 450\,\text{K}$).
3. **Near-Earth and Main-Belt Moving Objects** (cross-matched with the NASA MOST / Minor Planet Center database).
4. **Infrared Astronomical Transients** (novae, variable stars, and high-redshift starburst galaxies).

---

## 🔭 Key Features & Scientific Innovations

### 1. 3D Celestial Sphere & Solar System Orrery
- **Three.js Astronomical Scene**: Inverted celestial sphere with 2,000+ real stars from the Hipparcos catalog, colored by spectral temperature.
- **Coordinate Reference Systems**: Interactive toggles for Celestial Equatorial $(\alpha, \delta)$, Ecliptic $(\lambda, \beta)$, and Galactic $(l, b)$ coordinate grids (IAU 1958 standard with $l_{NCP} = 122.93192^\circ$).
- **Keplerian Orbital Physics**: Solves Kepler's equation ($M = E - e\sin E$) for eccentric anomaly with $10^{-8}$ convergence to render live planetary orbits (Mercury, Venus, Earth, Mars, Jupiter).
- **SPHEREx Survey Ring**: Animated precession ring demonstrating the SPHEREx polar low-Earth sun-synchronous scanning cadence.

### 2. Time-Travel Blink Comparator
- **Blink Mode**: Rapid alternation between Epoch A and Epoch B passes (200–2,000 ms cadence) with keyboard shortcuts (`Space` to pause, `A` / `B` to freeze frames).
- **Split Slider Mode**: Interactive vertical divider allowing continuous left-to-right swipe between epochs.
- **Flux Difference Mode**: Computes pixel-level difference ($I_B - I_A$) rendered through a high-contrast diverging colormap:
  $$\text{Fading / Deficit (Cyan)} \longleftrightarrow \text{Neutral (Black)} \longleftrightarrow \text{Brightening / Excess (Orange)}$$
- **Multi-Band False-Color RGB**: Assembles 3-band composite images using the **Lupton et al. (2004) Asinh stretch**:
  $$I = \frac{\text{asinh}(Q \cdot (r + g + b) / \text{stretch})}{Q}$$
  Presets: *CH₄ Methane Diagnostic*, *H₂O Ice & Silicate*, *Standard 2MASS NIR*, and *Full-Span Thermal Contrast*.

### 3. 102-Band SED Curve & Spectral Template Fitter
- Interactive logarithmic curve displaying measured SPHEREx photometry and observational error bars across all 102 channels ($0.75 - 5.0\,\mu\text{m}$).
- Real-time weighted least-squares template fitting calculating reduced chi-squared:
  $$\chi^2_\nu = \frac{1}{\nu} \sum_{i=1}^{102} \left(\frac{F_i - a \cdot T_i}{\sigma_i}\right)^2$$
- 4 Synthetic Reference Templates:
  - **Y-Dwarf Brown Dwarf**: Methane ($1.66\,\mu\text{m}$, $3.3\,\mu\text{m}$) and H₂O vapor bands.
  - **Methane Ice TNO / Planet X**: Solid-state narrow absorption lines at $1.67\,\mu\text{m}$, $2.32\,\mu\text{m}$, and $3.32\,\mu\text{m}$.
  - **High-z Starburst Galaxy**: Lyman break, redshifted $4000\,\text{Å}$ Balmer break, and PAH emission.
  - **Active Comet**: Dual volatile emission signatures from H₂O gas ($2.7\,\mu\text{m}$) and CO₂ gas ($4.26\,\mu\text{m}$).

### 4. NASA MOST Minor Planet Cross-Match & Artifact Guard
- **Automated Asteroid Cross-Match**: Live angular separation test against known minor planets and comets (Ceres, Vesta, Pallas, Bennu, Apophis, Halley, 67P, Pluto, Sedna). If separation $< 60″$, flags known Solar System origin; if $> 60″$, validates extra-solar / outer TNO origin.
- **Detector Boundary Guard**: Flags candidates located $< 15\,\text{px}$ from the sensor detector boundary to prevent false positives from focal plane diffraction edge effects.

### 5. Multi-Format Scientific Dossier Export
- **JSON Export**: Full telemetry, astrometry, SNR changes, confidence breakdown, caveats, and NASA IRSA archive URLs.
- **CSV Catalog Export**: Instant spreadsheet download of all filtered candidates for external analysis in Astropy, TOPCAT, or Aladin.
- **Official SPHEREx QR3 Citation**: BibTeX export with official DOI badge (`DOI: 10.26131/IRSA662`).

---

## 📐 Scientific Equations & Reference Physics

| Mechanism | Equation / Formula | Implementation |
|---|---|---|
| **SPHEREx Linear Variable Filter (LVF)** | $\lambda_i = 0.75 \times \left(\frac{5.0}{0.75}\right)^{\frac{i-1}{101}}\,\mu\text{m}$ | `getSPHERExWavelength(band)` |
| **Kepler's Equation (Eccentric Anomaly)** | $M = E - e\sin(E)$ | `solveKepler(M, e, 1e-8)` |
| **TAN Gnomonic WCS Projection** | $x = -f \frac{\cos\delta\sin(\alpha - \alpha_0)}{\sin\delta\sin\delta_0 + \cos\delta\cos\delta_0\cos(\alpha - \alpha_0)}$ | `WCSTransform.skyToPixel()` |
| **Lupton Asinh RGB Stretch** | $f(I) = \frac{\text{asinh}(Q \cdot I / \text{stretch})}{Q}$ | `asinhStretch(r, g, b, 0.5, 8.0)` |
| **Annual Parallax Distance** | $d = \frac{1}{p}\quad (\text{pc}),\quad p = \frac{\Delta\theta}{2}$ | `ParallaxCalculator.distance_pc()` |
| **Galactic Coordinates (IAU 1958)** | $\sin b = \sin\delta\sin\delta_{NGP} + \cos\delta\cos\delta_{NGP}\cos(\alpha - \alpha_{NGP})$ | `icrsToGalactic()` |

---

## 🏛️ System Architecture

SkyTrace is designed following clean **Hexagonal (Ports and Adapters)** architecture principles:

```
                          ┌───────────────────────────┐
                          │   Next.js 14 Web Client   │
                          │   (Three.js + Chart.js)   │
                          └─────────────┬─────────────┘
                                        │ REST / JSON
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Scientific Backend Server                     │
│                                                                           │
│  [Inbound HTTP Adapters]                                                  │
│   ├── /api/v1/wavelengths          (102 SPHEREx band telemetry)           │
│   ├── /api/v1/observations         (Astrometric cone search & epochs)     │
│   ├── /api/v1/compare              (WCS reproject, align & difference)    │
│   └── /api/v1/candidates/{id}      (Scientific evidence & caveats)        │
│                                                                           │
│  [Application Use Cases]                                                  │
│   ├── QueryObservationsUC          ├── CompareObservationsUC              │
│   └── EvaluateCandidateUC                                                 │
│                                                                           │
│  [Domain Services & Entities]                                             │
│   ├── CoordinateService (ICRS, Gal, Ecl)                                  │
│   ├── ParallaxCalculator (2 AU baseline)                                  │
│   ├── SpectralTemplateFitter (102-band chi-squared)                       │
│   ├── ConfidenceScorer & ArtifactChecker (>15px detector clearance)       │
│                                                                           │
│  [Outbound Adapters]                                                      │
│   ├── AstropyFITSAdapter           ├── NumpyImageProcessor (reproject)   │
│   ├── IRSASIAAdapter (IVOA SIA2)   ├── IRSAIBEAdapter (NASA IRSA QR3)     │
│   └── RedisCacheService                                                   │
└───────────────────────────────────────┬───────────────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [Redis Cache]            [NASA / IPAC IRSA Server]
                 (L1 In-Memory)           (QR3 SIA2 & IBE FITS Repos)
```

---

## 🚀 Quickstart & Installation

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/sky-trace.git
cd "sky-trace"

# Spin up Frontend, Backend, and Redis
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

---

### Option 2: Local Manual Setup

#### 1. Backend Setup (Python 3.12+)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run pytest unit & integration test suites
pytest -v

# Start FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup (Node.js 18+)
```bash
cd frontend
npm install

# Run astronomical unit verification suites
node test_phase2_astrometry.mjs
node test_phase3_science.mjs
node test_phase4_explorer.mjs
node test_phase5_differentiation.mjs

# Build and start Next.js application
npm run build
npm start
```

---

## 🧪 Verification & Test Suites

The entire platform has been systematically verified across all development phases with zero test failures:

| Test Suite | Purpose | Status | Execution Details |
|---|---|---|---|
| `test_phase0.py` | SPHEREx 102 LVF formula, Astropy FITS/WCS, IRSA access | **PASSED** | 3 tests in 1.4s |
| `tests/integration/api/` | FastAPI REST endpoints (`/health`, `/compare`, `/evidence`) | **PASSED** | 5 tests in 3.1s |
| `tests/unit/domain/` | Astrometry conversions, parallax, spectral fitter, artifact guard | **PASSED** | 10 tests in 2.2s |
| `test_phase2_astrometry.mjs` | IAU Galactic constant ($l_0 = 122.93192^\circ$), Ecliptic obliquity, Kepler solver | **PASSED** | 4 tests in 0.1s |
| `test_phase3_science.mjs` | TAN gnomonic projection, 102-band monotonicity, spectral $\chi^2$ discrimination | **PASSED** | 4 tests in 0.1s |
| `test_phase4_explorer.mjs` | Target catalog fuzzy search, coordinate parser, 6-array band contiguity | **PASSED** | 4 tests in 0.1s |
| `test_phase5_differentiation.mjs` | NASA MOST cross-match, Lupton asinh stretch, detector clearance guard | **PASSED** | 5 tests in 0.1s |

---

## 📜 Scientific Provenance & Citation

SPHEREx is a NASA Astrophysics Medium-Class Explorer (MIDEX) mission managed by NASA's Jet Propulsion Laboratory (JPL) with scientific oversight from the California Institute of Technology (Caltech).

```bibtex
@misc{spherex_qr3_2026,
  author    = {{SPHEREx Science Team} and {IPAC/Caltech}},
  title     = {NASA SPHEREx Quick Release 3 (QR3) Spectral Survey},
  year      = {2026},
  publisher = {NASA/IPAC Infrared Science Archive},
  doi       = {10.26131/IRSA662},
  url       = {https://irsa.ipac.caltech.edu/data/SPHEREx/}
}
```

---

## 📄 License

Distributed under the Apache 2.0 License. Built for the **NASA Space Apps Challenge 2026**.
