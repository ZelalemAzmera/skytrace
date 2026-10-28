'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Observation } from '../../types';
import { useSkyStore } from '../../store/skyStore';
import {
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface DetectorArray {
  id: number;
  name: string;
  minWl: number;
  maxWl: number;
  bandRange: [number, number];
}

export const SPHEREX_ARRAYS: DetectorArray[] = [
  { id: 1, name: 'Array 1', minWl: 0.75, maxWl: 1.11, bandRange: [1, 17] },
  { id: 2, name: 'Array 2', minWl: 1.11, maxWl: 1.64, bandRange: [18, 34] },
  { id: 3, name: 'Array 3', minWl: 1.64, maxWl: 2.42, bandRange: [35, 51] },
  { id: 4, name: 'Array 4', minWl: 2.42, maxWl: 3.82, bandRange: [52, 68] },
  { id: 5, name: 'Array 5', minWl: 3.82, maxWl: 4.42, bandRange: [69, 85] },
  { id: 6, name: 'Array 6', minWl: 4.42, maxWl: 5.00, bandRange: [86, 102] },
];

interface ObservationTimelineProps {
  observations: Observation[];
  className?: string;
}

export default function ObservationTimeline({
  observations = [],
  className = '',
}: ObservationTimelineProps) {
  const {
    selectedBand,
    setSelectedBand,
    selectedObsA,
    selectedObsB,
    selectObsA,
    selectObsB,
  } = useSkyStore();

  const [selectedArrayId, setSelectedArrayId] = useState<number | null>(null);

  // Filter observations by detector array if selected
  const filteredObservations = useMemo(() => {
    if (!selectedArrayId) return observations;
    const arr = SPHEREX_ARRAYS.find((a) => a.id === selectedArrayId);
    if (!arr) return observations;
    return observations.filter(
      (obs) =>
        obs.band_index >= arr.bandRange[0] && obs.band_index <= arr.bandRange[1]
    );
  }, [observations, selectedArrayId]);

  // Calculate time delta between Epoch A and Epoch B if both selected
  const timeDeltaDays = useMemo(() => {
    if (!selectedObsA || !selectedObsB) return null;
    const dateA = new Date(selectedObsA.obs_date).getTime();
    const dateB = new Date(selectedObsB.obs_date).getTime();
    if (isNaN(dateA) || isNaN(dateB)) return null;
    return Math.abs(Math.round((dateB - dateA) / (1000 * 60 * 60 * 24)));
  }, [selectedObsA, selectedObsB]);

  return (
    <div className={`glass-panel p-4 flex flex-col gap-3 backdrop-blur-md ${className}`}>
      {/* Header & Array Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent-cyan)]" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
            Multi-Epoch Survey Cadence
          </span>
          <span className="text-xs font-mono text-[var(--accent-gold)]">
            ({filteredObservations.length} passes)
          </span>
        </div>

        {/* Detector Array Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
          <button
            onClick={() => setSelectedArrayId(null)}
            className={`px-2 py-0.5 rounded transition-all ${
              selectedArrayId === null
                ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold'
                : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            All 6 Arrays
          </button>
          {SPHEREX_ARRAYS.map((arr) => {
            const isCurrent =
              selectedBand >= arr.bandRange[0] && selectedBand <= arr.bandRange[1];

            return (
              <button
                key={arr.id}
                onClick={() => {
                  setSelectedArrayId(arr.id);
                  setSelectedBand(arr.bandRange[0]);
                }}
                className={`px-2 py-0.5 rounded transition-all ${
                  selectedArrayId === arr.id
                    ? 'bg-[var(--accent-orange)] text-[#060810] font-bold'
                    : isCurrent
                    ? 'border border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[rgba(0,229,255,0.08)]'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                A{arr.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Timeline Track */}
      <div className="relative py-2">
        {/* Horizontal Baseline Axis Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[rgba(255,255,255,0.1)] -translate-y-1/2" />

        {/* Timeline Passes Container */}
        <div className="flex items-center justify-between relative z-10 gap-2 overflow-x-auto py-3 px-1">
          {filteredObservations.map((obs, idx) => {
            const isA = selectedObsA?.id === obs.id;
            const isB = selectedObsB?.id === obs.id;
            const isHighQ = obs.quality_pct >= 90;
            const isGoodQ = obs.quality_pct >= 75;
            const dotColor = isHighQ
              ? 'var(--accent-green)'
              : isGoodQ
              ? 'var(--accent-gold)'
              : 'var(--accent-orange)';

            return (
              <div
                key={obs.id}
                className="flex flex-col items-center group cursor-pointer shrink-0 min-w-[90px]"
                onClick={() => {
                  if (!selectedObsA) selectObsA(obs);
                  else if (!selectedObsB && obs.id !== selectedObsA.id) selectObsB(obs);
                  else if (obs.id === selectedObsA.id) selectObsA(null);
                  else if (obs.id === selectedObsB?.id) selectObsB(null);
                  else selectObsB(obs);
                }}
              >
                {/* Epoch Selection Marker Badge */}
                <div className="h-5 flex items-center justify-center">
                  {isA && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--accent-cyan)] text-[#060810] shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                      Epoch A
                    </span>
                  )}
                  {isB && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--accent-orange)] text-[#060810] shadow-[0_0_8px_rgba(255,107,53,0.5)]">
                      Epoch B
                    </span>
                  )}
                </div>

                {/* Quality Dot Node */}
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all my-1.5 flex items-center justify-center ${
                    isA
                      ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)] scale-125 shadow-[0_0_12px_rgba(0,229,255,0.8)]'
                      : isB
                      ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)] scale-125 shadow-[0_0_12px_rgba(255,107,53,0.8)]'
                      : 'border-[rgba(255,255,255,0.3)] bg-[#060810] group-hover:scale-125'
                  }`}
                  style={{
                    boxShadow: !isA && !isB ? `0 0 8px ${dotColor}` : undefined,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isA || isB ? '#060810' : dotColor }}
                  />
                </div>

                {/* Observation Date & Quality */}
                <span className="text-[10px] font-mono text-[var(--text-secondary)] group-hover:text-white transition-colors">
                  {obs.obs_date.split('T')[0]}
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  {obs.quality_pct.toFixed(0)}% Q
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-xs font-mono">
          {timeDeltaDays !== null ? (
            <div className="flex items-center gap-1.5 text-[var(--accent-gold)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Temporal Baseline: Δt = {timeDeltaDays} days</span>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">
              Click two pass nodes above to configure Differential Astrometry
            </span>
          )}
        </div>

        {selectedObsA && selectedObsB ? (
          <Link
            href={`/compare?obs_a=${encodeURIComponent(selectedObsA.id)}&obs_b=${encodeURIComponent(
              selectedObsB.id
            )}&band=${selectedBand}`}
            className="px-4 py-1.5 rounded-lg bg-[var(--accent-cyan)] text-[#060810] font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.4)] hover:shadow-[0_0_16px_rgba(0,229,255,0.6)] transition-all"
          >
            <span>Compare Epoch A & B</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            disabled
            className="px-3.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] text-xs font-semibold cursor-not-allowed"
          >
            Select 2 Passes to Compare
          </button>
        )}
      </div>
    </div>
  );
}
