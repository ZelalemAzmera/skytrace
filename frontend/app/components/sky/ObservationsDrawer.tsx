'use client';

import React from 'react';
import Link from 'next/link';
import { useSkyStore } from '../../store/skyStore';
import { useObservations } from '../../hooks/useObservations';
import { Layers, ArrowRight, Eye, Calendar, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function ObservationsDrawer() {
  const {
    ra,
    dec,
    radius,
    selectedBand,
    selectedObsA,
    selectedObsB,
    selectObsA,
    selectObsB,
  } = useSkyStore();

  const { data: observations, isLoading, error } = useObservations(
    ra,
    dec,
    radius,
    selectedBand
  );

  return (
    <div className="glass-panel p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent-green)]" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
            Multi-Epoch Sky Passes
          </span>
        </div>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          Field Coverage: r = {radius}°
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--text-secondary)] font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" />
          Querying NASA IRSA SPHEREx QR3 Archives...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-4 px-3 rounded bg-[rgba(239,71,111,0.1)] border border-[var(--danger)] text-xs text-[var(--danger)] font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Archive query error: {(error as Error).message}
        </div>
      )}

      {observations && observations.length === 0 && !isLoading && (
        <div className="text-center py-6 text-xs text-[var(--text-secondary)] font-mono">
          No SPHEREx survey tiles cataloged for this exact pointing. Try selecting a Calibration target above.
        </div>
      )}

      {observations && observations.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center justify-between">
            <span>{observations.length} Epoch Passes Cataloged</span>
            <span className="text-[var(--accent-cyan)]">Select 2 epochs for Differential Photometry</span>
          </div>

          {/* Observations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {observations.map((obs) => {
              const isSelectedA = selectedObsA?.id === obs.id;
              const isSelectedB = selectedObsB?.id === obs.id;

              return (
                <div
                  key={obs.id}
                  className={`p-2.5 rounded-lg border transition-all text-xs font-mono ${
                    isSelectedA
                      ? 'bg-[rgba(0,229,255,0.15)] border-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                      : isSelectedB
                      ? 'bg-[rgba(255,107,53,0.15)] border-[var(--accent-orange)] shadow-[0_0_12px_rgba(255,107,53,0.2)]'
                      : 'bg-[rgba(0,0,0,0.3)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-[var(--text-primary)] truncate max-w-[140px]">
                      {obs.id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--accent-gold)]">
                      {obs.quality_pct.toFixed(0)}% Q
                    </span>
                  </div>

                  <div className="text-[11px] text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>{obs.obs_date}</span>
                    <span className="text-[var(--text-muted)]">|</span>
                    <span>{obs.exposure_s}s</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => selectObsA(isSelectedA ? null : obs)}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        isSelectedA
                          ? 'bg-[var(--accent-cyan)] text-[#060810]'
                          : 'bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] hover:bg-[rgba(0,229,255,0.2)]'
                      }`}
                    >
                      {isSelectedA ? '✓ Epoch A' : 'Set as Epoch A'}
                    </button>
                    <button
                      onClick={() => selectObsB(isSelectedB ? null : obs)}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                        isSelectedB
                          ? 'bg-[var(--accent-orange)] text-[#060810]'
                          : 'bg-[rgba(255,107,53,0.1)] text-[var(--accent-orange)] hover:bg-[rgba(255,107,53,0.2)]'
                      }`}
                    >
                      {isSelectedB ? '✓ Epoch B' : 'Set as Epoch B'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Comparison CTA */}
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="text-[11px] font-mono text-[var(--text-secondary)]">
              {selectedObsA && selectedObsB ? (
                <span className="text-[var(--accent-green)] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Epochs aligned & ready for diffing
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  Pick Epoch A & Epoch B to run difference imaging
                </span>
              )}
            </div>

            {selectedObsA && selectedObsB ? (
              <Link
                href={`/compare?obs_a=${encodeURIComponent(selectedObsA.id)}&obs_b=${encodeURIComponent(
                  selectedObsB.id
                )}&band=${selectedBand}`}
                className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:shadow-[0_0_16px_rgba(0,229,255,0.5)] text-[#060810] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                Launch Blink Comparator <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                disabled
                className="bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] px-4 py-2 rounded-lg text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
              >
                Select 2 Epochs <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
