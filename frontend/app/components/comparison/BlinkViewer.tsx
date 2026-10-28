'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Candidate } from '../../types';
import { FALSE_COLOR_PRESETS, FalseColorPreset } from '../../lib/composite';
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Sparkles,
  Info,
  Layers,
  Palette,
  AlertTriangle,
} from 'lucide-react';

export type BlinkViewMode = 'blink' | 'slider' | 'difference' | 'false_color';

interface BlinkViewerProps {
  imageABase64: string;
  imageBBase64: string;
  differenceBase64?: string;
  falseColorBase64?: string;
  candidates: Candidate[];
  selectedCandidateId?: string | null;
  onCandidateSelect?: (candidate: Candidate) => void;
  epochALabel?: string;
  epochBLabel?: string;
}

export default function BlinkViewer({
  imageABase64,
  imageBBase64,
  differenceBase64,
  falseColorBase64,
  candidates = [],
  selectedCandidateId = null,
  onCandidateSelect,
  epochALabel = 'Pass 1 (Epoch A)',
  epochBLabel = 'Pass 2 (Epoch B)',
}: BlinkViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Images state
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const imgDiffRef = useRef<HTMLImageElement | null>(null);
  const imgFalseColorRef = useRef<HTMLImageElement | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  // Playback & view mode
  const [viewMode, setViewMode] = useState<BlinkViewMode>('blink');
  const [isPlaying, setIsPlaying] = useState(true);
  const [blinkIntervalMs, setBlinkIntervalMs] = useState(700);
  const showingARef = useRef(true);
  const [showingAState, setShowingAState] = useState(true);

  // False Color Preset state
  const [selectedPreset, setSelectedPreset] = useState<FalseColorPreset>(FALSE_COLOR_PRESETS[0]);

  // Split slider
  const [sliderPosition, setSliderPosition] = useState(0.5); // 0.0 - 1.0
  const isDraggingSliderRef = useRef(false);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Hovered Candidate
  const [hoveredCandidate, setHoveredCandidate] = useState<Candidate | null>(null);

  // 1. Preload base64 images
  useEffect(() => {
    let loadedCount = 0;
    const totalToLoad = 2 + (differenceBase64 ? 1 : 0) + (falseColorBase64 ? 1 : 0);

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
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

    // Apply zoom & pan transformations
    ctx.translate(W / 2 + panOffset.x, H / 2 + panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-W / 2, -H / 2);

    // Disable image smoothing for pixel-level astronomical fidelity
    ctx.imageSmoothingEnabled = false;

    // Draw active layer according to viewMode
    if (viewMode === 'blink') {
      const activeImg = showingARef.current ? imgARef.current : imgBRef.current;
      if (activeImg) ctx.drawImage(activeImg, 0, 0, W, H);
    } else if (viewMode === 'slider') {
      const splitX = sliderPosition * W;

      // Draw Image A on the left
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();
      if (imgARef.current) ctx.drawImage(imgARef.current, 0, 0, W, H);
      ctx.restore();

      // Draw Image B on the right
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, W - splitX, H);
      ctx.clip();
      if (imgBRef.current) ctx.drawImage(imgBRef.current, 0, 0, W, H);
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
      ctx.arc(splitX, H / 2, 12 / zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#060810';
      ctx.font = `bold ${10 / zoomLevel}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↔', splitX, H / 2);
    } else if (viewMode === 'difference') {
      const diffImg = imgDiffRef.current || imgBRef.current;
      if (diffImg) ctx.drawImage(diffImg, 0, 0, W, H);
    } else if (viewMode === 'false_color') {
      const fcImg = imgFalseColorRef.current || imgARef.current;
      if (fcImg) ctx.drawImage(fcImg, 0, 0, W, H);
    }

    // Draw Candidate Overlays
    candidates.forEach((cand) => {
      const scaleX = W / 100;
      const scaleY = H / 100;
      const px = cand.pixel_x * scaleX;
      const py = cand.pixel_y * scaleY;

      const isSelected = cand.id === selectedCandidateId;
      const isHovered = cand.id === hoveredCandidate?.id;
      const isHighConf = cand.confidence_score >= 0.7;

      const baseRadius = (10 + cand.confidence_score * 8) / zoomLevel;
      const ringColor = isSelected
        ? '#00E5FF'
        : isHighConf
        ? '#06D6A0'
        : '#FFD166';

      // Outer Selection Glow
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 6 / zoomLevel, 0, Math.PI * 2);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2 / zoomLevel;
        ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Candidate Target Ring
      ctx.beginPath();
      ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2 / zoomLevel;
      ctx.stroke();

      // Precision Crosshair Ticks
      const tick = 4 / zoomLevel;
      ctx.beginPath();
      ctx.moveTo(px - baseRadius - tick, py);
      ctx.lineTo(px - baseRadius + 1 / zoomLevel, py);
      ctx.moveTo(px + baseRadius - 1 / zoomLevel, py);
      ctx.lineTo(px + baseRadius + tick, py);
      ctx.moveTo(px, py - baseRadius - tick);
      ctx.lineTo(px, py - baseRadius + 1 / zoomLevel);
      ctx.moveTo(px, py + baseRadius - 1 / zoomLevel);
      ctx.lineTo(px, py + baseRadius + tick);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5 / zoomLevel;
      ctx.stroke();

      // SNR Delta Label
      ctx.fillStyle = ringColor;
      ctx.font = `bold ${10 / zoomLevel}px JetBrains Mono, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `ΔSNR +${cand.snr_change.toFixed(1)}`,
        px + baseRadius + 4 / zoomLevel,
        py - 2 / zoomLevel
      );

      // Classification Tag
      ctx.fillStyle = 'rgba(240, 244, 255, 0.8)';
      ctx.font = `${8 / zoomLevel}px JetBrains Mono, monospace`;
      ctx.fillText(
        cand.classification.split(' ')[0],
        px + baseRadius + 4 / zoomLevel,
        py + 8 / zoomLevel
      );
    });

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
  ]);

  // 3. Cadence Blink Loop
  useEffect(() => {
    if (viewMode !== 'blink' || !isPlaying) return;

    const interval = setInterval(() => {
      showingARef.current = !showingARef.current;
      setShowingAState(showingARef.current);
      drawCanvas();
    }, blinkIntervalMs);

    return () => clearInterval(interval);
  }, [viewMode, isPlaying, blinkIntervalMs, drawCanvas]);

  // Redraw when ready or changed
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        showingARef.current = true;
        setShowingAState(true);
        setIsPlaying(false);
        drawCanvas();
      } else if (e.key === 'b' || e.key === 'B') {
        showingARef.current = false;
        setShowingAState(false);
        setIsPlaying(false);
        drawCanvas();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawCanvas]);

  // 5. Mouse / Pointer Interactions
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Invert zoom & pan
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = (rawX - centerX - panOffset.x) / zoomLevel + centerX;
    const y = (rawY - centerY - panOffset.y) / zoomLevel + centerY;

    return { x, y, rawX, rawY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);

    if (viewMode === 'slider') {
      const { rawX } = getCanvasCoords(e);
      const canvas = canvasRef.current!;
      const splitX = sliderPosition * canvas.width;
      if (Math.abs(rawX - splitX) < 20) {
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

    if (isDraggingSliderRef.current && viewMode === 'slider') {
      const rect = canvas.getBoundingClientRect();
      const pos = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
      setSliderPosition(pos);
      return;
    }

    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Check Candidate Hover
    const { x, y } = getCanvasCoords(e);
    const scaleX = canvas.width / 100;
    const scaleY = canvas.height / 100;

    const hit = candidates.find((c) => {
      const cx = c.pixel_x * scaleX;
      const cy = c.pixel_y * scaleY;
      const dist = Math.hypot(cx - x, cy - y);
      return dist < (15 + c.confidence_score * 8) / zoomLevel;
    });

    setHoveredCandidate(hit || null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingSliderRef.current = false;
    isPanningRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If user dragged, don't trigger selection
    const { x, y } = getCanvasCoords(e as unknown as React.PointerEvent<HTMLCanvasElement>);
    const scaleX = canvas.width / 100;
    const scaleY = canvas.height / 100;

    const clicked = candidates.find((c) => {
      const cx = c.pixel_x * scaleX;
      const cy = c.pixel_y * scaleY;
      const dist = Math.hypot(cx - x, cy - y);
      return dist < (18 + c.confidence_score * 8) / zoomLevel;
    });

    if (clicked && onCandidateSelect) {
      onCandidateSelect(clicked);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoomLevel((prev) => Math.min(8.0, Math.max(0.5, prev * factor)));
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-3 font-sans relative backdrop-blur-md">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        {/* Mode Buttons */}
        <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.4)] p-1 rounded-xl border border-[var(--border-subtle)]">
          {(
            [
              { id: 'blink', label: 'Blink Comparator' },
              { id: 'slider', label: 'Split Slider' },
              { id: 'difference', label: 'Flux Difference' },
              { id: 'false_color', label: 'False Color RGB' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setViewMode(mode.id);
                if (mode.id === 'blink') setIsPlaying(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === mode.id
                  ? 'bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* View-Specific Secondary Controls */}
        {viewMode === 'blink' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-[var(--text-primary)]"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Manual Epoch Jumpers */}
            <button
              onClick={() => {
                showingARef.current = true;
                setShowingAState(true);
                setIsPlaying(false);
                drawCanvas();
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                !isPlaying && showingAState
                  ? 'bg-[var(--accent-cyan)] text-[#060810]'
                  : 'bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] hover:bg-[rgba(0,229,255,0.2)]'
              }`}
              title="Shortcut: 'A'"
            >
              Epoch A
            </button>
            <button
              onClick={() => {
                showingARef.current = false;
                setShowingAState(false);
                setIsPlaying(false);
                drawCanvas();
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                !isPlaying && !showingAState
                  ? 'bg-[var(--accent-orange)] text-[#060810]'
                  : 'bg-[rgba(255,107,53,0.1)] text-[var(--accent-orange)] hover:bg-[rgba(255,107,53,0.2)]'
              }`}
              title="Shortcut: 'B'"
            >
              Epoch B
            </button>

            {/* Blink Speed Slider */}
            <div className="flex items-center gap-1.5 ml-2">
              <Sliders className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={blinkIntervalMs}
                onChange={(e) => setBlinkIntervalMs(parseInt(e.target.value, 10))}
                className="w-20 accent-[var(--accent-cyan)] cursor-pointer"
                title={`Cadence: ${blinkIntervalMs} ms`}
              />
              <span className="text-[11px] font-mono text-[var(--text-secondary)] w-12">
                {blinkIntervalMs}ms
              </span>
            </div>
          </div>
        )}

        {/* False Color Presets Selector */}
        {viewMode === 'false_color' && (
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const found = FALSE_COLOR_PRESETS.find((p) => p.id === e.target.value);
                if (found) setSelectedPreset(found);
              }}
              className="bg-[rgba(0,0,0,0.5)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1 outline-none focus:border-[var(--accent-cyan)] cursor-pointer"
            >
              {FALSE_COLOR_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#060810]">
                  {p.name} (R:{p.redBand} G:{p.greenBand} B:{p.blueBand})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((prev) => Math.min(8.0, prev * 1.25))}
            className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]"
            title="Zoom In (or Wheel)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(0.5, prev / 1.25))}
            className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1.0);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div className="relative w-full aspect-square max-h-[560px] bg-[#020408] rounded-xl overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* Active Epoch Floating Badge */}
        {viewMode === 'blink' && (
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <div
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all duration-200 ${
                showingAState
                  ? 'bg-[rgba(0,229,255,0.2)] text-[var(--accent-cyan)] border-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-[rgba(255,107,53,0.2)] text-[var(--accent-orange)] border-[var(--accent-orange)] shadow-[0_0_12px_rgba(255,107,53,0.4)]'
              }`}
            >
              ● {showingAState ? epochALabel : epochBLabel}
            </div>
          </div>
        )}

        {/* Split Slider Mode Instructions */}
        {viewMode === 'slider' && (
          <div className="absolute top-3 left-3 text-[11px] font-mono text-[var(--text-secondary)] bg-[rgba(6,8,16,0.7)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)] pointer-events-none">
            Drag divider: Left is {epochALabel} | Right is {epochBLabel}
          </div>
        )}

        {/* Hovered Candidate Tooltip */}
        {hoveredCandidate && (
          <div className="absolute bottom-3 left-3 glass-panel p-2.5 pointer-events-none border-l-4 border-l-[var(--accent-cyan)] text-xs font-mono max-w-sm">
            <div className="font-bold text-[var(--accent-cyan)]">
              {hoveredCandidate.id} ({hoveredCandidate.classification})
            </div>
            <div className="text-[var(--text-secondary)]">
              RA: {hoveredCandidate.ra_deg.toFixed(4)}° | Dec: {hoveredCandidate.dec_deg.toFixed(4)}°
            </div>
            <div className="text-[var(--accent-gold)]">
              Confidence: {(hoveredCandidate.confidence_score * 100).toFixed(0)}% | ΔSNR: +
              {hoveredCandidate.snr_change.toFixed(1)}σ
            </div>
            {Math.min(
              hoveredCandidate.pixel_x,
              100 - hoveredCandidate.pixel_x,
              hoveredCandidate.pixel_y,
              100 - hoveredCandidate.pixel_y
            ) < 15 && (
              <div className="text-[var(--danger)] text-[10px] mt-0.5 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" /> Warning: Located within 15px of detector edge
              </div>
            )}
          </div>
        )}
      </div>

      {/* Difference Mode Diverging Colormap Legend */}
      {viewMode === 'difference' && (
        <div className="p-2.5 rounded-lg bg-[rgba(0,0,0,0.35)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
            <span className="text-[var(--accent-cyan)] font-bold">← Fading / Deficit (−ΔFlux)</span>
            <span className="text-[var(--text-muted)]">No Change (0σ)</span>
            <span className="text-[var(--accent-orange)] font-bold">Brightening / Excess (+ΔFlux) →</span>
          </div>
          <div className="h-2 rounded-full w-full bg-gradient-to-r from-[#00E5FF] via-[#060810] to-[#FF6B35] border border-[rgba(255,255,255,0.1)]" />
        </div>
      )}

      {/* False Color Mode Description */}
      {viewMode === 'false_color' && (
        <div className="p-2.5 rounded-lg bg-[rgba(0,0,0,0.35)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center justify-between">
          <span>{selectedPreset.description}</span>
          <span className="text-[var(--accent-cyan)] font-bold">
            Lupton (2004) Asinh Stretch (Q={selectedPreset.qStretch})
          </span>
        </div>
      )}

      {/* Bottom Hint Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
          <span>Click any candidate ring to inspect its 102-band SED & Evidence Dossier</span>
        </div>
        <div>
          <span>Shortcuts: </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]">
            Space
          </kbd>{' '}
          Pause |{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]">
            A
          </kbd>{' '}
          Epoch A |{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]">
            B
          </kbd>{' '}
          Epoch B
        </div>
      </div>
    </div>
  );
}
