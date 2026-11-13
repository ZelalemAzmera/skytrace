# Project: Sky Trace — Solar System Scope 3D Interactivity & Comet Trail Engine

## Architecture & System Overview
Sky Trace's 3D Celestial Explorer (`/explore`) renders an interactive Three.js r137 scene combining astronomical coordinate systems (ICRS J2000, Galactic, Ecliptic), SPHEREx telescope observations, and a real-time Keplerian planetary orrery.
Following reverse engineering of Solar System Scope (`http://www.solarsystemscope.com`, `sss2`, and `textures`), the 3D scene architecture is upgraded with Solar System Scope's exact interaction mechanics:
1. **Camera Framing & Transition Controller**: Decoupled 4-state camera transition machine (`IDLE`, `TRANSITIONING_IN`, `TARGET_LOCKED`, `TRANSITIONING_OUT`) replacing naive unconditional lerp.
2. **Object Framing Math**: Radius-dependent framing distance $d = \frac{R \cdot 2.2}{\sin(\alpha)}$ with ring/corona expansions.
3. **Dynamic Target Tracking Loop**: OrbitControls target synchronization with moving planetary bodies without fighting user orbit rotation ($\vec{\Delta} = \vec{P}_{\text{target}}(t) - \text{controls.target}$).
4. **Dynamic Comet Previous-Path Trail**: Replaces the static 360° closed orbit ellipse with an authentic cubic backward time sampling trail ($N=180$ points, $\tau = u^3$, piecewise alpha gradient $1.0 \to 0.7 \to 0.4 \to 0.0$).
5. **Solar System Scope Assets**: High-resolution CC BY 4.0 textures and authentic comet nucleus/side billboard rendering.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dedicated Git Branch | Work isolated on `feature/solarsystemscope-interactivity` | M0 (Done) | ORIGINAL_REQUEST §R2 |
| 2 | Reverse Engineering of SSS & Subdomains | Extraction of camera, zoom, target tracking, comet trails, and assets | M1 (Done) | ORIGINAL_REQUEST §R1 |
| 3 | Camera State Machine & Decoupled OrbitControls | 4-state camera manager resolving line 2286 target reset conflict | M2 | Reverse Engineering Analysis |
| 4 | Smooth Zoom-In Target Framing | Radius-based framing distance with `easeOutCubic` animation | M2 | Reverse Engineering Analysis |
| 5 | Centered Orbit & Target Tracking | Free orbit rotation around orbiting planet in viewport center | M2 | Reverse Engineering Analysis |
| 6 | Smooth Zoom-Out Overview Recovery | Seamless return to solar system overview upon deselect / Escape | M2 | Reverse Engineering Analysis |
| 7 | Dynamic Comet Previous-Path Trail | Replaces lines 1420-1443 closed loop with dynamic backward trail | M3 | Reverse Engineering Analysis |
| 8 | Texture & Visual Polish | Integrates SSS texture pipelines and billboarding | M3 | Reverse Engineering Analysis |
| 9 | Verification & E2E Validation | Visual comparison against live SSS, automated tests, zero build errors | M4 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Git Branch Setup | Create & checkout `feature/solarsystemscope-interactivity` | None | DONE |
| M1 | Reverse Engineering & Technical Plan | Decompile SSS, extract formulas, produce `plan.md` | M0 | DONE (Stage 1) |
| M2 | 3D Camera Controls & Object Interactivity | Implement 4-state machine, smooth zoom-in/out, target tracking in `CelestialSphere.tsx` | M1, `/plan` approval | DONE |
| M3 | Comet Previous-Path Trail Engine | Replace closed loop with dynamic vertex alpha trail in `astrometry.ts` & `CelestialSphere.tsx` | M1, `/plan` approval | DONE |
| M4 | Visual Verification & Production Build | Automated tests, visual verification against solarsystemscope.com, `npm run build` | M2, M3 | DONE |

## Interface Contracts
### `frontend/app/types/index.ts`
```typescript
export type CameraTransitionState = 'IDLE' | 'TRANSITIONING_IN' | 'TARGET_LOCKED' | 'TRANSITIONING_OUT';

export interface SelectedCelestialBody {
  name: string;
  type: 'star' | 'planet' | 'comet' | 'moon';
  radius: number;
  color: string;
}
```

### `frontend/app/store/skyStore.ts`
```typescript
selectedCelestialBody: SelectedCelestialBody | null;
cameraTransitionState: CameraTransitionState;
selectCelestialBody: (body: SelectedCelestialBody | null) => void;
resetCameraToOverview: () => void;
```

### `frontend/app/lib/astrometry.ts`
```typescript
export function computeCometPastTrail(
  orbit: CometOrbit,
  currentJD: number,
  samples?: number,
  arcDegrees?: number
): { positions: Float32Array; colors: Float32Array };
```

## Code Layout
- `frontend/app/components/sky/CelestialSphere.tsx`: Three.js scene, camera state machine, target tracking, comet mesh/trail bindings.
- `frontend/app/lib/astrometry.ts`: Keplerian orbits, coordinate transformations, `computeCometPastTrail` mathematical engine.
- `frontend/app/store/skyStore.ts`: Global state for active selection and camera transition mode.
- `frontend/app/types/index.ts`: TypeScript contracts for celestial bodies and camera transitions.
- `frontend/app/components/sky/SkyHUD.tsx`: Telemetry overlay, target selection dossier, and "Return to Overview" CTA.
