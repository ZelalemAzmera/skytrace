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
      return res.json();
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
