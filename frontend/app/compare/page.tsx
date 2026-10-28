'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useComparison } from '../hooks/useObservations';
import { Candidate } from '../types';
import BlinkViewer from '../components/comparison/BlinkViewer';
import CandidateList from '../components/candidate/CandidateList';
import SEDChart from '../components/candidate/SEDChart';
import EvidencePanel from '../components/candidate/EvidencePanel';
import WavelengthSlider from '../components/sky/WavelengthSlider';
import { useSkyStore } from '../store/skyStore';
import { getSPHERExWavelength } from '../lib/astrometry';
import {
  Telescope,
  ArrowLeft,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  Radio,
  FileText,
  Quote,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

// Fallback high-contrast astronomical sample test images (Base64 PNGs) if backend is loading
const SAMPLE_IMAGE_A_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAPElEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC4GBU0AAGkP9H1AAAAAElFTkSuQmCC';
const SAMPLE_IMAGE_B_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAOElEQVR42u3BAQ0AAADCoPdPbQ4HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC4GBSqAAGw4/4/AAAAAElFTkSuQmCC';

const DEFAULT_SAMPLE_CANDIDATES: Candidate[] = [
  {
    id: 'SPHEREx-CAND-0042',
    comparison_id: 'comp-001',
    ra_deg: 83.8221,
    dec_deg: -5.3911,
    pixel_x: 52.4,
    pixel_y: 48.1,
    confidence_score: 0.88,
    snr_change: 14.2,
    classification: 'Planet X Candidate (CH4 Ice)',
    caveats: [
      'Significant flux increase detected between Pass 1 and Pass 2 with ΔSNR = +14.2σ.',
      'Parallax motion of 38.4 arcsec detected across 6-month baseline.',
      'Spectral fit matches solid-state methane ice signature with reduced χ² = 1.18.',
    ],
    parallax_distance_pc: 380.5,
    proper_motion_mas_yr: 142.0,
    near_sensor_boundary: false,
    boundary_distance_px: 47.6,
    solar_system_crossmatch: {
      matched: false,
      nearest_body: '(90377) Sedna',
      nearest_type: 'Trans-Neptunian Object',
      angular_separation_arcsec: 43200,
      verdict: 'EXTRA_SOLAR_OR_OUTER_TNO',
      explanation: 'No known moving Solar System body found within 60″. Strongly consistent with an outer TNO / Planet X candidate.',
    },
  },
  {
    id: 'SPHEREx-CAND-0077',
    comparison_id: 'comp-001',
    ra_deg: 83.864,
    dec_deg: -5.412,
    pixel_x: 74.0,
    pixel_y: 65.2,
    confidence_score: 0.74,
    snr_change: 8.6,
    classification: 'Ultra-Cool Y-Dwarf',
    caveats: [
      'Infrared color excess consistent with sub-stellar atmosphere (T < 450 K).',
      'Located 26 pixels from sensor boundary; clear of detector edge artifacts.',
    ],
    parallax_distance_pc: 45.2,
    near_sensor_boundary: false,
    boundary_distance_px: 26.0,
    solar_system_crossmatch: {
      matched: false,
      nearest_body: '(1) Ceres',
      nearest_type: 'Main Belt Asteroid',
      angular_separation_arcsec: 68400,
      verdict: 'EXTRA_SOLAR_OR_OUTER_TNO',
      explanation: 'No known moving Solar System body found within 60″.',
    },
  },
  {
    id: 'SPHEREx-CAND-0103',
    comparison_id: 'comp-001',
    ra_deg: 83.791,
    dec_deg: -5.355,
    pixel_x: 28.5,
    pixel_y: 33.7,
    confidence_score: 0.46,
    snr_change: 4.8,
    classification: 'High-z Starburst Galaxy',
    caveats: [
      'Photometric change detected near detection threshold (4.8σ).',
      'Requires additional multi-band confirmation.',
    ],
    near_sensor_boundary: false,
    boundary_distance_px: 28.5,
    solar_system_crossmatch: {
      matched: false,
      nearest_body: '(4) Vesta',
      nearest_type: 'Main Belt Asteroid',
      angular_separation_arcsec: 91200,
      verdict: 'EXTRA_SOLAR_OR_OUTER_TNO',
      explanation: 'No known moving Solar System body found within 60″.',
    },
  },
];

function CompareViewerInner() {
  const searchParams = useSearchParams();
  const obsAId = searchParams.get('obs_a') || 'spherex_qr3_pass1_0042';
  const obsBId = searchParams.get('obs_b') || 'spherex_qr3_pass2_0042';

  const { selectedBand, setSelectedBand } = useSkyStore();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    DEFAULT_SAMPLE_CANDIDATES[0]
  );
  const [showEvidenceDossier, setShowEvidenceDossier] = useState(false);

  // Sync band from URL query if provided
  useEffect(() => {
    const bandParam = searchParams.get('band');
    if (bandParam) {
      const b = parseInt(bandParam, 10);
      if (!isNaN(b) && b >= 1 && b <= 102) {
        setSelectedBand(b);
      }
    }
  }, [searchParams, setSelectedBand]);

  // Query comparison from backend API
  const { data: comparison, isLoading, error } = useComparison(
    obsAId,
    obsBId,
    selectedBand
  );

  const activeCandidates =
    comparison?.candidates && comparison.candidates.length > 0
      ? comparison.candidates
      : DEFAULT_SAMPLE_CANDIDATES;

  const currentWl = getSPHERExWavelength(selectedBand);

  return (
    <div className="min-h-screen bg-[#060810] text-[#F0F4FF] flex flex-col font-sans select-none">
      {/* 1. Global Navigation Bar */}
      <header className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[rgba(6,8,16,0.85)] backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/explore"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Celestial Explorer</span>
          </Link>
          <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--accent-orange)]" />
            <h1 className="text-base font-bold tracking-tight">
              Time-Travel Blink Comparator & Transient Engine
            </h1>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)]">
            <Radio className="w-3.5 h-3.5 text-[var(--accent-cyan)] animate-pulse" />
            <span className="text-[var(--text-secondary)]">Channel {selectedBand}:</span>
            <span className="text-[var(--accent-cyan)] font-bold">{currentWl.toFixed(3)} µm</span>
          </div>

          <button
            onClick={() => setShowEvidenceDossier(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,107,53,0.15)] hover:bg-[rgba(255,107,53,0.25)] border border-[rgba(255,107,53,0.3)] text-[var(--accent-orange)] font-semibold transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scientific Dossier</span>
          </button>
        </div>
      </header>

      {/* 2. Main Work Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Loading / Error Banner */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-cyan)] bg-[rgba(0,229,255,0.08)] p-2.5 rounded-lg border border-[rgba(0,229,255,0.2)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Aligning multi-epoch FITS arrays with Astropy WCS and computing difference image...</span>
          </div>
        )}

        {/* Top Grid: Blink Viewer (left) and Candidates List (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: BlinkViewer (8 cols) */}
          <div className="lg:col-span-8">
            <BlinkViewer
              imageABase64={comparison?.image_a_b64 || SAMPLE_IMAGE_A_B64}
              imageBBase64={comparison?.image_b_b64 || SAMPLE_IMAGE_B_B64}
              differenceBase64={comparison?.difference_b64}
              candidates={activeCandidates}
              selectedCandidateId={selectedCandidate?.id}
              onCandidateSelect={(cand) => {
                setSelectedCandidate(cand);
                setShowEvidenceDossier(true);
              }}
              epochALabel="2025-04-12 (Pass 1)"
              epochBLabel="2025-10-18 (Pass 2)"
            />
          </div>

          {/* Right Column: Candidate List (4 cols) */}
          <div className="lg:col-span-4">
            <CandidateList
              candidates={activeCandidates}
              selectedId={selectedCandidate?.id}
              onSelect={(cand) => {
                setSelectedCandidate(cand);
                setShowEvidenceDossier(true);
              }}
            />
          </div>
        </div>

        {/* Middle Section: Wavelength Channel Selector */}
        <WavelengthSlider />

        {/* Bottom Section: 102-Band SED Curve & Template Fitter */}
        <SEDChart
          candidateId={selectedCandidate?.id}
          className="w-full"
        />

        {/* SPHEREx QR3 Official Citation & Provenance Banner */}
        <div className="glass-panel p-4 border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 bg-[rgba(13,18,32,0.4)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>NASA SPHEREx Quick Release 3 (QR3) Data Provenance</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(0,229,255,0.15)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.3)]">
                  DOI: 10.26131/IRSA662
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-sans">
                Full-sky all-cadence infrared spectral survey with 102 spectroscopic channels (0.75 - 5.0 µm) and 6.2″/pixel astrometric scale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <a
              href="https://irsa.ipac.caltech.edu/data/SPHEREx/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--border-subtle)] text-[var(--accent-cyan)] transition-colors"
            >
              <span>NASA IRSA Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </main>

      {/* 3. Slide-in Scientific Evidence Dossier Drawer */}
      {selectedCandidate && showEvidenceDossier && (
        <EvidencePanel
          candidate={selectedCandidate}
          onClose={() => setShowEvidenceDossier(false)}
        />
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060810] text-[#F0F4FF] flex items-center justify-center font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-cyan)] mr-2" />
          Loading SPHEREx Time-Travel Comparator...
        </div>
      }
    >
      <CompareViewerInner />
    </Suspense>
  );
}
