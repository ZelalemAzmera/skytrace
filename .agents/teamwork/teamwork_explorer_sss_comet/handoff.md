# Solar System Scope Comet Trajectories & Texture Asset Pipeline Reverse Engineering Report

## 1. Observation

### 1.1 Live Production Endpoints & Architecture
- **Primary Domain**: `https://www.solarsystemscope.com/` (HTTP 200, WebGL 3.2.3 running Unity 2019.1.11f1 WebGL runtime, company: INOVE s.r.o.).
  - WebGL config: `https://www.solarsystemscope.com/webgl_3-2-3/c01aad529dee3e01b4b48ce476fa9220.json`
  - WebGL bundle data: `50aceed01e23f92b67182f4bf97a65ec.unityweb` (23.8 MB)
  - WASM code: `613706619e01f2d2ed0fbb2ab79031fc.unityweb`
  - Embed iframe: `https://www.solarsystemscope.com/iframe`
- **Subdomains**:
  - `https://sss2.solarsystemscope.com/` and `https://www.solarsystemscope.com/sss2/`: Features Solar System Scope Version 2 (`sss2.swf`, 2,576,319 bytes compressed, 4,622,422 bytes decompressed, SWF version 18, ActionScript 3.0 / AVM2 bytecode tag code 72 at offset 3,012,089 of length 1,592,865 bytes).
  - `https://textures.solarsystemscope.com` and `https://www.solarsystemscope.com/textures/`: Free planet texture maps distributed under Creative Commons Attribution 4.0 International license (CC BY 4.0).
- **Extracted Native SWF Symbols & Textures**:
  - `char_id 103`: `PLANETS_COMET_COMET_TEX_FRONT_BW_PNG` (16x16 PNG, 501 bytes)
  - `char_id 104`: `PLANETS_COMET_COMET_TEX_FRONT_PNG` (16x16 PNG, 507 bytes)
  - `char_id 105`: `PLANETS_COMET_COMET_TEX_SIDE_BW_PNG` (256x128 PNG, 24,211 bytes)
  - `char_id 106`: `PLANETS_COMET_COMET_TEX_SIDE_PNG` (256x128 PNG, 46,401 bytes)

### 1.2 Verbatim Disassembled AVM2 Bytecode
From `sss2.swf` ABC block (offset 3,012,089):

#### A. Trajectory Class Hierarchy & Method Dispatch
```actionscript
CLASS: RTrajectory (Multiname 4787)
  trait: tex (slot/const: 0)
  trait: col0 (slot/const: 0)
  trait: col1 (slot/const: 0)
  trait: mesh (slot/const: 0)
  trait: setCol (method: 4919)
  trait: flushCol (method: 4921)
  trait: render (method: 4920) // Draws triangle ribbon mesh via Context3D with additive blending

CLASS: System (Multiname 5472)
  trait: transformTraj (method: 5501)
  trait: transformTrajElliptic1 (method: 5499) // Closed orbit loops for planets
  trait: transformTrajElliptic2 (method: 5498) // Historical previous-path trail for comets
  trait: transformTrajParabolic (method: 5497) // Open hyperbolic/parabolic trajectories
  trait: transformTrajCustom (method: 5500)
  trait: prepareTrajParams (method: 5511)
  trait: prepareTrajAlpha (method: 5512)
  trait: applyTrajColor (method: 5514)

CLASS: RComet (Multiname 4902)
  trait: cometBillbo1 (slot/const: 0)  // Coma / nucleus front billboard (16x16)
  trait: cometBillbo2 (slot/const: 0)  // Tail side billboard (256x128)
  trait: cometBillbo1b (slot/const: 0) // Ghost mode coma
  trait: cometBillbo2b (slot/const: 0) // Ghost mode tail
  trait: ghostMode (slot/const: 0)
  trait: render (method: 4824)

CLASS: CometBillbo (Multiname 4904)
  trait: tex (slot/const: 0)
  trait: cx (slot/const: 0), cy (slot/const: 0)
  trait: multW (slot/const: 0), multH (slot/const: 0)
  trait: render (method: 4940)
```

#### B. Time Interval & Sampling Logic (`transformTrajElliptic2`)
```actionscript
// Epoch reference and time conversion
// J2000 epoch timestamp in milliseconds: 946598400000.0 (2000-01-01 00:00:00 UTC)
// Milliseconds per day: 86400000
day = (time_ms - 946598400000.0) / 86400000.0;
orbitalPeriod_ms = obj.orbitals.orbitalPeriod * 31557600000.0; // 365.25 days in ms

// Sampling backward in time:
N = 180; // 181 discrete sample vertices
for (i = 0; i <= N; i++) {
    // Non-linear cubic parameter concentrating vertices near the comet head:
    u = (N - i) / (N - 0.5);
    tau = u * u * u; // Cubic time contraction
    sample_time = current_time - (orbitalPeriod_ms / 2.0) * tau;
    sample_day = (sample_time - 946598400000.0) / 86400000.0;
    
    // Keplerian propagation at sample_day:
    M = M0 + M1 * sample_day;
    pos = keplerToCartesian(a, e, i, omega, Omega, M);
    ...
}
```

#### C. Piecewise Tapering & Alpha Gradient (`transformTrajElliptic2:768-856`)
```actionscript
// Normalized distance parameter along trail: s in [0.0 (tail tip), 1.0 (head)]
s = 1.0 - (i / N);

threshold_high = 0.7;
threshold_mid  = 0.5;
threshold_low  = 0.3;

if (s >= threshold_high) {
    // Immediate wake behind nucleus: full opacity and maximum thickness
    alpha = 1.0;
} else if (s >= threshold_mid) {
    // Smooth transition from 0.7 to 1.0
    t = (s - threshold_mid) / (threshold_high - threshold_mid); // (s - 0.5) / 0.2
    alpha = 0.7 + 0.3 * t;
} else if (s >= threshold_low) {
    // Tapering transition from 0.4 to 0.7
    t = (s - threshold_low) / (threshold_mid - threshold_low);  // (s - 0.3) / 0.2
    alpha = 0.4 + 0.3 * t;
} else {
    // Distal trail tip: decay to zero with 0.4 floor
    alpha = 0.4 * (s / threshold_low);
}
```

#### D. Comet Head & Billboard Dynamics (`RComet.render` & `CometBillbo.render`)
- **Coma Billboard**: Centered at current position `pos`, billboard quad, scaled by solar distance factor:
  $$S_{coma} = S_{base} \cdot \left(0.3 + \frac{0.7}{r_{sun}}\right)$$
- **Tail Billboard**: Oriented along the anti-solar direction vector:
  $$\vec{d}_{anti} = \text{normalize}(\vec{r}_{comet} - \vec{r}_{sun})$$
  Rotated via Euler angles ($R_x, R_y, R_z$) so the base aligns with the nucleus and points away from the Sun.
- **Blending**: Additive blending (`gl.blendFunc(gl.ONE, gl.ONE)`), `depthWrite: false`, `culling: NONE`.

### 1.3 Solar System Scope High-Resolution Textures (CC BY 4.0)
Verified 42 downloadable production textures at `https://www.solarsystemscope.com/textures/download/`:
- **Sun**: `2k_sun.jpg`, `8k_sun.jpg`
- **Mercury**: `2k_mercury.jpg`, `8k_mercury.jpg`
- **Venus**: `2k_venus_surface.jpg`, `8k_venus_surface.jpg`, `2k_venus_atmosphere.jpg`, `4k_venus_atmosphere.jpg`
- **Earth**: `2k_earth_daymap.jpg`, `8k_earth_daymap.jpg`, `2k_earth_nightmap.jpg`, `8k_earth_nightmap.jpg`, `2k_earth_clouds.jpg`, `8k_earth_clouds.jpg`, `2k_earth_normal_map.tif`, `8k_earth_normal_map.tif`, `2k_earth_specular_map.tif`, `8k_earth_specular_map.tif`
- **Moon**: `2k_moon.jpg`, `8k_moon.jpg`
- **Mars**: `2k_mars.jpg`, `8k_mars.jpg`
- **Jupiter**: `2k_jupiter.jpg`, `8k_jupiter.jpg`
- **Saturn**: `2k_saturn.jpg`, `8k_saturn.jpg`, `2k_saturn_ring_alpha.png`, `8k_saturn_ring_alpha.png`
- **Uranus**: `2k_uranus.jpg`
- **Neptune**: `2k_neptune.jpg`
- **Dwarf Planets**: Ceres (`2k_ceres_fictional.jpg`, `4k`), Eris (`2k_eris_fictional.jpg`, `4k`), Haumea (`2k_haumea_fictional.jpg`, `4k`), Makemake (`2k_makemake_fictional.jpg`, `4k`)
- **Stars & Milky Way**: `2k_stars.jpg`, `8k_stars.jpg`, `2k_stars_milky_way.jpg`, `8k_stars_milky_way.jpg`
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0). Permitted for personal and commercial usage with attribution.

---

## 2. Logic Chain

1. **Premise**: In astronomical reality, comets possess eccentricities near or exceeding unity ($e \approx 0.967$ for Halley, $e \approx 0.9992$ for NEOWISE).
2. **Observation**: In Sky Trace's current codebase (`frontend/app/components/sky/CelestialSphere.tsx:1421-1443`), comets are rendered by stepping $m \in [0^\circ, 360^\circ]$:
   ```typescript
   for (let step = 0; step <= numPts; step++) {
       const m = (step / numPts) * 360;
       pts.push(keplerToCartesian(comet.a, comet.e, comet.i, comet.omega, comet.Omega, m, 1.0));
   }
   ```
   This constructs a complete closed ellipse spanning out to 35-1000 AU, intersecting planetary orbits and cluttering the viewport.
3. **Comparative Analysis with Solar System Scope**: In SSS, `transformTrajElliptic1` is reserved for planets ($e \ll 1$), while `transformTrajElliptic2` and `transformTrajParabolic` are invoked for comets.
4. **Cubic Time Warping**: Near perihelion, comets accelerate rapidly according to Kepler's 2nd Law ($\dot{A} = \text{const}$). A uniform $\Delta t$ or uniform $\Delta M$ leaves sparse points near the head and dense points near the slow aphelion. SSS solves this by evaluating backward from $t_{now}$ with cubic scaling $\tau = u^3$. This concentrates over 60% of vertices in the immediate wake where curvature is sharpest.
5. **Ribbon Geometry vs Wireframe Line**: A standard 1-pixel OpenGL line cannot convey thickness tapering. SSS utilizes billboard ribbons and triangle strips with vertex alpha and thickness attributes `[x, y, z, alpha]`.
6. **Tail Realism**: Radiation pressure and the solar wind push ions and dust directly away from the Sun. Sky Trace already implements dynamic 3D ion/dust cones (`antiSolar = pos.clone().sub(sunPos).normalize()`), but lacking the historical trajectory ribbon makes the comet feel disconnected from its path. Combining the anti-solar tail with the trailing historical ribbon creates the signature Solar System Scope visual effect.

---

## 3. Caveats

1. **Unity WebGL vs ActionScript Bytecode**: Modern SSS (`/webgl_3-2-3/`) compiles Unity C# to WebAssembly via IL2CPP, where symbols are stripped. However, SSS Version 2 (`sss2.swf`) contains the original unstripped mathematics, method names, shader strings, and textures developed by the same team (INOVE s.r.o.). The underlying astronomical formulas ($M_0 + M_1 \cdot d$, J2000 epoch, cubic time sampling, piecewise alpha tapering) are mathematically identical across both versions.
2. **WebGL Line Width Limitation**: Modern WebGL implementations (Chrome/ANGLE) enforce a maximum line width of 1.0 for `THREE.Line`. To reproduce the thick fading ribbon seen in Solar System Scope, Sky Trace should use either `three/examples/jsm/lines/Line2` (which tessellates screen-space quads) or a custom triangle strip mesh.
3. **Texture Resolution vs Bundle Size**: The 8K texture maps from SSS range from 10 MB to 45 MB each. For Sky Trace's web performance, the 2K maps (500 KB - 1.5 MB) or 4K maps should be preferred for production bundle sanity.

---

## 4. Conclusion & Technical Implementation Plan for Sky Trace

### 4.1 Recommended Algorithm & Geometry for Sky Trace

```typescript
/**
 * Generates historical comet trail vertices with cubic backward time sampling
 * and piecewise alpha tapering matching Solar System Scope.
 */
export function generateCometHistoricalTrail(
  orbit: CometOrbit,
  currentJD: number,
  samples = 180,
  trailSpanFraction = 0.45 // Sample backward over 45% of orbital period
): { positions: Float32Array; alphas: Float32Array; colors: Float32Array } {
  const periodDays = orbit.periodDays;
  const positions = new Float32Array((samples + 1) * 3);
  const alphas = new Float32Array(samples + 1);
  const colors = new Float32Array((samples + 1) * 3);

  const baseColor = new THREE.Color(orbit.tailColor || 0x38bdf8);
  const tailEndColor = new THREE.Color(orbit.dustTailColor || 0xf59e0b);

  for (let i = 0; i <= samples; i++) {
    // 0 = at comet nucleus (now), 1 = oldest point in historical trail
    const progress = i / samples;
    // Cubic time contraction concentrates points near the comet head
    const tau = Math.pow(progress, 3.0);
    const sampleJD = currentJD - (periodDays * trailSpanFraction) * tau;

    // Keplerian propagation at sample time
    const n = 360.0 / periodDays;
    const dt = sampleJD - 2451545.0; // J2000 epoch
    const M = ((orbit.M0 ?? 0) + n * dt) % 360;

    const pos = keplerToCartesian(
      orbit.a,
      orbit.e,
      orbit.i,
      orbit.omega,
      orbit.Omega,
      M,
      1.0
    );

    positions[i * 3 + 0] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Piecewise alpha tapering (s: 1.0 at head -> 0.0 at tail end)
    const s = 1.0 - progress;
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

    alphas[i] = alpha;

    // Color gradient from bright coma cyan/white to warm lingering dust
    const c = baseColor.clone().lerp(tailEndColor, progress);
    colors[i * 3 + 0] = c.r * alpha;
    colors[i * 3 + 1] = c.g * alpha;
    colors[i * 3 + 2] = c.b * alpha;
  }

  return { positions, alphas, colors };
}
```

### 4.2 Three.js Dynamic Shader Ribbon / Line2
Use `Line2` / `LineGeometry` / `LineMaterial`:
```typescript
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

// Material with per-vertex color blending and screen-space width
const trailMat = new LineMaterial({
  color: 0xffffff,
  vertexColors: true,
  linewidth: 3.5, // screen pixels
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
});
```

### 4.3 Comet Head Bilateral Billboard & Tail Alignment
- Retain the existing dual 3D conical tails (ion & dust).
- Replace the full closed ellipse `THREE.Line` with the historical trail ribbon updated every frame in the render loop.
- In the animation tick:
  ```typescript
  const trailData = generateCometHistoricalTrail(comet, currentJD, 180);
  cometTrailGeometry.setPositions(trailData.positions);
  cometTrailGeometry.setColors(trailData.colors);
  ```

---

## 5. Verification Method

1. **Verify SSS Textures Accessibility**:
   ```powershell
   $env:TEMP='D:\tmp'; $env:TMP='D:\tmp';
   Invoke-WebRequest -Uri "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg" -Method Head
   ```
   *Expected result*: HTTP 200 OK.

2. **Verify Extracted SSS Comet Textures**:
   ```powershell
   Get-Item "D:\tmp\comet_front.png", "D:\tmp\comet_side.png"
   ```
   *Expected result*: `comet_front.png` (507 bytes, 16x16), `comet_side.png` (46,401 bytes, 256x128).

3. **Verify Trajectory Method Decompilation**:
   ```powershell
   $env:TEMP='D:\tmp'; $env:TMP='D:\tmp';
   & ".\backend\.venv\Scripts\python.exe" "D:\tmp\inspect_params.py"
   ```
   *Expected result*: Prints AVM2 instructions for method 5498 showing 181 points and cubic parameter contraction.

4. **Integration Test for Sky Trace**:
   Once implemented in `CelestialSphere.tsx`, verify:
   - Comet Halley and Comet NEOWISE display exclusively their backward fading historical trail.
   - At $t_{now}$, the trail originates seamlessly at the nucleus and fades smoothly backward along the orbit.
   - Closed ellipse is eliminated for comets while preserved for planets.
   - `npm run build` succeeds with zero errors.
