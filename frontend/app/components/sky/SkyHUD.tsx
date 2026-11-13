'use client';

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '../../lib/resolver';
import {
  Compass,
  Crosshair,
  Sparkles,
  Navigation,
  Globe,
  Search,
  Telescope,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Box,
  Orbit,
  ArrowLeft,
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
    showTeardown,
    show3DImageRelief,
    selectedCelestialBody,
    resetCameraToOverview,
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

  // Global Escape Key Listener for returning to Solar System Overview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCelestialBody) {
        resetCameraToOverview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCelestialBody, resetCameraToOverview]);

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
    <div className="absolute top-28 lg:top-16 left-4 z-20 flex flex-col gap-3 pointer-events-none max-w-sm w-[calc(100vw-2rem)] sm:w-full max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-5rem)] overflow-y-auto pb-2">
      {/* Focused Celestial Body Holographic Banner (Solar System Scope Interactivity) */}
      <AnimatePresence>
        {selectedCelestialBody && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="glass-panel p-3.5 pointer-events-auto backdrop-blur-xl border border-[var(--accent-cyan)] shadow-[0_0_20px_rgba(0,229,255,0.25)] bg-[rgba(6,12,28,0.96)] rounded-xl"
          >
            <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-[rgba(0,229,255,0.2)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[rgba(0,229,255,0.15)] border border-[rgba(0,229,255,0.4)] flex items-center justify-center">
                  <Orbit className="w-4 h-4 text-[var(--accent-cyan)] animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--accent-cyan)]">
                    Target Focused • {selectedCelestialBody.category}
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">
                    {selectedCelestialBody.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => resetCameraToOverview()}
                className="px-2.5 py-1.5 rounded-lg bg-[rgba(0,229,255,0.15)] hover:bg-[var(--accent-cyan)] hover:text-[#060810] text-[var(--accent-cyan)] border border-[var(--accent-cyan)] text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                title="Return camera to solar system overview perspective (ESC)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
                <kbd className="px-1 py-0.5 bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.2)] rounded text-[9px] font-mono">
                  ESC
                </kbd>
              </button>
            </div>

            {/* Focused Body Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[rgba(0,0,0,0.35)] p-2 rounded-lg border border-[rgba(255,255,255,0.06)] mb-2">
              {selectedCelestialBody.realAU !== undefined && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Distance (Sun)</div>
                  <div className="font-semibold text-[var(--accent-gold)]">
                    {selectedCelestialBody.realAU === 0 ? '0.000 AU (Origin)' : `${selectedCelestialBody.realAU.toFixed(3)} AU`}
                  </div>
                </div>
              )}
              {selectedCelestialBody.vKms !== undefined && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Orbital Speed</div>
                  <div className="font-semibold text-[var(--accent-cyan)]">
                    {selectedCelestialBody.vKms === 0 ? '0.00 km/s' : `${selectedCelestialBody.vKms.toFixed(2)} km/s`}
                  </div>
                </div>
              )}
              {selectedCelestialBody.periodDays !== undefined && (
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Period</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {selectedCelestialBody.periodDays === 0
                      ? 'N/A'
                      : selectedCelestialBody.periodDays > 365.25
                      ? `${(selectedCelestialBody.periodDays / 365.25).toFixed(2)} yr`
                      : `${selectedCelestialBody.periodDays.toFixed(1)} d`}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Radius / Scale</div>
                <div className="font-semibold text-[var(--text-secondary)]">
                  {selectedCelestialBody.effectiveRadius.toFixed(2)} units
                </div>
              </div>
            </div>

            {selectedCelestialBody.description && (
              <div className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed bg-[rgba(13,18,32,0.4)] p-1.5 rounded border border-[rgba(255,255,255,0.04)]">
                {selectedCelestialBody.description}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            <span>SPHEREx Spacecraft CTA</span>
          </div>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
              viewMode === 'spacecraft'
                ? 'bg-[var(--accent-cyan)] text-[#060810]'
                : 'bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.3)]'
            }`}
          >
            {viewMode === 'spacecraft' ? 'LEO Orbit' : 'Boresight Lock'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">Cryo Assembly</div>
            <div className="text-[var(--text-primary)] font-semibold text-[11px]">&lt; 80K V-Groove</div>
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
              <span>{sunSepAngle.toFixed(1)}° ({isSunSafe ? 'Nominal' : 'Limit'})</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-[var(--border-subtle)] text-[10px] font-mono flex items-center justify-between text-[var(--text-secondary)]">
          <span>700 km Polar LEO</span>
          <span className="text-[var(--accent-cyan)] font-semibold">
            {ra.toFixed(2)}°, {dec.toFixed(2)}°
          </span>
        </div>

        {/* 3D Optical Teardown Details */}
        {showTeardown && (
          <div className="mt-2 pt-2 border-t border-[rgba(192,132,252,0.3)] bg-[rgba(192,132,252,0.06)] -mx-3 -mb-3 p-2.5 rounded-b">
            <div className="text-[10px] font-mono text-[#c084fc] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Box className="w-3 h-3 text-[#c084fc]" />
              <span>3D Optical Teardown</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
              <div>• 20cm f/3.0 Gold Mirror</div>
              <div>• 6x H2RG Focal Arrays</div>
              <div>• 102 Band LVF Filters</div>
              <div>• 3.5° × 7.0° Frustum</div>
            </div>
          </div>
        )}

        {/* 3D Image Relief Telemetry */}
        {show3DImageRelief && !showTeardown && (
          <div className="mt-2 pt-2 border-t border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.04)] -mx-3 -mb-3 p-2 rounded-b flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1 text-[var(--accent-gold)]">
              <Layers className="w-3 h-3" /> 3D Image Relief:
            </span>
            <span className="text-[var(--text-primary)] font-semibold">102-Band Tomography</span>
          </div>
        )}
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
              {hoveredObject.extra.split(' | ').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
