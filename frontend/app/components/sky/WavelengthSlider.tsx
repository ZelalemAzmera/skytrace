'use client';

import React, { useState } from 'react';
import { useSkyStore } from '../../store/skyStore';
import { getSPHERExWavelength, getWavelengthColor } from '../../lib/astrometry';
import { Radio, Zap, ChevronDown, ChevronUp } from 'lucide-react';

const SPECTRAL_ANCHORS = [
  { band: 1, label: '0.75 µm', desc: 'Optical/NIR Limit' },
  { band: 18, label: '1.25 µm', desc: 'J-Band' },
  { band: 33, label: '1.65 µm', desc: 'Methane (CH4) Window' },
  { band: 50, label: '2.15 µm', desc: 'Ks / H2 Line' },
  { band: 73, label: '3.05 µm', desc: 'H2O Ice Feature' },
  { band: 88, label: '4.26 µm', desc: 'CO2 Ice Feature' },
  { band: 102, label: '5.00 µm', desc: 'Thermal Boundary' },
];

export default function WavelengthSlider() {
  const { selectedBand, setSelectedBand } = useSkyStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentWavelength = getSPHERExWavelength(selectedBand);
  const colorInfo = getWavelengthColor(currentWavelength);

  // Spectral resolving power R: ranges from ~41 at 0.75 µm to ~135 at 4.5 µm
  const resolvingPowerR = Math.round(41 + (currentWavelength - 0.75) * 22);

  // Active diagnostic anchor if within ±2 bands
  const activeAnchor = SPECTRAL_ANCHORS.find((a) => Math.abs(a.band - selectedBand) <= 2);

  return (
    <div className="w-full flex flex-col gap-1.5 font-mono select-none">
      {/* Sleek Compact Primary Bar (~36px height) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-[rgba(6,8,16,0.7)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md">
        {/* Left: Channel & Band Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[var(--accent-orange)] animate-pulse" />
            <span className="text-[11px] font-bold text-white tracking-wide">
              SPHEREx 102-Band Channel
            </span>
          </div>

          <div className="flex items-baseline gap-1 px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-xs">
            <span className="text-slate-400 text-[10px]">BAND</span>
            <span className="font-bold text-white">{selectedBand}</span>
            <span className="text-slate-500 text-[10px]">/ 102</span>
          </div>

          <div className="flex items-baseline gap-1 px-2 py-0.5 rounded bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)] text-xs">
            <span className="font-bold text-[var(--accent-cyan)]">{currentWavelength.toFixed(3)}</span>
            <span className="text-cyan-400 text-[10px]">µm</span>
            <span className="text-slate-400 text-[10px] ml-1.5">(R ≈ {resolvingPowerR})</span>
          </div>

          {/* Color Indicator Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[10px]">
            <span
              className="w-2 h-2 rounded-full shadow-[0_0_6px]"
              style={{
                backgroundColor: colorInfo.css,
                boxShadow: `0 0 6px ${colorInfo.css}`,
              }}
            />
            <span style={{ color: colorInfo.css }}>{colorInfo.name}</span>
          </div>
        </div>

        {/* Center: Interactive Continuous Gradient Slider */}
        <div className="relative flex-1 min-w-[180px] max-w-xl mx-2">
          {/* Continuous False-Color Infrared Gradient Track */}
          <div
            className="h-2 w-full rounded-full shadow-inner"
            style={{
              background:
                'linear-gradient(to right, #8A2BE2 0%, #00E5FF 20%, #FFD166 45%, #FF6B35 70%, #EF476F 100%)',
            }}
          />
          <input
            type="range"
            min={1}
            max={102}
            step={1}
            value={selectedBand}
            onChange={(e) => setSelectedBand(parseInt(e.target.value, 10))}
            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            title={`Slide across 102 SPHEREx spectroscopic channels (Current: Band ${selectedBand}, ${currentWavelength.toFixed(3)} µm)`}
          />
          {/* Indicator Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.9)] pointer-events-none transition-all"
            style={{
              left: `${((selectedBand - 1) / 101) * 100}%`,
              backgroundColor: colorInfo.css,
            }}
          />
        </div>

        {/* Right: Active Diagnostic Window & Collapsible Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {activeAnchor ? (
            <div className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/40 text-[10px] text-orange-300 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-orange-400" />
              <span>{activeAnchor.desc}</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 hidden md:inline">Continuum Channel</span>
          )}

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-[10px] text-slate-300 flex items-center gap-1 transition-colors"
            title="Toggle Diagnostic Spectral Windows"
          >
            <span>Windows</span>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsible Diagnostic Spectral Windows */}
      {isExpanded && (
        <div className="p-2.5 rounded-lg bg-[rgba(6,8,16,0.9)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-2">
            <Zap className="w-3 h-3 text-[var(--accent-orange)]" />
            <span>Key Diagnostic Absorption Features (Click to Jump Channel):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
            {SPECTRAL_ANCHORS.map((anchor) => (
              <button
                key={anchor.band}
                onClick={() => setSelectedBand(anchor.band)}
                className={`px-2 py-1 rounded text-center transition-all border ${
                  selectedBand === anchor.band
                    ? 'bg-[var(--accent-orange)] text-[#060810] font-bold border-transparent shadow-[0_0_10px_rgba(255,107,53,0.4)]'
                    : 'bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-slate-300 border-[rgba(255,255,255,0.06)]'
                }`}
              >
                <div className="text-[10px] font-bold leading-tight">{anchor.label}</div>
                <div className="text-[9px] text-slate-400 opacity-90 truncate">{anchor.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
