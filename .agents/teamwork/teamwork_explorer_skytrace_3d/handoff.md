# Handoff Report — Sky Trace 3D Celestial Explorer Architecture & Integration Points

- **Agent**: `teamwork_explorer_skytrace_3d`
- **Role**: Teamwork Explorer (Read-only Codebase & Architecture Investigation)
- **State Folder**: `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_explorer_skytrace_3d\`
- **Date**: 2026-11-11
- **Target Feature**: Solar System Scope Interactivity & Comet Previous-Path Trail Integration

---

## 1. Observation

A comprehensive inspection of the Sky Trace 3D explorer codebase was conducted across all relevant files:
- `frontend/app/components/sky/CelestialSphere.tsx` (2,409 lines)
- `frontend/app/lib/astrometry.ts` (526 lines)
- `frontend/app/store/skyStore.ts` (150 lines)
- `frontend/app/types/index.ts` (91 lines)
- `frontend/app/explore/page.tsx` (188 lines)
- `frontend/app/components/sky/SkyHUD.tsx` (375 lines)
- `frontend/app/components/sky/ControlToggles.tsx` (190 lines)
- `frontend/app/lib/planetXScale.ts` (88 lines)
- `frontend/app/lib/solarSystemCrossmatch.ts` (288 lines)

### 1.1 Camera, Scene, Renderer, and OrbitControls Initialization
In `frontend/app/components/sky/CelestialSphere.tsx:397-426`:
```typescript
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060810, 0.0015);

const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  2000
);
camera.position.set(0, 30, 160);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.5;
controls.maxDistance = 320;
controls.autoRotate = autoRotate;
controls.autoRotateSpeed = 0.35;
```
- **FOV**: `60°`
- **Initial Camera Position**: `(0, 30, 160)`
- **Initial OrbitControls Target**: defaults to `(0, 0, 0)` (the Sun)
- **Controls Configuration**: damping enabled (`0.05`), distance clamped between `0.5` and `320`.

### 1.2 Planets and Celestial Bodies Positioning & Animation Loop
In `frontend/app/components/sky/CelestialSphere.tsx:1245-1341` and `lines 2092-2115`:
- Planets are stored in `planetMeshes: { mesh: THREE.Mesh; orbit: CelestialOrbit; clouds?: THREE.Mesh; rings?: THREE.Mesh; }[]`.
- Defined in `PLANET_ORBITS` (`Mercury`, `Venus`, `Earth`, `Mars`, `Ceres`, `Jupiter`, `Saturn`, `Uranus`, `Neptune`, `Pluto`).
- Positioned in the render loop `animate()`:
```typescript
if (storeValuesRef.current.showOrrery) {
  const jd = getJulianDate();
  let earthPos = new THREE.Vector3(22.8, 0, 0);

  planetMeshes.forEach(({ mesh, orbit, clouds }) => {
    const mDeg = ((jd - 2451545.0) * (360.0 / orbit.periodDays)) % 360;
    const pos = keplerToCartesian(
      orbit.a,
      orbit.e,
      orbit.i,
      orbit.omega,
      orbit.Omega,
      mDeg,
      1.0
    );
    mesh.position.copy(pos);
    mesh.rotation.y = elapsed * 0.4;
    ...
```
- Earth has an orbiting Moon (`lines 1344-1367` & `lines 2118-2126`).
- Main Asteroid Belt is rendered as 1,200 particle points (`lines 1369-1407`).
- Saturn has 3D ring geometry (`RingGeometry(size * 1.35, size * 2.45)`).

### 1.3 Raycasting, Hover, and Click-to-Select Mechanics
In `frontend/app/components/sky/CelestialSphere.tsx:1775-2038`:
- Hover uses screen-space proximity checking:
```typescript
const worldPos = mesh.position.clone();
const ndc = worldPos.clone().project(camera);
if (ndc.z <= 1) {
  const sx = ((ndc.x + 1) / 2) * rect.width;
  const sy = ((1 - ndc.y) / 2) * rect.height;
  const d = Math.hypot(sx - px, sy - py);
  const hitRadius = Math.max(24, (orbit.size / Math.max(1, worldPos.distanceTo(camera.position))) * 1400);
  if (d < hitRadius) { ... }
}
```
- Populates `currentHoveredPlanet`:
```typescript
currentHoveredPlanet = {
  name: bestHit.name,
  category: bestHit.category,
  ra: icrs.ra,
  dec: icrs.dec,
  worldPos: bestHit.meshPos,
  baseRadius: bestHit.radius,
  velocityKms: bestHit.vKms,
  distAu: bestHit.rAu,
  periodDays: bestHit.periodDays,
};
```
- **Click Handling (`lines 1994-1999`)**:
```typescript
if (currentHoveredPlanet) {
  setCoordinates(currentHoveredPlanet.ra, currentHoveredPlanet.dec, currentHoveredPlanet.name);
  if (onCoordinateClick) onCoordinateClick(currentHoveredPlanet.ra, currentHoveredPlanet.dec);
  return;
}
```
**Direct Observation**:
Currently, clicking a hovered planet **only** converts its 3D position into celestial coordinates `(ra, dec)` on the radius-100 outer sphere and slews the SPHEREx telescope reticle. It **does NOT** move, zoom, frame, or lock the camera on the planet. The camera remains stationary at `(0, 30, 160)` orbiting `(0, 0, 0)`.

### 1.4 Comet Closed Orbit Loop Implementation
In `frontend/app/components/sky/CelestialSphere.tsx:1419-1444`:
```typescript
COMET_ORBITS.forEach((comet) => {
  // Orbit path
  const pts: THREE.Vector3[] = [];
  const numPts = 128;
  for (let step = 0; step <= numPts; step++) {
    const m = (step / numPts) * 360;
    pts.push(
      keplerToCartesian(
        comet.a,
        comet.e,
        comet.i,
        comet.omega,
        comet.Omega,
        m,
        1.0
      )
    );
  }
  const cGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const cMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(comet.color),
    transparent: true,
    opacity: 0.35,
  });
  orreryGroup.add(new THREE.Line(cGeo, cMat));
```
**Direct Observation**:
Lines **1420 to 1443** create a static `THREE.Line` geometry iterating `step` from `0` to `128` over a full $360^\circ$ circle of mean anomaly. This draws a complete, closed, static orbital ellipse for both `1P/Halley` and `C/2020 F3 (NEOWISE)`.

### 1.5 Camera Movement & OrbitControls Conflict
In `frontend/app/components/sky/CelestialSphere.tsx:2272-2287`:
```typescript
// View Mode Transitions: Sky Survey (wide) vs Spacecraft (close-up orbiting telescope)
if (isSpacecraftMode) {
  controls.minDistance = 2.0;
  controls.maxDistance = 35;
  if (camera.position.length() > 16) {
    camera.position.lerp(new THREE.Vector3(4.5, 3.2, 5.5), 0.06);
  }
  controls.target.lerp(new THREE.Vector3(0, 0.2, 0), 0.06);
} else {
  controls.minDistance = 0.5;
  controls.maxDistance = 320;
  if (transitionFrames > 0) {
    camera.position.lerp(new THREE.Vector3(0, 30, 160), 0.06);
    transitionFrames--;
  }
  controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
}
```
**Direct Observation**:
1. Line 2286 unconditionally executes `controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);` every single frame in Sky mode. This prevents any persistent target shifting.
2. `controls.update()` is called on line 2063 before the lerp. If `camera.position` is lerped independently, OrbitControls will immediately re-derive spherical coordinates or fight the interpolation.
3. No camera state machine exists; only a naive frame counter `transitionFrames = 45` triggered exclusively by `viewMode` toggle.

---

## 2. Logic Chain

1. **Target Framing Mathematics**:
   - The camera uses vertical field of view $\theta = 60^\circ$ (`camera.fov`).
   - The half-angle is $\alpha = \frac{\theta}{2} \cdot \frac{\pi}{180} = 30^\circ$ ($\sin(30^\circ) = 0.5$).
   - To frame an object of radius $R$ so it occupies approximately $45\%$ of the vertical viewport height (leaving space for HUD readouts and rings):
     $$d_{\text{frame}} = \frac{R \cdot k_{\text{framing}}}{\sin(\alpha)}$$
     where $k_{\text{framing}} \approx 2.2$.
   - For Saturn with rings ($R_{\text{ring}} = 2.45 \cdot R_{\text{planet}}$), $R_{\text{eff}} = 2.45 \cdot 1.90 = 4.65$, giving $d \approx 20.4$.
   - For the Sun ($R_{\text{corona}} = 4.5$), $d \approx 19.8$.
   - For terrestrial planets ($R = 0.6$ to $1.1$), $d \approx 2.8$ to $4.8$.
   - A safety minimum distance clamp $d_{\text{min}} = R + 1.2$ prevents camera clipping into the mesh surface.

2. **Decoupling OrbitControls via a 4-State Machine**:
   - `IDLE`:
     - OrbitControls operates in solar system overview.
     - `controls.target` is `(0, 0, 0)` (Sun).
     - `controls.minDistance = 2.0`, `controls.maxDistance = 320`.
   - `TRANSITIONING_IN`:
     - On object selection, record start camera position $\vec{C}_0$ and start target $\vec{T}_0$.
     - Compute target viewing direction: $\hat{u} = \frac{\vec{C}_0 - \vec{P}_{\text{target}}}{\|\vec{C}_0 - \vec{P}_{\text{target}}\|}$. If $\hat{u}$ is degenerate, default to normalized $(0.5, 0.35, 0.8)$.
     - Camera destination: $\vec{C}_{\text{dest}} = \vec{P}_{\text{target}} + \hat{u} \cdot d_{\text{frame}}$.
     - Over duration $\tau = 1.2\text{ s}$ with easing $f(t) = 1 - (1 - t)^3$ (`easeOutCubic`):
       $$\vec{T}(t) = \text{lerp}(\vec{T}_0, \vec{P}_{\text{target}}(t), f(t))$$
       $$\vec{C}(t) = \text{lerp}(\vec{C}_0, \vec{C}_{\text{dest}}(t), f(t))$$
     - Sync: `controls.target.copy(T(t))`, `camera.position.copy(C(t))`, `camera.lookAt(T(t))`.
     - Disable user drag interference during transition (`controls.enabled = false`).
     - Once $t \ge 1.0$, transition to `TARGET_LOCKED`.
   - `TARGET_LOCKED`:
     - Re-enable OrbitControls (`controls.enabled = true`).
     - Adjust distance bounds to object scale:
       `controls.minDistance = targetRadius * 1.4`
       `controls.maxDistance = targetRadius * 25.0`
     - **Dynamic Target Tracking Loop**:
       Because planets, moons, and comets orbit each frame, the world position $\vec{P}_{\text{target}}(t)$ changes:
       $$\vec{\Delta} = \vec{P}_{\text{target}}(t) - \text{controls.target}$$
       $$\text{controls.target.copy}(\vec{P}_{\text{target}}(t))$$
       $$\text{camera.position.add}(\vec{\Delta})$$
       This preserves the user's manual orbital rotation angles and zoom distance relative to the moving planet!
   - `TRANSITIONING_OUT`:
     - Triggered by deselecting (Escape key, clicking "Return to Overview" CTA in HUD, or clicking empty space).
     - Records $\vec{C}_{\text{lock}}$ and $\vec{T}_{\text{lock}}$.
     - Interpolates $\vec{T}(t) \to (0, 0, 0)$ and $\vec{C}(t) \to (0, 30, 160)$ over $1.0\text{ s}$ via `easeOutCubic`.
     - Once complete, transitions to `IDLE` with `controls.minDistance = 0.5` and `maxDistance = 320`.

3. **Comet Previous-Path Trail Geometry & Shading**:
   - Instead of a closed ellipse across $M \in [0^\circ, 360^\circ]$, comets in Solar System Scope display an open historical trail representing the previous $\approx 120^\circ$ to $160^\circ$ of orbital arc.
   - For $k = 0, \dots, N-1$ ($N=96$ segments):
     $$s_k = \frac{k}{N-1} \quad (s_0 = 0 \text{ at nucleus}, s_{N-1} = 1 \text{ at oldest trail point})$$
     $$M_k = M_{\text{current}} - s_k \cdot \Delta M$$
     $$\vec{P}_k = \text{keplerToCartesian}(a, e, i, \omega, \Omega, M_k, 1.0)$$
   - Color and Alpha:
     $$\alpha(s_k) = (1 - s_k)^{1.6} \cdot 0.85$$
     $$\vec{C}_k = \vec{C}_{\text{comet}} \cdot \alpha(s_k)$$
   - Using `THREE.Line` with `BufferGeometry` having dynamic `position` and `color` attributes, updated in the tick loop:
     `posAttr.needsUpdate = true;`
     `colAttr.needsUpdate = true;`
   - Material: `THREE.LineBasicMaterial` with `vertexColors: true`, `transparent: true`, `blending: THREE.AdditiveBlending`, and `depthWrite: false`.

---

## 3. Caveats

1. **Moving Targets During Transition**:
   Because planets move along their Keplerian orbits every frame, the destination position $\vec{C}_{\text{dest}}(t)$ must be re-evaluated each frame during `TRANSITIONING_IN` using the live Kepler position at the current Julian Date, rather than freezing the position at $t=0$.
2. **OrbitControls Internal Spherical Cache**:
   When re-enabling `controls.enabled = true` on arrival at `TARGET_LOCKED`, `controls.update()` must be called immediately so OrbitControls synchronizes its internal spherical coordinates $(r, \phi, \theta)$ to the new relative offset vector $(\vec{C} - \vec{T})$.
3. **Saturn Ring and Sun Corona Radius Scaling**:
   When framing Saturn or the Sun, using the bare sphere radius ($1.9$ or $1.8$) would cause rings ($r=4.65$) or outer corona ($r=4.5$) to be clipped by the viewport edges. The effective framing radius must account for ring and corona spans.
4. **Spacecraft View Mode Interaction**:
   When the user is in SPHEREx Spacecraft View Mode (`viewMode === 'spacecraft'`), planet selection should either switch to Sky Survey mode or remain dedicated to telescope attitude slew, keeping the spacecraft model unobstructed.

---

## 4. Conclusion & Concrete Architectural Specifications

### 4.1 State Store Extensions (`frontend/app/store/skyStore.ts`)
Add `selectedCelestialBody`, `cameraTransitionState`, and corresponding action handlers:

```typescript
export interface SelectedCelestialBody {
  name: string;
  category: 'Planet' | 'Dwarf Planet' | 'Moon' | 'Sun' | 'Comet' | 'Candidate' | 'Star';
  radius: number;
  realAU?: number;
  periodDays?: number;
  vKms?: number;
  description?: string;
}

export type CameraTransitionState =
  | 'IDLE'
  | 'TRANSITIONING_IN'
  | 'TARGET_LOCKED'
  | 'TRANSITIONING_OUT';
```

In `SkyState`:
```typescript
selectedCelestialBody: SelectedCelestialBody | null;
cameraTransitionState: CameraTransitionState;
selectCelestialBody: (body: SelectedCelestialBody | null) => void;
resetCameraToOverview: () => void;
```

### 4.2 Astrometry Helpers (`frontend/app/lib/astrometry.ts`)
Add mathematical framing and comet past-path calculations:

```typescript
/**
 * Computes optimal camera distance to frame a celestial object within camera FOV.
 */
export function computeFramingDistance(
  targetRadius: number,
  cameraFovDeg: number = 60,
  framingFactor: number = 2.2
): number {
  const halfFovRad = (cameraFovDeg * 0.5 * Math.PI) / 180;
  const dist = (targetRadius * framingFactor) / Math.sin(halfFovRad);
  return Math.max(dist, targetRadius + 1.2);
}

/**
 * Computes historical previous-path trail coordinates and alpha weights for a comet.
 */
export function computeCometPastTrail(
  orbit: CometOrbit,
  currentMDeg: number,
  numSegments = 96,
  trailArcDeg = 140
): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(numSegments * 3);
  const colors = new Float32Array(numSegments * 3);
  const baseColor = new THREE.Color(orbit.color);

  for (let k = 0; k < numSegments; k++) {
    const s = k / (numSegments - 1); // 0 at head, 1 at tail
    const m = currentMDeg - s * trailArcDeg;
    const pt = keplerToCartesian(orbit.a, orbit.e, orbit.i, orbit.omega, orbit.Omega, m, 1.0);

    positions[k * 3] = pt.x;
    positions[k * 3 + 1] = pt.y;
    positions[k * 3 + 2] = pt.z;

    const alpha = Math.pow(1.0 - s, 1.6) * 0.85;
    colors[k * 3] = baseColor.r * alpha;
    colors[k * 3 + 1] = baseColor.g * alpha;
    colors[k * 3 + 2] = baseColor.b * alpha;
  }

  return { positions, colors };
}
```

### 4.3 Comet Trajectory Replacement (`frontend/app/components/sky/CelestialSphere.tsx`)
Replace static closed orbit loop with dynamic previous-path trail:

```typescript
// Replace lines 1420-1443 with dynamic past-path trail buffer:
interface CometMeshItem {
  nucleus: THREE.Mesh;
  coma: THREE.Mesh;
  ionTail: THREE.Mesh;
  dustTail: THREE.Mesh;
  trailLine: THREE.Line;
  trailGeo: THREE.BufferGeometry;
  orbit: CometOrbit;
}
const cometMeshes: CometMeshItem[] = [];

COMET_ORBITS.forEach((comet) => {
  const numPts = 96;
  const trailGeo = new THREE.BufferGeometry();
  const initPositions = new Float32Array(numPts * 3);
  const initColors = new Float32Array(numPts * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(initPositions, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(initColors, 3));

  const trailMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  orreryGroup.add(trailLine);

  // (nucleus, coma, ionTail, dustTail mesh creation remains...)
  cometMeshes.push({ nucleus, coma, ionTail, dustTail, trailLine, trailGeo, orbit: comet });
});
```

And in the animation loop (`animate`):
```typescript
cometMeshes.forEach(({ nucleus, coma, ionTail, dustTail, trailGeo, orbit }) => {
  const mDeg = ((jd - 2451545.0) * (360.0 / orbit.periodDays)) % 360;
  const pos = keplerToCartesian(orbit.a, orbit.e, orbit.i, orbit.omega, orbit.Omega, mDeg, 1.0);
  nucleus.position.copy(pos);
  coma.position.copy(pos);

  // Update comet dynamic past-path trail
  const { positions, colors } = computeCometPastTrail(orbit, mDeg, 96, 140);
  const posAttr = trailGeo.attributes.position as THREE.BufferAttribute;
  const colAttr = trailGeo.attributes.color as THREE.BufferAttribute;
  (posAttr.array as Float32Array).set(positions);
  (colAttr.array as Float32Array).set(colors);
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  ...
```

### 4.4 Camera Controller State Machine in `CelestialSphere.tsx`

```typescript
// Camera Transition Controller Variables
let camState: CameraTransitionState = 'IDLE';
let transProgress = 0;
const transDuration = 1.2; // seconds
const overviewCamPos = new THREE.Vector3(0, 30, 160);
const overviewTarget = new THREE.Vector3(0, 0, 0);

const startCamPos = new THREE.Vector3();
const startTarget = new THREE.Vector3();
const endCamPos = new THREE.Vector3();
const endTarget = new THREE.Vector3();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Function to resolve current world position and effective framing radius of active target
function getTargetLiveInfo(): { pos: THREE.Vector3; radius: number } | null {
  const body = storeValuesRef.current.selectedCelestialBody;
  if (!body) return null;

  if (body.name === 'Sun') {
    return { pos: new THREE.Vector3(0, 0, 0), radius: 4.5 };
  }
  if (body.name === 'Moon') {
    return { pos: moonMesh.position.clone(), radius: 0.35 };
  }
  const pm = planetMeshes.find((p) => p.orbit.name === body.name);
  if (pm) {
    const effectiveRadius = body.name === 'Saturn' ? pm.orbit.size * 2.45 : pm.orbit.size;
    return { pos: pm.mesh.position.clone(), radius: effectiveRadius };
  }
  const cm = cometMeshes.find((c) => c.orbit.name === body.name);
  if (cm) {
    return { pos: cm.nucleus.position.clone(), radius: cm.orbit.size * 2.5 };
  }
  return null;
}
```

In `animate(delta)`:
```typescript
if (camState === 'TRANSITIONING_IN') {
  transProgress += delta / transDuration;
  const t = Math.min(1.0, easeOutCubic(transProgress));
  const targetInfo = getTargetLiveInfo();

  if (targetInfo) {
    endTarget.copy(targetInfo.pos);
    const frameDist = computeFramingDistance(targetInfo.radius, camera.fov);
    const dir = startCamPos.clone().sub(endTarget).normalize();
    if (dir.lengthSq() < 0.1 || isNaN(dir.x)) dir.set(0.6, 0.4, 0.7).normalize();
    endCamPos.copy(endTarget).add(dir.multiplyScalar(frameDist));

    controls.target.lerpVectors(startTarget, endTarget, t);
    camera.position.lerpVectors(startCamPos, endCamPos, t);
    camera.lookAt(controls.target);
  }

  if (transProgress >= 1.0) {
    camState = 'TARGET_LOCKED';
    controls.enabled = true;
    if (targetInfo) {
      controls.minDistance = Math.max(0.2, targetInfo.radius * 1.3);
      controls.maxDistance = targetInfo.radius * 25.0;
    }
    controls.update();
  }
} else if (camState === 'TARGET_LOCKED') {
  const targetInfo = getTargetLiveInfo();
  if (targetInfo) {
    // Dynamic tracking: shift target and camera by target motion delta
    const deltaShift = targetInfo.pos.clone().sub(controls.target);
    controls.target.copy(targetInfo.pos);
    camera.position.add(deltaShift);
  }
  controls.update();
} else if (camState === 'TRANSITIONING_OUT') {
  transProgress += delta / 1.0;
  const t = Math.min(1.0, easeOutCubic(transProgress));

  controls.target.lerpVectors(startTarget, overviewTarget, t);
  camera.position.lerpVectors(startCamPos, overviewCamPos, t);
  camera.lookAt(controls.target);

  if (transProgress >= 1.0) {
    camState = 'IDLE';
    controls.enabled = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 320;
    controls.target.copy(overviewTarget);
    controls.update();
  }
} else if (camState === 'IDLE') {
  if (!isSpacecraftMode) {
    controls.target.lerp(overviewTarget, 0.05);
  }
  controls.update();
}
```

### 4.5 Interactive Selection Trigger (`handlePointerDown`)
```typescript
if (currentHoveredPlanet) {
  setCoordinates(currentHoveredPlanet.ra, currentHoveredPlanet.dec, currentHoveredPlanet.name);
  if (onCoordinateClick) onCoordinateClick(currentHoveredPlanet.ra, currentHoveredPlanet.dec);

  // Initiate Smooth Zoom-in & Frame Target
  startCamPos.copy(camera.position);
  startTarget.copy(controls.target);
  transProgress = 0;
  camState = 'TRANSITIONING_IN';
  controls.enabled = false;

  selectCelestialBody({
    name: currentHoveredPlanet.name,
    category: currentHoveredPlanet.category as any,
    radius: currentHoveredPlanet.baseRadius,
    realAU: currentHoveredPlanet.distAu,
    periodDays: currentHoveredPlanet.periodDays,
    vKms: currentHoveredPlanet.velocityKms,
  });
  return;
}
```

### 4.6 Keyboard Deselection / Return to Overview
Add Escape key listener in `CelestialSphere.tsx`:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && (camState === 'TARGET_LOCKED' || camState === 'TRANSITIONING_IN')) {
    startCamPos.copy(camera.position);
    startTarget.copy(controls.target);
    transProgress = 0;
    camState = 'TRANSITIONING_OUT';
    controls.enabled = false;
    selectCelestialBody(null);
  }
};
window.addEventListener('keydown', handleKeyDown);
```

### 4.7 HUD Focused Object Banner (`SkyHUD.tsx`)
When `selectedCelestialBody` is active, display a floating holographic banner with a one-click "Return to Solar System Overview [⎋]" button:
```tsx
{selectedCelestialBody && (
  <div className="glass-panel p-3 border border-[var(--accent-cyan)] shadow-[0_0_15px_rgba(0,229,255,0.25)] bg-[rgba(6,12,28,0.95)] flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Orbit className="w-4 h-4 text-[var(--accent-cyan)] animate-spin" />
      <div>
        <div className="text-[10px] text-[var(--accent-cyan)] font-mono uppercase font-bold">
          Target Focused
        </div>
        <div className="text-sm font-bold text-white">
          {selectedCelestialBody.name}
        </div>
      </div>
    </div>
    <button
      onClick={() => resetCameraToOverview()}
      className="px-2.5 py-1 rounded bg-[rgba(0,229,255,0.15)] hover:bg-[var(--accent-cyan)] hover:text-[#060810] text-[var(--accent-cyan)] border border-[var(--accent-cyan)] text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Overview</span>
      <kbd className="px-1 py-0.2 bg-[rgba(0,0,0,0.4)] rounded text-[9px]">ESC</kbd>
    </button>
  </div>
)}
```

---

## 5. Verification Method

To independently verify these findings and confirm the planned code changes:

1. **Verify File Paths and Line Numbers**:
   - Inspect `CelestialSphere.tsx:1420-1443` to confirm the static 128-point closed ellipse loop for comets.
   - Inspect `CelestialSphere.tsx:1994-1999` to confirm that clicking a planet only executes `setCoordinates` without camera motion.
   - Inspect `CelestialSphere.tsx:2286` to confirm that `controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1)` currently overrides target positioning every frame.

2. **Automated Mathematical Unit Test Script (`test_camera_and_comet.mjs`)**:
   Create and execute a standalone test script verifying:
   - `computeFramingDistance(1.05, 60)` yields $\approx 4.62$ units for Earth.
   - `computeFramingDistance(2.30, 60)` yields $\approx 10.12$ units for Jupiter.
   - `computeCometPastTrail` produces 96 points with monotonically decreasing alpha values from $0.85$ at $k=0$ to $0.0$ at $k=95$.
   - Kepler backward propagation accurately follows the orbital ellipse in reverse.

3. **Frontend Production Build Verification**:
   Execute:
   ```powershell
   $env:TEMP = 'D:\tmp'; $env:TMP = 'D:\tmp'
   cd "d:\Projects\Personal Projects\Sky Trace\frontend"
   npm run build
   ```
   Confirm zero TypeScript errors and successful static route generation across all routes.

4. **Interactive Playwright Verification in Browser**:
   Run browser session targeting `http://localhost:3000/explore`:
   - Click planet (e.g., Earth or Mars): confirm smooth zoom-in animation transitions over 1.2 seconds, framing the target prominently.
   - Orbit around Earth with mouse drag: confirm OrbitControls revolves around Earth rather than jumping back to the Sun.
   - Observe comets Halley and NEOWISE: confirm comets display only their fading historical trailing path rather than a closed ellipse.
   - Click "Return to Overview" or press Escape: confirm camera smoothly transitions back to solar system overview `(0, 30, 160)` centered at `(0, 0, 0)`.
