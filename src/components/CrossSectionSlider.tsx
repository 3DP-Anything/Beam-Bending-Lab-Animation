/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SplitSquareVertical, Minus, Plus } from 'lucide-react';
import { MomentIcon } from './EngineeringIcons';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface CrossSectionSliderProps {
  config: BeamConfig;
  analysis?: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
}

const SPAN_MARKERS_MM = [50, 100, 150, 200, 250, 300, 350];

export const CrossSectionSlider: React.FC<CrossSectionSliderProps> = ({ config, analysis, onChange }) => {
  const currentX = Math.round(config.crossSectionPlaneX);
  const maxL = Math.max(1, config.lengthMm);
  const ratio = Math.max(0, Math.min(1, currentX / maxL));
  const pct = Math.max(0, Math.min(100, ratio * 100));

  // Bending moment at active cross-section plane x
  const momentFrac = ratio <= 0.5 ? ratio * 2 : (1 - ratio) * 2;
  const maxM = analysis?.maxBendingMomentNm ?? ((config.loadN * (config.lengthMm / 1000)) / 4);
  const momentAtSectionNm = momentFrac * maxM;

  const activeMarkers = SPAN_MARKERS_MM.filter((mm) => mm > 0 && mm < maxL);

  const handleStep = (deltaMm: number) => {
    const next = Math.max(0, Math.min(maxL, currentX + deltaMm));
    onChange({ crossSectionPlaneX: next });
  };

  const handleSelectDistance = (mm: number) => {
    const clamped = Math.max(0, Math.min(maxL, mm));
    onChange({ crossSectionPlaneX: clamped });
  };

  return (
    <div className="w-full select-none flex flex-col gap-0.5 px-0">
      {/* Frameless Header with Label, Step Buttons, Position, and Bending Moment Readout */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <SplitSquareVertical className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 tracking-wide truncate">
            Cross-Section Plane (x)
          </span>
        </div>

        {/* Stepper buttons & position + bending moment readouts */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleStep(-10)}
            title="Step 10 mm left"
            className="w-5 h-5 rounded hover:bg-slate-200/80 text-slate-600 hover:text-purple-700 text-xs flex items-center justify-center cursor-pointer font-bold transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="font-mono text-xs text-purple-700 font-bold whitespace-nowrap bg-purple-50/90 border border-purple-200 px-2 py-0.5 rounded shadow-2xs">
            x = {currentX} mm{' '}
            <span className="text-purple-400 font-normal text-[10px]">({ratio.toFixed(2)} L)</span>
          </span>

          {/* Bending Moment value at section x */}
          {config.showMomentOnGraph && (
            <span
              className="font-mono text-xs text-indigo-700 font-bold whitespace-nowrap bg-indigo-50/95 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1"
              title="Bending moment M(x) at cross-section plane x"
            >
              <MomentIcon className="w-3 h-3 text-indigo-600" />
              M(x) = {momentAtSectionNm.toFixed(2)} N·m
            </span>
          )}

          <button
            type="button"
            onClick={() => handleStep(10)}
            title="Step 10 mm right"
            className="w-5 h-5 rounded hover:bg-slate-200/80 text-slate-600 hover:text-purple-700 text-xs flex items-center justify-center cursor-pointer font-bold transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Custom-aligned Scrubber Track with Track Ticks */}
      <div className="relative h-4 flex items-center group cursor-pointer">
        {/* Track rail */}
        <div className="relative w-full h-1.5 group-hover:h-2 transition-all bg-slate-300 rounded-full">
          {/* Active purple fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-purple-600 rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
          {/* Subtle marker dots on the rail */}
          {activeMarkers.map((mm) => {
            const mPct = (mm / maxL) * 100;
            const isPassed = mm <= currentX;
            return (
              <span
                key={`dot-${mm}`}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-1 rounded-full pointer-events-none ${
                  isPassed ? 'bg-white/90' : 'bg-slate-500/75'
                }`}
                style={{ left: `${mPct}%` }}
              />
            );
          })}
        </div>

        {/* Thumb aligned exactly to pct% */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-white shadow-md shadow-purple-500/30 pointer-events-none group-hover:scale-115 transition-transform z-10"
          style={{ left: `${pct}%` }}
        />

        {/* Accessible range input */}
        <input
          type="range"
          min="0"
          max={maxL}
          step="1"
          value={currentX}
          aria-label="Cross-Section Plane Position in millimeters"
          onChange={(e) => onChange({ crossSectionPlaneX: parseFloat(e.target.value) || 0 })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
      </div>

      {/* Clickable Ruler Markers (0, 50, 100, 150, 200, 250, 300, 350, maxL) */}
      <div className="relative w-full h-7 text-[9px] font-mono">
        {/* Point A (0 mm) */}
        <button
          type="button"
          onClick={() => handleSelectDistance(0)}
          title="Move cursor to Point A (0 mm)"
          className={`absolute left-0 top-0 flex flex-col items-start cursor-pointer group/m transition-colors ${
            currentX === 0 ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-purple-700'
          }`}
        >
          <span
            className={`w-[1.5px] h-1.5 mb-0.5 transition-colors ${
              currentX === 0 ? 'bg-purple-600' : 'bg-slate-400 group-hover/m:bg-purple-500'
            }`}
          />
          <span className={`px-0.5 rounded ${currentX === 0 ? 'bg-purple-100/90' : 'group-hover/m:bg-purple-50'}`}>
            0<span className="hidden sm:inline">mm</span>
          </span>
        </button>

        {/* Intermediate clickable markers at 50, 100, 150, 200, 250, 300, 350 mm */}
        {activeMarkers.map((mm) => {
          const mPct = (mm / maxL) * 100;
          const isActive = currentX === mm;
          return (
            <button
              key={mm}
              type="button"
              onClick={() => handleSelectDistance(mm)}
              title={`Move cursor to ${mm} mm`}
              style={{ left: `${mPct}%` }}
              className={`absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group/m transition-colors ${
                isActive ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-purple-700'
              }`}
            >
              <span
                className={`w-[1.5px] mb-0.5 transition-colors ${
                  isActive ? 'h-2 bg-purple-600' : 'h-1.5 bg-slate-400 group-hover/m:bg-purple-500'
                }`}
              />
              <span
                className={`px-1 rounded whitespace-nowrap leading-tight ${
                  isActive
                    ? 'bg-purple-100 text-purple-800 font-bold ring-1 ring-purple-300'
                    : 'group-hover/m:bg-purple-50'
                }`}
              >
                {mm}
                <span className="hidden sm:inline">mm</span>
              </span>
            </button>
          );
        })}

        {/* Point B (maxL mm) */}
        <button
          type="button"
          onClick={() => handleSelectDistance(maxL)}
          title={`Move cursor to Point B (${maxL} mm)`}
          className={`absolute right-0 top-0 flex flex-col items-end cursor-pointer group/m transition-colors ${
            currentX === maxL ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-purple-700'
          }`}
        >
          <span
            className={`w-[1.5px] h-1.5 mb-0.5 transition-colors ${
              currentX === maxL ? 'bg-purple-600' : 'bg-slate-400 group-hover/m:bg-purple-500'
            }`}
          />
          <span className={`px-0.5 rounded ${currentX === maxL ? 'bg-purple-100/90' : 'group-hover/m:bg-purple-50'}`}>
            {maxL}
            <span className="hidden sm:inline">mm</span>
          </span>
        </button>
      </div>
    </div>
  );
};
