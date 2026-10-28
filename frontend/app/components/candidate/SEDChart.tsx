'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import ChartJS from 'chart.js/auto';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  SPHEREX_WAVELENGTHS,
  SPECTRAL_TEMPLATES,
  fitSpectralEnergyDistribution,
  generateSyntheticCandidateSED,
  FitResult,
} from '../../lib/spectralTemplates';
import { useSkyStore } from '../../store/skyStore';
import { Activity, Sparkles, CheckCircle2, Sliders } from 'lucide-react';

interface SEDChartProps {
  candidateId?: string;
  measuredFluxes?: number[];
  uncertainties?: number[];
  className?: string;
}

export default function SEDChart({
  candidateId,
  measuredFluxes: inputFluxes,
  uncertainties: inputUncertainties,
  className = '',
}: SEDChartProps) {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const { selectedBand, setSelectedBand } = useSkyStore();

  // Active template visibility filters
  const [visibleTemplates, setVisibleTemplates] = useState<Record<string, boolean>>({
    'Y-Dwarf Brown Dwarf': true,
    'Methane Ice (TNO / Planet X)': true,
    'High-z Starburst Galaxy (z ~ 6.5)': true,
    'Comet / Active Centaur': true,
  });

  // Measured fluxes & errors (fallback to realistic synthetic SED if not provided)
  const { measuredFluxes, uncertainties } = useMemo(() => {
    if (inputFluxes && inputFluxes.length === 102) {
      return {
        measuredFluxes: inputFluxes,
        uncertainties: inputUncertainties || inputFluxes.map((f) => f * 0.08),
      };
    }
    // High-proper-motion methane ice candidate default
    return generateSyntheticCandidateSED('Methane Ice (TNO / Planet X)', 16.0);
  }, [inputFluxes, inputUncertainties]);

  // Least-squares fit across the 4 templates
  const fitResult: FitResult = useMemo(() => {
    return fitSpectralEnergyDistribution(measuredFluxes, uncertainties);
  }, [measuredFluxes, uncertainties]);

  // Draw & Update Chart.js
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = SPHEREX_WAVELENGTHS.map((wl) => wl.toFixed(2));

    // Datasets
    const datasets: any[] = [];

    // 1. Measured Candidate Photometry Points
    datasets.push({
      label: `Candidate Measured SED`,
      data: measuredFluxes,
      borderColor: '#FFFFFF',
      backgroundColor: '#00E5FF',
      pointRadius: (ctx: any) => {
        const index = ctx.dataIndex;
        return index + 1 === selectedBand ? 7 : 3.5;
      },
      pointHoverRadius: 8,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 1.5,
      showLine: true,
      borderWidth: 2,
      borderDash: [2, 2],
      tension: 0.2,
      order: 1,
    });

    // 2. Overlay Synthetic Templates
    SPECTRAL_TEMPLATES.forEach((tmpl) => {
      if (!visibleTemplates[tmpl.name]) return;
      const isBest = tmpl.name === fitResult.bestTemplate.name;

      const scaledData = tmpl.fluxes.map((f) => f * fitResult.scaleFactor);

      datasets.push({
        label: `${tmpl.name} (Scale: ${fitResult.scaleFactor.toFixed(2)})`,
        data: scaledData,
        borderColor: tmpl.color,
        backgroundColor: `${tmpl.color}15`,
        borderWidth: isBest ? 3 : 1.5,
        borderDash: isBest ? [] : [4, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: isBest ? true : false,
        order: isBest ? 2 : 3,
      });
    });

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          setSelectedBand(index + 1);
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(6, 8, 16, 0.95)',
          titleColor: '#00E5FF',
          bodyColor: '#F0F4FF',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'JetBrains Mono', size: 12 },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          callbacks: {
            title: (items) => {
              if (items.length === 0) return '';
              const idx = items[0].dataIndex;
              const wl = SPHEREX_WAVELENGTHS[idx].toFixed(3);
              return `Band ${idx + 1} (${wl} µm)`;
            },
            label: (item) => {
              const val = typeof item.raw === 'number' ? item.raw.toFixed(3) : item.raw;
              return `${item.dataset.label}: ${val} mJy`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Wavelength λ (µm) — 102 SPHEREx Channels',
            color: '#8892B0',
            font: { family: 'Inter', size: 11, weight: 500 },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: '#8892B0',
            font: { family: 'JetBrains Mono', size: 10 },
            maxTicksLimit: 14,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Flux Density F_λ (mJy)',
            color: '#8892B0',
            font: { family: 'Inter', size: 11, weight: 500 },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
          ticks: {
            color: '#8892B0',
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
      },
    };

    const chart = new ChartJS(canvas, {
      type: 'line',
      data: { labels, datasets },
      options,
    });

    chartInstanceRef.current = chart;

    return () => {
      chart.destroy();
    };
  }, [measuredFluxes, uncertainties, fitResult, visibleTemplates, selectedBand, setSelectedBand]);

  const toggleTemplate = (name: string) => {
    setVisibleTemplates((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className={`glass-panel p-4 flex flex-col gap-3 backdrop-blur-md ${className}`}>
      {/* Header & Best-Fit Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent-cyan)]" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
            Spectral Energy Distribution (SED)
          </span>
          {candidateId && (
            <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,229,255,0.1)] text-[var(--accent-cyan)] font-mono">
              {candidateId}
            </span>
          )}
        </div>

        {/* Best-Fit Diagnostic Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(6,214,160,0.15)] border border-[var(--accent-green)] text-xs text-[var(--accent-green)] font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Best Fit: {fitResult.bestTemplate.classificationBadge}</span>
          </div>
          <div className="px-2 py-1 rounded bg-[rgba(255,255,255,0.06)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--accent-gold)]">
            χ²_ν = {fitResult.reducedChiSquare.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full h-64 bg-[rgba(2,4,8,0.7)] rounded-xl border border-[var(--border-subtle)] p-2">
        <canvas ref={chartCanvasRef} />
      </div>

      {/* Template Toggle Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
        <div className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
          <Sliders className="w-3 h-3 text-[var(--text-muted)]" />
          <span>Toggle Templates:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SPECTRAL_TEMPLATES.map((tmpl) => {
            const isVisible = visibleTemplates[tmpl.name];
            const isBest = tmpl.name === fitResult.bestTemplate.name;

            return (
              <button
                key={tmpl.name}
                onClick={() => toggleTemplate(tmpl.name)}
                className={`px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  isVisible
                    ? 'bg-[rgba(255,255,255,0.08)] border border-[var(--border-hover)] text-[var(--text-primary)]'
                    : 'bg-transparent border border-transparent text-[var(--text-muted)] opacity-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: tmpl.color,
                    boxShadow: isVisible ? `0 0 8px ${tmpl.color}` : 'none',
                  }}
                />
                <span>{tmpl.name.split(' (')[0]}</span>
                {isBest && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[rgba(6,214,160,0.2)] text-[var(--accent-green)]">
                    BEST
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
