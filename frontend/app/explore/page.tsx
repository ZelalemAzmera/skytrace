'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CelestialSphere from '../components/sky/CelestialSphere';
import SkyHUD from '../components/sky/SkyHUD';
import WavelengthSlider from '../components/sky/WavelengthSlider';
import ObservationsDrawer from '../components/sky/ObservationsDrawer';
import ObservationTimeline from '../components/sky/ObservationTimeline';
import ControlToggles from '../components/sky/ControlToggles';
import PlanetXPanel from '../components/sky/PlanetXPanel';
import { useSkyStore } from '../store/skyStore';
import { useObservations } from '../hooks/useObservations';
import { Telescope, ArrowLeft, Layers, ChevronUp, ChevronDown, Clock } from 'lucide-react';

export default function ExplorePage() {
  // Small screens start with panels closed so the sky stays visible; desktop opens them all.
  const [drawerExpanded, setDrawerExpanded] = useState<boolean>(false);
  const [showTarget, setShowTarget] = useState<boolean>(false);
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [showPlanetX, setShowPlanetX] = useState<boolean>(false);
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setDrawerExpanded(true);
      setShowTarget(true);
      setShowLayers(true);
    }
  }, []);
  const [activeTab, setActiveTab] = useState<'cards' | 'timeline'>('cards');
  const { ra, dec, radius, selectedBand } = useSkyStore();

  const { data: observations = [] } = useObservations(ra, dec, radius, selectedBand);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060810] text-[#F0F4FF]">
      {/* 1. Global Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.7)] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <Telescope className="w-5 h-5 text-[var(--accent-cyan)]" />
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-[var(--accent-cyan)] bg-clip-text text-transparent">
              SkyTrace Celestial Explorer
            </h1>
          </div>
        </div>

        {/* Live Data Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.25)] text-xs text-[var(--accent-cyan)] font-mono">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
            NASA IRSA SPHEREx QR3 Live Archive
          </div>
          <button
            onClick={() => setShowPlanetX((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showPlanetX
                ? 'bg-[#ff3df2] text-[#060810] border-transparent'
                : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            Planet X
          </button>
          <Link
            href="/compare"
            className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--accent-orange)]" />
            Blink Comparator
          </Link>
        </div>
      </header>

      {/* 2. Three.js Full-Viewport Celestial Sphere */}
      <main className="absolute inset-0 z-0">
        <CelestialSphere className="w-full h-full" />
      </main>

      {/* Panel switches (small screens) */}
      <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-30 flex gap-1.5 lg:hidden">
        {([
          ['Target', showTarget, setShowTarget],
          ['Layers', showLayers, setShowLayers],
          ['Panels', drawerExpanded, setDrawerExpanded],
        ] as const).map(([label, on, set]) => (
          <button
            key={label}
            onClick={() => set(!on)}
            className={`px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md transition-all ${
              on
                ? 'bg-[var(--accent-cyan)] text-[#060810] border-transparent font-bold'
                : 'bg-[rgba(13,18,32,0.85)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 3. Left-side Target HUD Overlay */}
      {showTarget && <SkyHUD />}

      {/* 4. Right-side Layer Toggles */}
      {showLayers && <ControlToggles />}

      {/* Planet X orbit / mass / timeline panel */}
      {showPlanetX && <PlanetXPanel onClose={() => setShowPlanetX(false)} />}

      {/* 5. Bottom Dock: Spectroscopic Channel & Multi-Epoch Passes */}
      <div className="absolute bottom-4 left-4 right-4 lg:left-[25rem] lg:right-[16.5rem] z-20 pointer-events-none">
        <div className="max-w-6xl mx-auto flex flex-col gap-2 max-h-[55vh]">
          {/* Collapse/Expand Toggle & View Switcher */}
          <div className="self-end pointer-events-auto flex items-center gap-2">
            {drawerExpanded && (
              <div className="flex items-center bg-[rgba(13,18,32,0.85)] border border-[var(--border-subtle)] rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    activeTab === 'cards'
                      ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Epoch Passes
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                    activeTab === 'timeline'
                      ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Timeline</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setDrawerExpanded(!drawerExpanded)}
              className="px-3 py-1 rounded-t-lg bg-[rgba(13,18,32,0.85)] border border-[var(--border-subtle)] border-b-0 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 backdrop-blur-md"
            >
              {drawerExpanded ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Collapse Instrument Panels
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Expand Instrument Panels
                </>
              )}
            </button>
          </div>

          {drawerExpanded && (
            <div className="grid grid-cols-1 2xl:grid-cols-12 gap-3 pointer-events-auto transition-all animate-fadeIn overflow-y-auto">
              {/* Left Column: Wavelength Slider (5 cols) */}
              <div className="2xl:col-span-5">
                <WavelengthSlider />
              </div>

              {/* Right Column: Multi-Epoch Passes or Cadence Timeline (7 cols) */}
              <div className="2xl:col-span-7">
                {activeTab === 'cards' ? (
                  <ObservationsDrawer />
                ) : (
                  <ObservationTimeline observations={observations} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}