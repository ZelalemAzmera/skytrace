## 2026-11-12T10:08:15Z
Working directory: d:\Projects\Personal Projects\Sky Trace
State folder: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_orchestrator_2\
Original Request path: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\ORIGINAL_REQUEST.md
Project path: d:\Projects\Personal Projects\Sky Trace\PROJECT.md
Stage 1 Plan path: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_orchestrator_1\plan.md

STAGE 2 APPROVED — EXECUTE IMPLEMENTATION & VERIFICATION ON DEDICATED GIT BRANCH `feature/solarsystemscope-interactivity`

You are teamwork_orchestrator_2. Stage 1 (Reverse Engineering & Planning) is complete and approved by the user. Dedicated branch `feature/solarsystemscope-interactivity` is already created and checked out.
Execute Stage 2 Implementation, Testing, Build, and Playwright E2E Verification on dedicated branch `feature/solarsystemscope-interactivity`.

Incorporate all 5 approved architectural refinements from plan.md:
1. `frontend/app/types/index.ts`: Add `CameraTransitionState` ('IDLE' | 'TRANSITIONING_IN' | 'TARGET_LOCKED' | 'TRANSITIONING_OUT') and `SelectedCelestialBody` ('Sun' | 'Planet' | 'Dwarf Planet' | 'Natural Satellite' | 'Comet', radius, effectiveRadius, realAU?, periodDays?, vKms?, description?).
2. `frontend/app/store/skyStore.ts`: Add `selectedCelestialBody`, `cameraTransitionState`, `selectCelestialBody`, `resetCameraToOverview`. Switching `viewMode` to 'spacecraft' clears `selectedCelestialBody` and resets `cameraTransitionState: 'IDLE'`.
3. `frontend/app/lib/astrometry.ts`: Add `easeOutCubic(t)`, `computeFramingDistance(effectiveRadius, cameraFovDeg=60, framingFactor=2.2)`, and `computeCometPastTrail(orbit, currentMeanAnomalyDeg, samples=181, trailArcDeg=162)` (cubic contraction tau = u^3, piecewise SSS alpha 1.0 -> 0.7 -> 0.4 -> 0.0, ion->dust color blend).
4. `frontend/app/components/sky/CelestialSphere.tsx`:
   - Replace static 360° closed comet loop (lines 1419-1444) with dynamic Line2 / LineGeometry / LineMaterial (`three/examples/jsm/lines/...`, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, resize-aware resolution, proper cleanup dispose), ticked each frame via `computeCometPastTrail` while preserving nucleus, coma, and anti-solar ion/dust tails.
   - Add Sun proximity pick (sunMesh at (0,0,0), radius: 1.8, effectiveRadius: 4.5) in `handlePointerMove` safely WITHOUT calling `.normalize()` / `vectorToIcrs` on zero vector.
   - Disambiguate click vs drag (< 6px between pointerdown and pointerup) so orbiting never misfires zoom-in. Clicking Sun/Planet/Dwarf Planet/Moon/Comet in Sky mode enters TRANSITIONING_IN (supporting direct target-to-target switch). Empty-space dblclick triggers `resetCameraToOverview()`.
   - Sync `storeValuesRef.current.cameraTransitionState` (TRANSITIONING_OUT from HUD, IDLE in spacecraft mode) into render loop, replace line 2286 unconditional target lerp to (0,0,0), call `controls.update()` AFTER state-machine transforms, disable `enablePan` while TARGET_LOCKED, scale minDistance/maxDistance to effectiveRadius, and shift both `controls.target` and `camera.position` by Keplerian frame delta so moving targets stay centered while orbiting. Preserve SPHEREx spacecraft mode, 3D frustum/relief, and optical teardown intact.
5. `frontend/app/components/sky/SkyHUD.tsx`: Floating Focused Target banner with body telemetry + "Overview [ESC]" button calling `resetCameraToOverview()`, plus global Escape listener.
6. Mandatory Verification & Quality Gates:
   - Write & pass unit tests covering `easeOutCubic`, `computeFramingDistance`, and `computeCometPastTrail` (181 points, open path < 360°, monotonic alpha tapering).
   - Run `npm run build` cleanly (0 errors).
   - Run Playwright browser verification comparing `http://localhost:3000/explore` against live `https://www.solarsystemscope.com`: verify 0 console/page errors, planet hover vs drag (no accidental zoom), click smooth zoom-in -> centered orbit drag -> wheel zoom -> switch target -> ESC / Overview smooth zoom-out, Halley & NEOWISE open previous-path trails (no closed ellipse), AND zero SPHEREx Spacecraft / Frustum / 3D Image Relief / Teardown regressions. Inspect screenshots visually.
   - Route ALL temp/cache/Playwright artifacts to `D:\tmp\*` ($env:TEMP='D:\tmp'; $env:TMP='D:\tmp'; $env:TMPDIR='D:\tmp'; $env:NPM_CONFIG_CACHE='D:\tmp\npm-cache'; $env:PIP_CACHE_DIR='D:\tmp\pip-cache'; read-only PLAYWRIGHT_BROWSERS_PATH='C:\Users\zelal\AppData\Local\ms-playwright'; --disk-cache-dir=D:\tmp\pw-cache --user-data-dir=D:\tmp\pw-profile, artifacts in D:\tmp\pw-tmp).
   - Update PROJECT.md milestones and deliver complete verification evidence, test outputs, build status, screenshot paths, and git diff --stat upon completion.
