# Dispatch Messages

## 2026-11-11T09:32:35Z
Reverse engineer Solar System Scope (http://www.solarsystemscope.com) and all its discoverable subdomains comprehensively using REA skills and browser tools, and implement its 3D interactivity mechanics in Sky Trace's 3D Celestial Explorer on a dedicated git branch for production.

Integrity mode: development

## Requirements

### R1. Comprehensive Reverse Engineering of Solar System Scope
Reverse engineer http://www.solarsystemscope.com and all discoverable subdomains (including sss1, sss2, textures, and related assets) using REA skills and browser inspection. Extract the technical mechanics for 3D camera controls, object selection, zoom-in and zoom-out transitions, object interaction behaviors, and comet trajectory visualization.

### R2. Dedicated Git Branch
Create and switch to a separate git branch (such as `feature/solarsystemscope-interactivity`). All reverse engineering findings, code modifications, and tests must be isolated to this branch.

### R3. 3D Camera Controls and Object Interactivity in Celestial Explorer
Refactor the 3D scene interactivity in Sky Trace's 3D Celestial Explorer (/explore) to match Solar System Scope: when a planet or celestial body is selected, smoothly zoom in, frame the target, and allow seamless object interaction; when deselecting or zooming out, smoothly return to the orbital overview perspective.

### R4. Comet Path Trajectory Correction
Update comet visualization so that comets do not render a full closed orbital ellipse, but instead display only their previous path/trail, matching Solar System Scope's visual mechanics.

### R5. Verification and Reference Comparison
Verify all updated 3D interactions and comet rendering against the live Solar System Scope interface (http://www.solarsystemscope.com) using browser tools and automated tests, ensuring zero console errors and no regressions to existing Sky Trace features.

## Acceptance Criteria

### Git Branching & Isolation
- [ ] A dedicated git branch (such as `feature/solarsystemscope-interactivity`) is created and contains all implementation work.

### Reverse Engineering & Findings
- [ ] Solar System Scope (http://www.solarsystemscope.com) and its subdomains (including sss1, sss2, textures) are reverse-engineered via REA and browser inspection.
- [ ] Camera motion curves, zoom boundaries, target tracking logic, and comet trail algorithms from Solar System Scope are documented from the reverse-engineering analysis.

### 3D Interactivity & Camera Navigation
- [ ] Selecting a planet or celestial body initiates smooth camera zoom-in framing the target.
- [ ] The user can rotate, inspect, and interact with the focused object while centered in the viewport.
- [ ] Deselecting or zooming out smoothly restores the solar system overview perspective without abrupt camera jumps.
- [ ] Interactivity in the 3D Celestial Explorer matches the fluidity and behavior of Solar System Scope without disrupting existing SPHEREx observatory features.

### Comet Trail Visualization
- [ ] Comets display exclusively their historical/previous path trajectory trail rather than a full closed orbit loop.

### Quality & Verification
- [ ] Automated tests pass and browser-based visual verification confirms smooth 3D camera transitions and comet trail rendering against http://www.solarsystemscope.com with zero runtime errors.
- [ ] Production build (`npm run build`) completes with zero errors.

## Execution Directives

### Stage 1 Mandate (Planning & Reverse Engineering First):
Please execute ONLY Stage 1 first:
1. Create and check out the dedicated git branch (e.g., `feature/solarsystemscope-interactivity`).
2. Perform comprehensive reverse engineering of `http://www.solarsystemscope.com` and its discoverable subdomains (`sss1`, `sss2`, `textures`, etc.) using REA skills and browser inspection (inspecting 3D camera selection, zoom-in/zoom-out curves, object interactions, and comet previous-path trail mechanics).
3. Produce a detailed technical Implementation Plan (`plan.md` in your state folder) with concrete proposed diffs/code snippets for Sky Trace's 3D Celestial Explorer (`/explore`), and pause & report those findings + diffs in your handoff back to the Sentinel so we can present the `/plan` artifact for user approval BEFORE applying code modifications to application files.

### Workspace & State
- Working directory: d:\Projects\Personal Projects\Sky Trace
- Your state folder: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_orchestrator_1\
- ORIGINAL_REQUEST.md: d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\ORIGINAL_REQUEST.md
- Storage Note: Drive `C:` has limited space (~1.6GB free). Keep all temp, build, and browser caches on `D:\tmp` (e.g., `$env:TEMP = 'D:\tmp'; $env:TMP = 'D:\tmp'`).


## 2026-11-11T18:35:10Z
STAGE 2 APPROVED — BEGIN EXECUTION ON BRANCH feature/solarsystemscope-interactivity

The user has explicitly approved the Implementation Plan with the following 5 concrete refinements. Proceed immediately with Stage 2 implementation and verification:

1. `frontend/app/types/index.ts`:
   - Add `CameraTransitionState = 'IDLE' | 'TRANSITIONING_IN' | 'TARGET_LOCKED' | 'TRANSITIONING_OUT'`
   - Add `SelectedCelestialBody` with categories: `'Sun' | 'Planet' | 'Dwarf Planet' | 'Natural Satellite' | 'Comet'`, plus `radius`, `effectiveRadius`, `realAU?`, `periodDays?`, `vKms?`, `description?`.

2. `frontend/app/store/skyStore.ts`:
   - Add `selectedCelestialBody`, `cameraTransitionState`, `selectCelestialBody`, `resetCameraToOverview`.
   - When switching `viewMode` to `'spacecraft'`, clear `selectedCelestialBody: null` and reset `cameraTransitionState: 'IDLE'`.

3. `frontend/app/lib/astrometry.ts`:
   - Add `easeOutCubic(t: number): number = 1 - Math.pow(1 - t, 3)`.
   - Add `computeFramingDistance(effectiveRadius: number, cameraFovDeg: number = 60, framingFactor: number = 2.2): number = (effectiveRadius * framingFactor) / Math.sin((cameraFovDeg * 0.5 * Math.PI) / 180)`.
   - Add `computeCometPastTrail(orbit: CometOrbit, currentMeanAnomalyDeg: number, samples: number = 181, trailArcDeg: number = 162)` using cubic time contraction `tau = Math.pow(u, 2.2)` or `u^3`, piecewise SSS alpha `1.0 -> 0.7 -> 0.4 -> 0.0`, and smooth ion-to-dust color blending.

4. `frontend/app/components/sky/CelestialSphere.tsx`:
   - Replace static 360° closed comet loop (lines 1419-1444) with dynamic `Line2` / `LineGeometry` / `LineMaterial` (`three/examples/jsm/lines/...`, `vertexColors: true`, `transparent: true`, `blending: THREE.AdditiveBlending`, `depthWrite: false`, resize-aware resolution), ticked each frame via `computeCometPastTrail` while preserving nucleus, coma, and anti-solar ion/dust tails.
   - Add Sun proximity pick (`sunMesh` at `(0,0,0)`, `radius: 1.8`, `effectiveRadius: 4.5`) in `handlePointerMove` safely without normalizing zero vector.
   - Disambiguate click vs drag (`< 6px` between pointerdown and pointerup). Clicking Sun/Planet/Dwarf Planet/Moon/Comet in Sky mode enters `TRANSITIONING_IN` (supporting direct target-to-target switch). Empty-space `dblclick` triggers `resetCameraToOverview()`.
   - Sync `storeValuesRef.current.cameraTransitionState` into render loop, replace line 2286 unconditional target lerp to `(0,0,0)`, call `controls.update()` AFTER state-machine transforms, disable `enablePan` while `TARGET_LOCKED`, scale `minDistance`/`maxDistance` to `effectiveRadius`, and shift both `controls.target` and `camera.position` by Keplerian frame delta so moving targets stay centered while orbiting.

5. `frontend/app/components/sky/SkyHUD.tsx`:
   - Add Focused Target banner with body telemetry + `"Overview [ESC]"` button calling `resetCameraToOverview()`, plus global `Escape` listener.

6. Quality Gates & Verification:
   - Write unit tests for `computeFramingDistance`, `easeOutCubic`, and `computeCometPastTrail` (181 points, < 360° open path, monotonic piecewise alpha `1.0 -> 0.0`).
   - Run `npm run build` cleanly (0 errors).
   - Run Playwright browser verification against `http://localhost:3000/explore` and `https://www.solarsystemscope.com`: verify 0 errors, planet hover vs drag, click zoom-in -> centered orbit drag -> wheel zoom -> click new target -> ESC overview return, comets open trails, zero SPHEREx regressions.
   - Update `PROJECT.md` milestones cleanly and report back complete verification evidence, test outputs, build status, screenshot paths, and `git diff --stat`.

Enforce storage safety: all commands must set `$env:TEMP='D:\tmp'; $env:TMP='D:\tmp'; $env:TMPDIR='D:\tmp'; $env:NPM_CONFIG_CACHE='D:\tmp\npm-cache'; $env:PIP_CACHE_DIR='D:\tmp\pip-cache'`. Playwright caches on `D:\tmp\pw-cache`, profiles on `D:\tmp\pw-profile`, artifacts on `D:\tmp\pw-tmp`. Keep C: free.
