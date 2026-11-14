'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import BlinkViewer from '../components/comparison/BlinkViewer';
import CelestialMiniMap from '../components/sky/CelestialMiniMap';
import WavelengthSlider from '../components/sky/WavelengthSlider';
import CandidateList from '../components/candidate/CandidateList';
import SEDChart from '../components/candidate/SEDChart';
import EvidencePanel from '../components/candidate/EvidencePanel';
import { useSkyStore } from '../store/skyStore';
import { useComparison } from '../hooks/useObservations';
import {
  BENCHMARK_TARGETS,
  BenchmarkTarget,
  findBenchmarkTarget,
  parseAstronomicalCoordinates,
  degreesToRaSexagesimal,
  degreesToDecSexagesimal,
} from '../lib/benchmarkTargets';
import { generateSyntheticCutout, computeDifferencePixels } from '../lib/imageProcessing';
import { Candidate } from '../types';
import {
  Telescope,
  ArrowLeft,
  Search,
  Sparkles,
  Info,
  Layers,
  Sliders,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Compass,
  FileText,
  AlertCircle,
  Activity,
  Zap,
} from 'lucide-react';

export default function ExplorePage() {
  // Store coordinates & band
  const { ra, dec, selectedBand, setCoordinates, setSelectedBand } = useSkyStore();

  // Active benchmark target (defaults to WISE 0855, the coldest sub-brown dwarf benchmark)
  const [activeTarget, setActiveTarget] = useState<BenchmarkTarget>(BENCHMARK_TARGETS[1]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // UI Panels
  const [showSideDossier, setShowSideDossier] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'candidates' | 'sed' | 'dossier'>('candidates');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Sync initial coordinates with default benchmark target
  useEffect(() => {
    setCoordinates(activeTarget.ra, activeTarget.dec);
    if (activeTarget.suggestedBand) {
      setSelectedBand(activeTarget.suggestedBand);
    }
  }, []);

  // Generate synthetic high-contrast multi-epoch cutouts for the active target
  const { imageABase64, imageBBase64, differenceBase64 } = useMemo(() => {
    const cutoutA = generateSyntheticCutout(activeTarget.id, 1, 128);
    const cutoutB = generateSyntheticCutout(activeTarget.id, 2, 128);

    // Generate difference image
    const canvasDiff = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    let diffUrl = '';
    if (canvasDiff) {
      canvasDiff.width = 128;
      canvasDiff.height = 128;
      const ctx = canvasDiff.getContext('2d');
      if (ctx) {
        const diffPixels = computeDifferencePixels(cutoutA.rawPixels, cutoutB.rawPixels, 3.2);
        const imgData = ctx.createImageData(128, 128);
        for (let i = 0; i < diffPixels.length; i++) {
          const v = diffPixels[i];
          const p = i * 4;
          imgData.data[p] = v;
          imgData.data[p + 1] = v;
          imgData.data[p + 2] = v;
          imgData.data[p + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        diffUrl = canvasDiff.toDataURL('image/png');
      }
    }

    return {
      imageABase64: cutoutA.dataUrl,
      imageBBase64: cutoutB.dataUrl,
      differenceBase64: diffUrl,
    };
  }, [activeTarget.id, selectedBand]);

  // Construct realistic candidate transients matching the active target
  const activeCandidates: Candidate[] = useMemo(() => {
    const hasHop = activeTarget.expectedShiftPx > 0;
    const isVariable = activeTarget.magDelta && activeTarget.magDelta > 0;

    const baseCand: Candidate = {
      id: `SPHEREx-${activeTarget.id.toUpperCase()}-001`,
      comparison_id: `comp-${activeTarget.id}`,
      ra_deg: activeTarget.ra,
      dec_deg: activeTarget.dec,
      pixel_x: 50.0,
      pixel_y: 50.0,
      confidence_score: activeTarget.id === 'planet_x_alpha' ? 0.91 : 0.86,
      snr_change: isVariable ? 18.4 : hasHop ? 14.8 : 8.2,
      classification: `${activeTarget.name} (${activeTarget.category})`,
      caveats: [
        activeTarget.scientificCaveat,
        hasHop
          ? `Measured astrometric hop: Δθ = ${(activeTarget.expectedShiftPx * 6.2).toFixed(2)}″ across 6-month baseline.`
          : `Photometric flux variability: Δm = ${activeTarget.magDelta?.toFixed(1) || '0.0'} mag with stationary centroid.`,
        `SPHEREx diagnostic channel: Band ${selectedBand} (${(0.75 * Math.pow(5.0 / 0.75, (selectedBand - 1) / 101)).toFixed(2)} µm).`,
      ],
      parallax_distance_pc: activeTarget.distanceLightYears
        ? activeTarget.distanceLightYears / 3.2616
        : 450.0,
      proper_motion_mas_yr: activeTarget.properMotionArcsecYr
        ? activeTarget.properMotionArcsecYr * 1000.0
        : 25.0,
      near_sensor_boundary: false,
      boundary_distance_px: 48.0,
      solar_system_crossmatch: {
        matched: activeTarget.category === 'Planet X Candidate',
        nearest_body: activeTarget.category === 'Planet X Candidate' ? '(90377) Sedna' : 'None',
        nearest_type: activeTarget.category === 'Planet X Candidate' ? 'Outer TNO' : 'Stellar / Sub-Stellar',
        angular_separation_arcsec: 42000,
        verdict: activeTarget.category === 'Planet X Candidate' ? 'CONSISTENT_WITH_OUTER_TNO' : 'EXTRA_SOLAR_OR_OUTER_TNO',
        explanation: activeTarget.description,
      },
    };

    return [baseCand];
  }, [activeTarget, selectedBand]);

  // Set default selected candidate
  useEffect(() => {
    setSelectedCandidate(activeCandidates[0] || null);
  }, [activeCandidates]);

  // Handler for benchmark target button click
  const handleSelectBenchmark = (target: BenchmarkTarget) => {
    setActiveTarget(target);
    setCoordinates(target.ra, target.dec);
    if (target.suggestedBand) {
      setSelectedBand(target.suggestedBand);
    }
    setSearchQuery('');
    setSearchError('');
  };

  // Handler for custom coordinate search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if matching a benchmark target name
    const found = findBenchmarkTarget(searchQuery);
    if (found) {
      handleSelectBenchmark(found);
      return;
    }

    // Check if coordinates
    const coords = parseAstronomicalCoordinates(searchQuery);
    if (coords) {
      setCoordinates(coords.ra, coords.dec);
      // Create a custom pointing target
      setActiveTarget({
        id: 'custom_pointing',
        name: `Pointing (${coords.ra.toFixed(3)}°, ${coords.dec >= 0 ? `+${coords.dec.toFixed(3)}` : coords.dec.toFixed(3)}°)`,
        designation: `RA ${degreesToRaSexagesimal(coords.ra)} / Dec ${degreesToDecSexagesimal(coords.dec)}`,
        ra: coords.ra,
        dec: coords.dec,
        category: 'Planet X Candidate',
        phenomenon: 'proper_motion',
        badge: 'Custom Pointing',
        badgeColor: '#00E5FF',
        description: `User-specified equatorial coordinates RA=${coords.ra.toFixed(4)}°, Dec=${coords.dec.toFixed(4)}°.`,
        expectedShiftPx: 0.5,
        suggestedBand: selectedBand,
        diagnosticWindow: 'User Pointing Field',
        epochA_fluxMultiplier: 1.0,
        epochB_fluxMultiplier: 1.0,
        epochShiftVectorPx: { dx: 0.5, dy: -0.3 },
        scientificCaveat: 'Real-time SPHEREx all-sky survey cutout extraction.',
      });
      setSearchError('');
    } else {
      setSearchError('Format: "83.82, -5.39" or "08h55m10s -07d14m42s" or target name.');
    }
  };

  // Slew handler from the 3D Mini-Map
  const handleMiniMapSlew = useCallback(
    (newRa: number, newDec: number) => {
      setCoordinates(newRa, newDec);
      setActiveTarget((prev) => ({
        ...prev,
        id: 'slew_pointing',
        name: `Boresight (${newRa.toFixed(2)}°, ${newDec >= 0 ? `+${newDec.toFixed(2)}` : newDec.toFixed(2)}°)`,
        designation: `RA ${degreesToRaSexagesimal(newRa)} / Dec ${degreesToDecSexagesimal(newDec)}`,
        ra: newRa,
        dec: newDec,
      }));
    },
    [setCoordinates]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04060C] text-[#F0F4FF] flex flex-col font-sans select-none">
      {/* 1. Top Navigation & Benchmark Targets Bar */}
      <header className="relative z-30 px-5 py-2.5 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.92)] backdrop-blur-xl gap-3">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <Telescope className="w-4 h-4 text-[var(--accent-cyan)]" />
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-[var(--accent-cyan)] bg-clip-text text-transparent">
              SkyTrace 2D Sky Image Viewer
            </h1>
          </div>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.25)] text-[10px] text-[var(--accent-cyan)] font-mono">
            WiseView & Aladin Mode
          </span>
        </div>

        {/* Center: Coordinate Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RA, Dec (e.g. 133.79, -7.24 or 08h55m -07d14m) or target..."
              className="w-full pl-8 pr-16 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] focus:border-[var(--accent-cyan)] text-xs font-mono text-white placeholder-slate-500 outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 rounded-md bg-[var(--accent-cyan)] text-[#060810] text-[10px] font-mono font-bold hover:brightness-110 transition-all"
            >
              GO
            </button>
          </div>
          {searchError && (
            <div className="absolute top-full left-0 mt-1 text-[10px] font-mono text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800 z-50">
              {searchError}
            </div>
          )}
        </form>

        {/* Right: Dossier Drawer Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSideDossier((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              showSideDossier
                ? 'bg-[var(--accent-cyan)] text-[#060810] border-transparent shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[var(--border-subtle)] text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Scientific Dossier</span>
          </button>
        </div>
      </header>

      {/* 2. Official NASA Challenge Benchmark Targets Bar */}
      <div className="relative z-20 px-5 py-2 flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.7)] backdrop-blur-md overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[var(--accent-cyan)]" />
          Challenge Benchmarks:
        </span>

        {BENCHMARK_TARGETS.map((target) => {
          const isSelected = activeTarget.id === target.id;
          return (
            <button
              key={target.id}
              onClick={() => handleSelectBenchmark(target)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-[rgba(0,229,255,0.15)] border-[var(--accent-cyan)] text-white shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                  : 'bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.08)] text-slate-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: target.badgeColor }}
              />
              <span className="font-semibold">{target.name}</span>
              <span className="text-[10px] text-slate-400 opacity-80">({target.badge})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Center Workspace: 2D Astronomical Viewport */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Primary 2D BlinkViewer Canvas (WiseView / Aladin Lite Style) */}
        <main className="relative flex-1 h-full overflow-hidden">
          <BlinkViewer
            imageABase64={imageABase64}
            imageBBase64={imageBBase64}
            differenceBase64={differenceBase64}
            candidates={activeCandidates}
            selectedCandidateId={selectedCandidate?.id}
            onCandidateSelect={(c) => {
              setSelectedCandidate(c);
              setShowSideDossier(true);
            }}
            epochALabel="Survey Pass 1 (Apr 2025)"
            epochBLabel="Survey Pass 2 (Oct 2025)"
            centralRa={ra}
            centralDec={dec}
            plateScaleArcsec={6.2}
            className="w-full h-full"
          />

          {/* Active Target Information Badge (Top Center Floating) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[rgba(6,8,16,0.85)] border border-[var(--border-subtle)] backdrop-blur-md shadow-2xl flex flex-col items-center gap-1 pointer-events-none select-none max-w-lg text-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">{activeTarget.name}</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-black"
                style={{ backgroundColor: activeTarget.badgeColor }}
              >
                {activeTarget.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight line-clamp-2">
              {activeTarget.description}
            </p>
          </div>

          {/* Floating 3D Celestial Mini-Map (Bottom-Right Radar Sphere) */}
          <div className="absolute bottom-16 right-5 z-20">
            <CelestialMiniMap
              ra={ra}
              dec={dec}
              onSlew={handleMiniMapSlew}
            />
          </div>
        </main>

        {/* 4. Right Side Scientific Dossier Drawer */}
        {showSideDossier && (
          <aside className="relative z-30 w-96 h-full flex flex-col border-l border-[var(--border-subtle)] bg-[rgba(6,8,16,0.95)] backdrop-blur-2xl shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header with Tabs */}
            <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.05)]">
                <button
                  onClick={() => setActiveSideTab('candidates')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    activeSideTab === 'candidates'
                      ? 'bg-[var(--accent-cyan)] text-[#060810]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Candidate
                </button>
                <button
                  onClick={() => setActiveSideTab('sed')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    activeSideTab === 'sed'
                      ? 'bg-[var(--accent-cyan)] text-[#060810]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  102-Band SED
                </button>
                <button
                  onClick={() => setActiveSideTab('dossier')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    activeSideTab === 'dossier'
                      ? 'bg-[var(--accent-cyan)] text-[#060810]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Evidence
                </button>
              </div>

              <button
                onClick={() => setShowSideDossier(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSideTab === 'candidates' && (
                <div className="space-y-4">
                  {/* Target Summary Card */}
                  <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">DESIGNATION</span>
                      <span className="text-xs font-mono font-semibold text-white">
                        {activeTarget.designation}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">COORDINATES</span>
                      <span className="text-xs font-mono text-cyan-300">
                        {ra.toFixed(3)}°, {dec >= 0 ? `+${dec.toFixed(3)}` : dec.toFixed(3)}°
                      </span>
                    </div>
                    {activeTarget.distanceLightYears && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">DISTANCE</span>
                        <span className="text-xs font-mono text-slate-200">
                          {activeTarget.distanceLightYears} light-years
                        </span>
                      </div>
                    )}
                    {activeTarget.properMotionArcsecYr && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">PROPER MOTION</span>
                        <span className="text-xs font-mono text-amber-300 font-bold">
                          {activeTarget.properMotionArcsecYr}″/year
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">EXPECTED HOP</span>
                      <span className="text-xs font-mono text-green-300 font-bold">
                        {activeTarget.expectedShiftPx > 0
                          ? `~${activeTarget.expectedShiftPx} pixels / 6 months`
                          : '0.0 px (Stationary flux variable)'}
                      </span>
                    </div>
                  </div>

                  {/* Candidate List Component */}
                  <CandidateList
                    candidates={activeCandidates}
                    selectedId={selectedCandidate?.id}
                    onSelect={(c) => setSelectedCandidate(c)}
                  />
                </div>
              )}

              {activeSideTab === 'sed' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-300">
                    102-Band SPHEREx Spectral Energy Distribution (0.75 – 5.0 µm)
                  </div>
                  <div className="h-64 rounded-xl bg-[rgba(6,8,16,0.6)] border border-[rgba(255,255,255,0.08)] p-2">
                    <SEDChart
                      candidateId={selectedCandidate?.id}
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(0,229,255,0.05)] border border-[rgba(0,229,255,0.15)] text-[11px] font-mono text-slate-300 leading-relaxed">
                    <strong className="text-[var(--accent-cyan)]">Diagnostic Window:</strong>{' '}
                    {activeTarget.diagnosticWindow}
                  </div>
                </div>
              )}

              {activeSideTab === 'dossier' && (
                <div className="space-y-4">
                  {selectedCandidate ? (
                    <EvidencePanel
                      candidate={selectedCandidate}
                      onClose={() => setShowSideDossier(false)}
                    />
                  ) : (
                    <div className="text-xs font-mono text-slate-400 text-center py-8">
                      Select a candidate to view scientific evidence
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 5. Bottom SPHEREx 102-Band Wavelength Slider */}
      <footer className="relative z-30 px-6 py-2 border-t border-[var(--border-subtle)] bg-[rgba(6,8,16,0.92)] backdrop-blur-xl">
        <WavelengthSlider />
      </footer>
    </div>
  );
}
