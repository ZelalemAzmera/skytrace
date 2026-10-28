import { create } from 'zustand';
import { Observation, Candidate } from '../types';

export interface HoveredSkyObject {
  name: string;
  ra: number;
  dec: number;
  type: 'Star' | 'Candidate' | 'Planet' | 'Point';
  extra?: string;
}

export interface SkyState {
  // Target Sky Region
  ra: number;
  dec: number;
  radius: number;
  selectedBand: number; // 1 - 102
  activePresetName: string | null;

  // Multi-epoch Observations
  observations: Observation[];
  selectedObsA: Observation | null;
  selectedObsB: Observation | null;

  // Active Transient Candidate
  activeCandidate: Candidate | null;
  hoveredObject: HoveredSkyObject | null;

  // 3D Celestial Sphere Display Toggles
  showEquatorialGrid: boolean;
  showEclipticGrid: boolean;
  showGalacticPlane: boolean;
  showOrrery: boolean;
  showScanPath: boolean;
  showStarLabels: boolean;
  autoRotate: boolean;

  // Actions
  setCoordinates: (ra: number, dec: number, presetName?: string) => void;
  setRadius: (radius: number) => void;
  setSelectedBand: (band: number) => void;
  setObservations: (obs: Observation[]) => void;
  selectObsA: (obs: Observation | null) => void;
  selectObsB: (obs: Observation | null) => void;
  setActiveCandidate: (cand: Candidate | null) => void;
  setHoveredObject: (obj: HoveredSkyObject | null) => void;
  toggleSetting: (
    key:
      | 'showEquatorialGrid'
      | 'showEclipticGrid'
      | 'showGalacticPlane'
      | 'showOrrery'
      | 'showScanPath'
      | 'showStarLabels'
      | 'autoRotate'
  ) => void;
  reset: () => void;
}

export const useSkyStore = create<SkyState>((set) => ({
  ra: 83.8221, // Default Orion Nebula
  dec: -5.3911,
  radius: 0.1,
  selectedBand: 50,
  activePresetName: 'Orion Nebula (M42)',

  observations: [],
  selectedObsA: null,
  selectedObsB: null,

  activeCandidate: null,
  hoveredObject: null,

  showEquatorialGrid: true,
  showEclipticGrid: true,
  showGalacticPlane: true,
  showOrrery: true,
  showScanPath: true,
  showStarLabels: true,
  autoRotate: true,

  setCoordinates: (ra, dec, presetName) =>
    set({
      ra,
      dec,
      activePresetName: presetName ?? null,
    }),

  setRadius: (radius) => set({ radius }),
  setSelectedBand: (selectedBand) => set({ selectedBand }),
  setObservations: (observations) => set({ observations }),
  selectObsA: (selectedObsA) => set({ selectedObsA }),
  selectObsB: (selectedObsB) => set({ selectedObsB }),
  setActiveCandidate: (activeCandidate) => set({ activeCandidate }),
  setHoveredObject: (hoveredObject) => set({ hoveredObject }),

  toggleSetting: (key) =>
    set((state) => ({
      [key]: !state[key],
    })),

  reset: () =>
    set({
      observations: [],
      selectedObsA: null,
      selectedObsB: null,
      activeCandidate: null,
      hoveredObject: null,
    }),
}));
