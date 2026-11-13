import { useQuery } from '@tanstack/react-query';
import { Observation, ComparisonResult, Evidence, WavelengthBand } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useObservations(ra: number, dec: number, radius = 0.1, band?: number) {
  return useQuery<Observation[]>({
    queryKey: ['observations', ra, dec, radius, band],
    queryFn: async () => {
      let url = `${API_BASE}/api/v1/observations?ra=${ra}&dec=${dec}&radius=${radius}`;
      if (band !== undefined) {
        url += `&band=${band}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to query observations: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: typeof ra === 'number' && typeof dec === 'number' && !isNaN(ra) && !isNaN(dec),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWavelengths() {
  return useQuery<WavelengthBand[]>({
    queryKey: ['wavelengths'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/wavelengths`);
      if (!res.ok) {
        throw new Error(`Failed to fetch wavelengths: ${res.statusText}`);
      }
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

// Backend returns candidates as {ra, dec, ...}; the UI expects {ra_deg, dec_deg, ...}.
function normalizeComparison(data: any): ComparisonResult {
  const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const candidates = (data?.candidates ?? []).map((c: any) => ({
    ...c,
    comparison_id: c.comparison_id ?? data?.comparison_id ?? '',
    ra_deg: num(c.ra_deg ?? c.ra),
    dec_deg: num(c.dec_deg ?? c.dec),
    pixel_x: num(c.pixel_x),
    pixel_y: num(c.pixel_y),
    snr_change: num(c.snr_change),
    confidence_score: num(c.confidence_score),
    classification: c.classification ?? 'Unclassified',
    caveats: c.caveats ?? [],
  }));
  return { ...data, candidates };
}

export function useComparison(obsAId: string | null, obsBId: string | null, band = 50) {
  return useQuery<ComparisonResult>({
    queryKey: ['comparison', obsAId, obsBId, band],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/v1/compare?obs_a=${encodeURIComponent(obsAId!)}&obs_b=${encodeURIComponent(obsBId!)}&band=${band}`
      );
      if (!res.ok) {
        throw new Error(`Failed to compare observations: ${res.statusText}`);
      }
      const data = await res.json();
      return normalizeComparison(data);
    },
    enabled: !!obsAId && !!obsBId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useEvidence(candidateId: string | null) {
  return useQuery<Evidence>({
    queryKey: ['evidence', candidateId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/candidates/${candidateId}/evidence`);
      if (!res.ok) {
        throw new Error(`Failed to fetch evidence: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!candidateId,
    staleTime: 60 * 60 * 1000,
  });
}