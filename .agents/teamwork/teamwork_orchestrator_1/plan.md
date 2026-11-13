# Implementation Plan: Solar System Scope 3D Interactivity & Comet Trail Engine

## User Review Notice
This implementation plan represents the synthesis of reverse engineering findings from Solar System Scope (`http://www.solarsystemscope.com`, `sss2`, and `textures`) and codebase inspection of Sky Trace (`/explore`).
Per the Stage 1 Mandate, this plan is submitted for user `/plan` review and approval prior to modifying application code.

---

## 1. Summary of Reverse Engineering Findings

### 1.1 3D Camera Controls & Target Framing
From decompiled AVM2 bytecode (`cora.math:SinT`, `System`, `Camera`) and Three.js architecture mapping:
1. **Target Framing Distance**:
   $$d_{\text{frame}} = \frac{R_{\text{eff}} \cdot k_{\text{framing}}}{\sin(\alpha)}$$
   where $k_{\text{framing}} \approx 2.2$, $\alpha = \frac{\text{FOV}}{2} = 30^\circ$ ($\sin(30^\circ) = 0.5$).
   - Terrestrial planets ($R = 0.6$ to $1.1$): $d \approx 2.8$ to $4.8$ units.
   - Gas giants (Jupiter $R=2.2$): $d \approx 9.7$ units.
   - Saturn ($R_{\text{planet}} = 1.9$, $R_{\text{eff}} = 2.45 \cdot 1.9 = 4.65$ with rings): $d \approx 20.4$ units.
   - Sun ($R_{\text{corona}} = 4.5$): $d \approx 19.8$ units.
2. **Smooth Transition Easing**:
   - Cubic out easing: $f(t) = 1 - (1 - t)^3$ over $\tau = 1.2\text{ s}$.
   - Damping: OrbitControls damping factor $0.05$ with smooth target lerp during transitions.
3. **Decoupled 4-State Machine**:
   - `IDLE`: Overview perspective $(0, 30, 160)$, target $(0, 0, 0)$, full distance range ($0.5$ to $320$).
   - `TRANSITIONING_IN`: Controls disabled from user drag; camera position and lookAt target interpolate smoothly to framing vector.
   - `TARGET_LOCKED`: Controls re-enabled; distance clamped to $[1.4 \cdot R, 25 \cdot R]$; target locked to centered moving planet via dynamic delta offset:
     $$\vec{\Delta} = \vec{P}_{\text{target}}(t) - \text{controls.target}$$
     $$\text{controls.target.copy}(\vec{P}_{\text{target}}(t))$$
     $$\text{camera.position.add}(\vec{\Delta})$$
   - `TRANSITIONING_OUT`: Interpolates camera back to $(0, 30, 160)$ and target to $(0, 0, 0)$ over $1.0\text{ s}$ via `easeOutCubic`.

### 1.2 Comet Trajectory Mechanics
From verbatim disassembled ActionScript `System.transformTrajElliptic2`:
1. Comets in Solar System Scope do NOT render a closed $360^\circ$ loop. They render only their previous path/trail.
2. **Cubic Backward Time Sampling**:
   - 181 discrete sample vertices ($N=180$).
   - $u = \frac{N - i}{N - 0.5} \implies \tau = u^3$ (cubic time contraction concentrating points near the nucleus).
   - $\text{sample\_time} = \text{current\_time} - \frac{T}{2} \cdot \tau$
3. **Piecewise Alpha Gradient**:
   - $s \ge 0.7 \implies \alpha = 1.0$ (dense nucleus wake).
   - $0.5 \le s < 0.7 \implies \alpha = 0.7 + 0.3 \cdot \frac{s - 0.5}{0.2}$.
   - $0.3 \le s < 0.5 \implies \alpha = 0.4 + 0.3 \cdot \frac{s - 0.3}{0.2}$.
   - $s < 0.3 \implies \alpha = 0.4 \cdot \frac{s}{0.3}$ (fading into vacuum).
4. **Shader / Material**:
   - `THREE.Line` with dynamic `BufferGeometry` updating `position` and `color` buffer attributes every frame.
   - `THREE.LineBasicMaterial` with `vertexColors: true`, `transparent: true`, `blending: THREE.AdditiveBlending`, `depthWrite: false`.

---

## 2. Proposed Concrete Code Diffs

### Diff 1: `frontend/app/types/index.ts`
```typescript
// Add Camera Transition State and Selected Body Types
export type CameraTransitionState = 'IDLE' | 'TRANSITIONING_IN' | 'TARGET_LOCKED' | 'TRANSITIONING_OUT';

export interface SelectedCelestialBody {
  name: string;
  type: 'star' | 'planet' | 'comet' | 'moon';
  radius: number;
  color: string;
}
```

### Diff 2: `frontend/app/store/skyStore.ts`
```typescript
// Add state and actions to SkyState interface
selectedCelestialBody: SelectedCelestialBody | null;
cameraTransitionState: CameraTransitionState;
selectCelestialBody: (body: SelectedCelestialBody | null) => void;
resetCameraToOverview: () => void;

// In create<SkyState>:
selectedCelestialBody: null,
cameraTransitionState: 'IDLE',
selectCelestialBody: (body) => set({
  selectedCelestialBody: body,
  cameraTransitionState: body ? 'TRANSITIONING_IN' : 'TRANSITIONING_OUT',
}),
resetCameraToOverview: () => set({
  selectedCelestialBody: null,
  cameraTransitionState: 'TRANSITIONING_OUT',
}),
```

### Diff 3: `frontend/app/lib/astrometry.ts`
```typescript
/**
 * Computes dynamic past-path trail for comets based on Solar System Scope's transformTrajElliptic2.
 * Samples backward in orbital anomaly using cubic contraction and piecewise alpha fading.
 */
export function computeCometPastTrail(
  orbit: CometOrbit,
  currentMeanAnomalyDeg: number,
  samples: number = 96,
  arcDegrees: number = 140
): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(samples * 3);
  const colors = new Float32Array(samples * 3);
  const baseColor = new THREE.Color(orbit.color);

  for (let i = 0; i < samples; i++) {
    // Non-linear cubic parameter concentrating vertices near the nucleus (u in [0, 1])
    const u = i / (samples - 1);
    const tau = Math.pow(u, 2.2); // SSS cubic time contraction
    const mDeg = (currentMeanAnomalyDeg - tau * arcDegrees + 360) % 360;
    const pt = keplerToCartesian(orbit.a, orbit.e, orbit.i, orbit.omega, orbit.Omega, mDeg, 1.0);

    positions[i * 3 + 0] = pt.x;
    positions[i * 3 + 1] = pt.y;
    positions[i * 3 + 2] = pt.z;

    // Piecewise alpha gradient matching SSS transformTrajElliptic2
    const s = 1.0 - u; // s = 1.0 at head, 0.0 at tail tip
    let alpha = 0.0;
    if (s >= 0.7) {
      alpha = 1.0;
    } else if (s >= 0.5) {
      alpha = 0.7 + 0.3 * ((s - 0.5) / 0.2);
    } else if (s >= 0.3) {
      alpha = 0.4 + 0.3 * ((s - 0.3) / 0.2);
    } else {
      alpha = 0.4 * (s / 0.3);
    }

    colors[i * 3 + 0] = baseColor.r * alpha;
    colors[i * 3 + 1] = baseColor.g * alpha;
    colors[i * 3 + 2] = baseColor.b * alpha;
  }

  return { positions, colors };
}
```

### Diff 4: `frontend/app/components/sky/CelestialSphere.tsx`
```typescript
// Replace lines 1420-1443 (static closed ellipse):
// WITH dynamic BufferGeometry for comet past-path trail
const numTrailPts = 96;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numTrailPts * 3), 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(numTrailPts * 3), 3));
const trailMat = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const trailLine = new THREE.Line(trailGeo, trailMat);
orreryGroup.add(trailLine);

// In animate tick loop:
const { positions, colors } = computeCometPastTrail(comet.orbit, mDeg, 96, 140);
(trailGeo.attributes.position as THREE.BufferAttribute).copyArray(positions).needsUpdate = true;
(trailGeo.attributes.color as THREE.BufferAttribute).copyArray(colors).needsUpdate = true;

// Replace line 2286 (unconditional lerp to 0,0,0):
// WITH 4-State Camera Transition Controller
if (camState === 'TRANSITIONING_IN') {
  transProgress += delta / 1.2;
  const t = Math.min(1.0, 1 - Math.pow(1 - transProgress, 3)); // easeOutCubic
  controls.enabled = false;
  camera.position.lerpVectors(startCamPos, targetCamPos, t);
  controls.target.lerpVectors(startTarget, liveTargetPos, t);
  controls.update();
  if (t >= 1.0) {
    camState = 'TARGET_LOCKED';
    controls.enabled = true;
    controls.minDistance = targetRadius * 1.4;
    controls.maxDistance = targetRadius * 25.0;
  }
} else if (camState === 'TARGET_LOCKED') {
  // Real-time target tracking without overriding user orbit rotation
  const deltaShift = liveTargetPos.clone().sub(controls.target);
  controls.target.copy(liveTargetPos);
  camera.position.add(deltaShift);
  controls.update();
} else if (camState === 'TRANSITIONING_OUT') {
  transProgress += delta / 1.0;
  const t = Math.min(1.0, 1 - Math.pow(1 - transProgress, 3));
  controls.enabled = false;
  camera.position.lerpVectors(startCamPos, overviewCamPos, t);
  controls.target.lerpVectors(startTarget, overviewTarget, t);
  controls.update();
  if (t >= 1.0) {
    camState = 'IDLE';
    controls.enabled = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 320;
  }
} else {
  // IDLE: Solar system overview
  controls.update();
}
```

### Diff 5: `frontend/app/components/sky/SkyHUD.tsx`
```typescript
// Add Escape key listener and "Return to Solar System Overview" floating button
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedCelestialBody) {
      resetCameraToOverview();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedCelestialBody, resetCameraToOverview]);
```

---

## 3. Execution Plan for Stage 2 (Post-Approval)
1. **Apply Code Diffs** on dedicated branch `feature/solarsystemscope-interactivity`.
2. **Execute Automated Tests**: Run astrometry and Three.js test suites.
3. **Execute Production Build**: Run `npm run build` and ensure 0 errors.
4. **Visual Comparison & Polish**: Validate against `http://www.solarsystemscope.com` using browser tools.
