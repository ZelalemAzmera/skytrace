'use client';

import React from 'react';
import { useSkyStore } from '../../store/skyStore';
import { getSPHERExWavelength, getWavelengthColor } from '../../lib/astrometry';
import { Radio, Zap } from 'lucide-react';

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
  const currentWavelength = getSPHERExWavelength(selectedBand);
  const colorInfo = getWavelengthColor(currentWavelength);

  // Spectral resolving power R: ranges from ~41 at 0.75 µm to ~135 at 4.5 µm
  const resolvingPowerR = Math.round(41 + (currentWavelength - 0.75) * 22);

  return (
    <div className="glass-panel p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--accent-orange)]" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
            SPHEREx Spectroscopic Channel
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shadow-[0_0_8px]"
            style={{
              backgroundColor: colorInfo.css,
              boxShadow: `0 0 10px ${colorInfo.css}`,
            }}
          />
          <span className="text-xs font-mono font-semibold" style={{ color: colorInfo.css }}>
            {colorInfo.name}
          </span>
        </div>
      </div>

      {/* Primary Display */}
      <div className="flex items-baseline justify-between mb-3 bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
        <div>
          <span className="text-xs font-mono text-[var(--text-secondary)]">Band</span>
          <span className="text-xl font-mono font-bold text-[var(--text-primary)] ml-1.5">
            {selectedBand}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)] ml-1">/ 102</span>
        </div>
        <div>
          <span className="text-2xl font-mono font-bold text-[var(--accent-cyan)]">
            {currentWavelength.toFixed(3)}
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)] ml-1">µm</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)] block">Resolution</span>
          <span className="text-xs font-mono text-[var(--text-primary)] font-semibold">
            R ≈ {resolvingPowerR} (λ/Δλ)
          </span>
        </div>
      </div>

      {/* Slider Control */}
      <div className="relative my-4">
        {/* Continuous False-Color Infrared Gradient Track */}
        <div
          className="h-2.5 w-full rounded-full"
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
          className="absolute inset-0 w-full h-2.5 opacity-0 cursor-pointer"
        />
        {/* Indicator Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_0_12px_rgba(0,0,0,0.8)] pointer-events-none transition-all"
          style={{
            left: `${((selectedBand - 1) / 101) * 100}%`,
            backgroundColor: colorInfo.css,
          }}
        />
      </div>

      {/* Scientific Spectral Anchors */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-[var(--text-secondary)] mb-1.5">
          <Zap className="w-3 h-3 text-[var(--accent-orange)]" /> Diagnostic Absorption Windows
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
          {SPECTRAL_ANCHORS.map((anchor) => (
            <button
              key={anchor.band}
              onClick={() => setSelectedBand(anchor.band)}
              title={anchor.desc}
              className={`px-1.5 py-1 rounded text-center transition-all ${
                selectedBand === anchor.band
                  ? 'bg-[var(--accent-orange)] text-[#060810] font-bold shadow-[0_0_10px_rgba(255,107,53,0.5)]'
                  : 'bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              <div className="text-[10px] font-mono leading-none">{anchor.label}</div>
              <div className="text-[8px] opacity-75 truncate">{anchor.desc.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
