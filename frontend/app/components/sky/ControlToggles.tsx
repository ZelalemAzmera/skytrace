'use client';

import React from 'react';
import { useSkyStore } from '../../store/skyStore';
import {
  Layers,
  CircleDot,
  RotateCw,
  Sun,
  Orbit,
  Eye,
  SlidersHorizontal,
  Telescope,
  Compass,
  ShieldAlert,
} from 'lucide-react';

export default function ControlToggles() {
  const {
    viewMode,
    setViewMode,
    showSunExclusion,
    showBoresight,
    showEquatorialGrid,
    showEclipticGrid,
    showGalacticPlane,
    showOrrery,
    showScanPath,
    autoRotate,
    toggleSetting,
  } = useSkyStore();

  const toggleItems = [
    {
      key: 'showBoresight' as const,
      label: 'Boresight Laser Ray',
      active: showBoresight,
      color: 'var(--accent-cyan)',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    {
      key: 'showSunExclusion' as const,
      label: 'Sun Exclusion Cone (85°)',
      active: showSunExclusion,
      color: 'var(--accent-orange)',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    {
      key: 'showEquatorialGrid' as const,
      label: 'Equatorial Grid (α, δ)',
      active: showEquatorialGrid,
      color: 'var(--accent-cyan)',
      icon: <CircleDot className="w-3.5 h-3.5" />,
    },
    {
      key: 'showEclipticGrid' as const,
      label: 'Ecliptic Plane (λ, β)',
      active: showEclipticGrid,
      color: 'var(--accent-gold)',
      icon: <Orbit className="w-3.5 h-3.5" />,
    },
    {
      key: 'showGalacticPlane' as const,
      label: 'Galactic Plane (l, b)',
      active: showGalacticPlane,
      color: 'var(--accent-purple)',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      key: 'showOrrery' as const,
      label: 'Solar System Orrery',
      active: showOrrery,
      color: 'var(--accent-gold)',
      icon: <Sun className="w-3.5 h-3.5" />,
    },
    {
      key: 'showScanPath' as const,
      label: 'SPHEREx Scan Cadence',
      active: showScanPath,
      color: 'var(--accent-orange)',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      key: 'autoRotate' as const,
      label: 'Auto Turntable',
      active: autoRotate,
      color: 'var(--accent-green)',
      icon: <RotateCw className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="absolute top-28 lg:top-16 right-4 z-20 flex flex-col gap-2 pointer-events-auto max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* 1. Observation View Mode Switcher */}
      <div className="glass-panel p-2 backdrop-blur-md">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
          Observation Mode
        </div>
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[rgba(6,8,16,0.6)] border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('sky')}
            className={`py-1 px-2 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'sky'
                ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Sky Survey</span>
          </button>
          <button
            onClick={() => setViewMode('spacecraft')}
            className={`py-1 px-2 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'spacecraft'
                ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Telescope className="w-3.5 h-3.5" />
            <span>Spacecraft</span>
          </button>
        </div>
      </div>

      {/* 2. Layer Toggles */}
      <div className="glass-panel p-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[var(--border-subtle)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
          <span>Layer Toggles</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {toggleItems.map((item) => (
            <button
              key={item.key}
              onClick={() => toggleSetting(item.key)}
              className={`flex items-center justify-between gap-3 px-2 py-1 rounded text-xs font-mono transition-all ${
                item.active
                  ? 'bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: item.active ? item.color : 'inherit' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  item.active ? 'shadow-[0_0_8px]' : 'bg-[var(--border-subtle)]'
                }`}
                style={{
                  backgroundColor: item.active ? item.color : undefined,
                  boxShadow: item.active ? `0 0 8px ${item.color}` : undefined,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}