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
  keplerToCartesian,
  getJulianDate,
} from '../../lib/astrometry';

interface CelestialSphereProps {
  onCoordinateClick?: (ra: number, dec: number) => void;
  className?: string;
}

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
    gradient.addColorStop(0.80, 'rgba(255, 50, 5, 0.06)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
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
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    setCoordinates,
    setHoveredObject,
    planetXMarker,
  } = useSkyStore();

  const storeValuesRef = useRef({
    ra,
    dec,
    viewMode,
    showSunExclusion,
    showBoresight,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    planetXMarker,
  });

  useEffect(() => {
    storeValuesRef.current = {
      ra,
      dec,
      viewMode,
      showSunExclusion,
      showBoresight,
      showEquatorialGrid,
      showEclipticGrid,
      showGalacticPlane,
      showOrrery,
      showScanPath,
      autoRotate,
      planetXMarker,
    };
  }, [
    ra,
    dec,
    viewMode,
    showSunExclusion,
    showBoresight,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    planetXMarker,
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

    // 85° Solar Exclusion Cone (Cryogenic Thermal Avoidance Frustum)
    // Points toward directional sunlight vector, truncated at r=20 to completely avoid intersecting the spacecraft!
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
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/spherex/spherex.gltf',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(2.4, 2.4, 2.4);
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.material) {
              const mat = m.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.32;
              mat.metalness = 0.78;
            }
          }
        });
        spacecraftGroup.add(model);
      },
      undefined,
      (err) => console.warn('NASA SPHEREx GLTF model load error:', err)
    );

    // --- 3. Milky Way Great Circle Dust Band ---
    const mwCount = 9000;
    const mwPositions = new Float32Array(mwCount * 3);
    const mwColors = new Float32Array(mwCount * 3);

    // Galactic Pole constants
    const alphaG = (192.85948 * Math.PI) / 180;
    const deltaG = (27.12825 * Math.PI) / 180;
    const ngp = new THREE.Vector3(
      Math.cos(deltaG) * Math.cos(alphaG),
      Math.sin(deltaG),
      Math.cos(deltaG) * Math.sin(alphaG)
    );

    // Any vector orthogonal to NGP
    const gU = new THREE.Vector3(0, 1, 0).cross(ngp).normalize();
    const gV = ngp.clone().cross(gU).normalize();

    for (let i = 0; i < mwCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Gaussian scatter around galactic latitude
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

      // Color palette: soft violet, cyan-blue, and cosmic gold
      const t = Math.random();
      if (t < 0.4) {
        mwColors[i * 3] = 0.45;
        mwColors[i * 3 + 1] = 0.55;
        mwColors[i * 3 + 2] = 0.95; // Blue
      } else if (t < 0.75) {
        mwColors[i * 3] = 0.75;
        mwColors[i * 3 + 1] = 0.45;
        mwColors[i * 3 + 2] = 0.9; // Purple
      } else {
        mwColors[i * 3] = 0.95;
        mwColors[i * 3 + 1] = 0.75;
        mwColors[i * 3 + 2] = 0.45; // Amber
      }
    }

    const mwGeo = new THREE.BufferGeometry();
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));
    const mwMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const mwPoints = new THREE.Points(mwGeo, mwMat);
    scene.add(mwPoints);

    // --- 4. Real Star Field (Bright Stars + Background Catalog) ---
    const bgStarCount = 2000;
    const totalStarCount = BRIGHT_STARS.length + bgStarCount;
    const starPositions = new Float32Array(totalStarCount * 3);
    const starColors = new Float32Array(totalStarCount * 3);
    const starSizes = new Float32Array(totalStarCount);

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

      // Brightness scaling from apparent magnitude
      const magScale = Math.max(1.8, (3.5 - star.mag) * 0.8);
      starSizes[idx] = magScale;
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
      starSizes[idx] = 0.5 + Math.random() * 0.7;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

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

    // 5b. Dec parallels (+-30°, +-60°)
    [-60, -30, 30, 60].forEach((decDeg) => {
      const dPts: THREE.Vector3[] = [];
      const decRad = (decDeg * Math.PI) / 180;
      const rDec = sphereRadius * 0.99 * Math.cos(decRad);
      const yDec = sphereRadius * 0.99 * Math.sin(decRad);
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        dPts.push(new THREE.Vector3(rDec * Math.cos(a), yDec, rDec * Math.sin(a)));
      }
      const dGeo = new THREE.BufferGeometry().setFromPoints(dPts);
      const dMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.12,
      });
      gridGroup.add(new THREE.Line(dGeo, dMat));
    });

    // 5c. RA meridians (every 2 hours = 30°)
    for (let h = 0; h < 24; h += 2) {
      const mPts: THREE.Vector3[] = [];
      const raDeg = h * 15;
      for (let d = -80; d <= 80; d += 2) {
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

    // 5d. Ecliptic Plane (Gold great circle, inclined 23.44°)
    const eclipticGroup = new THREE.Group();
    scene.add(eclipticGroup);
    const ecPts: THREE.Vector3[] = [];
    const epsRad = (23.4392911 * Math.PI) / 180;
    for (let i = 0; i <= 180; i++) {
      const l = (i / 180) * Math.PI * 2;
      const x = sphereRadius * 0.988 * Math.cos(l);
      const y = sphereRadius * 0.988 * Math.sin(l) * Math.sin(epsRad);
      const z = sphereRadius * 0.988 * Math.sin(l) * Math.cos(epsRad);
      ecPts.push(new THREE.Vector3(x, y, z));
    }
    const ecGeo = new THREE.BufferGeometry().setFromPoints(ecPts);
    const ecMat = new THREE.LineBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.35,
    });
    eclipticGroup.add(new THREE.Line(ecGeo, ecMat));

    // 5e. Galactic Plane (Purple great circle, b = 0)
    const galacticGroup = new THREE.Group();
    scene.add(galacticGroup);
    const galPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const pt = gU
        .clone()
        .multiplyScalar(Math.cos(a))
        .add(gV.clone().multiplyScalar(Math.sin(a)))
        .normalize()
        .multiplyScalar(sphereRadius * 0.986);
      galPts.push(pt);
    }
    const galGeo = new THREE.BufferGeometry().setFromPoints(galPts);
    const galMat = new THREE.LineBasicMaterial({
      color: 0x9d4edd,
      transparent: true,
      opacity: 0.4,
    });
    galacticGroup.add(new THREE.Line(galGeo, galMat));

    // --- 6. SPHEREx Scan Path (Animated Ring) ---
    const scanGroup = new THREE.Group();
    scene.add(scanGroup);
    const scanRadius = sphereRadius * 0.982;
    const scanPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      scanPts.push(new THREE.Vector3(scanRadius * Math.cos(a), 0, scanRadius * Math.sin(a)));
    }
    const scanGeo = new THREE.BufferGeometry().setFromPoints(scanPts);
    const scanMat = new THREE.LineBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.65,
      linewidth: 2,
    });
    const scanRing = new THREE.Line(scanGeo, scanMat);
    // Align scan ring with SPHEREx sun-synchronous orbit
    scanRing.rotation.x = Math.PI / 2.2;
    scanGroup.add(scanRing);

    // --- 7. Solar System Orrery (Kepler Orbits & Solar System Scope Photorealistic Planets) ---
    const orreryGroup = new THREE.Group();
    scene.add(orreryGroup);

    // Central Photorealistic Sun with Luminous Dynamic Corona
    const sunGeo = new THREE.SphereGeometry(2.0, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: planetTextures.Sun,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    orreryGroup.add(sunMesh);

    // Corona flare sprites
    const coronaTex = createSunCoronaTexture();
    const innerCoronaMat = new THREE.SpriteMaterial({
      map: coronaTex,
      color: 0xfff6cf,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    const innerCorona = new THREE.Sprite(innerCoronaMat);
    innerCorona.scale.set(7.5, 7.5, 1.0);
    sunMesh.add(innerCorona);

    const outerCoronaMat = new THREE.SpriteMaterial({
      map: coronaTex,
      color: 0xff9922,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.45,
    });
    const outerCorona = new THREE.Sprite(outerCoronaMat);
    outerCorona.scale.set(19.0, 19.0, 1.0);
    sunMesh.add(outerCorona);

    // Central PointLight casting authentic solar illumination onto planetary bodies
    const sunLight = new THREE.PointLight(0xfff6e5, 3.8, 500, 0.4);
    sunLight.position.set(0, 0, 0);
    orreryGroup.add(sunLight);

    const ORRERY_SCALE = 4.8;

    // Planetary orbit lines and realistic textured planet meshes
    interface PlanetMeshEntry {
      mesh: THREE.Mesh;
      orbit: (typeof PLANET_ORBITS)[0];
      clouds?: THREE.Mesh;
      rings?: THREE.Mesh;
    }
    const planetMeshes: PlanetMeshEntry[] = [];

    PLANET_ORBITS.forEach((orbit) => {
      const pts: THREE.Vector3[] = [];
      for (let m = 0; m <= 360; m += 3) {
        pts.push(
          keplerToCartesian(orbit.a, orbit.e, orbit.i, orbit.omega, orbit.Omega, m, ORRERY_SCALE)
        );
      }
      const oGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const oMat = new THREE.LineBasicMaterial({
        color: orbit.color,
        transparent: true,
        opacity: 0.28,
      });
      orreryGroup.add(new THREE.Line(oGeo, oMat));

      const pGeo = new THREE.SphereGeometry(orbit.size * 0.65, 32, 32);
      const tex = planetTextures[orbit.name] || planetTextures.Mercury;
      const pMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: orbit.name === 'Earth' ? 0.6 : 0.75,
        metalness: 0.05,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      orreryGroup.add(pMesh);

      let pClouds: THREE.Mesh | undefined;
      let pRings: THREE.Mesh | undefined;

      // Realistic Earth clouds in Orrery
      if (orbit.name === 'Earth') {
        const cGeo = new THREE.SphereGeometry(orbit.size * 0.665, 32, 32);
        const cMat = new THREE.MeshStandardMaterial({
          map: earthCloudsTexture,
          transparent: true,
          opacity: 0.75,
          blending: THREE.NormalBlending,
        });
        pClouds = new THREE.Mesh(cGeo, cMat);
        pMesh.add(pClouds);
      }

      // Realistic 3D Saturn Rings with custom radial UV projection
      if (orbit.name === 'Saturn') {
        const ringInner = orbit.size * 0.85;
        const ringOuter = orbit.size * 1.95;
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

    // --- 8. Selected Target Reticle & Candidate Markers ---
    const targetGroup = new THREE.Group();
    scene.add(targetGroup);

    // Concentric reticle rings
    const ring1Geo = new THREE.RingGeometry(1.4, 1.8, 32);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);

    const ring2Geo = new THREE.RingGeometry(2.4, 2.7, 32);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);

    targetGroup.add(ring1);
    targetGroup.add(ring2);

    // Hypothetical Planet X marker (magenta), placed at its sky direction for the selected date
    const planetXGroup = new THREE.Group();
    planetXGroup.visible = false;
    scene.add(planetXGroup);
    const pxMat = new THREE.MeshBasicMaterial({ color: 0xff3df2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    planetXGroup.add(new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32), pxMat));
    planetXGroup.add(new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), pxMat));

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

    // --- 9. Raycasting Interaction ---
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 1.5 };
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Planet hover: name, time and orbital speed (screen-space pick, planets are tiny)
      if (storeValuesRef.current.showOrrery) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        let best: { d: number; mesh: THREE.Mesh; orbit: (typeof PLANET_ORBITS)[0] } | null = null;
        planetMeshes.forEach(({ mesh, orbit }) => {
          const ndc = mesh.position.clone().project(camera);
          if (ndc.z > 1) return; // behind camera
          const sx = ((ndc.x + 1) / 2) * rect.width;
          const sy = ((1 - ndc.y) / 2) * rect.height;
          const d = Math.hypot(sx - px, sy - py);
          if (d < 18 && (!best || d < best.d)) best = { d, mesh, orbit };
        });
        if (best) {
          const { mesh, orbit } = best as { d: number; mesh: THREE.Mesh; orbit: (typeof PLANET_ORBITS)[0] };
          const rAu = mesh.position.length() / ORRERY_SCALE;
          // vis-viva: v = 29.7847 km/s * sqrt(2/r - 1/a)  (1 AU circular speed)
          const vKms = 29.7847 * Math.sqrt(Math.max(0, 2 / rAu - 1 / orbit.a));
          const when = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
          const dir = vectorToIcrs(mesh.position.clone().normalize().multiplyScalar(sphereRadius));
          setHoveredObject({
            name: orbit.name,
            ra: dir.ra,
            dec: dir.dec,
            type: 'Planet',
            extra: `${when} | Speed: ${vKms.toFixed(2)} km/s | Sun dist: ${rAu.toFixed(3)} AU | Period: ${(orbit.periodDays / 365.25).toFixed(2)} yr`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // Check candidate hover
      const candHits = raycaster.intersectObjects(candidateMeshes.map((c) => c.mesh));
      if (candHits.length > 0) {
        const hitMesh = candHits[0].object as THREE.Mesh;
        const candData = candidateMeshes.find((c) => c.mesh === hitMesh)?.data;
        if (candData) {
          setHoveredObject({
            name: `${candData.id} (${candData.type})`,
            ra: candData.ra,
            dec: candData.dec,
            type: 'Candidate',
            extra: `Confidence: ${(candData.confidence * 100).toFixed(0)}%`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // Check bright stars hover
      const starHits = raycaster.intersectObject(starPoints);
      if (starHits.length > 0 && starHits[0].index !== undefined) {
        const starIdx = starHits[0].index;
        if (starIdx < BRIGHT_STARS.length) {
          const star = BRIGHT_STARS[starIdx];
          setHoveredObject({
            name: `${star.name} (${star.spectralType})`,
            ra: star.ra,
            dec: star.dec,
            type: 'Star',
            extra: `V-Mag: ${star.mag}`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      // Check empty sphere intersection for coordinates
      const sphereHits = raycaster.intersectObject(sphereMesh);
      if (sphereHits.length > 0) {
        const hitPt = sphereHits[0].point;
        const coords = vectorToIcrs(hitPt);
        setHoveredObject({
          name: 'Celestial Coordinate',
          ra: coords.ra,
          dec: coords.dec,
          type: 'Point',
        });
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }

      setHoveredObject(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Click on candidate
      const candHits = raycaster.intersectObjects(candidateMeshes.map((c) => c.mesh));
      if (candHits.length > 0) {
        const hitMesh = candHits[0].object as THREE.Mesh;
        const candData = candidateMeshes.find((c) => c.mesh === hitMesh)?.data;
        if (candData) {
          setCoordinates(candData.ra, candData.dec, candData.id);
          if (onCoordinateClick) onCoordinateClick(candData.ra, candData.dec);
          return;
        }
      }

      // Click on celestial sphere
      const sphereHits = raycaster.intersectObject(sphereMesh);
      if (sphereHits.length > 0) {
        const hitPt = sphereHits[0].point;
        const coords = vectorToIcrs(hitPt);
        setCoordinates(
          Math.round(coords.ra * 10000) / 10000,
          Math.round(coords.dec * 10000) / 10000
        );
        if (onCoordinateClick) {
          onCoordinateClick(coords.ra, coords.dec);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // --- 10. Resize Observer ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // --- 11. Animation Loop ---
    let animationId: number;
    let clock = new THREE.Clock();
    let lastViewMode = storeValuesRef.current.viewMode;
    let transitionFrames = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

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
      // In Spacecraft View Mode: Hide intersecting central orrery (Sun & inner orbits) so they never clip through the spacecraft!
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

      // Update Planet positions via Kepler solver
      if (storeValuesRef.current.showOrrery) {
        const jd = getJulianDate();
        planetMeshes.forEach(({ mesh, orbit, clouds }) => {
          // Mean anomaly rate (deg/day)
          const mDeg = ((jd - 2451545.0) * (360.0 / orbit.periodDays)) % 360;
          const pos = keplerToCartesian(
            orbit.a,
            orbit.e,
            orbit.i,
            orbit.omega,
            orbit.Omega,
            mDeg,
            ORRERY_SCALE
          );
          mesh.position.copy(pos);
          mesh.rotation.y = elapsed * 0.4;
          if (clouds) {
            clouds.rotation.y = elapsed * 0.48;
          }
        });
      }

      // Update Selected Reticle Position
      const targetPos = icrsToUnitVector(
        storeValuesRef.current.ra,
        storeValuesRef.current.dec,
        sphereRadius * 0.985
      );
      targetGroup.position.copy(targetPos);
      targetGroup.lookAt(new THREE.Vector3(0, 0, 0));
      targetGroup.visible = !isSpacecraftMode;

      // Planet X sky marker
      const pxm = storeValuesRef.current.planetXMarker;
      planetXGroup.visible = !!pxm;
      if (pxm) {
        planetXGroup.position.copy(icrsToUnitVector(pxm.ra, pxm.dec, sphereRadius * 0.985));
        planetXGroup.lookAt(new THREE.Vector3(0, 0, 0));
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

      // Toggles for Boresight and Sun Exclusion Zone
      boresightRay.visible = storeValuesRef.current.showBoresight;
      emitMesh.visible = storeValuesRef.current.showBoresight;
      sunExclusionCone.visible = storeValuesRef.current.showSunExclusion;

      // View Mode Transitions: Sky Survey (wide) vs Spacecraft (close-up orbiting telescope)
      if (isSpacecraftMode) {
        controls.minDistance = 2.0;
        controls.maxDistance = 35;
        if (camera.position.length() > 16) {
          camera.position.lerp(new THREE.Vector3(4.5, 3.2, 5.5), 0.06);
        }
        controls.target.lerp(new THREE.Vector3(0, 0.2, 0), 0.06);
      } else {
        controls.minDistance = 0.5; // no hard cap: can zoom right in on the Sun / planets
        controls.maxDistance = 320;
        if (transitionFrames > 0) {
          camera.position.lerp(new THREE.Vector3(0, 30, 160), 0.06);
          transitionFrames--;
        }
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
      }


      // Pulse reticle
      const scale1 = 1.0 + Math.sin(elapsed * 3) * 0.08;
      const scale2 = 1.0 + Math.cos(elapsed * 2.5) * 0.12;
      ring1.scale.set(scale1, scale1, 1);
      ring2.scale.set(scale2, scale2, 1);

      // Pulse sample candidates
      candidateMeshes.forEach(({ mesh }, idx) => {
        const cScale = 1.0 + Math.sin(elapsed * 3.5 + idx) * 0.15;
        mesh.scale.set(cScale, cScale, 1);
      });

      renderer.render(scene, camera);
    };

    animate();

    // --- 12. Cleanup on Unmount ---
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);

      controls.dispose();
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
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
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