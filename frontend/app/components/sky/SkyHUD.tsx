'use client';

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useSkyStore } from '../../store/skyStore';
import {
  formatRA,
  formatDec,
  equatorialToGalactic,
  equatorialToEcliptic,
  icrsToUnitVector,
  SKY_PRESETS,
} from '../../lib/astrometry';
import {
  searchCatalog,
  resolveObjectName,
  ResolvedTarget,
  ASTRONOMICAL_CATALOG,
} from '../../lib/resolver';
import {
  Compass,
  Crosshair,
  Sparkles,
  Navigation,
  Globe,
  Search,
  CheckCircle,
  Telescope,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export default function SkyHUD() {
  const {
    ra,
    dec,
    viewMode,
    activePresetName,
    hoveredObject,
    setCoordinates,
    setSelectedBand,
  } = useSkyStore();

  const [inputRa, setInputRa] = useState<string>(ra.toFixed(4));
  const [inputDec, setInputDec] = useState<string>(dec.toFixed(4));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResolvedTarget[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Sync internal state when external store coordinates change
  useEffect(() => {
    setInputRa(ra.toFixed(4));
    setInputDec(dec.toFixed(4));
  }, [ra, dec]);

  // Live target search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchCatalog(searchQuery);
    setSearchResults(results.slice(0, 5));
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  const galactic = equatorialToGalactic(ra, dec);
  const ecliptic = equatorialToEcliptic(ra, dec);

  // Compute Solar Separation Angle
  const sunVector = new THREE.Vector3(80, 50, 100).normalize();
  const targetVector = icrsToUnitVector(ra, dec, 1.0).normalize();
  const sunDot = Math.max(-1, Math.min(1, targetVector.dot(sunVector)));
  const sunSepAngle = (Math.acos(sunDot) * 180) / Math.PI;
  const isSunSafe = sunSepAngle >= 85.0;

  const handleManualSlew = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseFloat(inputRa);
    const d = parseFloat(inputDec);
    if (!isNaN(r) && !isNaN(d)) {
      setCoordinates(r, d, 'Custom Target');
    }
  };

  const handleSelectTarget = (target: ResolvedTarget) => {
    setInputRa(target.ra.toFixed(4));
    setInputDec(target.dec.toFixed(4));
    setCoordinates(target.ra, target.dec, target.name);
    if (target.suggestedBand) {
      setSelectedBand(target.suggestedBand);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleSelectTarget(searchResults[0]);
    } else {
      const resolved = await resolveObjectName(searchQuery);
      if (resolved) {
        handleSelectTarget(resolved);
      }
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {/* Target Coordinates HUD */}
      <div className="glass-panel p-4 pointer-events-auto backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[var(--accent-cyan)]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
              Target Field
            </span>
          </div>
          {activePresetName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.15)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.3)]">
              {activePresetName}
            </span>
          )}
        </div>

        {/* Search Bar with Autocomplete Dropdown */}
        <div className="relative mb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim() && searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search target or coords (e.g. Sedna, M42, WISE)..."
              className="w-full bg-[rgba(6,8,16,0.9)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(6,8,16,0.95)] border border-[var(--border-subtle)] rounded-lg shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
              {searchResults.map((item) => (
                <div
                  key={item.name}
                  onClick={() => handleSelectTarget(item)}
                  className="p-2 hover:bg-[rgba(0,229,255,0.1)] cursor-pointer border-b border-[rgba(255,255,255,0.05)] last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--text-primary)]">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[rgba(255,255,255,0.08)] text-[var(--accent-cyan)]">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 truncate">
                    RA: {item.ra.toFixed(3)}°, Dec: {item.dec >= 0 ? `+${item.dec.toFixed(3)}` : item.dec.toFixed(3)}°
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equatorial Readout */}
        <div className="grid grid-cols-2 gap-2 mb-3 bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
          <div>
            <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
              Right Ascension (α)
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {ra.toFixed(4)}°
            </div>
            <div className="font-mono text-[11px] text-[var(--accent-cyan)]">
              {formatRA(ra)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
              Declination (δ)
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {dec >= 0 ? `+${dec.toFixed(4)}` : dec.toFixed(4)}°
            </div>
            <div className="font-mono text-[11px] text-[var(--accent-cyan)]">
              {formatDec(dec)}
            </div>
          </div>
        </div>

        {/* Dual Coordinate Systems (Galactic & Ecliptic) */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 text-[var(--text-secondary)] bg-[rgba(13,18,32,0.4)] p-2 rounded">
          <div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--accent-purple)]">
              <Globe className="w-3 h-3" /> Galactic (l, b)
            </div>
            <div>
              {galactic.l.toFixed(2)}°, {galactic.b >= 0 ? `+${galactic.b.toFixed(2)}` : galactic.b.toFixed(2)}°
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--accent-gold)]">
              <Compass className="w-3 h-3" /> Ecliptic (λ, β)
            </div>
            <div>
              {ecliptic.lambda.toFixed(2)}°, {ecliptic.beta >= 0 ? `+${ecliptic.beta.toFixed(2)}` : ecliptic.beta.toFixed(2)}°
            </div>
          </div>
        </div>

        {/* Manual Slew Input */}
        <form onSubmit={handleManualSlew} className="flex gap-2">
          <input
            type="number"
            step="0.0001"
            value={inputRa}
            onChange={(e) => setInputRa(e.target.value)}
            placeholder="RA deg"
            className="w-1/2 bg-[rgba(6,8,16,0.8)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none"
          />
          <input
            type="number"
            step="0.0001"
            value={inputDec}
            onChange={(e) => setInputDec(e.target.value)}
            placeholder="Dec deg"
            className="w-1/2 bg-[rgba(6,8,16,0.8)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none"
          />
          <button
            type="submit"
            className="bg-[rgba(0,229,255,0.15)] hover:bg-[var(--accent-cyan)] hover:text-[#060810] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" /> Slew
          </button>
        </form>

        {/* Quick Sky Presets */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-[var(--text-secondary)] mb-1.5">
            <Sparkles className="w-3 h-3 text-[var(--accent-gold)]" /> Calibration & Survey Targets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SKY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setInputRa(preset.ra.toFixed(4));
                  setInputDec(preset.dec.toFixed(4));
                  setCoordinates(preset.ra, preset.dec, preset.name);
                }}
                className={`text-[11px] px-2 py-1 rounded transition-all ${
                  activePresetName === preset.name
                    ? 'bg-[var(--accent-cyan)] text-[#060810] font-semibold'
                    : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.12)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                {preset.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spacecraft Telemetry Card */}
      <div
        className={`glass-panel p-3 pointer-events-auto transition-all ${
          viewMode === 'spacecraft'
            ? 'border border-[var(--accent-cyan)] shadow-[0_0_15px_rgba(0,229,255,0.15)] bg-[rgba(13,18,32,0.95)]'
            : 'bg-[rgba(13,18,32,0.85)]'
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <Telescope className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>Spitzer Spacecraft CTA</span>
          </div>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
              viewMode === 'spacecraft'
                ? 'bg-[var(--accent-cyan)] text-[#060810]'
                : 'bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.3)]'
            }`}
          >
            {viewMode === 'spacecraft' ? 'Close Orbit' : 'Boresight Lock'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">Cryo Assembly</div>
            <div className="text-[var(--text-primary)] font-semibold text-[11px]">1.4K L-He Dewar</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">Solar Margin</div>
            <div
              className={`font-semibold text-[11px] flex items-center gap-1 ${
                isSunSafe ? 'text-[var(--accent-green)]' : 'text-[var(--accent-orange)]'
              }`}
            >
              {isSunSafe ? (
                <ShieldCheck className="w-3 h-3 text-[var(--accent-green)]" />
              ) : (
                <ShieldAlert className="w-3 h-3 text-[var(--accent-orange)] animate-pulse" />
              )}
              <span>{sunSepAngle.toFixed(1)}° ({isSunSafe ? 'Safe' : 'Limit'})</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-[var(--border-subtle)] text-[10px] font-mono flex items-center justify-between text-[var(--text-secondary)]">
          <span>Target Alignment</span>
          <span className="text-[var(--accent-cyan)] font-semibold">
            {ra.toFixed(2)}°, {dec.toFixed(2)}°
          </span>
        </div>
      </div>

      {/* Hovered Object Telemetry Card */}
      {hoveredObject && (
        <div className="glass-panel p-3 pointer-events-auto border-l-4 border-l-[var(--accent-cyan)] animate-fadeIn">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-mono">
            {hoveredObject.type} Detected
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {hoveredObject.name}
          </div>
          <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">
            RA: {hoveredObject.ra.toFixed(4)}° | Dec:{' '}
            {hoveredObject.dec >= 0 ? `+${hoveredObject.dec.toFixed(4)}` : hoveredObject.dec.toFixed(4)}°
          </div>
          {hoveredObject.extra && (
            <div className="text-[11px] text-[var(--accent-gold)] font-mono mt-0.5">
              {hoveredObject.extra}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
