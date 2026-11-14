'use client';

import React from 'react';
import Link from 'next/link';
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
  Eye,
  Sliders,
  Crosshair,
} from 'lucide-react';
import { BENCHMARK_TARGETS } from './lib/benchmarkTargets';

const STAT_BADGES = [
  { value: '102', label: 'Spectroscopic Channels', sub: '0.75 – 5.0 µm All-Sky' },
  { value: '6.2″', label: 'Pixel Plate Scale', sub: 'WCS TAN Astrometry' },
  { value: '5', label: 'Official Benchmarks', sub: 'High-PM, Brown Dwarf & Variables' },
  { value: 'QR3', label: 'NASA IRSA Archive', sub: '6-Month Cadence Repeat' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#04060C] text-[#F0F4FF] flex flex-col font-sans select-none">
      {/* Deep Space Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(10,25,50,0.35)_0%,rgba(6,8,16,0.8)_65%,#04060C_100%)]" />

      {/* 1. Header Navigation */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.7)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(0,229,255,0.15)] text-[var(--accent-cyan)] flex items-center justify-center border border-[rgba(0,229,255,0.3)] shadow-[0_0_12px_rgba(0,229,255,0.3)]">
            <Telescope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-[var(--accent-cyan)] bg-clip-text text-transparent">
              SkyTrace
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              NASA SPHEREx 2D Sky Image Viewer & Discovery Engine
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
            <span>Launch Viewer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-20 max-w-6xl mx-auto w-full text-center">
        {/* Mission Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[var(--border-subtle)] text-xs text-slate-300 font-mono mb-6 backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
          <span>Planet X and SPHEREx — Inside-Looking-Out 2D Sky Image Viewer (WiseView & Aladin Style)</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Blink the Infrared Sky.{' '}
          <span className="bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-gold)] to-[var(--accent-orange)] bg-clip-text text-transparent">
            Follow the Motion.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-8">
          Investigate real multi-epoch telescope cutouts across 102 spectroscopic infrared bands. Discover moving brown dwarfs, high proper-motion stars, eclipsing binaries, and outer solar system candidates by blinking photos taken 6 months apart against fixed background galaxies.
        </p>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/explore"
            className="px-7 py-3.5 rounded-xl bg-[var(--accent-cyan)] text-[#060810] font-bold text-sm hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Launch 2D Sky Image Viewer</span>
          </Link>

          <a
            href="https://byw.tools/wiseview"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl bg-[rgba(13,18,32,0.85)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--border-subtle)] text-sm font-semibold transition-all flex items-center gap-2 backdrop-blur-md text-slate-300"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>WiseView Reference Architecture</span>
          </a>
        </div>

        {/* 3. Stat Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-16">
          {STAT_BADGES.map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[rgba(6,8,16,0.6)] text-left border border-[var(--border-subtle)] backdrop-blur-md transition-all hover:border-[rgba(0,229,255,0.3)] shadow-lg"
            >
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--accent-cyan)] mb-1">
                {stat.value}
              </div>
              <div className="text-xs font-bold text-white">
                {stat.label}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* 4. The 5 Official Benchmark Targets Grid */}
        <div className="w-full text-left space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--accent-gold)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Official Challenge Evaluation Benchmarks
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Tested Directly by NASA Space Apps Judges
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENCHMARK_TARGETS.map((target) => (
              <div
                key={target.id}
                className="p-4 rounded-xl bg-[rgba(6,8,16,0.7)] border border-[var(--border-subtle)] hover:border-[rgba(0,229,255,0.4)] transition-all flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-black"
                      style={{ backgroundColor: target.badgeColor }}
                    >
                      {target.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Band {target.suggestedBand}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">{target.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {target.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    {target.expectedShiftPx > 0
                      ? `Hop: ~${target.expectedShiftPx} px / 6-mo`
                      : `Variability: Δm ~ ${target.magDelta} mag`}
                  </span>
                  <Link
                    href={`/explore`}
                    className="text-[var(--accent-cyan)] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 5. Footer */}
      <footer className="relative z-20 border-t border-[var(--border-subtle)] bg-[rgba(6,8,16,0.85)] px-6 py-4 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>SPHEREx Quick Release 3 (QR3) · DOI: 10.26131/IRSA662 · NASA IRSA SIA2/IBE Pipeline</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="hover:text-white transition-colors">
            2D Sky Viewer
          </Link>
          <a
            href="https://irsa.ipac.caltech.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <span>IRSA Archive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
