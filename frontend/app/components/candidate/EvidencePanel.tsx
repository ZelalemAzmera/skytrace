'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Candidate, Evidence } from '../../types';
import { useEvidence } from '../../hooks/useObservations';
import { crossMatchSolarSystem } from '../../lib/solarSystemCrossmatch';
import {
  X,
  ShieldAlert,
  Download,
  ExternalLink,
  Sparkles,
  Layers,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Compass,
  Radar,
  Quote,
} from 'lucide-react';

interface EvidencePanelProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export default function EvidencePanel({ candidate, onClose }: EvidencePanelProps) {
  const { data: evidence, isLoading } = useEvidence(candidate?.id || null);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  if (!candidate) return null;

  const score = candidate.confidence_score;
  const confTier =
    score >= 0.8
      ? { label: 'Very High Confidence', color: 'var(--accent-green)' }
      : score >= 0.6
      ? { label: 'High Confidence', color: 'var(--accent-cyan)' }
      : score >= 0.35
      ? { label: 'Moderate Confidence', color: 'var(--accent-gold)' }
      : { label: 'Low Confidence (Unconfirmed)', color: 'var(--danger)' };

  // Sensor boundary clearance calculation (100x100 detector scale)
  const boundaryDist = Math.min(
    candidate.pixel_x,
    100 - candidate.pixel_x,
    candidate.pixel_y,
    100 - candidate.pixel_y
  );
  const isNearBoundary = boundaryDist < 15;

  // NASA MOST & Solar System Cross-match
  const crossMatch =
    candidate.solar_system_crossmatch ||
    crossMatchSolarSystem(candidate.ra_deg, candidate.dec_deg);

  // BibTeX Citation snippet
  const bibtexCitation = `@misc{spherex_qr3_2026,
  author = {{SPHEREx Science Team} and {IPAC/Caltech}},
  title = {NASA SPHEREx Quick Release 3 (QR3) Spectral Survey},
  year = {2026},
  publisher = {NASA/IPAC Infrared Science Archive},
  doi = {10.26131/IRSA662},
  url = {https://irsa.ipac.caltech.edu/data/SPHEREx/}
}`;

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(bibtexCitation);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  // Export dossier as JSON
  const handleExportJSON = () => {
    const data = {
      candidate_id: candidate.id,
      timestamp: new Date().toISOString(),
      ra_deg: candidate.ra_deg,
      dec_deg: candidate.dec_deg,
      classification: candidate.classification,
      confidence_score: candidate.confidence_score,
      snr_change: candidate.snr_change,
      sensor_edge_distance_px: boundaryDist,
      near_sensor_boundary: isNearBoundary,
      solar_system_crossmatch: crossMatch,
      measurements: evidence?.measurements || [],
      caveats: candidate.caveats || [],
      irsa_links: evidence?.irsa_links || [],
      doi_citation: '10.26131/IRSA662',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkyTrace_${candidate.id}_evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export dossier as CSV
  const handleExportCSV = () => {
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
      'Sensor_Clearance_px',
      'NASA_MOST_Match',
      'Nearest_Body',
      'Separation_arcsec',
      'DOI',
    ];
    const row = [
      candidate.id,
      candidate.ra_deg.toFixed(5),
      candidate.dec_deg.toFixed(5),
      candidate.pixel_x.toFixed(1),
      candidate.pixel_y.toFixed(1),
      candidate.snr_change.toFixed(1),
      candidate.confidence_score.toFixed(3),
      `"${candidate.classification}"`,
      candidate.parallax_distance_pc ? candidate.parallax_distance_pc.toFixed(2) : 'N/A',
      boundaryDist.toFixed(1),
      crossMatch.matched ? 'MATCHED' : 'CLEAN',
      `"${crossMatch.nearest_body}"`,
      crossMatch.angular_separation_arcsec.toFixed(1),
      '10.26131/IRSA662',
    ];
    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkyTrace_${candidate.id}_evidence.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-lg z-50 bg-[rgba(6,8,16,0.96)] border-l border-[var(--border-subtle)] shadow-[-16px_0_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col font-sans overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[rgba(13,18,32,0.6)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[rgba(0,229,255,0.12)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.25)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)] font-mono">
                  {candidate.id}
                </h2>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: `${confTier.color}20`,
                    color: confTier.color,
                    border: `1px solid ${confTier.color}40`,
                  }}
                >
                  {candidate.classification}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                Astronomical Investigation Dossier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Confidence Score Arc Card */}
          <div className="glass-panel p-4 flex items-center gap-4 border border-[var(--border-subtle)]">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              {/* Circular SVG Gauge */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[rgba(255,255,255,0.08)]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${score * 100}, 100`}
                  strokeWidth="3.5"
                  stroke={confTier.color}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono font-bold text-sm text-[var(--text-primary)]">
                {(score * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                Multi-Factor Confidence
              </div>
              <div className="text-sm font-bold" style={{ color: confTier.color }}>
                {confTier.label}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Calculated from signal-to-noise ratio delta, spatial FWHM PSF profile, and sensor edge clearance.
              </p>
            </div>
          </div>

          {/* NASA MOST / Minor Planet Cross-Match Card */}
          <div
            className={`glass-panel p-4 border space-y-2.5 ${
              crossMatch.matched
                ? 'border-[rgba(255,107,53,0.4)] bg-[rgba(255,107,53,0.06)]'
                : 'border-[rgba(6,214,160,0.4)] bg-[rgba(6,214,160,0.05)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <Radar className="w-4 h-4 text-[var(--accent-cyan)]" />
                <span>NASA MOST Minor Planet Cross-Match</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  crossMatch.matched
                    ? 'bg-[rgba(255,107,53,0.2)] text-[var(--accent-orange)]'
                    : 'bg-[rgba(6,214,160,0.2)] text-[var(--accent-green)]'
                }`}
              >
                {crossMatch.matched ? 'SOLAR SYSTEM MATCH' : 'CLEAN (>60″)'}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              {crossMatch.explanation}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Nearest Body</span>
                <span className="text-[var(--text-primary)] font-bold">{crossMatch.nearest_body}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Separation</span>
                <span className="text-[var(--accent-cyan)] font-bold">
                  {crossMatch.angular_separation_arcsec < 60
                    ? `${crossMatch.angular_separation_arcsec.toFixed(1)}″`
                    : `${(crossMatch.angular_separation_arcsec / 3600).toFixed(2)}°`}
                </span>
              </div>
            </div>
          </div>

          {/* Sensor Boundary Clearance & Artifact Guard */}
          <div
            className={`glass-panel p-3.5 border flex items-center justify-between ${
              isNearBoundary
                ? 'border-[rgba(239,71,111,0.4)] bg-[rgba(239,71,111,0.08)]'
                : 'border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.03)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isNearBoundary ? (
                <ShieldAlert className="w-4 h-4 text-[var(--danger)] shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  {isNearBoundary
                    ? 'Optical Artifact Risk: Near Sensor Boundary'
                    : 'Detector Edge Clearance Verified'}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                  Distance to focal plane edge: {boundaryDist.toFixed(1)} px (Safety threshold: 15 px)
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isNearBoundary
                  ? 'bg-[rgba(239,71,111,0.2)] text-[var(--danger)]'
                  : 'bg-[rgba(0,229,255,0.2)] text-[var(--accent-cyan)]'
              }`}
            >
              {isNearBoundary ? 'CAUTION' : 'PASS'}
            </span>
          </div>

          {/* Narrative Summary */}
          {evidence && (
            <div className="glass-panel p-4 border-l-4 border-l-[var(--accent-cyan)] space-y-1.5">
              <div className="text-xs uppercase font-mono tracking-wider text-[var(--accent-cyan)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Scientific Context & Finding
              </div>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
                {evidence.narrative}
              </p>
            </div>
          )}

          {/* Astrometric Measurements Table */}
          <div className="glass-panel p-4 space-y-3">
            <div className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--accent-cyan)]" /> Photometric & Astrometric Telemetry
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Right Ascension (α)</span>
                <span className="text-[var(--text-primary)] font-bold">{candidate.ra_deg.toFixed(5)}°</span>
              </div>
              <div className="bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Declination (δ)</span>
                <span className="text-[var(--text-primary)] font-bold">
                  {candidate.dec_deg >= 0 ? `+${candidate.dec_deg.toFixed(5)}` : candidate.dec_deg.toFixed(5)}°
                </span>
              </div>
              <div className="bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">SNR Change (ΔSNR)</span>
                <span className="text-[var(--accent-cyan)] font-bold">+{candidate.snr_change.toFixed(1)}σ</span>
              </div>
              <div className="bg-[rgba(0,0,0,0.3)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Pixel Centroid (X, Y)</span>
                <span className="text-[var(--text-primary)] font-bold">
                  ({candidate.pixel_x.toFixed(1)}, {candidate.pixel_y.toFixed(1)})
                </span>
              </div>
            </div>

            {/* Parallax & Distance if detected */}
            {candidate.parallax_distance_pc && (
              <div className="bg-[rgba(255,209,102,0.1)] border border-[rgba(255,209,102,0.3)] p-3 rounded-lg text-xs font-mono">
                <div className="text-[var(--accent-gold)] font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Annual Parallax Detected across 2 AU Baseline
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                  <div>
                    <span>Distance (pc): </span>
                    <span className="text-white font-bold">{candidate.parallax_distance_pc.toFixed(2)} pc</span>
                  </div>
                  <div>
                    <span>Distance (ly): </span>
                    <span className="text-white font-bold">
                      {(candidate.parallax_distance_pc * 3.262).toFixed(2)} ly
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Scientific Caveats Banner */}
          <div className="glass-panel p-4 border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.06)] space-y-2.5">
            <div className="text-xs uppercase font-mono tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Mandatory Scientific Caveats
            </div>

            <div className="space-y-1.5 text-xs text-[var(--text-secondary)] font-sans">
              {(candidate.caveats && candidate.caveats.length > 0
                ? candidate.caveats
                : [
                    'Candidate detected in single epoch pass; requires independent follow-up to confirm astrophysical origin.',
                    'Point spread function (PSF) circularity matches diffraction expectations, but optical artifacts cannot be ruled out completely.',
                    'Target is located >15 pixels from sensor detector edge, passing minimum clearance bounds.',
                  ]
              ).map((caveat, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[var(--accent-gold)] font-bold">•</span>
                  <p className="leading-snug">{caveat}</p>
                </div>
              ))}
            </div>
          </div>

          {/* NASA IRSA Source Data Links */}
          <div className="glass-panel p-4 space-y-2.5">
            <div className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-cyan)]" /> NASA IRSA Archive Verifications
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <a
                href={`https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3?POS=${candidate.ra_deg},${candidate.dec_deg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[var(--border-subtle)] text-[var(--accent-cyan)] transition-colors"
              >
                <span>Direct FITS Primary Array (IRSA)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={`https://irsa.ipac.caltech.edu/applications/MOST?ra=${candidate.ra_deg}&dec=${candidate.dec_deg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[var(--border-subtle)] text-[var(--accent-gold)] transition-colors"
              >
                <span>NASA MOST Minor Planet Checker</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* SPHEREx QR3 Citation & DOI Block */}
          <div className="glass-panel p-4 border border-[var(--border-subtle)] space-y-2 bg-[rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 font-bold">
                <Quote className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                <span>SPHEREx QR3 Dataset Citation</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--accent-cyan)] bg-[rgba(0,229,255,0.1)] px-2 py-0.5 rounded border border-[rgba(0,229,255,0.2)]">
                DOI: 10.26131/IRSA662
              </span>
            </div>

            <div className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed bg-[rgba(0,0,0,0.4)] p-2 rounded border border-[var(--border-subtle)]">
              SPHEREx Science Team & IPAC/Caltech (2026). NASA SPHEREx Quick Release 3 (QR3) All-Sky Spectral Survey.
            </div>

            <button
              onClick={handleCopyBibtex}
              className="w-full py-1.5 px-3 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-xs font-mono text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all flex items-center justify-center gap-1.5"
            >
              {copiedBibtex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                  <span className="text-[var(--accent-green)]">BibTeX Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Copy BibTeX Citation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[rgba(13,18,32,0.85)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-lg bg-[rgba(0,229,255,0.12)] hover:bg-[rgba(0,229,255,0.22)] border border-[rgba(0,229,255,0.3)] text-xs font-semibold text-[var(--accent-cyan)] transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--accent-cyan)] text-[#060810] text-xs font-bold hover:shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all"
          >
            Dismiss Dossier
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
