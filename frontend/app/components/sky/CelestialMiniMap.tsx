'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { icrsToUnitVector, unitVectorToICRS } from '../../lib/astrometry';
import { Maximize2, Minimize2, Compass, Radio } from 'lucide-react';

interface CelestialMiniMapProps {
  ra: number;
  dec: number;
  onSlew?: (ra: number, dec: number) => void;
  className?: string;
}

export default function CelestialMiniMap({
  ra,
  dec,
  onSlew,
  className = '',
}: CelestialMiniMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const reticleGroupRef = useRef<THREE.Group | null>(null);
  const sphereGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Target rotation for smooth camera/sphere lerping
  const targetQuaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  // 1. Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 0, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Root rotating group
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    sphereGroupRef.current = sphereGroup;

    // A. Celestial Sphere Shell (translucent wireframe & backface)
    const shellGeo = new THREE.SphereGeometry(6.0, 32, 24);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x091428,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    sphereGroup.add(shell);

    const wireGeo = new THREE.WireframeGeometry(shellGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x1e3a5f,
      transparent: true,
      opacity: 0.25,
    });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    sphereGroup.add(wire);

    // B. Celestial Equator Ring (Dec = 0, Cyan)
    const eqCurve = new THREE.EllipseCurve(0, 0, 6.02, 6.02, 0, 2 * Math.PI, false, 0);
    const eqPoints = eqCurve.getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const eqGeo = new THREE.BufferGeometry().setFromPoints(eqPoints);
    const eqMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 });
    const eqLine = new THREE.Line(eqGeo, eqMat);
    sphereGroup.add(eqLine);

    // C. Ecliptic Plane Ring (Obliquity = 23.44°, Gold)
    const ecPoints = eqCurve.getPoints(96).map((p) => {
      const v = new THREE.Vector3(p.x, 0, p.y);
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(23.439));
      return v;
    });
    const ecGeo = new THREE.BufferGeometry().setFromPoints(ecPoints);
    const ecMat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.7 });
    const ecLine = new THREE.Line(ecGeo, ecMat);
    sphereGroup.add(ecLine);

    // D. Galactic Plane Ring (Purple)
    const gpPoints = eqCurve.getPoints(96).map((p) => {
      const v = new THREE.Vector3(p.x, 0, p.y);
      v.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(62.87));
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(60.19));
      return v;
    });
    const gpGeo = new THREE.BufferGeometry().setFromPoints(gpPoints);
    const gpMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    const gpLine = new THREE.Line(gpGeo, gpMat);
    sphereGroup.add(gpLine);

    // E. Background Navigation Stars (Hipparcos benchmarks)
    const starCount = 360;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 5.95;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const bright = 0.4 + Math.random() * 0.6;
      starColors[i * 3] = bright * 0.8;
      starColors[i * 3 + 1] = bright * 0.9;
      starColors[i * 3 + 2] = bright;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    sphereGroup.add(stars);

    // F. Active Telescope Boresight Reticle (Stationary facing camera at +Z)
    const reticleGroup = new THREE.Group();
    reticleGroupRef.current = reticleGroup;
    scene.add(reticleGroup);

    // Outer Target Crosshair Circle
    const reticleCurve = new THREE.EllipseCurve(0, 0, 0.65, 0.65, 0, 2 * Math.PI, false, 0);
    const reticlePoints = reticleCurve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, 6.05));
    const reticleGeo = new THREE.BufferGeometry().setFromPoints(reticlePoints);
    const reticleMat = new THREE.LineBasicMaterial({ color: 0x00e5ff });
    const reticleLine = new THREE.Line(reticleGeo, reticleMat);
    reticleGroup.add(reticleLine);

    // Crosshair ticks
    const tickMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const tickPoints = [
      new THREE.Vector3(-0.9, 0, 6.05),
      new THREE.Vector3(-0.4, 0, 6.05),
      new THREE.Vector3(0.4, 0, 6.05),
      new THREE.Vector3(0.9, 0, 6.05),
      new THREE.Vector3(0, -0.9, 6.05),
      new THREE.Vector3(0, -0.4, 6.05),
      new THREE.Vector3(0, 0.4, 6.05),
      new THREE.Vector3(0, 0.9, 6.05),
    ];
    const ticksGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
    const ticks = new THREE.LineSegments(ticksGeo, tickMat);
    reticleGroup.add(ticks);

    // Center Pulsing Dot
    const dotGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.position.set(0, 0, 6.05);
    reticleGroup.add(dotMesh);

    // 2. Render Animation Loop
    let time = 0;
    const animate = () => {
      time += 0.02;
      animFrameRef.current = requestAnimationFrame(animate);

      // Smoothly slerp sphere towards target orientation
      if (sphereGroupRef.current) {
        sphereGroupRef.current.quaternion.slerp(targetQuaternionRef.current, 0.08);
      }

      // Reticle pulse
      const scale = 1.0 + Math.sin(time * 3.0) * 0.08;
      reticleGroup.scale.set(scale, scale, 1.0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 3. Update rotation target whenever RA/Dec changes
  useEffect(() => {
    // Vector pointing to current RA and Dec
    const unitVec = icrsToUnitVector(ra, dec, 1.0);

    // We want this vector on the sphere to align with +Z (facing camera: 0, 0, 1)
    const targetDir = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(unitVec, targetDir);
    targetQuaternionRef.current.copy(q);
  }, [ra, dec]);

  // 4. Handle Click-to-Slew on the Mini-Map
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sphereGroupRef.current || !onSlew) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // Raycast against the sphere shell
    const shell = sphereGroupRef.current.children[0] as THREE.Mesh;
    if (!shell) return;

    const intersects = raycaster.intersectObject(shell, false);
    if (intersects.length > 0) {
      const hitWorld = intersects[0].point;
      // Convert world point to local sphere coordinates
      const hitLocal = hitWorld.clone();
      sphereGroupRef.current.worldToLocal(hitLocal);
      hitLocal.normalize();

      const { raDeg, decDeg } = unitVectorToICRS(hitLocal);
      onSlew(raDeg, decDeg);
    }
  };

  const dims = isExpanded ? 'w-80 h-80' : 'w-56 h-56';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[rgba(6,8,16,0.85)] backdrop-blur-xl shadow-2xl transition-all duration-300 ${dims} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        title="3D Celestial Mini-Map: Click anywhere to slew the 2D telescope view"
      />

      {/* Header Overlay */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none select-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(6,8,16,0.7)] border border-[rgba(255,255,255,0.1)] text-[10px] font-mono text-[var(--accent-cyan)]">
          <Compass className="w-3 h-3 text-[var(--accent-cyan)] animate-spin-slow" />
          <span>CELESTIAL RADAR</span>
        </div>

        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="pointer-events-auto p-1 rounded-md bg-[rgba(6,8,16,0.7)] border border-[rgba(255,255,255,0.1)] text-slate-400 hover:text-white transition-colors"
          title={isExpanded ? 'Collapse Mini-Map' : 'Expand Mini-Map'}
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Coordinate & Reference Legend Footer */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none text-[9px] font-mono select-none">
        <div className="flex flex-col text-slate-300">
          <span>RA {ra.toFixed(2)}°</span>
          <span>DEC {dec >= 0 ? `+${dec.toFixed(2)}` : dec.toFixed(2)}°</span>
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="flex items-center gap-1 text-[#00E5FF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" /> EQ
          </span>
          <span className="flex items-center gap-1 text-[#FFD166]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166]" /> ECL
          </span>
          <span className="flex items-center gap-1 text-[#A855F7]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" /> GAL
          </span>
        </div>
      </div>
    </div>
  );
}
