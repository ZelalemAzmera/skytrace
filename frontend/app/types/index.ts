export interface Observation {
  id: string;
  ra_deg: number;
  dec_deg: number;
  band_index: number;
  wavelength_um: number;
  obs_date: string;
  mjd?: number;
  exposure_s: number;
  quality_pct: number;
  fits_url: string;
  preview_url: string;
}

export interface WavelengthBand {
  band_index: number;
  wavelength_um: number;
  resolution_r: number;
  description: string;
}

export interface Candidate {
  id: string;
  comparison_id: string;
  ra_deg: number;
  dec_deg: number;
  pixel_x: number;
  pixel_y: number;
  confidence_score: number;
  snr_change: number;
  classification: string;
  caveats: string[];
  parallax_distance_pc?: number;
  proper_motion_mas_yr?: number;
  near_sensor_boundary?: boolean;
  boundary_distance_px?: number;
  solar_system_crossmatch?: {
    matched: boolean;
    nearest_body: string;
    nearest_type: string;
    angular_separation_arcsec: number;
    verdict: string;
    explanation: string;
  };
}

export interface ComparisonResult {
  comparison_id: string;
  obs_a_id: string;
  obs_b_id: string;
  band_index: number;
  wavelength_um: number;
  image_a_b64: string;
  image_b_b64: string;
  difference_b64: string;
  false_color_b64?: string;
  candidates: Candidate[];
  alignment_rms_arcsec: number;
  flux_scale_factor: number;
}

export interface EvidenceMeasurement {
  label: string;
  value: number | string;
  unit: string;
  uncertainty?: number;
}

export interface EvidenceLink {
  label: string;
  url: string;
  description: string;
}

export interface Evidence {
  candidate_id: string;
  narrative: string;
  confidence_score: number;
  measurements: EvidenceMeasurement[];
  caveats: string[];
  irsa_links: EvidenceLink[];
  quality_flags: Record<string, boolean>;
}

export interface SkyPreset {
  name: string;
  ra: number;
  dec: number;
  description: string;
  category: 'Nebula' | 'Star Cluster' | 'Galactic' | 'Deep Survey' | 'Calibration';
}
