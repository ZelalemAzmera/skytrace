'use client';

import React, { useState } from 'react';
import { Candidate } from '../../types';
import {
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Compass,
  Zap,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface CandidateListProps {
  candidates: Candidate[];
  selectedId?: string | null;
  onSelect?: (candidate: Candidate) => void;
  className?: string;
}

export default function CandidateList({
  candidates = [],
  selectedId = null,
  onSelect,
  className = '',
}: CandidateListProps) {
  const [minConfidence, setMinConfidence] = useState(0.2);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Filter and sort candidates by confidence score
  const filteredCandidates = candidates
    .filter((c) => c.confidence_score >= minConfidence)
    .filter((c) => {
      if (filterType === 'ALL') return true;
      return c.classification.toUpperCase().includes(filterType);
    })
    .sort((a, b) => b.confidence_score - a.confidence_score);

  // Bulk Export All Filtered Candidates as CSV
  const handleExportAllCSV = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredCandidates.length === 0) return;

    const headers = [
      'Candidate_ID',
      'RA_deg',
      'Dec_deg',
      'Pixel_X',
      'Pixel_Y',
      'SNR_Change',
      'Confidence_Score',
      'Classification',
      'Parallax_pc',
      'Proper_Motion_mas_yr',
      'Sensor_Clearance_px',
      'Near_Boundary_Risk',
      'Solar_System_Match',
      'Caveats',
    ];

    const rows = filteredCandidates.map((c) => {
      const boundaryDist = Math.min(c.pixel_x, 100 - c.pixel_x, c.pixel_y, 100 - c.pixel_y);
      return [
        c.id,
        c.ra_deg.toFixed(5),
        c.dec_deg.toFixed(5),
        c.pixel_x.toFixed(1),
        c.pixel_y.toFixed(1),
        c.snr_change.toFixed(1),
        c.confidence_score.toFixed(3),
        `"${c.classification}"`,
        c.parallax_distance_pc ? c.parallax_distance_pc.toFixed(2) : 'N/A',
        c.proper_motion_mas_yr ? c.proper_motion_mas_yr.toFixed(1) : 'N/A',
        boundaryDist.toFixed(1),
        boundaryDist < 15 ? 'YES' : 'NO',
        c.solar_system_crossmatch?.matched ? `"${c.solar_system_crossmatch.nearest_body}"` : 'CLEAN',
        `"${(c.caveats || []).join(' | ')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkyTrace_candidates_catalog.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`glass-panel p-4 flex flex-col gap-3 backdrop-blur-md ${className}`}>
      {/* Header & Filter Controls */}
      <div className="border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-orange)]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
              Transient Candidates
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,107,53,0.15)] text-[var(--accent-orange)] font-mono font-bold">
              {filteredCandidates.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Export CSV button */}
            <button
              onClick={handleExportAllCSV}
              title="Export filtered candidates as CSV"
              className="p-1 px-2 rounded bg-[rgba(0,229,255,0.1)] hover:bg-[rgba(0,229,255,0.2)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.25)] text-[10px] font-mono flex items-center gap-1 transition-all"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>

            {/* Confidence Slider */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Min:</span>
              <input
                type="range"
                min={0.0}
                max={0.9}
                step={0.05}
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-14 accent-[var(--accent-cyan)] cursor-pointer"
              />
              <span className="w-7 text-[var(--accent-cyan)] font-bold">
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1 overflow-x-auto text-[11px] font-mono">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PROPER', label: 'High-PM' },
            { id: 'DWARF', label: 'Y-Dwarf' },
            { id: 'PLANET', label: 'Planet X' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2 py-0.5 rounded transition-all ${
                filterType === tab.id
                  ? 'bg-[var(--accent-cyan)] text-[#060810] font-bold'
                  : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates List */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--text-secondary)] font-mono">
            No candidates meet the {(minConfidence * 100).toFixed(0)}% confidence threshold in this
            field. Try lowering the filter.
          </div>
        ) : (
          filteredCandidates.map((cand) => {
            const isSelected = cand.id === selectedId;
            const isHigh = cand.confidence_score >= 0.7;
            const isModerate = cand.confidence_score >= 0.4;
            const confColor = isHigh
              ? 'var(--accent-green)'
              : isModerate
              ? 'var(--accent-gold)'
              : 'var(--danger)';

            const boundaryDist = Math.min(
              cand.pixel_x,
              100 - cand.pixel_x,
              cand.pixel_y,
              100 - cand.pixel_y
            );
            const isNearBoundary = boundaryDist < 15;

            return (
              <div
                key={cand.id}
                onClick={() => onSelect && onSelect(cand)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-xs font-mono relative overflow-hidden ${
                  isSelected
                    ? 'bg-[rgba(0,229,255,0.12)] border-[var(--accent-cyan)] shadow-[0_0_16px_rgba(0,229,255,0.25)]'
                    : 'bg-[rgba(0,0,0,0.3)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                {/* Confidence Left Stripe Indicator */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: confColor }}
                />

                <div className="flex items-center justify-between mb-1.5 pl-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--text-primary)]">
                    <span>{cand.id}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-normal"
                      style={{
                        backgroundColor: `${confColor}20`,
                        color: confColor,
                        border: `1px solid ${confColor}40`,
                      }}
                    >
                      {cand.classification}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </div>

                {/* Telemetry Row */}
                <div className="grid grid-cols-2 gap-2 pl-1.5 mb-2 text-[11px] text-[var(--text-secondary)]">
                  <div>
                    <span className="text-[var(--text-muted)]">RA/Dec: </span>
                    <span className="text-[var(--text-primary)]">
                      {cand.ra_deg.toFixed(3)}°, {cand.dec_deg >= 0 ? `+${cand.dec_deg.toFixed(3)}` : cand.dec_deg.toFixed(3)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">ΔSNR: </span>
                    <span className="text-[var(--accent-cyan)] font-bold">
                      +{cand.snr_change.toFixed(1)}σ
                    </span>
                  </div>
                </div>

                {/* Artifact Clearance & Solar System Badges */}
                <div className="pl-1.5 mb-2 flex items-center gap-1.5 flex-wrap">
                  {isNearBoundary ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[rgba(239,71,111,0.2)] text-[var(--danger)] border border-[rgba(239,71,111,0.3)] flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Edge Risk ({boundaryDist.toFixed(0)}px)
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[rgba(0,229,255,0.08)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.2)]">
                      Clearance: {boundaryDist.toFixed(0)}px
                    </span>
                  )}

                  {cand.solar_system_crossmatch?.matched && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[rgba(255,107,53,0.15)] text-[var(--accent-orange)] border border-[rgba(255,107,53,0.3)]">
                      🪐 {cand.solar_system_crossmatch.nearest_body}
                    </span>
                  )}
                </div>

                {/* Confidence Bar & Metrics */}
                <div className="pl-1.5 flex items-center gap-2">
                  <div className="flex-1 bg-[rgba(255,255,255,0.08)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cand.confidence_score * 100}%`,
                        backgroundColor: confColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: confColor }}>
                    {(cand.confidence_score * 100).toFixed(0)}% Conf
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
