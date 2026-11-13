# DISPATCH — teamwork_worker_stage2_1
Dispatched by teamwork_orchestrator for Stage 2 Implementation and Unit Testing.
State Folder: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_worker_stage2_1\


## 2026-11-12T13:38:22Z
You are teamwork_worker_stage2_1.
Working directory: d:\Projects\Personal Projects\Sky Trace
State folder: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_worker_stage2_1\

Read this mandatory original request file FIRST:
d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\ORIGINAL_REQUEST.md

Also read the architecture specifications, approved plan, and explorer reports:
- d:\Projects\Personal Projects\Sky Trace\PROJECT.md
- d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_orchestrator_1\plan.md
- d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_explorer_sss_comet\handoff.md
- d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_explorer_skytrace_3d\handoff.md

Armed Skills:
- d:\Projects\Personal Projects\Sky Trace\.agents\skills\clean-code\SKILL.md
- d:\Projects\Personal Projects\Sky Trace\.agents\skills\framer-motion\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Environment & Temp Cache Constraint:
Route ALL temp/cache/build artifacts to D:\tmp\*:
$env:TEMP='D:\tmp'; $env:TMP='D:\tmp'; $env:TMPDIR='D:\tmp'; $env:NPM_CONFIG_CACHE='D:\tmp\npm-cache'; $env:PIP_CACHE_DIR='D:\tmp\pip-cache'

Your Mission:
Execute the implementation of the 5 approved architectural refinements on dedicated branch `feature/solarsystemscope-interactivity`:

1. `frontend/app/types/index.ts`:
   - Add `CameraTransitionState` ('IDLE' | 'TRANSITIONING_IN' | 'TARGET_LOCKED' | 'TRANSITIONING_OUT')
   - Add `SelectedCelestialBody` ('Sun' | 'Planet' | 'Dwarf Planet' | 'Natural Satellite' | 'Comet', radius: number, effectiveRadius: number, realAU?: number, periodDays?: number, vKms?: number, description?: string)

2. `frontend/app/store/skyStore.ts`:
   - Add `selectedCelestialBody: SelectedCelestialBody | null`
   - Add `cameraTransitionState: CameraTransitionState`
   - Add `selectCelestialBody: (body: SelectedCelestialBody | null) => void`
   - Add `resetCameraToOverview: () => void`
   - When switching `viewMode` to 'spacecraft', ensure it clears `selectedCelestialBody: null` and sets `cameraTransitionState: 'IDLE'`.

3. `frontend/app/lib/astrometry.ts`:
   - Add `easeOutCubic(t: number): number`
   - Add `computeFramingDistance(effectiveRadius: number, cameraFovDeg = 60, framingFactor = 2.2): number`
   - Add `computeCometPastTrail(orbit: CometOrbit, currentMeanAnomalyDeg: number, samples = 181, trailArcDeg = 162): { positions: Float32Array; colors: Float32Array }`
     Using cubic contraction `tau = u^3` (u = i / (samples - 1)), piecewise SSS alpha (s >= 0.7 => 1.0, 0.5 <= s < 0.7 => 0.7 + 0.3 * (s-0.5)/0.2, 0.3 <= s < 0.5 => 0.4 + 0.3 * (s-0.3)/0.2, s < 0.3 => 0.4 * (s/0.3)), and color blending from cyan/white to dust orange/amber.

4. `frontend/app/components/sky/CelestialSphere.tsx`:
   - Replace static 360° closed comet loop (lines 1419-1444) with dynamic Line2 / LineGeometry / LineMaterial (`three/examples/jsm/lines/Line2.js`, `three/examples/jsm/lines/LineGeometry.js`, `three/examples/jsm/lines/LineMaterial.js`, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, resize-aware resolution), ticked each frame via `computeCometPastTrail(orbit, mDeg, 181, 162)` while preserving nucleus, coma, and anti-solar ion/dust tails. Ensure proper cleanup/dispose on unmount.
   - Add Sun proximity pick (`sunMesh` at (0,0,0), radius: 1.8, effectiveRadius: 4.5) in `handlePointerMove` safely WITHOUT calling `.normalize()` / `vectorToIcrs` on zero vector.
   - Disambiguate click vs drag (< 6px between pointerdown and pointerup) so orbiting never misfires zoom-in. Clicking Sun/Planet/Dwarf Planet/Moon/Comet in Sky mode enters TRANSITIONING_IN (supporting direct target-to-target switch). Empty-space dblclick triggers `resetCameraToOverview()`.
   - Sync `storeValuesRef.current.cameraTransitionState` (TRANSITIONING_OUT from HUD, IDLE in spacecraft mode) into render loop, replace line 2286 unconditional target lerp to (0,0,0), call `controls.update()` AFTER state-machine transforms, disable `enablePan` while TARGET_LOCKED, scale minDistance/maxDistance to effectiveRadius, and shift both `controls.target` and `camera.position` by Keplerian frame delta so moving targets stay centered while orbiting. Preserve SPHEREx spacecraft mode, 3D frustum/relief, and optical teardown intact.

5. `frontend/app/components/sky/SkyHUD.tsx`:
   - Floating Focused Target banner with body telemetry + "Overview [ESC]" button calling `resetCameraToOverview()`.
   - Add global Escape listener.

6. Testing & Build:
   - Create and run an automated mathematical test script (e.g. `frontend/test_phase8_solarsystemscope_math.mjs`) validating `easeOutCubic`, `computeFramingDistance`, and `computeCometPastTrail` (181 points, open path < 360°, monotonic alpha tapering).
   - Execute `npm run build` in `frontend/` (using `$env:TEMP='D:\tmp'; $env:TMP='D:\tmp'`) and ensure 0 TypeScript or build errors.

7. Deliverables:
   - Write `handoff.md` in `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_worker_stage2_1\handoff.md` detailing:
     * Exact files modified and created
     * Summary of changes per file
     * Commands executed and exact build/test output logs
     * Verification of Clean Code layout and interface contracts
   - Update `progress.md` in your state folder with timestamps before long builds/tests.
   - When finished, send a message back to the orchestrator with your completion summary.
