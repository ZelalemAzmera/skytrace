# SkyTrace - Implementation Plan
### Step-by-step guide to building blueprint.md in 48 hours

> **Reference:** This document implements every section of `blueprint.md`.
> Read blueprint.md first for architectural rationale.
> This document tells you *what to type, in what order, and why*.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Monorepo and Docker Scaffold](#2-monorepo-and-docker-scaffold)
3. [Backend Domain Layer](#3-backend-domain-layer)
4. [Backend Application Layer - Ports and Use Cases](#4-backend-application-layer)
5. [Backend Infrastructure - IRSA Adapters](#5-backend-infrastructure---irsa-adapters)
6. [Backend Infrastructure - Image Pipeline](#6-backend-infrastructure---image-pipeline)
7. [Backend Infrastructure - Database and Cache](#7-backend-infrastructure---database-and-cache)
8. [Backend API - FastAPI Routers](#8-backend-api---fastapi-routers)
9. [Backend Dependency Injection Wiring](#9-backend-dependency-injection-wiring)
10. [Frontend Setup and Design System](#10-frontend-setup-and-design-system)
11. [Frontend State and Data Fetching](#11-frontend-state-and-data-fetching)
12. [Frontend Pages - Sky Region Explorer](#12-frontend-pages---sky-region-explorer)
13. [Frontend Pages - Time-Travel Comparison Viewer](#13-frontend-pages---time-travel-comparison)
14. [Frontend Components - BlinkViewer Canvas Engine](#14-frontend-components---blinkviewer)
15. [Frontend Pages - Evidence Panel](#15-frontend-pages---evidence-panel)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment - Vercel and Railway](#17-deployment)
18. [Demo Preparation Checklist](#18-demo-preparation-checklist)

---

## 1. Environment Setup

### 1.1 Prerequisites to Verify Before Hackathon Starts

Run these checks the night before (Hour -1):

```bash
# Python 3.12+
python --version          # must be 3.12.x or 3.13.x

# uv (fast Python package manager)
uv --version              # if missing: pip install uv

# Node.js 20+
node --version            # must be 20.x or 22.x

# Docker Desktop
docker --version
docker compose version    # must be v2 (not v1 docker-compose)

# Git
git --version

# Test IRSA access (critical - do this before starting)
python -c "import pyvo; svc = pyvo.dal.SIA2Service('https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3'); print('IRSA OK')"
# If pyvo not installed: pip install pyvo
```

### 1.2 Install uv (if missing)

```bash
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Mac / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1.3 Required API Access Verification

**IRSA SIA2 test query (paste into Python REPL):**

```python
import pyvo

service = pyvo.dal.SIA2Service(
    "https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3"
)
# Query a known area: galactic plane, 0.1 degree radius
results = service.search(
    pos=pyvo.dal.sia.SIA2_SHAPES.CIRCLE,
    ra=0.0, dec=0.0, radius=0.1
)
print(f"Found {len(results)} observations")
for r in results[:3]:
    print(r.getdataurl())
```

If this returns observations, your IRSA access is confirmed. If it returns 0, try
`ra=180.0, dec=0.0` (opposite side of sky) as the galactic plane may have fewer data.

---

## 2. Monorepo and Docker Scaffold

### 2.1 Create the Monorepo Structure

```bash
mkdir -p skytrace && cd skytrace
git init
```

Create this exact directory tree:

```
skytrace/
  backend/
    src/
      domain/
        entities/
        services/
      application/
        ports/
        use_cases/
      infrastructure/
        adapters/
        api/
          v1/
            routers/
        db/
    tests/
      unit/
        domain/
        use_cases/
      integration/
        api/
    data/                  # SQLite database file lives here (gitignored)
    main.py
    pyproject.toml
    Dockerfile
  frontend/
    app/
      explore/
      compare/
      candidate/
      components/
        sky/
        comparison/
        candidate/
        shared/
    public/
    next.config.mjs
    tsconfig.json
    package.json
    Dockerfile
  docker-compose.yml
  .gitignore
  README.md
```

**Create all directories at once:**

```bash
# Backend
mkdir -p backend/src/domain/entities backend/src/domain/services
mkdir -p backend/src/application/ports backend/src/application/use_cases
mkdir -p backend/src/infrastructure/adapters
mkdir -p backend/src/infrastructure/api/v1/routers
mkdir -p backend/src/infrastructure/db
mkdir -p backend/tests/unit/domain backend/tests/unit/use_cases
mkdir -p backend/tests/integration/api
mkdir -p backend/data

# Frontend
mkdir -p frontend/app/explore frontend/app/compare frontend/app/candidate
mkdir -p frontend/app/components/sky frontend/app/components/comparison
mkdir -p frontend/app/components/candidate frontend/app/components/shared
mkdir -p frontend/public

# __init__.py files for Python packages
touch backend/src/__init__.py
touch backend/src/domain/__init__.py
touch backend/src/domain/entities/__init__.py
touch backend/src/domain/services/__init__.py
touch backend/src/application/__init__.py
touch backend/src/application/ports/__init__.py
touch backend/src/application/use_cases/__init__.py
touch backend/src/infrastructure/__init__.py
touch backend/src/infrastructure/adapters/__init__.py
touch backend/src/infrastructure/api/__init__.py
touch backend/src/infrastructure/api/v1/__init__.py
touch backend/src/infrastructure/api/v1/routers/__init__.py
touch backend/src/infrastructure/db/__init__.py
touch backend/tests/__init__.py
```

### 2.2 .gitignore

```
# backend
backend/.venv/
backend/data/*.db
backend/__pycache__/
backend/**/__pycache__/
backend/.env

# frontend
frontend/node_modules/
frontend/.next/
frontend/.env.local

# general
.DS_Store
*.pyc
```

### 2.3 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:8000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      REDIS_URL: "redis://redis:6379"
      DATABASE_URL: "sqlite+aiosqlite:///./data/skytrace.db"
      IRSA_SIA2_URL: "https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3"
      IRSA_IBE_URL: "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3"
      IRSA_MOST_URL: "https://irsa.ipac.caltech.edu/applications/MOST"
      LOG_LEVEL: "INFO"
    volumes:
      - ./backend:/app
      - ./backend/data:/app/data
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

### 2.4 Backend pyproject.toml

Create `backend/pyproject.toml`:

```toml
[project]
name = "skytrace-backend"
version = "1.0.0"
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
redis = {extras = ["hiredis"], version = "^5.0"}
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}
aiosqlite = "^0.20"

[dependency-groups]
dev = [
  "pytest>=8",
  "pytest-asyncio>=0.23",
  "httpx>=0.27",
  "ruff>=0.4",
  "mypy>=1.10",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.mypy]
python_version = "3.12"
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

Install dependencies:

```bash
cd backend
uv sync
```

### 2.5 Backend Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
RUN uv sync --no-dev

COPY . .

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.6 Frontend Setup

```bash
cd frontend
npx create-next-app@14 . --typescript --app --no-src-dir --no-tailwind --import-alias "@/*"
```

Install additional packages:

```bash
npm install zustand @tanstack/react-query ol d3 framer-motion
npm install @radix-ui/react-slider @radix-ui/react-dialog @radix-ui/react-tooltip
npm install @radix-ui/react-select @radix-ui/react-separator
npm install --save-dev @types/ol @types/d3
```

### 2.7 Frontend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## 3. Backend Domain Layer

The domain layer has ZERO external dependencies. Write and test it first.

### 3.1 Domain Entities

**`backend/src/domain/entities/sky_region.py`**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class SkyRegion:
    ra: float          # ICRS decimal degrees (0-360)
    dec: float         # ICRS decimal degrees (-90 to +90)
    radius_deg: float  # Search radius in decimal degrees
    label: str | None = None

    def __post_init__(self) -> None:
        if not (0.0 <= self.ra < 360.0):
            raise ValueError(f"RA must be 0-360, got {self.ra}")
        if not (-90.0 <= self.dec <= 90.0):
            raise ValueError(f"Dec must be -90 to +90, got {self.dec}")
        if not (0.0 < self.radius_deg <= 5.0):
            raise ValueError(f"Radius must be 0-5 deg, got {self.radius_deg}")
```

**`backend/src/domain/entities/observation.py`**

```python
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Observation:
    id: str
    region_id: str
    epoch_mjd: float        # Modified Julian Date
    band_index: int         # 0-101 (SPHEREx bands)
    wavelength_um: float    # 0.75-5.0 micrometers
    fits_url: str           # IRSA IBE direct URL
    quality_pct: float      # 0-100 (% clean pixels)
    data_release: str       # "qr3"
    obs_date: date
    ra: float
    dec: float
```

**`backend/src/domain/entities/fits_image.py`**

```python
from dataclasses import dataclass
import numpy as np
from astropy.wcs import WCS


@dataclass
class FITSImage:
    data: np.ndarray          # float32 science array (masked)
    variance: np.ndarray      # float32 noise variance array
    flags: np.ndarray         # int16 quality flag array
    wcs: WCS                  # Astropy WCS object
    epoch_mjd: float
    wavelength_um: float
    band_index: int
    obs_id: str
    quality_pct: float        # Computed from flags

    @property
    def shape(self) -> tuple[int, int]:
        return self.data.shape
```

**`backend/src/domain/entities/candidate.py`**

```python
from dataclasses import dataclass, field
from uuid import uuid4


@dataclass
class Candidate:
    ra: float
    dec: float
    pixel_x: float
    pixel_y: float
    snr_change: float          # Signed SNR (positive = brightening)
    delta_flux: float          # Flux change in data units
    delta_flux_sigma: float    # Uncertainty on delta_flux
    motion_arcsec: float       # Apparent motion (0 if single epoch)
    artifact_probability: float  # 0.0-1.0 (higher = more likely artifact)
    confidence_score: float    # 0.0-1.0 (higher = more confident real source)
    most_match: bool = False
    most_object_name: str | None = None
    most_object_type: str | None = None
    id: str = field(default_factory=lambda: str(uuid4()))
```

**`backend/src/domain/entities/evidence.py`**

```python
from dataclasses import dataclass, field
from .fits_image import FITSImage
from .candidate import Candidate


@dataclass
class Measurement:
    label: str
    value: float
    unit: str
    uncertainty: float | None = None


@dataclass
class Evidence:
    candidate_id: str
    narrative: str
    measurements: list[Measurement] = field(default_factory=list)
    caveats: list[str] = field(default_factory=list)
    irsa_links: list[dict] = field(default_factory=list)
    quality_flags: dict = field(default_factory=dict)


@dataclass
class ComparisonResult:
    image_a: FITSImage
    image_b: FITSImage
    difference: np.ndarray
    snr_map: np.ndarray
    candidates: list[Candidate]
    metadata: dict
    tile_a_b64: str = ""    # Populated by pipeline after PNG render
    tile_b_b64: str = ""
    tile_diff_b64: str = ""

    def to_dict(self) -> dict:
        return {
            "tile_a_b64": self.tile_a_b64,
            "tile_b_b64": self.tile_b_b64,
            "tile_diff_b64": self.tile_diff_b64,
            "candidates": [c.__dict__ for c in self.candidates],
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ComparisonResult":
        # Lightweight reconstruction from cache (no numpy arrays needed)
        from .candidate import Candidate
        result = cls.__new__(cls)
        result.tile_a_b64 = d["tile_a_b64"]
        result.tile_b_b64 = d["tile_b_b64"]
        result.tile_diff_b64 = d["tile_diff_b64"]
        result.candidates = [Candidate(**c) for c in d["candidates"]]
        result.metadata = d["metadata"]
        result.image_a = None   # Not stored in cache
        result.image_b = None
        result.difference = None
        result.snr_map = None
        return result

import numpy as np  # noqa: E402 - needed for ComparisonResult type hints
```

**`backend/src/domain/exceptions.py`**

```python
class SkyTraceError(Exception):
    pass

class NoDataError(SkyTraceError):
    pass

class IRSAError(SkyTraceError):
    pass

class ArtifactWarning(SkyTraceError):
    pass

class CoordinateError(SkyTraceError):
    pass
```

### 3.2 Domain Services

**`backend/src/domain/services/confidence_scorer.py`**

```python
from dataclasses import dataclass


@dataclass
class ConfidenceResult:
    score: float           # 0.0-1.0
    label: str             # "Very Low" | "Moderate" | "High" | "Very High"
    caveats: list[str]


class ConfidenceScorer:
    STANDARD_CAVEATS = [
        "This detection uses automated algorithms, not expert human review.",
        "Full scientific confirmation requires independent follow-up observations.",
    ]

    def score(
        self,
        snr: float,
        quality_pct: float,
        most_match: bool,
        multi_band: bool,
    ) -> ConfidenceResult:
        # Normalize each component to 0.0-1.0
        snr_score = min(abs(snr) / 20.0, 1.0)       # 20-sigma = max
        quality_score = quality_pct / 100.0
        multiband_score = 1.0 if multi_band else 0.3
        # Compactness placeholder (real value comes from image processor)
        compactness_score = 0.7

        total = (
            snr_score         * 0.40 +
            multiband_score   * 0.25 +
            compactness_score * 0.20 +
            quality_score     * 0.15
        )

        caveats = list(self.STANDARD_CAVEATS)
        if most_match:
            caveats.append("This source matches a known solar system object in MOST.")
        if quality_pct < 80.0:
            caveats.append(
                f"Only {quality_pct:.0f}% of pixels in this region are clean; "
                "artifacts are more likely."
            )
        if not multi_band:
            caveats.append(
                "Detection is only confirmed in a single wavelength band. "
                "Multi-band confirmation increases confidence."
            )

        if total < 0.3:
            label = "Very Low"
        elif total < 0.6:
            label = "Moderate"
        elif total < 0.8:
            label = "High"
        else:
            label = "Very High"

        return ConfidenceResult(score=round(total, 3), label=label, caveats=caveats)
```

**`backend/src/domain/services/coordinate_service.py`**

```python
from astropy.coordinates import SkyCoord
import astropy.units as u


class CoordinateService:
    @staticmethod
    def validate_icrs(ra: float, dec: float) -> None:
        if not (0.0 <= ra < 360.0):
            raise ValueError(f"RA {ra} out of range 0-360")
        if not (-90.0 <= dec <= 90.0):
            raise ValueError(f"Dec {dec} out of range -90 to +90")

    @staticmethod
    def to_hms_dms(ra: float, dec: float) -> dict:
        coord = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs")
        return {
            "ra_hms": coord.ra.to_string(unit=u.hour, sep="hms", precision=2),
            "dec_dms": coord.dec.to_string(sep="dms", precision=1, alwayssign=True),
            "ra_deg": round(ra, 6),
            "dec_deg": round(dec, 6),
        }

    @staticmethod
    def angular_separation_arcsec(
        ra1: float, dec1: float, ra2: float, dec2: float
    ) -> float:
        c1 = SkyCoord(ra=ra1 * u.deg, dec=dec1 * u.deg, frame="icrs")
        c2 = SkyCoord(ra=ra2 * u.deg, dec=dec2 * u.deg, frame="icrs")
        return float(c1.separation(c2).arcsec)
```

---

## 4. Backend Application Layer

### 4.1 Outbound Port Protocols

**`backend/src/application/ports/outbound.py`**

```python
from typing import Protocol, runtime_checkable
from ...domain.entities.fits_image import FITSImage
from ...domain.entities.observation import Observation
from ...domain.entities.candidate import Candidate


@runtime_checkable
class IFITSImageSource(Protocol):
    async def fetch(self, obs_id: str, band: int) -> FITSImage: ...


@runtime_checkable
class IImageProcessor(Protocol):
    async def align(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple[FITSImage, FITSImage]: ...

    async def subtract(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple: ...  # returns (difference_array, snr_map)

    async def detect_sources(
        self, snr_map, sigma_threshold: float
    ) -> list[Candidate]: ...

    async def render_tile(self, image: FITSImage, scaling: str) -> str: ...
    async def render_diff_tile(self, diff_array, colormap: str) -> str: ...


@runtime_checkable
class IObservationRepository(Protocol):
    async def search(
        self, ra: float, dec: float, radius_deg: float,
        band: int | None = None
    ) -> list[Observation]: ...

    async def get_by_id(self, obs_id: str) -> Observation | None: ...


@runtime_checkable
class ICandidateRepository(Protocol):
    async def save(self, candidate: Candidate, comparison_id: str) -> None: ...
    async def get_by_comparison(self, comparison_id: str) -> list[Candidate]: ...
    async def get_by_id(self, candidate_id: str) -> Candidate | None: ...


@runtime_checkable
class ISolarSystemChecker(Protocol):
    async def check(
        self, ra: float, dec: float, epoch_mjd: float
    ) -> dict: ...  # {"match": bool, "object_name": str|None, "object_type": str|None}


@runtime_checkable
class ICacheService(Protocol):
    async def get(self, key: str) -> dict | None: ...
    async def set(self, key: str, value: dict, ttl: int = 3600) -> None: ...
    async def get_bytes(self, key: str) -> bytes | None: ...
    async def set_bytes(self, key: str, value: bytes, ttl: int = 86400) -> None: ...
```

**`backend/src/application/ports/inbound.py`**

```python
from typing import Protocol
from ...domain.entities.evidence import ComparisonResult, Evidence
from ...domain.entities.observation import Observation
from ...domain.entities.candidate import Candidate


class IQuerySkyRegion(Protocol):
    async def execute(
        self, ra: float, dec: float, radius_deg: float,
        band: int | None = None
    ) -> list[Observation]: ...


class ICompareObservations(Protocol):
    async def execute(
        self, obs_a_id: str, obs_b_id: str, band: int
    ) -> ComparisonResult: ...


class ISearchCandidates(Protocol):
    async def execute(self, comparison_id: str) -> list[Candidate]: ...


class IGenerateEvidence(Protocol):
    async def execute(self, candidate_id: str) -> Evidence: ...
```

### 4.2 Use Cases

**`backend/src/application/use_cases/query_sky_region.py`**

```python
from ..ports.outbound import IObservationRepository, ICacheService
from ...domain.entities.observation import Observation
import hashlib, json


class QuerySkyRegionUC:
    def __init__(
        self,
        obs_repo: IObservationRepository,
        cache: ICacheService,
    ) -> None:
        self._repo = obs_repo
        self._cache = cache

    async def execute(
        self, ra: float, dec: float, radius_deg: float, band: int | None = None
    ) -> list[Observation]:
        key_data = f"{ra:.6f}:{dec:.6f}:{radius_deg:.4f}:{band}"
        cache_key = "obs_meta:" + hashlib.sha256(key_data.encode()).hexdigest()[:16]

        if cached := await self._cache.get(cache_key):
            return [Observation(**o) for o in cached["observations"]]

        observations = await self._repo.search(ra, dec, radius_deg, band)
        await self._cache.set(
            cache_key,
            {"observations": [o.__dict__ for o in observations]},
            ttl=3600,
        )
        return observations
```

**`backend/src/application/use_cases/compare_observations.py`**

```python
from ..ports.outbound import IFITSImageSource, IImageProcessor, ICacheService
from ...domain.entities.evidence import ComparisonResult


class CompareObservationsUC:
    def __init__(
        self,
        image_source: IFITSImageSource,
        processor: IImageProcessor,
        cache: ICacheService,
    ) -> None:
        self._source = image_source
        self._proc = processor
        self._cache = cache

    async def execute(
        self, obs_a_id: str, obs_b_id: str, band: int
    ) -> ComparisonResult:
        cache_key = f"comparison:{obs_a_id}:{obs_b_id}:{band}"

        if cached := await self._cache.get(cache_key):
            return ComparisonResult.from_dict(cached)

        image_a = await self._source.fetch(obs_a_id, band=band)
        image_b = await self._source.fetch(obs_b_id, band=band)

        aligned_a, aligned_b = await self._proc.align(image_a, image_b)
        difference, snr_map = await self._proc.subtract(aligned_a, aligned_b)
        candidates = await self._proc.detect_sources(snr_map, sigma_threshold=5.0)

        # Render PNG tiles
        tile_a = await self._proc.render_tile(aligned_a, scaling="zscale")
        tile_b = await self._proc.render_tile(aligned_b, scaling="zscale")
        tile_diff = await self._proc.render_diff_tile(snr_map, colormap="diverging")

        result = ComparisonResult(
            image_a=aligned_a,
            image_b=aligned_b,
            difference=difference,
            snr_map=snr_map,
            candidates=candidates,
            metadata={
                "obs_a_epoch_mjd": image_a.epoch_mjd,
                "obs_b_epoch_mjd": image_b.epoch_mjd,
                "time_delta_days": abs(image_b.epoch_mjd - image_a.epoch_mjd),
                "band": band,
                "wavelength_um": image_a.wavelength_um,
                "n_candidates": len(candidates),
            },
            tile_a_b64=tile_a,
            tile_b_b64=tile_b,
            tile_diff_b64=tile_diff,
        )

        await self._cache.set(cache_key, result.to_dict(), ttl=43200)
        return result
```

**`backend/src/application/use_cases/search_candidates.py`**

```python
from ..ports.outbound import ICandidateRepository
from ...domain.entities.candidate import Candidate


class SearchCandidatesUC:
    def __init__(self, candidate_repo: ICandidateRepository) -> None:
        self._repo = candidate_repo

    async def execute(self, comparison_id: str) -> list[Candidate]:
        candidates = await self._repo.get_by_comparison(comparison_id)
        return sorted(candidates, key=lambda c: c.confidence_score, reverse=True)
```

**`backend/src/application/use_cases/generate_evidence.py`**

```python
from ..ports.outbound import ICandidateRepository, ISolarSystemChecker
from ...domain.entities.evidence import Evidence, Measurement
from ...domain.services.confidence_scorer import ConfidenceScorer


class GenerateEvidenceUC:
    def __init__(
        self,
        candidate_repo: ICandidateRepository,
        solar_system: ISolarSystemChecker,
        scorer: ConfidenceScorer,
    ) -> None:
        self._repo = candidate_repo
        self._solar = solar_system
        self._scorer = scorer

    async def execute(self, candidate_id: str) -> Evidence:
        candidate = await self._repo.get_by_id(candidate_id)
        if candidate is None:
            raise ValueError(f"Candidate {candidate_id} not found")

        # Re-run MOST check with current candidate position
        most_result = await self._solar.check(
            candidate.ra, candidate.dec, epoch_mjd=0.0
        )

        # Generate confidence result for caveats
        conf = self._scorer.score(
            snr=candidate.snr_change,
            quality_pct=90.0,    # Use stored value in full impl
            most_match=most_result["match"],
            multi_band=False,
        )

        measurements = [
            Measurement("SNR of change", candidate.snr_change, "sigma"),
            Measurement("Flux change", candidate.delta_flux, "data units",
                        candidate.delta_flux_sigma),
            Measurement("Confidence score", candidate.confidence_score, ""),
            Measurement("Artifact probability", candidate.artifact_probability, ""),
        ]

        narrative = self._build_narrative(candidate, most_result, conf)

        return Evidence(
            candidate_id=candidate_id,
            narrative=narrative,
            measurements=measurements,
            caveats=conf.caveats,
            irsa_links=[
                {"label": "IRSA FITS File",
                 "url": f"https://irsa.ipac.caltech.edu/..."},
            ],
        )

    def _build_narrative(self, candidate, most_result, conf) -> str:
        snr = candidate.snr_change
        direction = "brighter" if snr > 0 else "fainter"
        known = most_result.get("object_name", "No match found")

        return (
            f"A source at RA={candidate.ra:.4f}, Dec={candidate.dec:.4f} became "
            f"{direction} between the two observations, with a signal-to-noise "
            f"ratio of {abs(snr):.1f} sigma. Confidence: {conf.label}. "
            f"Solar system cross-match (MOST): {known}."
        )
```

---

## 5. Backend Infrastructure - IRSA Adapters

### 5.1 IRSA SIA2 Adapter (Observation Repository)

**`backend/src/infrastructure/adapters/irsa_sia_adapter.py`**

```python
import hashlib
from datetime import date, datetime
from uuid import uuid4

import pyvo
import pyvo.dal

from ...domain.entities.observation import Observation


class IRSASIAAdapter:
    def __init__(self, sia2_url: str) -> None:
        self._service = pyvo.dal.SIA2Service(sia2_url)

    async def search(
        self,
        ra: float,
        dec: float,
        radius_deg: float,
        band: int | None = None,
    ) -> list[Observation]:
        # SIA2 is synchronous - wrap in asyncio executor in production
        # For hackathon, direct call is acceptable
        try:
            results = self._service.search(
                pos=[(ra, dec, radius_deg)],
            )
        except Exception as e:
            raise RuntimeError(f"IRSA SIA2 query failed: {e}") from e

        observations = []
        for i, row in enumerate(results):
            try:
                url = row.getdataurl()
                # Extract band info from URL or VOTable columns
                band_idx = int(getattr(row, "band_idx", i % 102))
                wavelength = 0.75 + (band_idx / 101.0) * (5.0 - 0.75)
                obs = Observation(
                    id=hashlib.md5(str(url).encode()).hexdigest(),
                    region_id=f"{ra:.4f}_{dec:.4f}",
                    epoch_mjd=float(getattr(row, "t_min", 60000.0)),
                    band_index=band_idx,
                    wavelength_um=round(wavelength, 4),
                    fits_url=str(url),
                    quality_pct=95.0,  # Retrieved from metadata in full impl
                    data_release="qr3",
                    obs_date=date.today(),  # Parse from t_min MJD in full impl
                    ra=ra,
                    dec=dec,
                )
                observations.append(obs)
            except Exception:
                continue  # Skip malformed rows

        return observations

    async def get_by_id(self, obs_id: str):
        return None  # Implement if needed for detail view
```

### 5.2 IRSA IBE Adapter (FITS Image Source)

**`backend/src/infrastructure/adapters/irsa_ibe_adapter.py`**

```python
import httpx
from ...domain.entities.observation import Observation


class IRSAIBEAdapter:
    IBE_CUTOUT_BASE = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3"
    CUTOUT_SIZE_DEG = 0.2   # 0.2 degree cutout region

    def __init__(self, ibe_url: str, timeout: float = 30.0) -> None:
        self._base = ibe_url
        self._timeout = timeout

    async def fetch_fits_bytes(self, fits_url: str) -> bytes:
        # Add cutout parameters to the IBE URL
        cutout_url = self._add_cutout_params(fits_url)
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(cutout_url)
            response.raise_for_status()
            return response.content

    async def fetch(self, obs_id: str, band: int):
        # This is called by the use case via IFITSImageSource protocol.
        # In a full implementation, obs_id maps to a stored fits_url.
        # For hackathon, obs_id IS the fits_url (url-safe encoded).
        from .astropy_fits_adapter import AstropyFITSAdapter
        fits_bytes = await self.fetch_fits_bytes(obs_id)
        parser = AstropyFITSAdapter()
        return parser.parse(fits_bytes, obs_id=obs_id)

    def _add_cutout_params(self, url: str) -> str:
        sep = "&" if "?" in url else "?"
        return f"{url}{sep}size={self.CUTOUT_SIZE_DEG}"
```

### 5.3 Astropy FITS Adapter

**`backend/src/infrastructure/adapters/astropy_fits_adapter.py`**

```python
import io
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS, FITSFixedWarning
import warnings

from ...domain.entities.fits_image import FITSImage


class AstropyFITSAdapter:
    HDU_IMAGE    = 1
    HDU_FLAGS    = 2
    HDU_VARIANCE = 3

    def parse(self, fits_bytes: bytes, obs_id: str = "") -> FITSImage:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FITSFixedWarning)
            with fits.open(io.BytesIO(fits_bytes)) as hdul:
                primary_header = hdul[0].header

                # Science image
                image_hdu = hdul[self.HDU_IMAGE]
                data = image_hdu.data.astype(np.float32)

                # Quality flags
                flags = hdul[self.HDU_FLAGS].data.astype(np.int16)

                # Variance (noise)
                variance = hdul[self.HDU_VARIANCE].data.astype(np.float32)

                # WCS from image HDU header
                wcs = WCS(image_hdu.header)

                # Apply quality mask
                bad_mask = flags != 0
                data_masked = np.where(bad_mask, np.nan, data)
                quality_pct = 100.0 * (~bad_mask).sum() / bad_mask.size

                return FITSImage(
                    data=data_masked,
                    variance=variance,
                    flags=flags,
                    wcs=wcs,
                    epoch_mjd=float(primary_header.get("MJD-OBS", 60000.0)),
                    wavelength_um=float(primary_header.get("WAVELNTH", 1.0)),
                    band_index=int(primary_header.get("BANDINDX", 0)),
                    obs_id=obs_id,
                    quality_pct=float(quality_pct),
                )
```

---

## 6. Backend Infrastructure - Image Pipeline

**`backend/src/infrastructure/adapters/numpy_processor.py`**

```python
import asyncio
import base64
import io
import numpy as np
from PIL import Image
from astropy.visualization import ZScaleInterval, LinearStretch, ImageNormalize
from reproject import reproject_interp
from photutils.background import Background2D, MedianBackground
from photutils.detection import DAOStarFinder
from astropy.stats import sigma_clipped_stats

from ...domain.entities.fits_image import FITSImage
from ...domain.entities.candidate import Candidate


class NumpyImageProcessor:

    async def align(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple[FITSImage, FITSImage]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._align_sync, image_a, image_b)

    def _align_sync(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple[FITSImage, FITSImage]:
        # Reproject image_b onto image_a's WCS grid
        data_b_reproj, footprint = reproject_interp(
            (np.nan_to_num(image_b.data, nan=0.0), image_b.wcs),
            image_a.wcs,
            shape_out=image_a.shape,
        )
        var_b_reproj, _ = reproject_interp(
            (image_b.variance, image_b.wcs),
            image_a.wcs,
            shape_out=image_a.shape,
        )
        # Mask reprojected pixels outside footprint
        data_b_aligned = np.where(footprint, data_b_reproj, np.nan)
        image_b_aligned = FITSImage(
            data=data_b_aligned.astype(np.float32),
            variance=var_b_reproj.astype(np.float32),
            flags=image_b.flags,
            wcs=image_a.wcs,    # Now shares image_a's WCS
            epoch_mjd=image_b.epoch_mjd,
            wavelength_um=image_b.wavelength_um,
            band_index=image_b.band_index,
            obs_id=image_b.obs_id,
            quality_pct=image_b.quality_pct,
        )
        return image_a, image_b_aligned

    async def subtract(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple[np.ndarray, np.ndarray]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._subtract_sync, image_a, image_b)

    def _subtract_sync(
        self, image_a: FITSImage, image_b: FITSImage
    ) -> tuple[np.ndarray, np.ndarray]:
        # Background subtract each image
        def bgsub(data):
            clean = np.nan_to_num(data, nan=0.0)
            try:
                bkg = Background2D(clean, box_size=50, estimator=MedianBackground())
                return clean - bkg.background
            except Exception:
                return clean

        a_clean = bgsub(image_a.data)
        b_clean = bgsub(image_b.data)

        # Difference and SNR map
        difference = a_clean - b_clean
        sigma_diff = np.sqrt(
            np.nan_to_num(image_a.variance, nan=1.0) +
            np.nan_to_num(image_b.variance, nan=1.0)
        )
        sigma_diff = np.where(sigma_diff <= 0, 1e-10, sigma_diff)
        snr_map = difference / sigma_diff
        return difference, snr_map

    async def detect_sources(
        self, snr_map: np.ndarray, sigma_threshold: float = 5.0
    ) -> list[Candidate]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._detect_sync, snr_map, sigma_threshold
        )

    def _detect_sync(
        self, snr_map: np.ndarray, sigma_threshold: float
    ) -> list[Candidate]:
        clean_snr = np.nan_to_num(snr_map, nan=0.0)
        mean, median, std = sigma_clipped_stats(clean_snr, sigma=3.0)

        daofind = DAOStarFinder(fwhm=3.0, threshold=sigma_threshold * std)
        sources = daofind(clean_snr - median)

        if sources is None:
            return []

        candidates = []
        for row in sources:
            snr = float(clean_snr[int(row["ycentroid"]), int(row["xcentroid"])])
            if abs(snr) < sigma_threshold:
                continue
            c = Candidate(
                ra=0.0,    # Will be filled by WCS projection in router
                dec=0.0,
                pixel_x=float(row["xcentroid"]),
                pixel_y=float(row["ycentroid"]),
                snr_change=snr,
                delta_flux=float(row["peak"]),
                delta_flux_sigma=float(row["peak"]) / max(abs(snr), 1e-6),
                motion_arcsec=0.0,
                artifact_probability=0.2,  # Refined by ArtifactChecker
                confidence_score=min(abs(snr) / 20.0, 1.0),
            )
            candidates.append(c)

        return candidates[:20]  # Return top 20 by SNR

    async def render_tile(self, image: FITSImage, scaling: str = "zscale") -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._render_tile_sync, image.data, scaling, "gray"
        )

    async def render_diff_tile(
        self, diff_array: np.ndarray, colormap: str = "diverging"
    ) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._render_tile_sync, diff_array, "linear", colormap
        )

    def _render_tile_sync(
        self, data: np.ndarray, scaling: str, colormap: str
    ) -> str:
        clean = np.nan_to_num(data, nan=0.0)

        if scaling == "zscale":
            try:
                interval = ZScaleInterval()
                vmin, vmax = interval.get_limits(clean)
            except Exception:
                vmin, vmax = np.nanpercentile(clean, [1, 99])
        elif scaling == "log":
            clean = np.log1p(np.maximum(clean - clean.min(), 0))
            vmin, vmax = clean.min(), clean.max()
        else:
            vmin, vmax = np.nanpercentile(clean, [1, 99])

        if vmax == vmin:
            vmax = vmin + 1e-10

        normalized = np.clip((clean - vmin) / (vmax - vmin), 0, 1)
        uint8 = (normalized * 255).astype(np.uint8)

        if colormap == "diverging":
            # Blue (negative) -> White (zero) -> Red (positive)
            center = np.clip((clean - clean.min()) / (clean.max() - clean.min() + 1e-10), 0, 1)
            r = (center * 255).astype(np.uint8)
            b = ((1 - center) * 255).astype(np.uint8)
            g = np.full_like(r, 128)
            rgb = np.stack([r, g, b], axis=-1)
            pil_img = Image.fromarray(rgb, mode="RGB")
        else:
            pil_img = Image.fromarray(uint8, mode="L")

        # Resize to 512x512 for web display
        pil_img = pil_img.resize((512, 512), Image.LANCZOS)

        buf = io.BytesIO()
        pil_img.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
```

---

## 7. Backend Infrastructure - Database and Cache

### 7.1 SQLAlchemy Models

**`backend/src/infrastructure/db/models.py`**

```python
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, Text, JSON, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ObservationModel(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    region_id: Mapped[str] = mapped_column(String, index=True)
    epoch_mjd: Mapped[float] = mapped_column(Float)
    band_index: Mapped[int] = mapped_column(Integer)
    wavelength_um: Mapped[float] = mapped_column(Float)
    fits_url: Mapped[str] = mapped_column(String)
    quality_pct: Mapped[float] = mapped_column(Float)
    data_release: Mapped[str] = mapped_column(String, default="qr3")
    ra: Mapped[float] = mapped_column(Float, index=True)
    dec: Mapped[float] = mapped_column(Float, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ComparisonModel(Base):
    __tablename__ = "comparisons"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    obs_a_id: Mapped[str] = mapped_column(String)
    obs_b_id: Mapped[str] = mapped_column(String)
    band: Mapped[int] = mapped_column(Integer)
    processing_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateModel(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    comparison_id: Mapped[str] = mapped_column(String, index=True)
    ra: Mapped[float] = mapped_column(Float)
    dec: Mapped[float] = mapped_column(Float)
    pixel_x: Mapped[float] = mapped_column(Float)
    pixel_y: Mapped[float] = mapped_column(Float)
    snr_change: Mapped[float] = mapped_column(Float)
    delta_flux: Mapped[float] = mapped_column(Float)
    delta_flux_sigma: Mapped[float] = mapped_column(Float)
    motion_arcsec: Mapped[float] = mapped_column(Float, default=0.0)
    artifact_probability: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float, index=True)
    most_match: Mapped[bool] = mapped_column(Boolean, default=False)
    most_object_name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EvidenceModel(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    narrative: Mapped[str] = mapped_column(Text)
    caveats: Mapped[dict] = mapped_column(JSON)
    irsa_links: Mapped[dict] = mapped_column(JSON)
    quality_flags: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

**`backend/src/infrastructure/db/session.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .models import Base

_engine = None
_session_factory = None


def get_engine(database_url: str):
    global _engine, _session_factory
    if _engine is None:
        _engine = create_async_engine(database_url, echo=False)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def create_tables(database_url: str) -> None:
    engine = get_engine(database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def get_session_factory():
    return _session_factory
```

### 7.2 Redis Cache Adapter

**`backend/src/infrastructure/adapters/redis_cache.py`**

```python
import json
import redis.asyncio as aioredis


class RedisCache:
    def __init__(self, redis_url: str) -> None:
        self._client = aioredis.from_url(redis_url, decode_responses=False)

    async def get(self, key: str) -> dict | None:
        raw = await self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: dict, ttl: int = 3600) -> None:
        await self._client.setex(key, ttl, json.dumps(value))

    async def get_bytes(self, key: str) -> bytes | None:
        return await self._client.get(key)

    async def set_bytes(self, key: str, value: bytes, ttl: int = 86400) -> None:
        await self._client.setex(key, ttl, value)

    async def publish(self, channel: str, message: str) -> None:
        await self._client.publish(channel, message)

    async def close(self) -> None:
        await self._client.aclose()
```

---

## 8. Backend API - FastAPI Routers

### 8.1 Pydantic Schemas

**`backend/src/infrastructure/api/v1/schemas.py`**

```python
from pydantic import BaseModel, Field
from datetime import date


class ObservationResponse(BaseModel):
    id: str
    epoch_mjd: float
    obs_date: date | None
    band_index: int
    wavelength_um: float
    fits_url: str
    quality_pct: float
    data_release: str
    ra: float
    dec: float


class CandidateResponse(BaseModel):
    id: str
    ra: float
    dec: float
    pixel_x: float
    pixel_y: float
    snr_change: float
    delta_flux: float
    delta_flux_sigma: float
    motion_arcsec: float
    artifact_probability: float
    confidence_score: float
    most_match: bool
    most_object_name: str | None = None


class CompareResponse(BaseModel):
    comparison_id: str
    image_a_b64: str     # base64 PNG
    image_b_b64: str     # base64 PNG
    difference_b64: str  # base64 PNG
    wcs: dict
    candidates: list[CandidateResponse]
    metadata: dict


class EvidenceResponse(BaseModel):
    candidate_id: str
    narrative: str
    measurements: list[dict]
    caveats: list[str]
    irsa_links: list[dict]
    quality_flags: dict


class MostCheckResponse(BaseModel):
    match: bool
    object_name: str | None = None
    object_type: str | None = None
```

### 8.2 Observations Router

**`backend/src/infrastructure/api/v1/routers/observations.py`**

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from ..schemas import ObservationResponse
from ..dependencies import get_query_sky_region_uc

router = APIRouter(prefix="/api/v1/observations", tags=["observations"])


@router.get("", response_model=list[ObservationResponse])
async def list_observations(
    ra: float = Query(..., ge=0.0, le=360.0, description="Right Ascension in degrees"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination in degrees"),
    radius: float = Query(0.1, ge=0.01, le=2.0, description="Search radius in degrees"),
    band: int | None = Query(None, ge=0, le=101, description="SPHEREx band index"),
    use_case=Depends(get_query_sky_region_uc),
):
    observations = await use_case.execute(ra=ra, dec=dec, radius_deg=radius, band=band)
    return [ObservationResponse(**o.__dict__) for o in observations]
```

### 8.3 Compare Router

**`backend/src/infrastructure/api/v1/routers/compare.py`**

```python
import time
from fastapi import APIRouter, Depends, Query, HTTPException
from ..schemas import CompareResponse, CandidateResponse
from ..dependencies import get_compare_uc

router = APIRouter(prefix="/api/v1/compare", tags=["compare"])


@router.get("", response_model=CompareResponse)
async def compare_observations(
    obs_a: str = Query(..., description="Observation A ID or FITS URL"),
    obs_b: str = Query(..., description="Observation B ID or FITS URL"),
    band: int = Query(50, ge=0, le=101, description="SPHEREx band index (0-101)"),
    use_case=Depends(get_compare_uc),
):
    t0 = time.perf_counter()
    try:
        result = await use_case.execute(obs_a_id=obs_a, obs_b_id=obs_b, band=band)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    comparison_id = f"{obs_a[:8]}_{obs_b[:8]}_{band}"

    return CompareResponse(
        comparison_id=comparison_id,
        image_a_b64=result.tile_a_b64,
        image_b_b64=result.tile_b_b64,
        difference_b64=result.tile_diff_b64,
        wcs={"ra_center": 0.0, "dec_center": 0.0, "pix_scale_deg": 0.0},
        candidates=[CandidateResponse(**c.__dict__) for c in result.candidates],
        metadata={**result.metadata, "processing_ms": elapsed_ms},
    )
```

### 8.4 Candidates and Evidence Routers

**`backend/src/infrastructure/api/v1/routers/candidates.py`**

```python
from fastapi import APIRouter, Depends, Query
from ..schemas import CandidateResponse, EvidenceResponse
from ..dependencies import get_search_candidates_uc, get_evidence_uc

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateResponse])
async def list_candidates(
    comparison_id: str = Query(...),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    use_case=Depends(get_search_candidates_uc),
):
    candidates = await use_case.execute(comparison_id=comparison_id)
    return [
        CandidateResponse(**c.__dict__)
        for c in candidates
        if c.confidence_score >= min_confidence
    ]


@router.get("/{candidate_id}/evidence", response_model=EvidenceResponse)
async def get_evidence(
    candidate_id: str,
    use_case=Depends(get_evidence_uc),
):
    evidence = await use_case.execute(candidate_id=candidate_id)
    return EvidenceResponse(
        candidate_id=evidence.candidate_id,
        narrative=evidence.narrative,
        measurements=[m.__dict__ for m in evidence.measurements],
        caveats=evidence.caveats,
        irsa_links=evidence.irsa_links,
        quality_flags=evidence.quality_flags,
    )
```

---

## 9. Backend Dependency Injection Wiring

### 9.1 Configuration

**`backend/src/infrastructure/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    database_url: str = "sqlite+aiosqlite:///./data/skytrace.db"
    irsa_sia2_url: str = "https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3"
    irsa_ibe_url: str = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3"
    irsa_most_url: str = "https://irsa.ipac.caltech.edu/applications/MOST"
    log_level: str = "INFO"
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
```

### 9.2 FastAPI Dependencies

**`backend/src/infrastructure/api/dependencies.py`**

```python
from functools import lru_cache
from fastapi import Depends

from ..config import settings
from ..adapters.redis_cache import RedisCache
from ..adapters.irsa_sia_adapter import IRSASIAAdapter
from ..adapters.irsa_ibe_adapter import IRSAIBEAdapter
from ..adapters.numpy_processor import NumpyImageProcessor
from ...application.use_cases.query_sky_region import QuerySkyRegionUC
from ...application.use_cases.compare_observations import CompareObservationsUC
from ...application.use_cases.search_candidates import SearchCandidatesUC
from ...application.use_cases.generate_evidence import GenerateEvidenceUC
from ...domain.services.confidence_scorer import ConfidenceScorer


@lru_cache()
def get_redis() -> RedisCache:
    return RedisCache(settings.redis_url)


@lru_cache()
def get_sia_adapter() -> IRSASIAAdapter:
    return IRSASIAAdapter(settings.irsa_sia2_url)


@lru_cache()
def get_ibe_adapter() -> IRSAIBEAdapter:
    return IRSAIBEAdapter(settings.irsa_ibe_url)


@lru_cache()
def get_processor() -> NumpyImageProcessor:
    return NumpyImageProcessor()


def get_query_sky_region_uc(
    repo: IRSASIAAdapter = Depends(get_sia_adapter),
    cache: RedisCache = Depends(get_redis),
) -> QuerySkyRegionUC:
    return QuerySkyRegionUC(obs_repo=repo, cache=cache)


def get_compare_uc(
    image_source: IRSAIBEAdapter = Depends(get_ibe_adapter),
    processor: NumpyImageProcessor = Depends(get_processor),
    cache: RedisCache = Depends(get_redis),
) -> CompareObservationsUC:
    return CompareObservationsUC(
        image_source=image_source, processor=processor, cache=cache
    )


def get_search_candidates_uc() -> SearchCandidatesUC:
    # TODO: wire real candidate_repo
    from ...application.use_cases.search_candidates import SearchCandidatesUC
    return SearchCandidatesUC(candidate_repo=None)


def get_evidence_uc() -> GenerateEvidenceUC:
    return GenerateEvidenceUC(
        candidate_repo=None,
        solar_system=None,
        scorer=ConfidenceScorer(),
    )
```

### 9.3 FastAPI App Entry Point

**`backend/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.infrastructure.config import settings
from src.infrastructure.db.session import create_tables
from src.infrastructure.api.v1.routers.observations import router as obs_router
from src.infrastructure.api.v1.routers.compare import router as compare_router
from src.infrastructure.api.v1.routers.candidates import router as candidates_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables(settings.database_url)
    yield


app = FastAPI(
    title="SkyTrace API",
    description="Evidence-first SPHEREx sky investigation platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obs_router)
app.include_router(compare_router)
app.include_router(candidates_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "skytrace-backend"}
```

---

## 10. Frontend Setup and Design System

### 10.1 CSS Variables

**`frontend/app/globals.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --color-void:        #03060F;
  --color-deep:        #080D1A;
  --color-surface:     #0D1528;
  --color-elevated:    #111F3A;
  --color-border:      #1A2545;
  --color-border-glow: #2A3A65;

  --color-nebula-blue: #1E3A8A;
  --color-plasma:      #3B82F6;
  --color-plasma-glow: rgba(59, 130, 246, 0.15);
  --color-infrared:    #F97316;
  --color-candidate:   #22C55E;
  --color-alert:       #EF4444;
  --color-warning:     #F59E0B;

  --color-text:        #E2E8F0;
  --color-text-dim:    #94A3B8;
  --color-muted:       #64748B;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-data: 'IBM Plex Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--color-void);
  color: var(--color-text);
  font-family: var(--font-sans);
  min-height: 100vh;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-deep); }
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}
```

### 10.2 Root Layout

**`frontend/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'SkyTrace - Explore the Sky. Compare the Evidence.',
  description: 'Investigate real SPHEREx infrared sky survey data from NASA IRSA. '
    + 'Compare observations across time, detect candidates, and build your own '
    + 'evidence trail for astronomical changes.',
  keywords: 'SPHEREx, NASA, astronomy, sky survey, infrared, candidate detection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**`frontend/app/providers.tsx`**

```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,  // 5 minutes
          retry: 2,
        },
      },
    })
  )
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## 11. Frontend State and Data Fetching

### 11.1 Zustand Stores

**`frontend/app/store/skyStore.ts`**

```typescript
import { create } from 'zustand'

export interface SkyState {
  ra: number | null
  dec: number | null
  radius: number
  observations: Observation[]
  selectedObsA: Observation | null
  selectedObsB: Observation | null
  setCoordinates: (ra: number, dec: number) => void
  setObservations: (obs: Observation[]) => void
  selectObsA: (obs: Observation) => void
  selectObsB: (obs: Observation) => void
  reset: () => void
}

export const useSkyStore = create<SkyState>((set) => ({
  ra: null,
  dec: null,
  radius: 0.1,
  observations: [],
  selectedObsA: null,
  selectedObsB: null,
  setCoordinates: (ra, dec) => set({ ra, dec }),
  setObservations: (observations) => set({ observations }),
  selectObsA: (obs) => set({ selectedObsA: obs }),
  selectObsB: (obs) => set({ selectedObsB: obs }),
  reset: () => set({ observations: [], selectedObsA: null, selectedObsB: null }),
}))
```

### 11.2 API Hooks

**`frontend/app/hooks/useObservations.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'

const API = process.env.NEXT_PUBLIC_API_URL

export function useObservations(ra: number, dec: number, radius = 0.1) {
  return useQuery({
    queryKey: ['observations', ra, dec, radius],
    queryFn: async () => {
      const res = await fetch(
        `${API}/api/v1/observations?ra=${ra}&dec=${dec}&radius=${radius}`
      )
      if (!res.ok) throw new Error('Failed to fetch observations')
      return res.json() as Promise<Observation[]>
    },
    enabled: ra !== null && dec !== null,
    staleTime: 5 * 60 * 1000,
  })
}

export function useComparison(obsAId: string, obsBId: string, band = 50) {
  return useQuery({
    queryKey: ['comparison', obsAId, obsBId, band],
    queryFn: async () => {
      const res = await fetch(
        `${API}/api/v1/compare?obs_a=${obsAId}&obs_b=${obsBId}&band=${band}`
      )
      if (!res.ok) throw new Error('Failed to fetch comparison')
      return res.json() as Promise<ComparisonResult>
    },
    enabled: !!obsAId && !!obsBId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useEvidence(candidateId: string) {
  return useQuery({
    queryKey: ['evidence', candidateId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/candidates/${candidateId}/evidence`)
      if (!res.ok) throw new Error('Failed to fetch evidence')
      return res.json() as Promise<Evidence>
    },
    enabled: !!candidateId,
    staleTime: 60 * 60 * 1000,
  })
}
```

---

## 12. Frontend Pages - Sky Region Explorer

**`frontend/app/explore/page.tsx`** (key logic):

```typescript
'use client'
import { useState } from 'react'
import { useObservations } from '../hooks/useObservations'
import { useSkyStore } from '../store/skyStore'
import styles from './explore.module.css'

export default function ExplorePage() {
  const [ra, setRa] = useState<number>(83.8221)   // Orion Nebula default
  const [dec, setDec] = useState<number>(-5.3911)
  const { setCoordinates, selectObsA, selectObsB } = useSkyStore()

  const { data: observations, isLoading } = useObservations(ra, dec)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCoordinates(ra, dec)
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Sky Region Explorer</h1>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <label>
          RA (degrees)
          <input type="number" value={ra} step="0.0001"
            onChange={e => setRa(Number(e.target.value))} />
        </label>
        <label>
          Dec (degrees)
          <input type="number" value={dec} step="0.0001"
            onChange={e => setDec(Number(e.target.value))} />
        </label>
        <button type="submit">Search SPHEREx Archive</button>
      </form>

      {isLoading && <div className={styles.loading}>Querying IRSA...</div>}

      {observations && (
        <div className={styles.obsList}>
          <p>{observations.length} observations found</p>
          {observations.map(obs => (
            <div key={obs.id} className={styles.obsCard}>
              <span className={styles.date}>{obs.obs_date}</span>
              <span className={styles.band}>
                Band {obs.band_index} ({obs.wavelength_um.toFixed(2)} um)
              </span>
              <span className={styles.quality}>
                Quality: {obs.quality_pct.toFixed(0)}%
              </span>
              <button onClick={() => selectObsA(obs)}>Set as A</button>
              <button onClick={() => selectObsB(obs)}>Set as B</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
```

---

## 13. Frontend Pages - Time-Travel Comparison

**`frontend/app/compare/[obs1]/[obs2]/page.tsx`**:

```typescript
'use client'
import { useParams } from 'next/navigation'
import { useComparison } from '../../../hooks/useObservations'
import BlinkViewer from '../../../components/comparison/BlinkViewer'
import CandidateList from '../../../components/candidate/CandidateList'
import styles from './compare.module.css'

export default function CompareViewerPage() {
  const { obs1, obs2 } = useParams() as { obs1: string; obs2: string }
  const [band, setBand] = useState(50)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'blink' | 'slider' | 'difference'>('blink')

  const { data: comparison, isLoading } = useComparison(
    decodeURIComponent(obs1),
    decodeURIComponent(obs2),
    band
  )

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Processing SPHEREx FITS data...</p>
        <p className={styles.hint}>
          Aligning WCS frames, computing difference image, detecting sources...
        </p>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.controls}>
        <div className={styles.modeSelector}>
          {(['blink', 'slider', 'difference'] as const).map(mode => (
            <button key={mode}
              className={viewMode === mode ? styles.active : ''}
              onClick={() => setViewMode(mode)}>
              {mode}
            </button>
          ))}
        </div>
        <WavelengthPicker band={band} onChange={setBand} />
      </aside>

      <main className={styles.viewer}>
        {comparison && (
          <BlinkViewer
            imageABase64={comparison.image_a_b64}
            imageBBase64={comparison.image_b_b64}
            differenceBase64={comparison.difference_b64}
            candidates={comparison.candidates}
            mode={viewMode}
            onCandidateSelect={setSelectedCandidate}
          />
        )}
      </main>

      <aside className={styles.candidates}>
        {comparison && (
          <CandidateList
            candidates={comparison.candidates}
            selectedId={selectedCandidate}
            onSelect={setSelectedCandidate}
          />
        )}
      </aside>
    </div>
  )
}
```

---

## 14. Frontend Components - BlinkViewer Canvas Engine

**`frontend/app/components/comparison/BlinkViewer.tsx`**

```typescript
'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './BlinkViewer.module.css'

interface Candidate {
  id: string; pixel_x: number; pixel_y: number;
  confidence_score: number; snr_change: number;
}

interface BlinkViewerProps {
  imageABase64: string
  imageBBase64: string
  differenceBase64: string
  candidates: Candidate[]
  mode: 'blink' | 'slider' | 'difference'
  blinkIntervalMs?: number
  onCandidateSelect?: (id: string) => void
}

export default function BlinkViewer({
  imageABase64, imageBBase64, differenceBase64,
  candidates, mode,
  blinkIntervalMs = 800,
  onCandidateSelect,
}: BlinkViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgARef = useRef<HTMLImageElement | null>(null)
  const imgBRef = useRef<HTMLImageElement | null>(null)
  const imgDiffRef = useRef<HTMLImageElement | null>(null)
  const showingA = useRef(true)
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sliderX = useRef(0.5)  // 0.0-1.0 normalized
  const [imagesLoaded, setImagesLoaded] = useState(false)

  // Load images from base64
  useEffect(() => {
    let loaded = 0
    const total = 3
    const onLoad = () => { loaded++; if (loaded === total) setImagesLoaded(true) }

    imgARef.current = new window.Image()
    imgARef.current.onload = onLoad
    imgARef.current.src = `data:image/png;base64,${imageABase64}`

    imgBRef.current = new window.Image()
    imgBRef.current.onload = onLoad
    imgBRef.current.src = `data:image/png;base64,${imageBBase64}`

    imgDiffRef.current = new window.Image()
    imgDiffRef.current.onload = onLoad
    imgDiffRef.current.src = `data:image/png;base64,${differenceBase64}`
  }, [imageABase64, imageBBase64, differenceBase64])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imagesLoaded) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    if (mode === 'blink') {
      const img = showingA.current ? imgARef.current : imgBRef.current
      if (img) ctx.drawImage(img, 0, 0, W, H)
    } else if (mode === 'slider') {
      const splitX = sliderX.current * W
      // Draw A on left
      ctx.save()
      ctx.beginPath(); ctx.rect(0, 0, splitX, H); ctx.clip()
      if (imgARef.current) ctx.drawImage(imgARef.current, 0, 0, W, H)
      ctx.restore()
      // Draw B on right
      ctx.save()
      ctx.beginPath(); ctx.rect(splitX, 0, W - splitX, H); ctx.clip()
      if (imgBRef.current) ctx.drawImage(imgBRef.current, 0, 0, W, H)
      ctx.restore()
      // Divider line
      ctx.strokeStyle = '#F97316'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, H); ctx.stroke()
    } else {
      if (imgDiffRef.current) ctx.drawImage(imgDiffRef.current, 0, 0, W, H)
    }

    // Draw candidate circles
    candidates.forEach(c => {
      const x = c.pixel_x, y = c.pixel_y
      const radius = 15 + c.confidence_score * 5
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = c.confidence_score > 0.6 ? '#22C55E' : '#F59E0B'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }, [mode, candidates, imagesLoaded])

  // Blink timer
  useEffect(() => {
    if (blinkTimerRef.current) clearInterval(blinkTimerRef.current)
    if (mode !== 'blink') return
    blinkTimerRef.current = setInterval(() => {
      showingA.current = !showingA.current
      drawFrame()
    }, blinkIntervalMs)
    return () => {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current)
    }
  }, [mode, blinkIntervalMs, drawFrame])

  // Slider mouse handling
  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode !== 'slider') return
    const rect = canvasRef.current!.getBoundingClientRect()
    sliderX.current = (e.clientX - rect.left) / rect.width
    drawFrame()
  }

  // Initial render and re-render on mode/data change
  useEffect(() => { drawFrame() }, [drawFrame])

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className={styles.canvas}
        onPointerMove={handlePointerMove}
        onClick={(e) => {
          if (!onCandidateSelect) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) * (512 / rect.width)
          const y = (e.clientY - rect.top)  * (512 / rect.height)
          const hit = candidates.find(c =>
            Math.hypot(c.pixel_x - x, c.pixel_y - y) < 20
          )
          if (hit) onCandidateSelect(hit.id)
        }}
      />
      {!imagesLoaded && <div className={styles.loadingOverlay}>Loading images...</div>}
    </div>
  )
}
```

---

## 15. Frontend Pages - Evidence Panel

**`frontend/app/components/candidate/EvidencePanel.tsx`** (key structure):

```typescript
'use client'
import { useEvidence } from '../../hooks/useObservations'
import styles from './EvidencePanel.module.css'

interface EvidencePanelProps {
  candidateId: string
  onClose: () => void
}

export default function EvidencePanel({ candidateId, onClose }: EvidencePanelProps) {
  const { data: evidence, isLoading } = useEvidence(candidateId)

  if (isLoading) {
    return <div className={styles.panel}><div className={styles.spinner} /></div>
  }

  if (!evidence) return null

  const score = evidence.measurements.find(m => m.label === 'Confidence score')?.value ?? 0
  const label = score >= 0.8 ? 'Very High' : score >= 0.6 ? 'High'
              : score >= 0.3 ? 'Moderate' : 'Very Low'
  const color = score >= 0.6 ? 'var(--color-candidate)' : 'var(--color-warning)'

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <h2>Evidence Panel</h2>
        <button onClick={onClose} aria-label="Close">&times;</button>
      </header>

      <div className={styles.narrative}>{evidence.narrative}</div>

      <div className={styles.confidence} style={{ borderColor: color }}>
        <span className={styles.confidenceLabel}>{label} Confidence</span>
        <div className={styles.confidenceBar}>
          <div style={{ width: `${score * 100}%`, background: color }} />
        </div>
        <span className={styles.confidenceValue}>{(score * 100).toFixed(0)}%</span>
      </div>

      <table className={styles.measurements}>
        <thead>
          <tr><th>Measurement</th><th>Value</th><th>Unit</th></tr>
        </thead>
        <tbody>
          {evidence.measurements.map((m, i) => (
            <tr key={i}>
              <td>{m.label}</td>
              <td className={styles.value}>
                {typeof m.value === 'number' ? m.value.toFixed(3) : m.value}
              </td>
              <td className={styles.unit}>{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.caveats}>
        <h3>Scientific Caveats</h3>
        {evidence.caveats.map((c, i) => (
          <div key={i} className={styles.caveat}>
            <span className={styles.caveatIcon}>!</span>
            <p>{c}</p>
          </div>
        ))}
      </div>

      <div className={styles.links}>
        <h3>Source Data</h3>
        {evidence.irsa_links.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label} (IRSA)
          </a>
        ))}
      </div>
    </aside>
  )
}
```

---

## 16. Testing Strategy

### 16.1 Backend Unit Tests (No Live Data Needed)

```python
# backend/tests/unit/domain/test_confidence_scorer.py
from src.domain.services.confidence_scorer import ConfidenceScorer

def test_high_snr_scores_high():
    scorer = ConfidenceScorer()
    result = scorer.score(snr=15.0, quality_pct=95.0,
                          most_match=False, multi_band=True)
    assert result.score >= 0.6
    assert result.label in ("High", "Very High")

def test_low_snr_scores_low():
    scorer = ConfidenceScorer()
    result = scorer.score(snr=5.1, quality_pct=60.0,
                          most_match=False, multi_band=False)
    assert result.score < 0.5

def test_caveats_always_present():
    scorer = ConfidenceScorer()
    result = scorer.score(snr=100.0, quality_pct=100.0,
                          most_match=False, multi_band=True)
    assert len(result.caveats) >= 2  # Standard caveats always shown
```

```python
# backend/tests/unit/use_cases/test_compare_observations.py
import pytest
from unittest.mock import AsyncMock
from src.application.use_cases.compare_observations import CompareObservationsUC
from src.domain.entities.fits_image import FITSImage
import numpy as np
from astropy.wcs import WCS

@pytest.fixture
def fake_image():
    wcs = WCS(naxis=2)
    wcs.wcs.crpix = [256, 256]
    wcs.wcs.cdelt = [-0.0001, 0.0001]
    wcs.wcs.crval = [83.0, -5.0]
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    return FITSImage(
        data=np.random.normal(0, 1, (512, 512)).astype(np.float32),
        variance=np.ones((512, 512), dtype=np.float32),
        flags=np.zeros((512, 512), dtype=np.int16),
        wcs=wcs, epoch_mjd=60000.0, wavelength_um=2.5,
        band_index=50, obs_id="test_obs", quality_pct=98.0,
    )

@pytest.mark.asyncio
async def test_compare_returns_result_from_cache(fake_image):
    cached_data = {
        "tile_a_b64": "abc", "tile_b_b64": "def", "tile_diff_b64": "ghi",
        "candidates": [], "metadata": {"band": 50},
    }
    mock_cache = AsyncMock()
    mock_cache.get.return_value = cached_data

    uc = CompareObservationsUC(
        image_source=AsyncMock(),
        processor=AsyncMock(),
        cache=mock_cache,
    )
    result = await uc.execute("obs_a", "obs_b", 50)

    assert result.tile_a_b64 == "abc"
    mock_cache.get.assert_called_once()
```

### 16.2 Run Tests

```bash
cd backend
uv run pytest tests/unit/ -v
```

---

## 17. Deployment

### 17.1 Vercel (Frontend)

1. Push to GitHub
2. Connect repo to Vercel (vercel.com/new)
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app`
4. Deploy — Vercel auto-detects Next.js

### 17.2 Railway (Backend + Redis)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create project
railway init

# Add Redis plugin
railway add --plugin redis

# Set environment variables
railway variables set REDIS_URL='${{Redis.REDIS_URL}}'
railway variables set DATABASE_URL='sqlite+aiosqlite:///./data/skytrace.db'
railway variables set IRSA_SIA2_URL='https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3'
railway variables set IRSA_IBE_URL='https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3'
railway variables set IRSA_MOST_URL='https://irsa.ipac.caltech.edu/applications/MOST'

# Deploy
railway up
```

### 17.3 Backend Dockerfile (Production-Ready)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY . .

RUN mkdir -p data

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app",
     "--host", "0.0.0.0", "--port", "8000",
     "--workers", "2"]
```

---

## 18. Demo Preparation Checklist

### 18.1 Pre-Demo Verification (1 hour before)

```bash
# 1. Production endpoints up
curl https://your-backend.up.railway.app/health
# Expected: {"status": "ok"}

# 2. Observation query works
curl "https://your-backend.up.railway.app/api/v1/observations?ra=83.82&dec=-5.39&radius=0.1"
# Expected: JSON array with at least 1 observation

# 3. Compare endpoint works (use IDs from step 2)
curl "https://your-backend.up.railway.app/api/v1/compare?obs_a=ID1&obs_b=ID2&band=50"
# Expected: CompareResponse with image_a_b64 populated

# 4. Frontend loads
# Open https://your-frontend.vercel.app in Chrome
# Featured observations should load on homepage
```

### 18.2 3-Minute Demo Script

**Minute 0:00-0:30 - Hook**
> "SPHEREx launched in March 2025 and is taking infrared photos of the entire sky
> every 6 months. We built SkyTrace to help anyone investigate what changes between
> those photos — using real NASA data, not mockups."

**Minute 0:30-1:15 - Journey A: Explore**
1. Open SkyTrace landing page
2. Show the 3 featured pre-cached observations
3. Type RA=83.82, Dec=-5.39 (Orion Nebula region)
4. Click Search — show the observation list appearing

**Minute 1:15-2:00 - Journey B: Compare**
1. Click "Set as A" on earliest observation
2. Click "Set as B" on latest observation
3. Click "Compare" — show the processing state briefly
4. Images appear — demonstrate blink mode (changes visible!)
5. Switch to difference image (false-color, striking visual)

**Minute 2:00-2:45 - Journey C: Evidence**
1. Click on a highlighted candidate circle on the image
2. Evidence Panel slides in showing:
   - Confidence: High (green gauge)
   - SNR: X sigma
   - MOST cross-match: "No match found" (genuine candidate)
   - Caveats: "Automated detection — expert review required"
3. Point out the IRSA source link (real data traceability)

**Minute 2:45-3:00 - Close**
> "SkyTrace makes SPHEREx's 102-band infrared data explorable by anyone.
> Every detection comes with a confidence score, scientific caveats, and
> a direct link back to NASA's archive. That's what evidence-first means."

### 18.3 Pre-Cached Featured Observations

Pre-compute and cache 3 striking comparisons before the demo:

```python
# Run this script 2 hours before demo to warm the cache
import httpx, asyncio

API = "https://your-backend.up.railway.app"

FEATURED = [
    # Orion region - high density, good for demo
    {"obs_a": "ORION_OBS_ID_1", "obs_b": "ORION_OBS_ID_2", "band": 50},
    # Galactic plane - shows variety
    {"obs_a": "GALACTIC_OBS_ID_1", "obs_b": "GALACTIC_OBS_ID_2", "band": 30},
    # High-latitude clean field
    {"obs_a": "CLEAN_OBS_ID_1", "obs_b": "CLEAN_OBS_ID_2", "band": 70},
]

async def warm_cache():
    async with httpx.AsyncClient(timeout=120.0) as client:
        for f in FEATURED:
            url = f"{API}/api/v1/compare?obs_a={f['obs_a']}&obs_b={f['obs_b']}&band={f['band']}"
            print(f"Warming: {url}")
            resp = await client.get(url)
            print(f"  Status: {resp.status_code}")

asyncio.run(warm_cache())
```

---

## Appendix - Quick Reference Commands

```bash
# Backend: start locally
cd backend && uv run uvicorn main:app --reload --port 8000

# Frontend: start locally
cd frontend && npm run dev

# Both at once (Docker)
docker compose up --build

# Run backend tests
cd backend && uv run pytest tests/ -v

# Type check backend
cd backend && uv run mypy src/

# Lint backend
cd backend && uv run ruff check src/

# Check Redis
redis-cli ping   # should return PONG

# Inspect SQLite database
sqlite3 backend/data/skytrace.db ".tables"
sqlite3 backend/data/skytrace.db "SELECT count(*) FROM observations;"

# Railway: view logs
railway logs --tail

# Vercel: view logs
vercel logs your-deployment-url
```

---

*SkyTrace Implementation Plan v1.0 - NASA Space Apps Challenge 2026*
*"Explore the sky. Compare the evidence. Follow the changes."*
*QR3 data: DOI 10.26131/IRSA662 from NASA/IPAC IRSA*
