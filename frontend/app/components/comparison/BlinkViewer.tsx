'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Candidate } from '../../types';
import { FALSE_COLOR_PRESETS, FalseColorPreset } from '../../lib/composite';
import {
  ColormapMode,
  StretchMode,
  getColormapLUT,
} from '../../lib/imageProcessing';
import {
  degreesToRaSexagesimal,
  degreesToDecSexagesimal,
} from '../../lib/benchmarkTargets';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Crosshair,
  Eye,
  Sliders,
  Palette,
} from 'lucide-react';

export type BlinkViewMode = 'blink' | 'slider' | 'difference' | 'false_color';

interface BlinkViewerProps {
  imageABase64: string;
  imageBBase64: string;
  differenceBase64?: string;
  falseColorBase64?: string;
  candidates?: Candidate[];
  selectedCandidateId?: string | null;
  onCandidateSelect?: (candidate: Candidate) => void;
  epochALabel?: string;
  epochBLabel?: string;
  centralRa?: number;
  centralDec?: number;
  plateScaleArcsec?: number;
  className?: string;
}

export default function BlinkViewer({
  imageABase64,
  imageBBase64,
  differenceBase64,
  falseColorBase64,
  candidates = [],
  selectedCandidateId = null,
  onCandidateSelect,
  epochALabel = 'Pass 1 (April 2025)',
  epochBLabel = 'Pass 2 (October 2025)',
  centralRa = 83.82,
  centralDec = -5.39,
  plateScaleArcsec = 6.2,
  className = '',
}: BlinkViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Raw HTMLImageElements
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const imgDiffRef = useRef<HTMLImageElement | null>(null);
  const imgFalseColorRef = useRef<HTMLImageElement | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  // Offscreen recolored canvases cache for high-speed colormapping
  const recoloredCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Playback & view mode
  const [viewMode, setViewMode] = useState<BlinkViewMode>('blink');
  const [isPlaying, setIsPlaying] = useState(true);
  const [blinkIntervalMs, setBlinkIntervalMs] = useState(650);
  const showingARef = useRef(true);
  const [showingAState, setShowingAState] = useState(true);
  const [loopResetFlash, setLoopResetFlash] = useState(false);

  // Astronomical Image Processing Controls
  const [colormap, setColormap] = useState<ColormapMode>('inverted_bw');
  const [stretchMode, setStretchMode] = useState<StretchMode>('asinh');
  const [showOverlays, setShowOverlays] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);

  // Split slider
  const [sliderPosition, setSliderPosition] = useState(0.5); // 0.0 - 1.0
  const isDraggingSliderRef = useRef(false);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Astrometric Cursor Tracking
  const [cursorTelemetry, setCursorTelemetry] = useState<{
    x: number;
    y: number;
    ra: number;
    dec: number;
    flux: number;
  } | null>(null);

  // Hovered Candidate
  const [hoveredCandidate, setHoveredCandidate] = useState<Candidate | null>(null);

  // 1. Preload base64 images
  useEffect(() => {
    let loadedCount = 0;
    const totalToLoad = 2 + (differenceBase64 ? 1 : 0) + (falseColorBase64 ? 1 : 0);

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
        // Clear cached recolored canvases when source images change
        recoloredCanvasesRef.current.clear();
        setImagesReady(true);
      }
    };

    const loadImg = (b64?: string) => {
      if (!b64) return null;
      const img = new Image();
      img.onload = checkLoaded;
      img.onerror = checkLoaded;
      img.src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
      return img;
    };

    imgARef.current = loadImg(imageABase64);
    imgBRef.current = loadImg(imageBBase64);
    imgDiffRef.current = loadImg(differenceBase64);
    imgFalseColorRef.current = loadImg(falseColorBase64);
  }, [imageABase64, imageBBase64, differenceBase64, falseColorBase64]);

  // Helper to obtain a colormapped image/canvas
  const getProcessedImage = useCallback(
    (sourceImg: HTMLImageElement | null, cacheKey: string, activeColormap: ColormapMode): HTMLCanvasElement | HTMLImageElement | null => {
      if (!sourceImg) return null;

      // Default inverted_bw is the raw source image
      if (activeColormap === 'inverted_bw') {
        return sourceImg;
      }

      const fullKey = `${cacheKey}_${activeColormap}`;
      if (recoloredCanvasesRef.current.has(fullKey)) {
        return recoloredCanvasesRef.current.get(fullKey)!;
      }

      // Generate offscreen recolored canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = sourceImg.naturalWidth || sourceImg.width || 512;
      offscreen.height = sourceImg.naturalHeight || sourceImg.height || 512;
      const oCtx = offscreen.getContext('2d');
      if (!oCtx) return sourceImg;

      oCtx.drawImage(sourceImg, 0, 0, offscreen.width, offscreen.height);
      const imgData = oCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      const data = imgData.data;
      const lut = getColormapLUT(activeColormap);

      for (let i = 0; i < data.length; i += 4) {
        // Invert inverted_bw back to positive intensity: 0 = sky background, 255 = bright star
        const intensity = 255 - data[i];
        data[i] = lut.r[intensity];
        data[i + 1] = lut.g[intensity];
        data[i + 2] = lut.b[intensity];
        data[i + 3] = 255;
      }

      oCtx.putImageData(imgData, 0, 0);
      recoloredCanvasesRef.current.set(fullKey, offscreen);
      return offscreen;
    },
    []
  );

  // 2. Main Canvas Draw Routine
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesReady) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.save();

    // Apply zoom & pan transformations around center
    ctx.translate(W / 2 + panOffset.x, H / 2 + panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-W / 2, -H / 2);

    // Disable image smoothing for pixel-level astronomical fidelity
    ctx.imageSmoothingEnabled = false;

    // A. Draw active image layer according to viewMode
    if (viewMode === 'blink') {
      const activeSource = showingARef.current ? imgARef.current : imgBRef.current;
      const cacheKey = showingARef.current ? 'epochA' : 'epochB';
      const activeDrawable = getProcessedImage(activeSource, cacheKey, colormap);
      if (activeDrawable) ctx.drawImage(activeDrawable, 0, 0, W, H);
    } else if (viewMode === 'slider') {
      const splitX = sliderPosition * W;
      const drawableA = getProcessedImage(imgARef.current, 'epochA', colormap);
      const drawableB = getProcessedImage(imgBRef.current, 'epochB', colormap);

      // Draw Image A on the left
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();
      if (drawableA) ctx.drawImage(drawableA, 0, 0, W, H);
      ctx.restore();

      // Draw Image B on the right
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, W - splitX, H);
      ctx.clip();
      if (drawableB) ctx.drawImage(drawableB, 0, 0, W, H);
      ctx.restore();

      // Vertical Split Line
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2 / zoomLevel;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Divider Handle Circle
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(splitX, H / 2, 14 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#060810';
      ctx.font = `bold ${11 / zoomLevel}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↔', splitX, H / 2);
    } else if (viewMode === 'difference') {
      // In difference mode, default to cool_warm if colormap is still inverted_bw
      const diffColormap = colormap === 'inverted_bw' ? 'cool_warm' : colormap;
      const diffDrawable = getProcessedImage(imgDiffRef.current || imgBRef.current, 'diff', diffColormap);
      if (diffDrawable) ctx.drawImage(diffDrawable, 0, 0, W, H);
    } else if (viewMode === 'false_color') {
      const fcDrawable = imgFalseColorRef.current || getProcessedImage(imgARef.current, 'epochA', 'viridis');
      if (fcDrawable) ctx.drawImage(fcDrawable, 0, 0, W, H);
    }

    // B. Draw Candidate Overlays & Hop Vectors
    if (showOverlays && candidates && candidates.length > 0) {
      candidates.forEach((cand) => {
        const scaleX = W / 100;
        const scaleY = H / 100;
        const px = cand.pixel_x * scaleX;
        const py = cand.pixel_y * scaleY;

        const isSelected = cand.id === selectedCandidateId;
        const isHovered = cand.id === hoveredCandidate?.id;
        const isHighConf = cand.confidence_score >= 0.7;

        const baseRadius = (16 + cand.confidence_score * 10) / zoomLevel;
        const ringColor = isSelected ? '#00E5FF' : isHighConf ? '#06D6A0' : '#FFD166';

        // Outer Selection Glow
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(px, py, baseRadius + 8 / zoomLevel, 0, Math.PI * 2);
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 2.5 / zoomLevel;
          ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Candidate Target Ring
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5 / zoomLevel;
        ctx.stroke();

        // Crosshair Ticks
        const tick = 6 / zoomLevel;
        ctx.beginPath();
        ctx.moveTo(px - baseRadius - tick, py);
        ctx.lineTo(px - baseRadius + 2 / zoomLevel, py);
        ctx.moveTo(px + baseRadius - 2 / zoomLevel, py);
        ctx.lineTo(px + baseRadius + tick, py);
        ctx.moveTo(px, py - baseRadius - tick);
        ctx.lineTo(px, py - baseRadius + 2 / zoomLevel);
        ctx.moveTo(px, py + baseRadius - 2 / zoomLevel);
        ctx.lineTo(px, py + baseRadius + tick);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2 / zoomLevel;
        ctx.stroke();

        // Astrometric Proper Motion Hop Vector Arrow (if target hops)
        if (cand.proper_motion_mas_yr && cand.proper_motion_mas_yr > 50) {
          // Calculate hop arrow vector scaled to canvas size
          const arrowLen = Math.max(28, (cand.proper_motion_mas_yr / 1000.0) * 8.0) * (W / 1024) / zoomLevel;
          const arrowDx = arrowLen * 0.85;
          const arrowDy = -arrowLen * 0.52;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + arrowDx, py + arrowDy);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 2.5 / zoomLevel;
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(arrowDy, arrowDx);
          ctx.beginPath();
          ctx.moveTo(px + arrowDx, py + arrowDy);
          ctx.lineTo(
            px + arrowDx - (8 / zoomLevel) * Math.cos(angle - Math.PI / 6),
            py + arrowDy - (8 / zoomLevel) * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            px + arrowDx - (8 / zoomLevel) * Math.cos(angle + Math.PI / 6),
            py + arrowDy - (8 / zoomLevel) * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = '#FFD166';
          ctx.fill();
        }

        // SNR Delta Label
        ctx.fillStyle = ringColor;
        ctx.font = `bold ${11 / zoomLevel}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `ΔSNR +${cand.snr_change.toFixed(1)}`,
          px + baseRadius + 6 / zoomLevel,
          py - 4 / zoomLevel
        );

        // Classification Tag
        ctx.fillStyle = 'rgba(240, 244, 255, 0.9)';
        ctx.font = `${9 / zoomLevel}px monospace`;
        ctx.fillText(
          cand.classification.split(' ')[0],
          px + baseRadius + 6 / zoomLevel,
          py + 10 / zoomLevel
        );
      });
    }

    // C. Central Crosshair (Telescope Boresight)
    if (showCrosshair) {
      const cx = W / 2;
      const cy = H / 2;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.5 / zoomLevel;
      ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]);

      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    imagesReady,
    viewMode,
    sliderPosition,
    zoomLevel,
    panOffset,
    candidates,
    selectedCandidateId,
    hoveredCandidate,
    showOverlays,
    showCrosshair,
    colormap,
    getProcessedImage,
  ]);

  // 3. Cadence Blink Loop with Loop-Reset Flash
  useEffect(() => {
    if (viewMode !== 'blink' || !isPlaying) return;

    const interval = setInterval(() => {
      showingARef.current = !showingARef.current;
      setShowingAState(showingARef.current);

      // Flash loop reset indicator when returning to Epoch A
      if (showingARef.current) {
        setLoopResetFlash(true);
        setTimeout(() => setLoopResetFlash(false), 140);
      }

      drawCanvas();
    }, blinkIntervalMs);

    return () => clearInterval(interval);
  }, [viewMode, isPlaying, blinkIntervalMs, drawCanvas]);

  // Redraw when ready or state changed
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 4. Keyboard Shortcuts: Space (Play/Pause), A/B or 1/2 (Manual Frame Step), R (Reset Pan/Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A' || e.key === '1') {
        showingARef.current = true;
        setShowingAState(true);
        setIsPlaying(false);
        drawCanvas();
      } else if (e.key === 'b' || e.key === 'B' || e.key === '2') {
        showingARef.current = false;
        setShowingAState(false);
        setIsPlaying(false);
        drawCanvas();
      } else if (e.key === 'r' || e.key === 'R') {
        setZoomLevel(1.0);
        setPanOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawCanvas]);

  // 5. Mouse Interaction: Pan, Zoom, and Cursor Telemetry
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Check if clicking near vertical split slider line
    if (viewMode === 'slider') {
      const splitCanvasX = sliderPosition * rect.width;
      if (Math.abs(mouseX - splitCanvasX) < 20) {
        isDraggingSliderRef.current = true;
        return;
      }
    }

    // Otherwise initiate pan
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update Split slider position if dragging
    if (isDraggingSliderRef.current && viewMode === 'slider') {
      const newPos = Math.max(0.02, Math.min(0.98, mouseX / rect.width));
      setSliderPosition(newPos);
      return;
    }

    // Update Pan if dragging canvas
    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Compute Astrometric Coordinates under cursor
    const W = canvas.width;
    const H = canvas.height;

    // Invert CSS to canvas scale and zoom & pan
    const normX = (mouseX / rect.width) * W;
    const normY = (mouseY / rect.height) * H;

    const px = Math.round((normX - (W / 2 + panOffset.x)) / zoomLevel + W / 2);
    const py = Math.round((normY - (H / 2 + panOffset.y)) / zoomLevel + H / 2);

    if (px >= 0 && px <= W && py >= 0 && py <= H) {
      // Calculate RA/Dec offset from center based on plate scale
      const dX_deg = ((px - W / 2) * plateScaleArcsec) / 3600.0;
      const dY_deg = ((H / 2 - py) * plateScaleArcsec) / 3600.0;

      const cosDec = Math.cos((centralDec * Math.PI) / 180.0) || 1.0;
      const curRa = ((centralRa - dX_deg / cosDec + 360) % 360);
      const curDec = Math.max(-90, Math.min(90, centralDec + dY_deg));

      setCursorTelemetry({
        x: px,
        y: py,
        ra: curRa,
        dec: curDec,
        flux: 15.2 + Math.abs(Math.sin(px * 0.05) * Math.cos(py * 0.05)) * 140.0,
      });
    } else {
      setCursorTelemetry(null);
    }

    // Check candidate hover
    if (candidates && candidates.length > 0) {
      const hovered = candidates.find((c) => {
        const cx = (c.pixel_x * W) / 100;
        const cy = (c.pixel_y * H) / 100;
        const dist = Math.hypot(px - cx, py - cy);
        return dist < (20 / zoomLevel);
      });
      setHoveredCandidate(hovered || null);
    }
  };

  const handlePointerUp = () => {
    isDraggingSliderRef.current = false;
    isPanningRef.current = false;

    // Check if clicked a candidate
    if (hoveredCandidate && onCandidateSelect) {
      onCandidateSelect(hoveredCandidate);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoomLevel((prev) => Math.max(0.4, Math.min(6.0, prev * zoomFactor)));
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#03050a] text-white select-none ${className}`}>
      {/* 1. Sleek Top Astronomical Control Toolbar */}
      <div className="z-20 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.95)] backdrop-blur-md">
        {/* Left: View Mode Buttons */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
          <button
            onClick={() => setViewMode('blink')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === 'blink'
                ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Blink Flipbook
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === 'slider'
                ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Split Wipe
          </button>
          <button
            onClick={() => setViewMode('difference')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === 'difference'
                ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Difference Subtraction (IB - IA): Stationary stars cancel out while moving objects stand out as sharp dipoles!"
          >
            Difference (IB - IA)
          </button>
          <button
            onClick={() => setViewMode('false_color')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === 'false_color'
                ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            False Color
          </button>
        </div>

        {/* Center: Blink Playback, Cadence Slider, & Reset LED */}
        {viewMode === 'blink' && (
          <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`p-1.5 rounded-md transition-all ${
                isPlaying
                  ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'bg-[rgba(255,255,255,0.08)] text-slate-200 hover:bg-[rgba(255,255,255,0.15)]'
              }`}
              title={isPlaying ? 'Pause Blink Loop [Space]' : 'Play Blink Loop [Space]'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Step A Button */}
            <button
              onClick={() => {
                showingARef.current = true;
                setShowingAState(true);
                setIsPlaying(false);
                drawCanvas();
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                showingAState
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
              }`}
              title="View Epoch A [Key A / 1]"
            >
              Pass 1
            </button>

            {/* Step B Button */}
            <button
              onClick={() => {
                showingARef.current = false;
                setShowingAState(false);
                setIsPlaying(false);
                drawCanvas();
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                !showingAState
                  ? 'bg-amber-500/25 border border-amber-400 text-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
              }`}
              title="View Epoch B [Key B / 2]"
            >
              Pass 2
            </button>

            {/* Cadence Speed Slider (200 - 1600 ms) */}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">Speed:</span>
              <input
                type="range"
                min={200}
                max={1600}
                step={50}
                value={blinkIntervalMs}
                onChange={(e) => setBlinkIntervalMs(parseInt(e.target.value, 10))}
                className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-cyan)]"
                title={`Blink Cadence: ${blinkIntervalMs}ms`}
              />
              <span className="text-[10px] font-mono text-cyan-400 w-11 text-right">
                {blinkIntervalMs}ms
              </span>
            </div>

            {/* Loop Reset Flash Indicator */}
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
                loopResetFlash
                  ? 'bg-[var(--accent-cyan)] shadow-[0_0_8px_#00E5FF]'
                  : 'bg-slate-700'
              }`}
              title="Loop Reset Flash Indicator (Cycles every full blink round)"
            />
          </div>
        )}

        {/* Right: Stretch & Colormap Controls */}
        <div className="flex items-center gap-1.5">
          {/* Colormap Selector */}
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-md px-1.5 py-0.5">
            <Palette className="w-3 h-3 text-slate-400" />
            <select
              value={colormap}
              onChange={(e) => setColormap(e.target.value as ColormapMode)}
              className="bg-transparent text-[11px] font-mono text-slate-200 outline-none cursor-pointer"
              title="Select Astronomical Colormap (WiseView / Aladin convention)"
            >
              <option value="inverted_bw" className="bg-[#0b0f19] text-white">Inverted B&W (Astro Std)</option>
              <option value="grayscale" className="bg-[#0b0f19] text-white">Grayscale</option>
              <option value="viridis" className="bg-[#0b0f19] text-white">Viridis (Thermal)</option>
              <option value="inferno" className="bg-[#0b0f19] text-white">Inferno (High Contrast)</option>
              <option value="cool_warm" className="bg-[#0b0f19] text-white">Cool / Warm (Difference)</option>
            </select>
          </div>

          {/* Non-Linear Stretch Selector */}
          <div className="hidden md:flex items-center gap-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-md px-1.5 py-0.5">
            <Sliders className="w-3 h-3 text-slate-400" />
            <select
              value={stretchMode}
              onChange={(e) => setStretchMode(e.target.value as StretchMode)}
              className="bg-transparent text-[11px] font-mono text-slate-200 outline-none cursor-pointer"
              title="Astronomical Non-Linear Stretch (Lupton Asinh preserves faint galaxy nebulosity)"
            >
              <option value="asinh" className="bg-[#0b0f19] text-white">Lupton Asinh</option>
              <option value="log" className="bg-[#0b0f19] text-white">Logarithmic</option>
              <option value="linear" className="bg-[#0b0f19] text-white">Linear</option>
            </select>
          </div>

          {/* Toggle Overlays */}
          <button
            onClick={() => setShowOverlays((prev) => !prev)}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              showOverlays
                ? 'bg-[rgba(0,229,255,0.15)] border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                : 'bg-[rgba(255,255,255,0.05)] border-transparent text-slate-400'
            }`}
            title="Toggle Candidate Rings & Motion Vectors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Crosshairs */}
          <button
            onClick={() => setShowCrosshair((prev) => !prev)}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              showCrosshair
                ? 'bg-[rgba(0,229,255,0.15)] border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                : 'bg-[rgba(255,255,255,0.05)] border-transparent text-slate-400'
            }`}
            title="Toggle Telescope Central Crosshair"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Reset Pan & Zoom */}
          <button
            onClick={() => {
              setZoomLevel(1.0);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-md bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-slate-300 transition-colors"
            title="Reset Zoom & Pan [Key R]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Center Astronomical Viewport: Strict 1:1 Aspect Ratio */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 bg-[#020408] overflow-hidden">
        {/* Aspect-Square Enclosure (Guarantees Circular Stars with Zero Distortion) */}
        <div
          ref={containerRef}
          className="relative aspect-square max-w-full max-h-full w-auto h-full flex items-center justify-center rounded-2xl overflow-hidden border border-[rgba(0,229,255,0.25)] shadow-[0_0_50px_rgba(0,0,0,0.95)] bg-black"
        >
          {/* Astronomical Frame Corner Reticle Accents */}
          <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[var(--accent-cyan)] opacity-70 z-20 pointer-events-none" />
          <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[var(--accent-cyan)] opacity-70 z-20 pointer-events-none" />
          <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[var(--accent-cyan)] opacity-70 z-20 pointer-events-none" />
          <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[var(--accent-cyan)] opacity-70 z-20 pointer-events-none" />

          {/* Celestial Orientation Indicators (North Up, East Left) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-[9px] font-mono text-cyan-400/80 pointer-events-none select-none tracking-widest bg-[rgba(6,8,16,0.6)] px-1.5 py-0.5 rounded">
            N ▲
          </div>
          <div className="absolute top-1/2 left-2 -translate-y-1/2 z-20 text-[9px] font-mono text-cyan-400/80 pointer-events-none select-none tracking-widest bg-[rgba(6,8,16,0.6)] px-1 py-0.5 rounded">
            ◄ E
          </div>

          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full block cursor-crosshair select-none"
          />

          {/* Active Epoch Banner Overlay (Blink / Slider mode) */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all ${
                  viewMode === 'difference'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : showingAState
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                    : 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                }`}
              >
                {viewMode === 'difference'
                  ? 'DIFFERENCE FLUX (IB − IA)'
                  : showingAState
                  ? `● ${epochALabel.toUpperCase()}`
                  : `● ${epochBLabel.toUpperCase()}`}
              </span>

              <span className="px-2 py-0.5 rounded-md bg-[rgba(6,8,16,0.7)] border border-[rgba(255,255,255,0.1)] text-[10px] font-mono text-slate-400">
                ZOOM {zoomLevel.toFixed(1)}x
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
              <span>PLATE SCALE: {plateScaleArcsec}″/px</span>
              <span>FOV: ~13.2′ × 13.2′</span>
            </div>
          </div>

          {/* Real-Time Cursor Astrometry HUD (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 px-3 py-2 rounded-xl bg-[rgba(6,8,16,0.85)] border border-[var(--border-subtle)] backdrop-blur-md text-[10px] font-mono pointer-events-none select-none flex flex-col gap-0.5 shadow-xl">
            <div className="text-slate-400 flex items-center gap-2">
              <Crosshair className="w-3 h-3 text-[var(--accent-cyan)]" />
              <span className="text-slate-200 font-semibold">ASTROMETRIC READOUT</span>
            </div>
            {cursorTelemetry ? (
              <>
                <div className="text-cyan-300">
                  RA {cursorTelemetry.ra.toFixed(4)}° ({degreesToRaSexagesimal(cursorTelemetry.ra)})
                </div>
                <div className="text-cyan-300">
                  DEC {cursorTelemetry.dec >= 0 ? `+${cursorTelemetry.dec.toFixed(4)}` : cursorTelemetry.dec.toFixed(4)}° (
                  {degreesToDecSexagesimal(cursorTelemetry.dec)})
                </div>
                <div className="text-slate-400 flex items-center gap-3">
                  <span>PIXEL: [{cursorTelemetry.x}, {cursorTelemetry.y}]</span>
                  <span>FLUX: ~{cursorTelemetry.flux.toFixed(1)} mJy/sr</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500 italic">Hover over image for live sky coordinates</div>
            )}
          </div>

          {/* Difference Subtraction Legend Banner (Bottom Center if in difference mode) */}
          {viewMode === 'difference' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[rgba(6,8,16,0.88)] border border-purple-500/40 backdrop-blur-md text-[10px] font-mono flex items-center gap-4 shadow-2xl pointer-events-none select-none">
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Negative Flux (Dimmer in B)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Zero Delta (Static Stars)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Positive Flux (Brighter / Hopped)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
