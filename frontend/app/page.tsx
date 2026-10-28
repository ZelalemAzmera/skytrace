'use client';

import React from 'react';
import Link from 'next/link';
import CelestialSphere from './components/sky/CelestialSphere';
import {
  Telescope,
  Layers,
  Sparkles,
  ArrowRight,
  Radio,
  Compass,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react';

const FEATURED_SHOWCASES = [
  {
    id: 'planet-x',
    title: 'Planet X & Kuiper Belt Search',
    sector: 'Sedna Recovery Sector',
    ra: 56.452,
    dec: 7.892,
    band: 88,
    wavelength: '4.26 µm',
    badge: 'Methane Ice Signature',
    badgeColor: 'var(--accent-cyan)',
    description:
      'Search for high-eccentricity trans-Neptunian objects and potential distant planets via characteristic solid-state CH4 surface ice absorption and high annual parallax.',
    metrics: [
      { label: 'Predicted Distance', value: '> 300 AU' },
      { label: 'Diagnostic Band', value: '4.26 µm CO2/CH4' },
      { label: 'Expected Parallax', value: '< 40 mas' },
    ],
    compareUrl: '/compare?obs_a=spherex_qr3_pass1_0042&obs_b=spherex_qr3_pass2_0042&band=88',
  },
  {
    id: 'y-dwarf',
    title: 'Orion Nebula Y-Dwarf Nursery',
    sector: 'M42 Active Star Formation',
    ra: 83.8221,
    dec: -5.3911,
    band: 33,
    wavelength: '1.65 µm',
    badge: 'Sub-Stellar Atmosphere',
    badgeColor: 'var(--accent-orange)',
    description:
      'Identify ultra-cool brown dwarfs (T < 450 K) embedded in the Orion starburst complex using differential photometry and diagnostic 1.65 µm atmospheric methane windows.',
    metrics: [
      { label: 'Effective Temp', value: '380 - 450 K' },
      { label: 'Molecular Features', value: 'CH4, H2O, NH3' },
      { label: 'Cataloged Passes', value: '48 Epochs' },
    ],
    compareUrl: '/compare?obs_a=spherex_qr3_pass1_0042&obs_b=spherex_qr3_pass2_0042&band=33',
  },
  {
    id: 'nep-survey',
    title: 'North Ecliptic Pole Deep Survey',
    sector: 'Continuous Viewing Zone',
    ra: 270.0,
    dec: 66.56,
    band: 50,
    wavelength: '2.15 µm',
    badge: 'Calibration Benchmark',
    badgeColor: 'var(--accent-green)',
    description:
      'Deepest survey pointing in the SPHEREx all-sky map with over 100 overlapping passes, serving as the benchmark for cosmic infrared background (CIB) fluctuation studies.',
    metrics: [
      { label: 'Overlapping Passes', value: '> 100 Passes' },
      { label: 'Astrometric Error', value: '< 0.05″ RMS' },
      { label: 'Primary Array', value: 'Array 3 (Ks)' },
    ],
    compareUrl: '/compare?obs_a=spherex_qr3_pass1_0042&obs_b=spherex_qr3_pass2_0042&band=50',
  },
];

const STAT_BADGES = [
  { value: '102', label: 'Spectroscopic Channels', sub: '0.75 – 5.0 µm All-Sky' },
  { value: '6.2″', label: 'Pixel Plate Scale', sub: 'WCS TAN Astrometry' },
  { value: '4', label: 'Physical SED Templates', sub: 'Reduced χ² Minimization' },
  { value: 'QR3', label: 'NASA IRSA Data Release', sub: 'SIA2 & IBE Live Pipeline' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#060810] text-[#F0F4FF] flex flex-col font-sans select-none">
      {/* 1. Full-Screen Interactive 3D Celestial Sphere Background */}
      <div className="fixed inset-0 z-0 pointer-events-auto opacity-70">
        <CelestialSphere className="w-full h-full" />
      </div>

      {/* Atmospheric Vignette & Radial Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(6,8,16,0.2)_0%,rgba(6,8,16,0.7)_65%,#060810_100%)]" />

      {/* 2. Top Header Navigation */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.6)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(0,229,255,0.15)] text-[var(--accent-cyan)] flex items-center justify-center border border-[rgba(0,229,255,0.3)] shadow-[0_0_12px_rgba(0,229,255,0.3)]">
            <Telescope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-[var(--accent-cyan)] bg-clip-text text-transparent">
              SkyTrace
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono">
              NASA SPHEREx Discovery Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.25)] text-xs text-[var(--accent-cyan)] font-mono">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
            NASA Space Apps Challenge 2026
          </div>

          <Link
            href="/explore"
            className="px-4 py-2 rounded-lg bg-[var(--accent-cyan)] text-[#060810] text-xs font-bold hover:shadow-[0_0_16px_rgba(0,229,255,0.5)] transition-all flex items-center gap-1.5"
          >
            <span>Launch Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 3. Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-20 max-w-6xl mx-auto w-full text-center">
        {/* Mission Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono mb-6 backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span>Planet X and SPHEREx — Multi-Epoch Astronomical Transient Engine</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Explore the Sky.{' '}
          <span className="bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-gold)] to-[var(--accent-orange)] bg-clip-text text-transparent">
            Compare the Evidence.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-8">
          Investigate real multi-epoch infrared sky observations from NASA IRSA across 102 spectroscopic bands. Discover moving asteroids, ultra-cool brown dwarfs, and candidate trans-Neptunian objects through differential photometry and honest scientific evidence.
        </p>

        {/* Dual Primary Call-to-Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/explore"
            className="px-6 py-3.5 rounded-xl bg-[var(--accent-cyan)] text-[#060810] font-bold text-sm hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Launch 3D Celestial Explorer</span>
          </Link>

          <Link
            href="/compare"
            className="px-6 py-3.5 rounded-xl bg-[rgba(13,18,32,0.85)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-sm font-semibold transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <Layers className="w-4 h-4 text-[var(--accent-orange)]" />
            <span>Open Blink Comparator Engine</span>
          </Link>
        </div>

        {/* 4. Stat Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-16">
          {STAT_BADGES.map((stat, i) => (
            <div
              key={i}
              className="glass-panel p-4 text-left border border-[var(--border-subtle)] backdrop-blur-md transition-all hover:border-[var(--border-hover)]"
            >
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--accent-cyan)] mb-1">
                {stat.value}
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                {stat.label}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* 5. Featured Observation Showcase Cards */}
        <div className="w-full text-left space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--accent-gold)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
                Featured Investigation Showcases
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              Pre-computed Multi-Epoch Baselines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURED_SHOWCASES.map((showcase) => (
              <div
                key={showcase.id}
                className="glass-panel p-5 flex flex-col justify-between border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all group backdrop-blur-md"
              >
                <div>
                  {/* Badge & Sector */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: `${showcase.badgeColor}20`,
                        color: showcase.badgeColor,
                        border: `1px solid ${showcase.badgeColor}40`,
                      }}
                    >
                      {showcase.badge}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Band {showcase.band}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors mb-1">
                    {showcase.title}
                  </h4>
                  <div className="text-xs font-mono text-[var(--accent-gold)] mb-3">
                    {showcase.sector} ({showcase.ra.toFixed(1)}°, {showcase.dec >= 0 ? `+${showcase.dec.toFixed(1)}` : showcase.dec.toFixed(1)}°)
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                    {showcase.description}
                  </p>

                  {/* Telemetry Metrics */}
                  <div className="bg-[rgba(0,0,0,0.35)] p-2.5 rounded-lg border border-[var(--border-subtle)] space-y-1 mb-4 font-mono text-[11px]">
                    {showcase.metrics.map((m, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-[var(--text-muted)]">{m.label}:</span>
                        <span className="text-[var(--text-primary)] font-semibold">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Action Link */}
                <Link
                  href={showcase.compareUrl}
                  className="w-full py-2 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[var(--accent-cyan)] hover:text-[#060810] border border-[var(--border-subtle)] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Launch Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 6. Footer */}
      <footer className="relative z-20 px-6 py-6 border-t border-[var(--border-subtle)] bg-[rgba(6,8,16,0.85)] text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2">
          <span>SkyTrace Discovery Engine</span>
          <span>•</span>
          <span>NASA Space Apps Challenge 2026</span>
          <span>•</span>
          <span className="text-[var(--accent-cyan)]">SPHEREx QR3 Data Release</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="hover:text-white transition-colors">
            3D Explorer
          </Link>
          <Link href="/compare" className="hover:text-white transition-colors">
            Blink Viewer
          </Link>
          <a
            href="https://irsa.ipac.caltech.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <span>NASA IRSA</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
