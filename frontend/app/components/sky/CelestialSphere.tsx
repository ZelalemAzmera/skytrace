'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useSkyStore } from '../../store/skyStore';
import {
  icrsToUnitVector,
  vectorToIcrs,
  equatorialToGalactic,
  equatorialToEcliptic,
  BRIGHT_STARS,
  PLANET_ORBITS,
  COMET_ORBITS,
  CelestialOrbit,
  CometOrbit,
  keplerToCartesian,
  getJulianDate,
} from '../../lib/astrometry';
import { eclipticToOrrery } from '../../lib/planetXScale';

interface CelestialSphereProps {
  onCoordinateClick?: (ra: number, dec: number) => void;
  className?: string;
}

// Procedural Solar Corona Texture Generator
function createSunCoronaTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0.0, 'rgba(255, 255, 250, 1.0)');
    gradient.addColorStop(0.12, 'rgba(255, 240, 160, 0.95)');
    gradient.addColorStop(0.28, 'rgba(255, 170, 50, 0.65)');
    gradient.addColorStop(0.55, 'rgba(255, 95, 15, 0.22)');
    gradient.addColorStop(0.8, 'rgba(255, 50, 5, 0.06)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Solar System Scope Target HUD Billboard Label Generator
function updateTargetBadgeCanvas(
  canvas: HTMLCanvasElement,
  targetTitle: string,
  coordsText: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;

  // Outer Holographic Glow Background
  ctx.fillStyle = 'rgba(6, 12, 28, 0.85)';
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(16, 8, w - 32, h - 16, 8);
  } else {
    ctx.rect(16, 8, w - 32, h - 16);
  }
  ctx.fill();
  ctx.stroke();

  // Corner Accent Brackets
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(18, 20);
  ctx.lineTo(18, 10);
  ctx.lineTo(28, 10);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - 18, 20);
  ctx.lineTo(w - 18, 10);
  ctx.lineTo(w - 28, 10);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(18, h - 20);
  ctx.lineTo(18, h - 10);
  ctx.lineTo(28, h - 10);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - 18, h - 20);
  ctx.lineTo(w - 18, h - 10);
  ctx.lineTo(w - 28, h - 10);
  ctx.stroke();

  // Target Title
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(targetTitle.toUpperCase(), w / 2, 42);

  // Subtext Coordinates
  ctx.font = '18px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(coordsText, w / 2, 78);
}

function createTargetBadgeTexture(
  targetTitle: string,
  coordsText: string
): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
  if (typeof document === 'undefined') {
    return {
      texture: new THREE.CanvasTexture({} as HTMLCanvasElement),
      canvas: {} as HTMLCanvasElement,
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  updateTargetBadgeCanvas(canvas, targetTitle, coordsText);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, canvas };
}

// Holographic Planet Hover Badge Sprite Texture Generator
function updatePlanetHoverBadgeCanvas(
  canvas: HTMLCanvasElement,
  title: string,
  category: string,
  velocityStr: string,
  distStr: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;

  // Background Glass Pill
  ctx.fillStyle = 'rgba(6, 12, 28, 0.94)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(10, 6, w - 20, h - 12, 10);
  } else {
    ctx.rect(10, 6, w - 20, h - 12);
  }
  ctx.fill();
  ctx.stroke();

  // Corner Accent Highlights
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.0;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(12, 22);
  ctx.lineTo(12, 8);
  ctx.lineTo(26, 8);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - 12, 22);
  ctx.lineTo(w - 12, 8);
  ctx.lineTo(w - 26, 8);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(12, h - 22);
  ctx.lineTo(12, h - 8);
  ctx.lineTo(26, h - 8);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - 12, h - 22);
  ctx.lineTo(w - 12, h - 8);
  ctx.lineTo(w - 26, h - 8);
  ctx.stroke();

  // Planet Title + Category
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${title.toUpperCase()}  [${category}]`, w / 2, 36);

  // Subtitle Metrics: Velocity + Sun Distance
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#facc15'; // golden accent
  ctx.fillText(`${velocityStr}  •  ${distStr}`, w / 2, 72);
}

function createPlanetHoverBadgeTexture(): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
  if (typeof document === 'undefined') {
    return {
      texture: new THREE.CanvasTexture({} as HTMLCanvasElement),
      canvas: {} as HTMLCanvasElement,
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 104;
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, canvas };
}

// 1. Realistic Airy-Disk Optical Star Sprite Texture (eliminates square WebGL point-boxes)
function createStarSpriteTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Soft Gaussian Airy halo with exponential falloff
    const radGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.12, 'rgba(255, 250, 240, 0.95)');
    radGrad.addColorStop(0.24, 'rgba(215, 235, 255, 0.6)');
    radGrad.addColorStop(0.48, 'rgba(140, 190, 255, 0.2)');
    radGrad.addColorStop(0.72, 'rgba(80, 130, 255, 0.05)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle 4-point telescope optical cross diffraction spikes
    const spikeH = ctx.createLinearGradient(0, 64, 128, 64);
    spikeH.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    spikeH.addColorStop(0.42, 'rgba(255, 255, 255, 0.15)');
    spikeH.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    spikeH.addColorStop(0.58, 'rgba(255, 255, 255, 0.15)');
    spikeH.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spikeH;
    ctx.fillRect(0, 62, 128, 4);

    const spikeV = ctx.createLinearGradient(64, 0, 64, 128);
    spikeV.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    spikeV.addColorStop(0.42, 'rgba(255, 255, 255, 0.15)');
    spikeV.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    spikeV.addColorStop(0.58, 'rgba(255, 255, 255, 0.15)');
    spikeV.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spikeV;
    ctx.fillRect(62, 0, 4, 128);

    // Concentrated central stellar core
    const coreGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 6);
    coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(64, 64, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 2. Ultra-Smooth Circular Dust Particle Sprite Texture for Milky Way Dust Lane
function createDustSpriteTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    const radGrad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    radGrad.addColorStop(0.2, 'rgba(240, 245, 255, 0.55)');
    radGrad.addColorStop(0.45, 'rgba(200, 220, 255, 0.18)');
    radGrad.addColorStop(0.75, 'rgba(150, 180, 255, 0.04)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function CelestialSphere({ onCoordinateClick, className }: CelestialSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    ra,
    dec,
    viewMode,
    showSunExclusion,
    showBoresight,
    show3DImageRelief,
    showObservationVolume,
    showTeardown,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    activePresetName,
    setCoordinates,
    setHoveredObject,
    planetXMarker,
    planetXOrbitPath,
    planetXScene,
  } = useSkyStore();

  const storeValuesRef = useRef({
    ra,
    dec,
    activePresetName,
    viewMode,
    showSunExclusion,
    showBoresight,
    show3DImageRelief,
    showObservationVolume,
    showTeardown,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    planetXMarker,
    planetXOrbitPath,
    planetXScene,
  });

  useEffect(() => {
    storeValuesRef.current = {
      ra,
      dec,
      activePresetName,
      viewMode,
      showSunExclusion,
      showBoresight,
      show3DImageRelief,
      showObservationVolume,
      showTeardown,
      showEquatorialGrid,
      showEclipticGrid,
      showGalacticPlane,
      showOrrery,
      showScanPath,
      autoRotate,
      planetXMarker,
      planetXOrbitPath,
      planetXScene,
    };
  }, [
    ra,
    dec,
    activePresetName,
    viewMode,
    showSunExclusion,
    showBoresight,
    show3DImageRelief,
    showObservationVolume,
    showTeardown,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    planetXMarker,
    planetXOrbitPath,
    planetXScene,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, Renderer ---
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

    // --- 1.4 Solar System Scope High-Resolution Textures ---
    const textureLoader = new THREE.TextureLoader();
    const planetTextures: Record<string, THREE.Texture> = {
      Sun: textureLoader.load('/textures/planets/sun.jpg'),
      Mercury: textureLoader.load('/textures/planets/mercury.jpg'),
      Venus: textureLoader.load('/textures/planets/venus.jpg'),
      Earth: textureLoader.load('/textures/planets/earth.jpg'),
      Mars: textureLoader.load('/textures/planets/mars.jpg'),
      Jupiter: textureLoader.load('/textures/planets/jupiter.jpg'),
      Saturn: textureLoader.load('/textures/planets/saturn.jpg'),
      Uranus: textureLoader.load('/textures/planets/uranus.jpg'),
      Neptune: textureLoader.load('/textures/planets/neptune.jpg'),
      Moon: textureLoader.load('/textures/planets/moon.jpg'),
    };
    const earthCloudsTexture = textureLoader.load('/textures/planets/earth_clouds.jpg');
    const saturnRingTexture = textureLoader.load('/textures/planets/saturn_ring.png');
    const milkyWayTexture = textureLoader.load('/textures/planets/stars_milky_way.jpg');
    const flareTexture = textureLoader.load('/textures/planets/flare.png');

    // Generate high-resolution optical star sprites (eliminating square WebGL point-boxes)
    const starSpriteTexture = createStarSpriteTexture();
    const dustSpriteTexture = createDustSpriteTexture();

    // --- 1.5 Vacuum PBR Space Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunDirLight = new THREE.DirectionalLight(0xfff6ea, 3.2);
    sunDirLight.position.set(80, 50, 100);
    scene.add(sunDirLight);

    const earthShineLight = new THREE.DirectionalLight(0x3a6088, 1.0);
    earthShineLight.position.set(-60, -30, -80);
    scene.add(earthShineLight);

    // --- 2. Celestial Sphere Mesh with Solar System Scope Milky Way ---
    const sphereRadius = 100;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 48);
    const sphereMat = new THREE.MeshBasicMaterial({
      map: milkyWayTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.42,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);

    // --- 2.5 Authentic NASA SPHEREx 3D Observatory & Boresight Ray ---
    const spacecraftGroup = new THREE.Group();
    spacecraftGroup.visible = false; // hidden until Spacecraft mode is selected
    scene.add(spacecraftGroup);

    // Boresight line-of-sight laser ray along +Y (SPHEREx telescope aperture axis)
    const rayLength = sphereRadius * 0.985;
    const rayGeo = new THREE.CylinderGeometry(0.04, 0.22, rayLength, 12);
    rayGeo.translate(0, rayLength / 2, 0);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const boresightRay = new THREE.Mesh(rayGeo, rayMat);
    boresightRay.position.set(0, 1.15, 0);
    spacecraftGroup.add(boresightRay);

    // Sleek Aperture Emitter Ring at top rim of V-groove shield
    const emitGeo = new THREE.RingGeometry(0.35, 0.55, 32);
    const emitMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const emitMesh = new THREE.Mesh(emitGeo, emitMat);
    emitMesh.rotation.x = Math.PI / 2;
    emitMesh.position.set(0, 1.15, 0);
    spacecraftGroup.add(emitMesh);

    // --- 2.6 3D Volumetric Observation Frustum (SPHEREx 3.5° × 7.0° Light Cone) ---
    const observationFrustumGroup = new THREE.Group();
    spacecraftGroup.add(observationFrustumGroup);

    const fovX = (3.5 * Math.PI) / 180;
    const fovZ = (7.0 * Math.PI) / 180;
    const frustumDist = sphereRadius * 0.96; // 96 units
    const hwBase = 0.18; // aperture half-width
    const hzBase = 0.36; // aperture half-height (1:2 aspect ratio)
    const hwEnd = Math.tan(fovX / 2) * frustumDist; // ~ 2.93
    const hzEnd = Math.tan(fovZ / 2) * frustumDist; // ~ 5.87
    const yStart = 1.15; // aperture ring height
    const yEnd = frustumDist;

    // 4 Corner Laser Guide Rails
    const railPositions = [
      new THREE.Vector3(hwBase, yStart, hzBase), new THREE.Vector3(hwEnd, yEnd, hzEnd),
      new THREE.Vector3(-hwBase, yStart, hzBase), new THREE.Vector3(-hwEnd, yEnd, hzEnd),
      new THREE.Vector3(-hwBase, yStart, -hzBase), new THREE.Vector3(-hwEnd, yEnd, -hzEnd),
      new THREE.Vector3(hwBase, yStart, -hzBase), new THREE.Vector3(hwEnd, yEnd, -hzEnd),
    ];
    const railPts: THREE.Vector3[] = [];
    railPts.push(railPositions[0], railPositions[1]);
    railPts.push(railPositions[2], railPositions[3]);
    railPts.push(railPositions[4], railPositions[5]);
    railPts.push(railPositions[6], railPositions[7]);

    const railGeo = new THREE.BufferGeometry().setFromPoints(railPts);
    const railMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const railLines = new THREE.LineSegments(railGeo, railMat);
    observationFrustumGroup.add(railLines);

    // 4 Volumetric Lateral Wall Planes
    const wallGeo = new THREE.BufferGeometry();
    const wallVertices = new Float32Array([
      // Front (+Z)
      hwBase, yStart, hzBase, hwEnd, yEnd, hzEnd, -hwEnd, yEnd, hzEnd,
      hwBase, yStart, hzBase, -hwEnd, yEnd, hzEnd, -hwBase, yStart, hzBase,
      // Back (-Z)
      -hwBase, yStart, -hzBase, -hwEnd, yEnd, -hzEnd, hwEnd, yEnd, -hzEnd,
      -hwBase, yStart, -hzBase, hwEnd, yEnd, -hzEnd, hwBase, yStart, -hzBase,
      // Right (+X)
      hwBase, yStart, -hzBase, hwEnd, yEnd, -hzEnd, hwEnd, yEnd, hzEnd,
      hwBase, yStart, -hzBase, hwEnd, yEnd, hzEnd, hwBase, yStart, hzBase,
      // Left (-X)
      -hwBase, yStart, hzBase, -hwEnd, yEnd, hzEnd, -hwEnd, yEnd, -hzEnd,
      -hwBase, yStart, hzBase, -hwEnd, yEnd, -hzEnd, -hwBase, yStart, -hzBase,
    ]);
    wallGeo.setAttribute('position', new THREE.BufferAttribute(wallVertices, 3));
    wallGeo.computeVertexNormals();

    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    observationFrustumGroup.add(wallMesh);

    // Traveling Wavefront Pulse Ring
    const pulseRingGeo = new THREE.BufferGeometry();
    const pulseRingMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const pulseRing = new THREE.LineLoop(pulseRingGeo, pulseRingMat);
    observationFrustumGroup.add(pulseRing);

    // --- 2.7 3D Astronomical Image Heightfield Relief Algorithm ---
    // Converts 2D telescope detector measurements into a 3D topographic flux structure
    const telescopeImageReliefGroup = new THREE.Group();
    telescopeImageReliefGroup.position.set(0, yEnd, 0);
    // Orient so surface normal faces down along -Y toward spacecraft
    telescopeImageReliefGroup.rotation.x = -Math.PI / 2;
    spacecraftGroup.add(telescopeImageReliefGroup);

    const gridW = hwEnd * 2; // ~5.86
    const gridH = hzEnd * 2; // ~11.74
    const segX = 40;
    const segY = 40;
    const fluxGeo = new THREE.PlaneGeometry(gridW, gridH, segX, segY);
    const posAttr = fluxGeo.attributes.position;
    const vertexCount = posAttr.count;
    const fluxColors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const u = posAttr.getX(i) / (gridW / 2); // -1 to +1
      const v = posAttr.getY(i) / (gridH / 2); // -1 to +1

      // 1. Primary Discovered Candidate Transient Peak (e.g. Brown Dwarf / Planet X anomaly)
      const candD2 = (u - 0.12) * (u - 0.12) + (v + 0.10) * (v + 0.10);
      const fCand = 1.6 * Math.exp(-candD2 / (2 * 0.07 * 0.07));

      // 2. Reference Field Stars
      const s1 = 0.9 * Math.exp(-((u + 0.45) ** 2 + (v - 0.5) ** 2) / (2 * 0.045 ** 2));
      const s2 = 0.7 * Math.exp(-((u - 0.55) ** 2 + (v - 0.35) ** 2) / (2 * 0.04 ** 2));
      const s3 = 0.8 * Math.exp(-((u + 0.3) ** 2 + (v + 0.6) ** 2) / (2 * 0.05 ** 2));
      const s4 = 0.65 * Math.exp(-((u - 0.4) ** 2 + (v + 0.55) ** 2) / (2 * 0.04 ** 2));

      // 3. Diffuse Infrared Cirrus / Molecular Cloud
      const fNebula =
        0.26 * (Math.sin(2.4 * u + 1.2) * Math.cos(2.2 * v - 0.5) + 0.4 * Math.cos(4.2 * u) * Math.sin(3.8 * v));

      // 4. Photometric Noise
      const fNoise = 0.035 * Math.sin(16 * u) * Math.cos(16 * v);

      const totalFlux = Math.max(0, fCand + s1 + s2 + s3 + s4 + fNebula + fNoise);

      // Topographic displacement along optical normal (+Z in local PlaneGeometry space)
      const zDisp = Math.pow(totalFlux, 0.65) * 2.8;
      posAttr.setZ(i, zDisp);

      // SPHEREx False-Color Gradient Mapping (0.75 - 5.0 µm infrared bands)
      if (totalFlux < 0.25) {
        const t = totalFlux / 0.25;
        fluxColors[i * 3] = 0.05 + 0.1 * t;
        fluxColors[i * 3 + 1] = 0.1 + 0.55 * t;
        fluxColors[i * 3 + 2] = 0.35 + 0.55 * t;
      } else if (totalFlux < 0.8) {
        const t = (totalFlux - 0.25) / 0.55;
        fluxColors[i * 3] = 0.15 + 0.85 * t;
        fluxColors[i * 3 + 1] = 0.65 + 0.25 * t;
        fluxColors[i * 3 + 2] = 0.9 - 0.7 * t;
      } else {
        const t = Math.min(1.0, (totalFlux - 0.8) / 0.7);
        fluxColors[i * 3] = 1.0;
        fluxColors[i * 3 + 1] = 0.9 + 0.1 * t;
        fluxColors[i * 3 + 2] = 0.2 + 0.8 * t;
      }
    }
    posAttr.needsUpdate = true;
    fluxGeo.setAttribute('color', new THREE.BufferAttribute(fluxColors, 3));
    fluxGeo.computeVertexNormals();

    const fluxMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.3,
      transparent: true,
      opacity: 0.92,
    });
    const fluxMesh = new THREE.Mesh(fluxGeo, fluxMat);
    telescopeImageReliefGroup.add(fluxMesh);

    // Isophote wireframe contour overlay
    const wireGeo = new THREE.WireframeGeometry(fluxGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    telescopeImageReliefGroup.add(wireMesh);

    // Multi-Epoch Tomography Stack: Epoch A and Epoch B baseline planes
    const sliceGeo = new THREE.PlaneGeometry(gridW, gridH);
    const epochAMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const epochAMesh = new THREE.Mesh(sliceGeo, epochAMat);
    epochAMesh.position.z = -1.2;
    telescopeImageReliefGroup.add(epochAMesh);

    const epochBMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const epochBMesh = new THREE.Mesh(sliceGeo, epochBMat);
    epochBMesh.position.z = -2.4;
    telescopeImageReliefGroup.add(epochBMesh);

    // Candidate Transient Multi-Epoch Laser Cursor
    const beaconPts = [
      new THREE.Vector3(0.12 * (gridW / 2), 0.10 * (gridH / 2), -2.6),
      new THREE.Vector3(0.12 * (gridW / 2), 0.10 * (gridH / 2), 3.2),
    ];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPts);
    const beaconMat = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      blending: THREE.AdditiveBlending,
    });
    const beaconLine = new THREE.Line(beaconGeo, beaconMat);
    telescopeImageReliefGroup.add(beaconLine);

    // Holographic Perimeter Frame with SPHEREx Field Markings
    const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(gridW + 0.2, gridH + 0.2));
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const frameLine = new THREE.LineSegments(frameGeo, frameMat);
    telescopeImageReliefGroup.add(frameLine);

    // --- 2.8 SPHEREx 3D Optical Teardown Subsystem ---
    // Follows the teardown skill: "The part doing the work opens up. Isolate it, cut it, x-ray it."
    const teardownGroup = new THREE.Group();
    spacecraftGroup.add(teardownGroup);

    // 1. Primary Mirror (20 cm f/3.0 TMA concave mirror with authentic gold coating)
    const primaryGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.05, 32);
    const primaryMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const primaryMirror = new THREE.Mesh(primaryGeo, primaryMat);
    primaryMirror.position.set(0, 0.45, 0);
    teardownGroup.add(primaryMirror);

    // 2. Secondary Fold Mirror (mounted on spider struts)
    const secGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 24);
    const secMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      metalness: 0.92,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const secMirror = new THREE.Mesh(secGeo, secMat);
    secMirror.position.set(0, 0.95, 0);
    teardownGroup.add(secMirror);

    // Spider struts supporting secondary mirror
    const strutMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 });
    const strutPts = [
      new THREE.Vector3(-0.35, 0.95, 0), new THREE.Vector3(0.35, 0.95, 0),
      new THREE.Vector3(0, 0.95, -0.35), new THREE.Vector3(0, 0.95, 0.35),
    ];
    const strutGeo = new THREE.BufferGeometry().setFromPoints(strutPts);
    const struts = new THREE.LineSegments(strutGeo, strutMat);
    teardownGroup.add(struts);

    // 3. Dichroic Beamsplitter Crystal
    const dichroicGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const dichroicMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.85,
      opacity: 1.0,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
    });
    const dichroic = new THREE.Mesh(dichroicGeo, dichroicMat);
    dichroic.position.set(0, 0.25, 0);
    dichroic.rotation.x = Math.PI / 4;
    teardownGroup.add(dichroic);

    // 4. Six Focal Plane Arrays (FPAs) with 6 LVF Bands
    const fpaColors = [0x7000ff, 0x00c8ff, 0x00ff88, 0xffbb00, 0xff5500, 0xff0044];
    const fpaMeshes: THREE.Mesh[] = [];
    fpaColors.forEach((color, idx) => {
      const fpaGeo = new THREE.BoxGeometry(0.12, 0.02, 0.12);
      const fpaMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.4,
      });
      const fpa = new THREE.Mesh(fpaGeo, fpaMat);
      const ang = (idx / 6) * Math.PI * 2;
      fpa.position.set(Math.cos(ang) * 0.28, 0.12, Math.sin(ang) * 0.28);
      teardownGroup.add(fpa);
      fpaMeshes.push(fpa);
    });

    // 5. Internal Optical Light Path Rays
    const rayPathPts = [
      new THREE.Vector3(0, 1.15, 0), new THREE.Vector3(0, 0.45, 0), // aperture to primary
      new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0, 0.95, 0), // primary to secondary
      new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0.25, 0), // secondary to dichroic
    ];
    fpaColors.forEach((_, idx) => {
      const ang = (idx / 6) * Math.PI * 2;
      rayPathPts.push(
        new THREE.Vector3(0, 0.25, 0),
        new THREE.Vector3(Math.cos(ang) * 0.28, 0.12, Math.sin(ang) * 0.28)
      );
    });
    const rayPathGeo = new THREE.BufferGeometry().setFromPoints(rayPathPts);
    const rayPathMat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const internalRays = new THREE.LineSegments(rayPathGeo, rayPathMat);
    teardownGroup.add(internalRays);

    // Initial state: teardown hidden until toggled
    teardownGroup.visible = false;
    let teardownFactor = 0.0;

    // 85° Solar Exclusion Cone (Cryogenic Thermal Avoidance Frustum)
    const sunVector = new THREE.Vector3(80, 50, 100).normalize();
    const coneLength = 75;
    const rInner = 20 * Math.tan((85 * Math.PI) / 360);
    const rOuter = 95 * Math.tan((85 * Math.PI) / 360);
    const coneGeo = new THREE.CylinderGeometry(rInner, rOuter, coneLength, 48, 1, true);
    coneGeo.translate(0, -coneLength / 2 - 20, 0);
    coneGeo.rotateX(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.08,
      wireframe: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunExclusionCone = new THREE.Mesh(coneGeo, coneMat);
    sunExclusionCone.lookAt(sunVector);
    sunExclusionCone.visible = false;
    scene.add(sunExclusionCone);

    // Glowing boundary rim ring at r=95 on celestial sphere
    const rimGeo = new THREE.RingGeometry(rOuter - 0.25, rOuter + 0.25, 64);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(0, 0, -coneLength - 20);
    sunExclusionCone.add(rimMesh);

    // Low Earth Orbit Environment (Earth Globe beneath SPHEREx in Spacecraft View Mode)
    const earthOrbitGroup = new THREE.Group();
    earthOrbitGroup.position.set(0, -22, 0);
    scene.add(earthOrbitGroup);

    const earthGeo = new THREE.SphereGeometry(15, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: planetTextures.Earth,
      roughness: 0.65,
      metalness: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthOrbitGroup.add(earthMesh);

    // Realistic Cloud Layer drifting above continents
    const atmoCloudsGeo = new THREE.SphereGeometry(15.18, 64, 48);
    const atmoCloudsMat = new THREE.MeshStandardMaterial({
      map: earthCloudsTexture,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const atmoCloudsMesh = new THREE.Mesh(atmoCloudsGeo, atmoCloudsMat);
    earthOrbitGroup.add(atmoCloudsMesh);

    // Atmosphere Glow Limb
    const atmoGeo = new THREE.SphereGeometry(15.45, 64, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    earthOrbitGroup.add(atmoMesh);

    // Load NASA SPHEREx GLTF Model
    let spherexModel: THREE.Group | null = null;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/spherex/spherex.gltf',
      (gltf) => {
        spherexModel = gltf.scene;
        spherexModel.scale.set(2.4, 2.4, 2.4);
        spherexModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.material) {
              const mat = m.material as THREE.MeshStandardMaterial;
              if (mat.name === 'white_krinkle') {
                mat.color.setHex(0xd1d5db); // authentic aerospace thermal-protective silver/aluminum
                mat.roughness = 0.38;
                mat.metalness = 0.55;
              } else if (mat.name?.includes('gold')) {
                mat.color.setHex(0xffd700);
                mat.roughness = 0.18;
                mat.metalness = 0.95;
              } else if (mat.name?.includes('aluminum') || mat.name?.includes('chrome')) {
                mat.roughness = 0.22;
                mat.metalness = 0.88;
              } else {
                mat.roughness = 0.35;
                mat.metalness = 0.65;
              }
            }
          }
        });
        spacecraftGroup.add(spherexModel);
      },
      undefined,
      (err) => console.warn('NASA SPHEREx GLTF model load error:', err)
    );

    // --- 3. Milky Way Great Circle Dust Band (Using Circular Dust Particle Sprites) ---
    const mwCount = 9000;
    const mwPositions = new Float32Array(mwCount * 3);
    const mwColors = new Float32Array(mwCount * 3);

    const alphaG = (192.85948 * Math.PI) / 180;
    const deltaG = (27.12825 * Math.PI) / 180;
    const ngp = new THREE.Vector3(
      Math.cos(deltaG) * Math.cos(alphaG),
      Math.sin(deltaG),
      Math.cos(deltaG) * Math.sin(alphaG)
    );

    const gU = new THREE.Vector3(0, 1, 0).cross(ngp).normalize();
    const gV = ngp.clone().cross(gU).normalize();

    for (let i = 0; i < mwCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const bRad = (Math.random() - 0.5) * (Math.random() - 0.5) * 0.45;
      const cosB = Math.cos(bRad);
      const sinB = Math.sin(bRad);

      const r = sphereRadius * (0.97 + Math.random() * 0.02);
      const dir = gU
        .clone()
        .multiplyScalar(Math.cos(angle) * cosB)
        .add(gV.clone().multiplyScalar(Math.sin(angle) * cosB))
        .add(ngp.clone().multiplyScalar(sinB))
        .normalize()
        .multiplyScalar(r);

      mwPositions[i * 3] = dir.x;
      mwPositions[i * 3 + 1] = dir.y;
      mwPositions[i * 3 + 2] = dir.z;

      const t = Math.random();
      if (t < 0.4) {
        mwColors[i * 3] = 0.45;
        mwColors[i * 3 + 1] = 0.55;
        mwColors[i * 3 + 2] = 0.95;
      } else if (t < 0.75) {
        mwColors[i * 3] = 0.75;
        mwColors[i * 3 + 1] = 0.45;
        mwColors[i * 3 + 2] = 0.9;
      } else {
        mwColors[i * 3] = 0.95;
        mwColors[i * 3 + 1] = 0.75;
        mwColors[i * 3 + 2] = 0.45;
      }
    }

    const mwGeo = new THREE.BufferGeometry();
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));
    // Soft circular dust sprite with additive blending and depthWrite=false (NO square boxes!)
    const mwMat = new THREE.PointsMaterial({
      size: 1.6,
      map: dustSpriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mwPoints = new THREE.Points(mwGeo, mwMat);
    scene.add(mwPoints);

    // --- 4. Real Star Field (Airy-Disk Star Sprites + Background Catalog) ---
    const bgStarCount = 2000;
    const totalStarCount = BRIGHT_STARS.length + bgStarCount;
    const starPositions = new Float32Array(totalStarCount * 3);
    const starColors = new Float32Array(totalStarCount * 3);

    // Bright catalog stars
    BRIGHT_STARS.forEach((star, idx) => {
      const pos = icrsToUnitVector(star.ra, star.dec, sphereRadius * 0.985);
      starPositions[idx * 3] = pos.x;
      starPositions[idx * 3 + 1] = pos.y;
      starPositions[idx * 3 + 2] = pos.z;

      const color = new THREE.Color(star.colorHex);
      starColors[idx * 3] = color.r;
      starColors[idx * 3 + 1] = color.g;
      starColors[idx * 3 + 2] = color.b;
    });

    // Background random stars
    for (let i = 0; i < bgStarCount; i++) {
      const idx = BRIGHT_STARS.length + i;
      const bRa = Math.random() * 360;
      const bDec = (Math.asin(Math.random() * 2 - 1) * 180) / Math.PI;
      const pos = icrsToUnitVector(bRa, bDec, sphereRadius * 0.985);

      starPositions[idx * 3] = pos.x;
      starPositions[idx * 3 + 1] = pos.y;
      starPositions[idx * 3 + 2] = pos.z;

      const brightness = 0.4 + Math.random() * 0.6;
      starColors[idx * 3] = brightness * 0.9;
      starColors[idx * 3 + 1] = brightness * 0.95;
      starColors[idx * 3 + 2] = brightness;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    // Authentic Airy-disk Gaussian star sprite with cross diffraction spikes (NO square boxes!)
    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      map: starSpriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Optical Diffraction Flares on Prominent Navigation Stars (using Solar System Scope flare)
    const brightFlareGroup = new THREE.Group();
    scene.add(brightFlareGroup);
    BRIGHT_STARS.forEach((star) => {
      if (star.mag <= 2.2) {
        const fMat = new THREE.SpriteMaterial({
          map: flareTexture,
          color: new THREE.Color(star.colorHex),
          transparent: true,
          opacity: Math.max(0.35, (2.6 - star.mag) * 0.4),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const flareSprite = new THREE.Sprite(fMat);
        const pos = icrsToUnitVector(star.ra, star.dec, sphereRadius * 0.982);
        flareSprite.position.copy(pos);
        const flareScale = Math.max(2.4, (2.8 - star.mag) * 2.5);
        flareSprite.scale.set(flareScale, flareScale, 1);
        brightFlareGroup.add(flareSprite);
      }
    });

    // --- 5. Coordinate Grids (Equatorial, Ecliptic, Galactic) ---
    const gridGroup = new THREE.Group();
    scene.add(gridGroup);

    // 5a. Celestial Equator (Dec = 0)
    const eqPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      eqPts.push(
        new THREE.Vector3(
          sphereRadius * 0.99 * Math.cos(a),
          0,
          sphereRadius * 0.99 * Math.sin(a)
        )
      );
    }
    const eqGeo = new THREE.BufferGeometry().setFromPoints(eqPts);
    const eqMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.35,
    });
    const equatorLine = new THREE.Line(eqGeo, eqMat);
    gridGroup.add(equatorLine);

    // 5b. Dec parallels (±30°, ±60°)
    [-60, -30, 30, 60].forEach((decDeg) => {
      const dRad = (decDeg * Math.PI) / 180;
      const rP = sphereRadius * 0.99 * Math.cos(dRad);
      const yP = sphereRadius * 0.99 * Math.sin(dRad);
      const dPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        dPts.push(new THREE.Vector3(rP * Math.cos(a), yP, rP * Math.sin(a)));
      }
      const dGeo = new THREE.BufferGeometry().setFromPoints(dPts);
      const dMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.12,
      });
      gridGroup.add(new THREE.Line(dGeo, dMat));
    });

    // 5c. RA meridians (every 2h = 30°)
    for (let h = 0; h < 24; h += 2) {
      const raDeg = h * 15;
      const mPts: THREE.Vector3[] = [];
      for (let d = -80; d <= 80; d += 5) {
        mPts.push(icrsToUnitVector(raDeg, d, sphereRadius * 0.99));
      }
      const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
      const mMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.1,
      });
      gridGroup.add(new THREE.Line(mGeo, mMat));
    }

    // --- 5d. Ecliptic Plane Great Circle (Gold) ---
    const eclipticGroup = new THREE.Group();
    scene.add(eclipticGroup);
    const ecPts: THREE.Vector3[] = [];
    const eps = (23.43929 * Math.PI) / 180;
    for (let i = 0; i <= 180; i++) {
      const l = (i / 180) * Math.PI * 2;
      const xE = sphereRadius * 0.988 * Math.cos(l);
      const yE = sphereRadius * 0.988 * Math.sin(l) * Math.sin(eps);
      const zE = sphereRadius * 0.988 * Math.sin(l) * Math.cos(eps);
      ecPts.push(new THREE.Vector3(xE, yE, zE));
    }
    const ecGeo = new THREE.BufferGeometry().setFromPoints(ecPts);
    const ecMat = new THREE.LineBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.45,
    });
    eclipticGroup.add(new THREE.Line(ecGeo, ecMat));

    // --- 5e. Galactic Plane Great Circle (Purple) ---
    const galacticGroup = new THREE.Group();
    scene.add(galacticGroup);
    const galPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const p = gU
        .clone()
        .multiplyScalar(Math.cos(a))
        .add(gV.clone().multiplyScalar(Math.sin(a)))
        .normalize()
        .multiplyScalar(sphereRadius * 0.986);
      galPts.push(p);
    }
    const galGeo = new THREE.BufferGeometry().setFromPoints(galPts);
    const galMat = new THREE.LineBasicMaterial({
      color: 0x9d4edd,
      transparent: true,
      opacity: 0.45,
    });
    galacticGroup.add(new THREE.Line(galGeo, galMat));

    // --- 6. SPHEREx Scan Cadence Great Circle (Animated Precessing Ring) ---
    const scanGroup = new THREE.Group();
    scene.add(scanGroup);
    const scanPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      scanPts.push(
        new THREE.Vector3(
          sphereRadius * 0.982 * Math.cos(a),
          sphereRadius * 0.982 * Math.sin(a),
          0
        )
      );
    }
    const scanGeo = new THREE.BufferGeometry().setFromPoints(scanPts);
    const scanMat = new THREE.LineBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.5,
    });
    scanGroup.add(new THREE.Line(scanGeo, scanMat));

    // --- 7. Solar System Orrery with Solar System Scope Authentic Textures & Orbital Model ---
    const orreryGroup = new THREE.Group();
    orreryGroup.rotation.x = -(23.43929 * Math.PI) / 180; // ecliptic plane tilted by the obliquity, like the ecliptic ring and the RA/Dec sphere
    scene.add(orreryGroup);

    // Central Sun with Solar System Scope Photosphere
    const sunGeo = new THREE.SphereGeometry(1.8, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: planetTextures.Sun,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    orreryGroup.add(sunMesh);

    // Multi-layered Solar Corona and Atmospheric Glow (Tuned with clear vacuum buffer before Mercury at r=8.34)
    const coronaTexture = createSunCoronaTexture();
    const innerCoronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      blending: THREE.AdditiveBlending,
      color: 0xfff0c0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const innerCorona = new THREE.Sprite(innerCoronaMat);
    innerCorona.scale.set(5.6, 5.6, 1); // Radius 2.8
    orreryGroup.add(innerCorona);

    const outerCoronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      blending: THREE.AdditiveBlending,
      color: 0xffa040,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const outerCorona = new THREE.Sprite(outerCoronaMat);
    outerCorona.scale.set(9.0, 9.0, 1); // Radius 4.5 (leaves wide 3.84 unit vacuum gap to Mercury's perihelion at 8.34)
    orreryGroup.add(outerCorona);

    // Central Sunlight PointLight
    const sunPointLight = new THREE.PointLight(0xfff6ea, 3.5, 500);
    sunPointLight.position.set(0, 0, 0);
    orreryGroup.add(sunPointLight);

    // Build Keplerian Planetary Bodies
    interface PlanetMeshItem {
      mesh: THREE.Mesh;
      orbit: CelestialOrbit;
      clouds?: THREE.Mesh;
      rings?: THREE.Mesh;
    }
    const planetMeshes: PlanetMeshItem[] = [];

    PLANET_ORBITS.forEach((orbit) => {
      // Orbital Ellipse Path (calibrated 1.0 visual scale)
      const pts: THREE.Vector3[] = [];
      const numPts = 128;
      for (let step = 0; step <= numPts; step++) {
        const m = (step / numPts) * 360;
        pts.push(
          keplerToCartesian(
            orbit.a,
            orbit.e,
            orbit.i,
            orbit.omega,
            orbit.Omega,
            m,
            1.0
          )
        );
      }
      const oGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const oMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(orbit.color),
        transparent: true,
        opacity: 0.28,
      });
      orreryGroup.add(new THREE.Line(oGeo, oMat));

      // Textured Planetary Sphere
      const tex = planetTextures[orbit.name] || (orbit.name === 'Ceres' || orbit.name === 'Pluto' ? planetTextures.Moon : undefined);
      const pGeo = new THREE.SphereGeometry(orbit.size, 32, 24);
      const pMat = tex
        ? new THREE.MeshStandardMaterial({
          map: tex,
          roughness: orbit.name === 'Ceres' || orbit.name === 'Pluto' ? 0.85 : 0.65,
          metalness: 0.05,
          color: orbit.name === 'Ceres' ? 0xcbc5b9 : orbit.name === 'Pluto' ? 0xc6a487 : 0xffffff,
        })
        : new THREE.MeshStandardMaterial({
          color: new THREE.Color(orbit.color),
          roughness: 0.5,
        });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      orreryGroup.add(pMesh);

      let pClouds: THREE.Mesh | undefined;
      let pRings: THREE.Mesh | undefined;

      // Earth Cloud Layer
      if (orbit.name === 'Earth') {
        const cloudsGeo = new THREE.SphereGeometry(orbit.size * 1.025, 32, 24);
        const cloudsMat = new THREE.MeshStandardMaterial({
          map: earthCloudsTexture,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
        });
        pClouds = new THREE.Mesh(cloudsGeo, cloudsMat);
        pMesh.add(pClouds);
      }

      // Saturn 3D Rings
      if (orbit.name === 'Saturn') {
        const ringInner = orbit.size * 1.35;
        const ringOuter = orbit.size * 2.45;
        const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);
        const posAttr = ringGeo.attributes.position;
        const uvAttr = ringGeo.attributes.uv;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const r = Math.sqrt(x * x + y * y);
          const normalizedR = (r - ringInner) / (ringOuter - ringInner);
          uvAttr.setXY(i, normalizedR, 0.5);
        }
        uvAttr.needsUpdate = true;

        const ringMat = new THREE.MeshStandardMaterial({
          map: saturnRingTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          roughness: 0.6,
        });
        pRings = new THREE.Mesh(ringGeo, ringMat);
        pRings.rotation.x = Math.PI / 2 + 0.466; // 26.73 deg axial tilt
        pMesh.add(pRings);
      }

      planetMeshes.push({ mesh: pMesh, orbit, clouds: pClouds, rings: pRings });
    });

    // --- 7.2 Earth-Moon System (Moon Orbiting Earth) ---
    const moonGeo = new THREE.SphereGeometry(0.32, 24, 20);
    const moonMat = new THREE.MeshStandardMaterial({
      map: planetTextures.Moon,
      roughness: 0.85,
      metalness: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    orreryGroup.add(moonMesh);

    // Moon Lunar Orbit Trace Ring around Earth
    const moonOrbitPts: THREE.Vector3[] = [];
    for (let step = 0; step <= 64; step++) {
      const ang = (step / 64) * Math.PI * 2;
      moonOrbitPts.push(new THREE.Vector3(Math.cos(ang) * 1.85, Math.sin(ang) * 1.85 * 0.089, Math.sin(ang) * 1.85 * 0.996));
    }
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.35,
    });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    orreryGroup.add(moonOrbitLine);

    // --- 7.3 Main Asteroid Belt Swarm (Between Mars and Jupiter) ---
    const asteroidBeltCount = 1200;
    const asteroidPositions = new Float32Array(asteroidBeltCount * 3);
    const asteroidColors = new Float32Array(asteroidBeltCount * 3);
    const rockTones = [
      new THREE.Color(0x8d8276),
      new THREE.Color(0xa89f91),
      new THREE.Color(0x6d6459),
      new THREE.Color(0x524b43),
      new THREE.Color(0x9ca3af),
    ];

    for (let i = 0; i < asteroidBeltCount; i++) {
      const r = 34.0 + Math.random() * 5.5; // situated between r=34.0 (Mars aphelion 32.6) and r=39.5 (Jupiter perihelion 45.2)
      const theta = Math.random() * Math.PI * 2;
      const yDisp = (Math.random() - 0.5) * 1.6;
      asteroidPositions[i * 3] = Math.cos(theta) * r;
      asteroidPositions[i * 3 + 1] = yDisp;
      asteroidPositions[i * 3 + 2] = Math.sin(theta) * r;

      const c = rockTones[Math.floor(Math.random() * rockTones.length)];
      asteroidColors[i * 3] = c.r;
      asteroidColors[i * 3 + 1] = c.g;
      asteroidColors[i * 3 + 2] = c.b;
    }

    const asteroidBeltGeo = new THREE.BufferGeometry();
    asteroidBeltGeo.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
    asteroidBeltGeo.setAttribute('color', new THREE.BufferAttribute(asteroidColors, 3));
    const asteroidBeltMat = new THREE.PointsMaterial({
      size: 1.25,
      map: dustSpriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const asteroidBeltPoints = new THREE.Points(asteroidBeltGeo, asteroidBeltMat);
    orreryGroup.add(asteroidBeltPoints);

    // --- 7.4 Solar System Scope Comets with Dynamic 3D Solar Wind Tails ---
    interface CometMeshItem {
      nucleus: THREE.Mesh;
      coma: THREE.Mesh;
      ionTail: THREE.Mesh;
      dustTail: THREE.Mesh;
      orbit: CometOrbit;
    }
    const cometMeshes: CometMeshItem[] = [];

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

      // Nucleus
      const nGeo = new THREE.SphereGeometry(comet.size, 16, 12);
      const nMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.9,
      });
      const nucleus = new THREE.Mesh(nGeo, nMat);
      orreryGroup.add(nucleus);

      // Coma (glowing atmosphere)
      const comaGeo = new THREE.SphereGeometry(comet.size * 2.2, 16, 16);
      const comaMat = new THREE.MeshBasicMaterial({
        color: comet.tailColor,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coma = new THREE.Mesh(comaGeo, comaMat);
      orreryGroup.add(coma);

      // Dynamic 3D Ion Tail (cylinder aligned anti-solar)
      const ionGeo = new THREE.CylinderGeometry(0.12, 1.2, 1.0, 16, 1, true);
      ionGeo.translate(0, 0.5, 0); // origin at base of nucleus
      const ionMat = new THREE.MeshBasicMaterial({
        color: comet.tailColor,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ionTail = new THREE.Mesh(ionGeo, ionMat);
      orreryGroup.add(ionTail);

      // Dynamic 3D Dust Tail (lagging golden tail)
      const dustGeo = new THREE.CylinderGeometry(0.18, 1.8, 1.0, 16, 1, true);
      dustGeo.translate(0, 0.5, 0);
      const dustMat = new THREE.MeshBasicMaterial({
        color: comet.dustTailColor,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const dustTail = new THREE.Mesh(dustGeo, dustMat);
      orreryGroup.add(dustTail);

      cometMeshes.push({ nucleus, coma, ionTail, dustTail, orbit: comet });
    });

    // --- 8. Solar System Scope Inspired Precision Target Selector HUD ---
    const targetGroup = new THREE.Group();
    scene.add(targetGroup);

    // 8.1 Four Aerodynamic Corner Precision Brackets (┌ ┐ └ ┘)
    const R_bracket = 5.2;
    const L_arm = 1.6;
    const bracketPts: THREE.Vector3[] = [];
    // Top-Left (┌)
    bracketPts.push(new THREE.Vector3(-R_bracket, R_bracket - L_arm, 0), new THREE.Vector3(-R_bracket, R_bracket, 0));
    bracketPts.push(new THREE.Vector3(-R_bracket, R_bracket, 0), new THREE.Vector3(-R_bracket + L_arm, R_bracket, 0));
    // Top-Right (┐)
    bracketPts.push(new THREE.Vector3(R_bracket - L_arm, R_bracket, 0), new THREE.Vector3(R_bracket, R_bracket, 0));
    bracketPts.push(new THREE.Vector3(R_bracket, R_bracket, 0), new THREE.Vector3(R_bracket, R_bracket - L_arm, 0));
    // Bottom-Right (┘)
    bracketPts.push(new THREE.Vector3(R_bracket, -R_bracket + L_arm, 0), new THREE.Vector3(R_bracket, -R_bracket, 0));
    bracketPts.push(new THREE.Vector3(R_bracket, -R_bracket, 0), new THREE.Vector3(R_bracket - L_arm, -R_bracket, 0));
    // Bottom-Left (└)
    bracketPts.push(new THREE.Vector3(-R_bracket + L_arm, -R_bracket, 0), new THREE.Vector3(-R_bracket, -R_bracket, 0));
    bracketPts.push(new THREE.Vector3(-R_bracket, -R_bracket, 0), new THREE.Vector3(-R_bracket, -R_bracket + L_arm, 0));

    const bracketGeo = new THREE.BufferGeometry().setFromPoints(bracketPts);
    const bracketMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const cornerBrackets = new THREE.LineSegments(bracketGeo, bracketMat);
    targetGroup.add(cornerBrackets);

    // 8.2 Inner Rotating Segmented Orbiting HUD Reticle
    const segRingPts: THREE.Vector3[] = [];
    const numSegments = 8;
    for (let s = 0; s < numSegments; s++) {
      const startAng = (s / numSegments) * Math.PI * 2 + 0.08;
      const endAng = ((s + 0.65) / numSegments) * Math.PI * 2;
      const arcSteps = 6;
      for (let j = 0; j < arcSteps; j++) {
        const a1 = startAng + ((endAng - startAng) * j) / arcSteps;
        const a2 = startAng + ((endAng - startAng) * (j + 1)) / arcSteps;
        segRingPts.push(
          new THREE.Vector3(Math.cos(a1) * 3.8, Math.sin(a1) * 3.8, 0),
          new THREE.Vector3(Math.cos(a2) * 3.8, Math.sin(a2) * 3.8, 0)
        );
      }
    }
    const segRingGeo = new THREE.BufferGeometry().setFromPoints(segRingPts);
    const segRingMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const segmentedRing = new THREE.LineSegments(segRingGeo, segRingMat);
    targetGroup.add(segmentedRing);

    // 8.3 Outer Precision Circular Ring
    const outerRingGeo = new THREE.RingGeometry(5.8, 5.95, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    targetGroup.add(outerRing);

    // 8.4 Four Cardinal Crosshair Ticks
    const tickPts: THREE.Vector3[] = [
      new THREE.Vector3(0, 6.2, 0), new THREE.Vector3(0, 7.4, 0),
      new THREE.Vector3(0, -6.2, 0), new THREE.Vector3(0, -7.4, 0),
      new THREE.Vector3(6.2, 0, 0), new THREE.Vector3(7.4, 0, 0),
      new THREE.Vector3(-6.2, 0, 0), new THREE.Vector3(-7.4, 0, 0),
    ];
    const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    const tickMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    const crosshairTicks = new THREE.LineSegments(tickGeo, tickMat);
    targetGroup.add(crosshairTicks);

    // 8.5 Center Glowing Reticle Core Dot
    const centerCoreGeo = new THREE.CircleGeometry(0.35, 16);
    const centerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const centerCore = new THREE.Mesh(centerCoreGeo, centerCoreMat);
    targetGroup.add(centerCore);

    // 8.6 Dynamic Radar Acquisition Pulse Ring
    const radarPingGeo = new THREE.RingGeometry(1.8, 2.0, 48);
    const radarPingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const radarPing = new THREE.Mesh(radarPingGeo, radarPingMat);
    targetGroup.add(radarPing);

    // 8.7 Floating Target Holographic Info Badge (Billboard HUD)
    const { texture: badgeTexture, canvas: badgeCanvas } = createTargetBadgeTexture(
      activePresetName || 'Target Field',
      `RA: ${ra.toFixed(2)}° | DEC: ${dec.toFixed(2)}°`
    );
    const badgeMat = new THREE.SpriteMaterial({
      map: badgeTexture,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    });
    const targetBadgeSprite = new THREE.Sprite(badgeMat);
    targetBadgeSprite.scale.set(11.5, 2.5, 1);
    targetBadgeSprite.position.set(0, 8.2, 0);
    targetGroup.add(targetBadgeSprite);

    // Hypothetical Planet X marker (magenta)
    const planetXGroup = new THREE.Group();
    planetXGroup.visible = false;
    scene.add(planetXGroup);
    const pxMat = new THREE.MeshBasicMaterial({ color: 0xff3df2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    planetXGroup.add(new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32), pxMat));
    planetXGroup.add(new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), pxMat));

    // Hypothetical Planet X 3D Orbit line in Orrery
    const pxOrbitGeo = new THREE.BufferGeometry();
    const pxOrbitMat = new THREE.LineBasicMaterial({
      color: 0xff3df2,
      transparent: true,
      opacity: 0.85,
    });
    const planetXOrbitLine = new THREE.Line(pxOrbitGeo, pxOrbitMat);
    planetXOrbitLine.visible = false;
    orreryGroup.add(planetXOrbitLine);

    // Planet X body on its orbit at the selected date (same scale/plane as the planets)
    const planetXBody = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xff3df2 })
    );
    planetXBody.visible = false;
    orreryGroup.add(planetXBody);
    const pxLabelCv = document.createElement('canvas');
    pxLabelCv.width = 256; pxLabelCv.height = 64;
    const pxLabelCx = pxLabelCv.getContext('2d')!;
    pxLabelCx.font = 'bold 30px monospace';
    pxLabelCx.fillStyle = '#ff3df2';
    pxLabelCx.textBaseline = 'middle';
    pxLabelCx.fillText('Planet X', 6, 32);
    const planetXLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(pxLabelCv), transparent: true, depthTest: false }));
    planetXLabel.scale.set(24, 6, 1);
    planetXLabel.center.set(0, 0.5);
    planetXLabel.visible = false;
    orreryGroup.add(planetXLabel);
    let pxHadPath = false;
    let pxFrameFrames = 0;

    // 8.8 3D Planet Hover Reticle & Holographic Badge (Billboarding HUD)
    interface HoveredTargetInfo {
      name: string;
      category: string;
      ra: number;
      dec: number;
      worldPos: THREE.Vector3;
      baseRadius: number;
      velocityKms: number;
      distAu: number;
      periodDays: number;
    }
    let currentHoveredPlanet: HoveredTargetInfo | null = null;

    const planetHoverGroup = new THREE.Group();
    planetHoverGroup.visible = false;
    planetHoverGroup.renderOrder = 9998;
    scene.add(planetHoverGroup);

    // Dynamic Hover Reticle Ring (cyan)
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const hoverRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.85, 32), hoverRingMat);
    hoverRing.renderOrder = 9998;
    planetHoverGroup.add(hoverRing);

    // 4 Corner Brackets for Hover Target
    const hoverBracketMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const hbSize = 2.4;
    const hbArm = 0.7;
    const hbPoints: THREE.Vector3[] = [
      new THREE.Vector3(-hbSize, hbSize - hbArm, 0),
      new THREE.Vector3(-hbSize, hbSize, 0),
      new THREE.Vector3(-hbSize + hbArm, hbSize, 0),
      new THREE.Vector3(hbSize - hbArm, hbSize, 0),
      new THREE.Vector3(hbSize, hbSize, 0),
      new THREE.Vector3(hbSize, hbSize - hbArm, 0),
      new THREE.Vector3(hbSize, -hbSize + hbArm, 0),
      new THREE.Vector3(hbSize, -hbSize, 0),
      new THREE.Vector3(hbSize - hbArm, -hbSize, 0),
      new THREE.Vector3(-hbSize + hbArm, -hbSize, 0),
      new THREE.Vector3(-hbSize, -hbSize, 0),
      new THREE.Vector3(-hbSize, -hbSize + hbArm, 0),
    ];
    const hbGeo = new THREE.BufferGeometry().setFromPoints(hbPoints);
    const hoverBrackets = new THREE.LineSegments(hbGeo, hoverBracketMat);
    hoverBrackets.renderOrder = 9998;
    planetHoverGroup.add(hoverBrackets);

    // Floating Holographic Hover Badge Sprite
    const { texture: hoverBadgeTex, canvas: hoverBadgeCanvas } = createPlanetHoverBadgeTexture();
    const hoverBadgeMat = new THREE.SpriteMaterial({
      map: hoverBadgeTex,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const hoverBadgeSprite = new THREE.Sprite(hoverBadgeMat);
    hoverBadgeSprite.center.set(0.5, 0.0);
    hoverBadgeSprite.renderOrder = 9998;
    hoverBadgeSprite.scale.set(7.5, 1.7, 1);
    hoverBadgeSprite.position.set(0, 3.2, 0);
    planetHoverGroup.add(hoverBadgeSprite);

    // Sample Known Transient Candidates on Sphere
    const sampleCandidates = [
      { id: 'cand-001', ra: 83.8221, dec: -5.3911, confidence: 0.87, type: 'Y-Dwarf' },
      { id: 'cand-002', ra: 84.15, dec: -5.20, confidence: 0.92, type: 'High Proper Motion' },
      { id: 'cand-003', ra: 266.4168, dec: -29.0078, confidence: 0.64, type: 'IR Flare' },
      { id: 'cand-004', ra: 56.75, dec: 24.1167, confidence: 0.78, type: 'Variable Star' },
      { id: 'cand-005', ra: 270.0, dec: 66.56, confidence: 0.95, type: 'NEP Transient' },
    ];

    const candidateMeshes: { mesh: THREE.Mesh; data: (typeof sampleCandidates)[0] }[] = [];
    sampleCandidates.forEach((cand) => {
      const pos = icrsToUnitVector(cand.ra, cand.dec, sphereRadius * 0.984);
      const cRingGeo = new THREE.RingGeometry(0.9, 1.3, 24);
      const cRingMat = new THREE.MeshBasicMaterial({
        color: cand.confidence >= 0.7 ? 0x06d6a0 : 0xffd166,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const cMesh = new THREE.Mesh(cRingGeo, cRingMat);
      cMesh.position.copy(pos);
      cMesh.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(cMesh);
      candidateMeshes.push({ mesh: cMesh, data: cand });
    });

    // --- 9. Raycasting for Interactive Selection ---
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 1.5 };
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // 1. Planet & Minor Body Screen-Space Proximity Picking (Smooth Hover Effect)
      if (storeValuesRef.current.showOrrery && storeValuesRef.current.viewMode !== 'spacecraft') {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const jd = getJulianDate();
        const when = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

        interface BestHitType {
          d: number;
          name: string;
          category: string;
          meshPos: THREE.Vector3;
          radius: number;
          rAu: number;
          vKms: number;
          periodDays: number;
          description: string;
        }
        let bestHit: BestHitType | null = null;

        // Check Planets (Mercury through Neptune, Ceres, Pluto)
        for (const { mesh, orbit } of planetMeshes) {
          const worldPos = mesh.getWorldPosition(new THREE.Vector3());
          const ndc = worldPos.clone().project(camera);
          if (ndc.z > 1) continue; // behind camera
          const sx = ((ndc.x + 1) / 2) * rect.width;
          const sy = ((1 - ndc.y) / 2) * rect.height;
          const d = Math.hypot(sx - px, sy - py);
          const hitRadius = Math.max(24, (orbit.size / Math.max(1, worldPos.distanceTo(camera.position))) * 1400);
          if (d < hitRadius && (!bestHit || d < (bestHit as BestHitType).d)) {
            // Solve Kepler equation for exact true heliocentric distance in AU
            const mDeg = ((jd - 2451545.0) * (360.0 / orbit.periodDays)) % 360;
            const M = mDeg * (Math.PI / 180);
            let E = M;
            for (let it = 0; it < 10; it++) {
              E -= (E - orbit.e * Math.sin(E) - M) / (1 - orbit.e * Math.cos(E));
            }
            const rAu = orbit.realAU * (1 - orbit.e * Math.cos(E));
            const vKms = 29.7847 * Math.sqrt(Math.max(0, 2 / rAu - 1 / orbit.realAU));
            bestHit = {
              d,
              name: orbit.name,
              category: orbit.category,
              meshPos: worldPos,
              radius: orbit.size,
              rAu,
              vKms,
              periodDays: orbit.periodDays,
              description: orbit.description,
            };
          }
        }

        // Check Moon
        {
          const worldPos = moonMesh.position.clone();
          const ndc = worldPos.clone().project(camera);
          if (ndc.z <= 1) {
            const sx = ((ndc.x + 1) / 2) * rect.width;
            const sy = ((1 - ndc.y) / 2) * rect.height;
            const d = Math.hypot(sx - px, sy - py);
            if (d < 24 && (!bestHit || d < (bestHit as BestHitType).d)) {
              bestHit = {
                d,
                name: 'Moon',
                category: 'Natural Satellite',
                meshPos: worldPos,
                radius: 0.32,
                rAu: 1.0,
                vKms: 1.02,
                periodDays: 27.32,
                description: 'Distance to Earth: 384,400 km | Tidally locked to Earth',
              };
            }
          }
        }

        // Check Comets
        for (const { nucleus, orbit } of cometMeshes) {
          const worldPos = nucleus.position.clone();
          const ndc = worldPos.clone().project(camera);
          if (ndc.z > 1) continue;
          const sx = ((ndc.x + 1) / 2) * rect.width;
          const sy = ((1 - ndc.y) / 2) * rect.height;
          const d = Math.hypot(sx - px, sy - py);
          if (d < 24 && (!bestHit || d < (bestHit as BestHitType).d)) {
            const mDeg = ((jd - 2451545.0) * (360.0 / orbit.periodDays)) % 360;
            const M = mDeg * (Math.PI / 180);
            let E = M;
            for (let it = 0; it < 10; it++) {
              E -= (E - orbit.e * Math.sin(E) - M) / (1 - orbit.e * Math.cos(E));
            }
            const rAu = orbit.realAU * (1 - orbit.e * Math.cos(E));
            const vKms = 29.7847 * Math.sqrt(Math.max(0, 2 / rAu - 1 / orbit.realAU));
            bestHit = {
              d,
              name: orbit.name,
              category: 'Comet',
              meshPos: worldPos,
              radius: orbit.size,
              rAu,
              vKms,
              periodDays: orbit.periodDays,
              description: orbit.description,
            };
          }
        }

        if (bestHit) {
          const icrs = vectorToIcrs(bestHit.meshPos.clone().normalize().multiplyScalar(sphereRadius));
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

          updatePlanetHoverBadgeCanvas(
            hoverBadgeCanvas,
            bestHit.name,
            bestHit.category,
            `v: ${bestHit.vKms.toFixed(2)} km/s`,
            `r: ${bestHit.rAu.toFixed(3)} AU`
          );
          hoverBadgeTex.needsUpdate = true;
          planetHoverGroup.visible = true;

          const periodStr = bestHit.periodDays > 365.25
            ? `${(bestHit.periodDays / 365.25).toFixed(2)} yr`
            : `${bestHit.periodDays.toFixed(1)} days`;

          setHoveredObject({
            name: `${bestHit.name} (${bestHit.category})`,
            ra: icrs.ra,
            dec: icrs.dec,
            type: 'Planet',
            extra: `${when} | Speed: ${bestHit.vKms.toFixed(2)} km/s | Sun dist: ${bestHit.rAu.toFixed(3)} AU | Period: ${periodStr} | ${bestHit.description}`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // No planet hovered: hide planet hover HUD
      currentHoveredPlanet = null;
      planetHoverGroup.visible = false;

      // Check Candidates
      const candHits = raycaster.intersectObjects(candidateMeshes.map((c) => c.mesh));
      if (candHits.length > 0) {
        const hit = candidateMeshes.find((c) => c.mesh === candHits[0].object);
        if (hit) {
          setHoveredObject({
            name: `${hit.data.type} (${(hit.data.confidence * 100).toFixed(0)}% conf)`,
            ra: hit.data.ra,
            dec: hit.data.dec,
            type: 'Candidate',
            extra: `ID: ${hit.data.id} | Class: ${hit.data.type}`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // Check Stars
      const starHits = raycaster.intersectObject(starPoints);
      if (starHits.length > 0 && starHits[0].index !== undefined) {
        const idx = starHits[0].index;
        if (idx < BRIGHT_STARS.length) {
          const s = BRIGHT_STARS[idx];
          setHoveredObject({
            name: `${s.name} (${s.spectralType})`,
            ra: s.ra,
            dec: s.dec,
            type: 'Star',
            extra: `Visual Mag: ${s.mag.toFixed(2)} | Color: ${s.colorHex}`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // Hovering general sky sphere
      const sphereHits = raycaster.intersectObject(sphereMesh);
      if (sphereHits.length > 0) {
        const pt = sphereHits[0].point;
        const icrs = vectorToIcrs(pt);
        setHoveredObject({
          name: 'Celestial Coordinate',
          ra: icrs.ra,
          dec: icrs.dec,
          type: 'Point',
        });
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }

      setHoveredObject(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 1. Check Planet Click (slew to hovered planet)
      if (currentHoveredPlanet) {
        setCoordinates(currentHoveredPlanet.ra, currentHoveredPlanet.dec, currentHoveredPlanet.name);
        if (onCoordinateClick) onCoordinateClick(currentHoveredPlanet.ra, currentHoveredPlanet.dec);
        return;
      }

      raycaster.setFromCamera(mouse, camera);

      // Check candidate click
      const candHits = raycaster.intersectObjects(candidateMeshes.map((c) => c.mesh));
      if (candHits.length > 0) {
        const hit = candidateMeshes.find((c) => c.mesh === candHits[0].object);
        if (hit) {
          setCoordinates(hit.data.ra, hit.data.dec, `${hit.data.type} (${hit.data.id})`);
          if (onCoordinateClick) onCoordinateClick(hit.data.ra, hit.data.dec);
          return;
        }
      }

      // Check star click
      const starHits = raycaster.intersectObject(starPoints);
      if (starHits.length > 0 && starHits[0].index !== undefined) {
        const idx = starHits[0].index;
        if (idx < BRIGHT_STARS.length) {
          const s = BRIGHT_STARS[idx];
          setCoordinates(s.ra, s.dec, s.name);
          if (onCoordinateClick) onCoordinateClick(s.ra, s.dec);
          return;
        }
      }

      // Check sky sphere click
      const sphereHits = raycaster.intersectObject(sphereMesh);
      if (sphereHits.length > 0) {
        const pt = sphereHits[0].point;
        const icrs = vectorToIcrs(pt);
        setCoordinates(icrs.ra, icrs.dec);
        if (onCoordinateClick) onCoordinateClick(icrs.ra, icrs.dec);
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // --- 10. Animation & Render Loop ---
    let reqId: number;
    let lastTime = performance.now();
    let transitionFrames = 0;
    let lastViewMode = storeValuesRef.current.viewMode;
    let lastTargetRa = -999;
    let lastTargetDec = -999;
    let lastTargetName: string | null = null;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const elapsed = now * 0.001;

      // Detect View Mode Changes
      if (storeValuesRef.current.viewMode !== lastViewMode) {
        lastViewMode = storeValuesRef.current.viewMode;
        transitionFrames = 45;
      }

      // Update OrbitControls
      controls.autoRotate = storeValuesRef.current.autoRotate;
      controls.update();

      // Visibility toggles from store
      const isSpacecraftMode = storeValuesRef.current.viewMode === 'spacecraft';
      spacecraftGroup.visible = isSpacecraftMode;
      spacecraftGroup.position.set(0, 0, 0);
      gridGroup.visible = storeValuesRef.current.showEquatorialGrid;
      eclipticGroup.visible = storeValuesRef.current.showEclipticGrid;
      galacticGroup.visible = storeValuesRef.current.showGalacticPlane;
      orreryGroup.visible = storeValuesRef.current.showOrrery && !isSpacecraftMode;
      earthOrbitGroup.visible = isSpacecraftMode;
      scanGroup.visible = storeValuesRef.current.showScanPath;

      if (isSpacecraftMode) {
        earthMesh.rotation.y = elapsed * 0.012;
        atmoCloudsMesh.rotation.y = elapsed * 0.016;
      }

      // Rotate Sun and solar corona
      sunMesh.rotation.y = elapsed * 0.03;
      innerCorona.material.rotation = elapsed * 0.012;
      outerCorona.material.rotation = -elapsed * 0.008;

      // Rotate SPHEREx scan ring
      if (storeValuesRef.current.showScanPath) {
        scanGroup.rotation.y = elapsed * 0.08;
      }

      // Update Planetary, Lunar, Asteroid & Cometary orbits via Kepler solver
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
          if (clouds) {
            clouds.rotation.y = elapsed * 0.48;
          }
          if (orbit.name === 'Earth') {
            earthPos = pos.clone();
          }
        });

        // Update Earth's Moon
        const moonOrbitAngle = ((jd - 2451545.0) * (360.0 / 27.32166)) * (Math.PI / 180);
        moonMesh.position.set(
          earthPos.x + Math.cos(moonOrbitAngle) * 1.85,
          earthPos.y + Math.sin(moonOrbitAngle) * 1.85 * 0.089, // 5.14 deg lunar inclination
          earthPos.z + Math.sin(moonOrbitAngle) * 1.85 * 0.996
        );
        moonMesh.rotation.y = moonOrbitAngle; // synchronous tidal locking
        moonOrbitLine.position.copy(earthPos);

        // Rotate Asteroid Belt
        asteroidBeltPoints.rotation.y = elapsed * 0.015;

        // Update Comets with Dynamic 3D Anti-Solar Tails
        cometMeshes.forEach(({ nucleus, coma, ionTail, dustTail, orbit }) => {
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
          nucleus.position.copy(pos);
          coma.position.copy(pos);

          // Solar distance and anti-solar direction (away from Sun at 0,0,0)
          const rSun = pos.length();
          const antiSolar = pos.clone().normalize();

          // Tail length scales dramatically as comet approaches perihelion (1/r scaling)
          const tailLen = Math.max(6.0, Math.min(26.0, 160.0 / rSun));
          const tailWidth = 0.25 + (20.0 / rSun) * 0.45;

          // Ion Tail: Straight plasma beam pointing strictly away from Sun
          ionTail.position.copy(pos);
          const defaultUp = new THREE.Vector3(0, 1, 0);
          ionTail.quaternion.setFromUnitVectors(defaultUp, antiSolar);
          ionTail.scale.set(tailWidth, tailLen, tailWidth);

          // Dust Tail: Warm golden tail slightly lagging behind orbit track
          const dustDir = antiSolar.clone().add(new THREE.Vector3(-antiSolar.z * 0.25, 0, antiSolar.x * 0.25)).normalize();
          dustTail.position.copy(pos);
          dustTail.quaternion.setFromUnitVectors(defaultUp, dustDir);
          dustTail.scale.set(tailWidth * 1.5, tailLen * 0.75, tailWidth * 1.5);
        });
      }

      // Update Selected Reticle Position
      const targetPos = icrsToUnitVector(
        storeValuesRef.current.ra,
        storeValuesRef.current.dec,
        sphereRadius * 0.985
      );
      targetGroup.position.copy(targetPos);
      targetGroup.quaternion.copy(camera.quaternion);
      targetGroup.visible = !isSpacecraftMode;

      // Planet X sky marker
      const pxm = storeValuesRef.current.planetXMarker;
      planetXGroup.visible = !!pxm;
      if (pxm) {
        planetXGroup.position.copy(icrsToUnitVector(pxm.ra, pxm.dec, sphereRadius * 0.985));
        planetXGroup.lookAt(new THREE.Vector3(0, 0, 0));
      }

      // 8.8 Animate 3D Planet Hover Reticle & Holographic Badge
      if (currentHoveredPlanet && planetHoverGroup.visible && !isSpacecraftMode) {
        planetHoverGroup.position.copy(currentHoveredPlanet.worldPos);
        planetHoverGroup.quaternion.copy(camera.quaternion);
        const distToCam = camera.position.distanceTo(currentHoveredPlanet.worldPos);
        const hoverScale = Math.max(0.6, distToCam / 70.0);
        const breath = 1.0 + 0.05 * Math.sin(elapsed * 6.0);
        planetHoverGroup.scale.setScalar(hoverScale * breath);
      } else {
        planetHoverGroup.visible = false;
      }

      // Planet X 3D Orbit Line update
      const pxPath = storeValuesRef.current.planetXOrbitPath;
      if (pxPath && pxPath.length > 0 && storeValuesRef.current.showOrrery && !isSpacecraftMode) {
        planetXOrbitLine.visible = true;
        // Same compressed scale as the planets (outside Neptune), same ecliptic plane (group is tilted)
        const pts = pxPath.map(([x, y, z]) => eclipticToOrrery(x, y, z));
        planetXOrbitLine.geometry.setFromPoints(pts);
        const pxs = storeValuesRef.current.planetXScene;
        planetXBody.visible = !!pxs;
        planetXLabel.visible = !!pxs;
        if (pxs) {
          const bp = eclipticToOrrery(pxs.pos[0], pxs.pos[1], pxs.pos[2]);
          planetXBody.position.copy(bp);
          planetXLabel.position.copy(bp).add(new THREE.Vector3(3.2, 2.2, 0));
        }
        if (!pxHadPath) { pxHadPath = true; pxFrameFrames = 100; } // zoom out once so the whole orbit is in view
      } else {
        planetXOrbitLine.visible = false;
        planetXBody.visible = false;
        planetXLabel.visible = false;
        pxHadPath = false;
      }
      if (pxFrameFrames > 0 && !isSpacecraftMode) {
        camera.position.lerp(new THREE.Vector3(0, 90, 270), 0.06);
        pxFrameFrames--;
      }

      // --- Spacecraft Slew: Smoothly rotate SPHEREx along +Y aperture to point at target RA/Dec ---
      const targetDir = icrsToUnitVector(
        storeValuesRef.current.ra,
        storeValuesRef.current.dec,
        1.0
      ).normalize();
      const modelAperture = new THREE.Vector3(0, 1, 0); // SPHEREx conical aperture points along +Y
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(modelAperture, targetDir);
      spacecraftGroup.quaternion.slerp(targetQuat, 0.06);

      // Toggles for Boresight, Frustum, 3D Image, and Sun Exclusion Cone
      boresightRay.visible = storeValuesRef.current.showBoresight;
      emitMesh.visible = storeValuesRef.current.showBoresight;
      sunExclusionCone.visible = storeValuesRef.current.showSunExclusion;
      observationFrustumGroup.visible = storeValuesRef.current.showObservationVolume;
      telescopeImageReliefGroup.visible = storeValuesRef.current.show3DImageRelief;

      // Wavefront Pulse traveling down observation frustum
      const pulseT = (elapsed * 0.35) % 1.0;
      const pulseY = THREE.MathUtils.lerp(yEnd, yStart, pulseT);
      const pulseFrac = (pulseY - yStart) / (yEnd - yStart);
      const pW = THREE.MathUtils.lerp(hwBase, hwEnd, pulseFrac);
      const pZ = THREE.MathUtils.lerp(hzBase, hzEnd, pulseFrac);
      const pulsePts = [
        new THREE.Vector3(pW, pulseY, pZ),
        new THREE.Vector3(-pW, pulseY, pZ),
        new THREE.Vector3(-pW, pulseY, -pZ),
        new THREE.Vector3(pW, pulseY, -pZ),
      ];
      pulseRingGeo.setFromPoints(pulsePts);

      // Smooth Teardown Exploded View Animation
      const targetTeardown = storeValuesRef.current.showTeardown ? 1.0 : 0.0;
      teardownFactor = THREE.MathUtils.lerp(teardownFactor, targetTeardown, 0.06);
      teardownGroup.visible = teardownFactor > 0.01;
      if (teardownGroup.visible) {
        primaryMirror.position.y = 0.45 - teardownFactor * 0.35;
        secMirror.position.y = 0.95 + teardownFactor * 0.45;
        struts.position.y = teardownFactor * 0.45;
        dichroic.position.y = 0.25 - teardownFactor * 0.15;
        fpaMeshes.forEach((fpa, idx) => {
          const ang = (idx / 6) * Math.PI * 2;
          const r = 0.28 + teardownFactor * 0.35;
          fpa.position.set(Math.cos(ang) * r, 0.12 - teardownFactor * 0.2, Math.sin(ang) * r);
        });
      }

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

      // Animate Solar System Scope Precision Target Selector
      segmentedRing.rotation.z = -elapsed * 0.45;
      const breath = 1.0 + Math.sin(elapsed * 2.4) * 0.04;
      cornerBrackets.scale.set(breath, breath, 1);
      outerRing.scale.set(breath, breath, 1);
      crosshairTicks.scale.set(breath, breath, 1);

      // Expanding Radar Pulse Ring
      const pingT = (elapsed * 0.75) % 1.0;
      radarPing.scale.set(1.0 + pingT * 3.5, 1.0 + pingT * 3.5, 1);
      radarPingMat.opacity = Math.max(0, (1.0 - pingT) * 0.7);

      // Dynamically update floating target HUD badge when coordinates or preset change
      const curRa = storeValuesRef.current.ra;
      const curDec = storeValuesRef.current.dec;
      const curName = storeValuesRef.current.activePresetName;
      if (curRa !== lastTargetRa || curDec !== lastTargetDec || curName !== lastTargetName) {
        lastTargetRa = curRa;
        lastTargetDec = curDec;
        lastTargetName = curName;
        updateTargetBadgeCanvas(
          badgeCanvas,
          curName || 'Target Field',
          `RA: ${curRa.toFixed(2)}° | DEC: ${curDec.toFixed(2)}°`
        );
        badgeTexture.needsUpdate = true;
      }

      // Pulse sample candidates
      candidateMeshes.forEach(({ mesh }, idx) => {
        const cScale = 1.0 + Math.sin(elapsed * 3.5 + idx) * 0.15;
        mesh.scale.set(cScale, cScale, 1);
      });

      renderer.render(scene, camera);
    };

    reqId = requestAnimationFrame(animate);

    // --- 11. Responsive Resize ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 12. Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(reqId);

      sphereGeo.dispose();
      sphereMat.dispose();
      mwGeo.dispose();
      mwMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      eqGeo.dispose();
      eqMat.dispose();
      ecGeo.dispose();
      ecMat.dispose();
      galGeo.dispose();
      galMat.dispose();
      scanGeo.dispose();
      scanMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      bracketGeo.dispose();
      bracketMat.dispose();
      segRingGeo.dispose();
      segRingMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      tickGeo.dispose();
      tickMat.dispose();
      centerCoreGeo.dispose();
      centerCoreMat.dispose();
      radarPingGeo.dispose();
      radarPingMat.dispose();
      badgeTexture.dispose();
      badgeMat.dispose();
      rayGeo.dispose();
      rayMat.dispose();
      emitGeo.dispose();
      emitMat.dispose();
      coneGeo.dispose();
      coneMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      moonOrbitGeo.dispose();
      moonOrbitMat.dispose();
      asteroidBeltGeo.dispose();
      asteroidBeltMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className || ''}`}
      style={{
        background: 'radial-gradient(ellipse at center, #0a1128 0%, #060810 75%, #030408 100%)',
      }}
    />
  );
}