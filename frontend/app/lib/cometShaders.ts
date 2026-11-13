import * as THREE from 'three';

// ---------------------------------------------------------------------------
// GLSL 2D Simplex Noise Shader Snippet
// ---------------------------------------------------------------------------
const SIMPLEX_NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

// ---------------------------------------------------------------------------
// 1. Animated Flame Tail Shader (Billowing, Fluttering Plasma / Dust Fire)
// ---------------------------------------------------------------------------
export const CometFlameTailVertexShader = `
uniform float uTime;
uniform float uTurbulence;
uniform float uSpeed;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewVec;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Flaming waft and flutter: displacement accelerates along tail height (uv.y^1.2)
  float waftFactor = pow(clamp(uv.y, 0.0, 1.0), 1.2) * uTurbulence;
  
  // High-frequency traveling waves flowing backward down the tail (pos.y from 0 to 1)
  float wave1 = sin(uTime * uSpeed * 4.5 - pos.y * 18.0) * 0.85;
  float wave2 = cos(uTime * uSpeed * 3.2 - pos.y * 26.0 + pos.x * 3.0) * 0.65;
  float wave3 = sin(uTime * uSpeed * 7.0 - pos.y * 38.0) * 0.40;
  
  pos.x += (wave1 + wave2) * waftFactor;
  pos.z += (wave2 - wave1 + wave3 * 0.5) * waftFactor * 0.85;
  
  // Radial flame pulsation / tongue flicker
  float pulse = sin(uTime * 6.5 - pos.y * 22.0) * 0.35 * waftFactor;
  pos.x += normal.x * pulse;
  pos.z += normal.z * pulse;
  
  vPosition = pos;
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vViewVec = normalize(-mvPos.xyz);
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const CometFlameTailFragmentShader = `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorFlame;
uniform vec3 uColorTip;
uniform float uSpeed;
uniform float uNoiseScale;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewVec;
varying vec3 vPosition;

${SIMPLEX_NOISE_GLSL}

void main() {
  float y = clamp(vUv.y, 0.0, 1.0);
  
  // Dual-frequency scrolling noise for roaring turbulent flames (flowing down tail)
  vec2 noiseCoord1 = vec2(vUv.x * 6.0, y * uNoiseScale - uTime * uSpeed * 0.7);
  vec2 noiseCoord2 = vec2(vUv.x * 12.0 + 3.1, y * uNoiseScale * 2.5 - uTime * uSpeed * 1.4);
  
  float n1 = snoise(noiseCoord1);
  float n2 = snoise(noiseCoord2);
  float flameNoise = n1 * 0.65 + n2 * 0.35; // ranges roughly -1.0 to 1.0
  
  // Modulate the edge falloff with simplex noise so the silhouette licks and flickers organically
  float NdotV = max(0.0, dot(vNormalView, vViewVec));
  float edgeNoise = flameNoise * 0.35;
  float edgeFade = smoothstep(0.06 + edgeNoise * 0.12, 0.82, NdotV);
  
  // Vertical dissipation: dense near nucleus (y=0), fading to vacuum at tip (y=1)
  float vertFade = pow(1.0 - y, 0.65);
  
  // Turbulent flame erosion cuts organic fiery tendrils into the tail
  float flameMask = smoothstep(0.12, 0.78, vertFade + flameNoise * 0.45 * vertFade);
  
  // Rich fiery plasma color ramp
  float coreGlint = pow(vertFade, 6.0); // White-hot only at immediate nozzle
  vec3 col = mix(uColorFlame, uColorCore, coreGlint);
  col = mix(uColorTip, col, smoothstep(0.02, 0.65, vertFade));
  
  // Bright licking flame highlights
  float hotHighlight = pow(max(0.0, flameNoise), 2.2) * vertFade * 1.5;
  col += mix(uColorFlame, vec3(1.0, 1.0, 1.0), 0.7) * hotHighlight;
  
  float alpha = flameMask * edgeFade * uOpacity;
  if (alpha < 0.005) discard;
  
  gl_FragColor = vec4(col, alpha);
}
`;

// ---------------------------------------------------------------------------
// 2. Animated Flaming Coma Halo Shader (Turbulent Shimmering Coronal Aura)
// ---------------------------------------------------------------------------
export const CometFlamingComaVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewVec;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewVec = normalize(-mvPos.xyz);
  
  // Harmonic breathing pulsation
  float pulse = 1.0 + sin(uTime * 4.5) * 0.04 + cos(uTime * 7.2) * 0.02;
  vec3 p = position * pulse;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const CometFlamingComaFragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uCoreColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewVec;

${SIMPLEX_NOISE_GLSL}

void main() {
  float NdotV = max(0.0, dot(vNormal, vViewVec));
  
  // Animated surface turbulence simulating coronal plasma boiling
  vec2 noiseCoord = vec2(vUv.x * 6.0 + uTime * 0.65, vUv.y * 6.0 - uTime * 0.85);
  float n = snoise(noiseCoord) * 0.22;
  
  // Volumetric glow: intense at center, feathered soft aura at rim (NO HARD EDGES)
  float glow = pow(NdotV, 2.5) + n * NdotV;
  glow = clamp(glow, 0.0, 1.0);
  
  // Feathered soft rim falloff: completely eliminates the hard circular disk silhouette!
  float rimAlpha = smoothstep(0.05, 0.88, NdotV);
  
  // Soft atmospheric color ramp: white core only at immediate center, rich colored halo
  vec3 col = mix(uColor, uCoreColor, pow(glow, 5.0));
  float alpha = rimAlpha * glow * uOpacity;
  
  if (alpha < 0.006) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

// ---------------------------------------------------------------------------
// 3. Factory Helpers for Instantiating Dynamic Flame Materials & Meshes
// ---------------------------------------------------------------------------
export interface CometFlameUniforms {
  uTime: { value: number };
  uTurbulence: { value: number };
  uSpeed: { value: number };
  uColorCore: { value: THREE.Color };
  uColorFlame: { value: THREE.Color };
  uColorTip: { value: THREE.Color };
  uNoiseScale: { value: number };
  uOpacity: { value: number };
}

export function createCometFlameTailMaterial(type: 'ion' | 'dust', baseColorHex: number): THREE.ShaderMaterial {
  const isIon = type === 'ion';
  const uniforms: CometFlameUniforms = {
    uTime: { value: 0 },
    uTurbulence: { value: isIon ? 0.75 : 1.25 },
    uSpeed: { value: isIon ? 3.5 : 1.8 },
    uColorCore: { value: new THREE.Color(isIon ? 0xffffff : 0xfffaed) },
    uColorFlame: { value: new THREE.Color(isIon ? 0x00e5ff : 0xf59e0b) },
    uColorTip: { value: new THREE.Color(isIon ? 0x0284c7 : 0xd97706) },
    uNoiseScale: { value: isIon ? 18.0 : 12.0 },
    uOpacity: { value: isIon ? 0.65 : 0.45 },
  };

  return new THREE.ShaderMaterial({
    uniforms: uniforms as any,
    vertexShader: CometFlameTailVertexShader,
    fragmentShader: CometFlameTailFragmentShader,
    transparent: true,
    side: THREE.FrontSide, // FrontSide prevents double-adding blowout
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createCometFlamingComaMaterial(colorHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uCoreColor: { value: new THREE.Color(0xffffff) },
      uOpacity: { value: 0.60 },
    },
    vertexShader: CometFlamingComaVertexShader,
    fragmentShader: CometFlamingComaFragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
