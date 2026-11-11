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

export const CrossSectionSlider: React.FC<CrossSectionSliderProps> = ({ config, analysis, onChange }) => {
  const currentX = Math.round(config.crossSectionPlaneX);
  const maxL = Math.max(1, config.lengthMm);
  const ratio = Math.max(0, Math.min(1, currentX / maxL));
  const pct = Math.max(0, Math.min(100, ratio * 100));

  // Bending moment at active cross-section plane x
  const momentFrac = ratio <= 0.5 ? ratio * 2 : (1 - ratio) * 2;
  const maxM = analysis?.maxBendingMomentNm ?? ((config.loadN * (config.lengthMm / 1000)) / 4);
  const momentAtSectionNm = momentFrac * maxM;

  const handleStep = (deltaMm: number) => {
    const next = Math.max(0, Math.min(maxL, currentX + deltaMm));
    onChange({ crossSectionPlaneX: next });
  };

  return (
    <div className="w-full select-none flex flex-col gap-1 px-0">
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
            onClick={() => handleStep(10)}
            title="Step 10 mm right"
            className="w-5 h-5 rounded hover:bg-slate-200/80 text-slate-600 hover:text-purple-700 text-xs flex items-center justify-center cursor-pointer font-bold transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Frameless Scrubber Track (Matching Load Slider Player Style) */}
      <div className="relative flex items-center group py-1 cursor-pointer">
        <input
          type="range"
          min="0"
          max={maxL}
          step="1"
          value={currentX}
          onChange={(e) => onChange({ crossSectionPlaneX: parseFloat(e.target.value) || 0 })}
          className="w-full h-1.5 group-hover:h-2 transition-all bg-slate-300 rounded-full appearance-none cursor-pointer accent-purple-600 focus:outline-none"
          style={{
            background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${pct}%, rgb(203, 213, 225) ${pct}%, rgb(203, 213, 225) 100%)`,
          }}
        />
      </div>

      {/* Subtle Span Markers strictly aligned with Point A (left), L/2 (center), Point B (right) */}
      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0">
        <span className="text-left font-semibold">Point A (0 mm)</span>
        <span className="text-center">L/4 ({(maxL * 0.25).toFixed(0)} mm)</span>
        <span className="text-center font-bold text-purple-600">L/2 ({(maxL * 0.5).toFixed(0)} mm)</span>
        <span className="text-center">3L/4 ({(maxL * 0.75).toFixed(0)} mm)</span>
        <span className="text-right font-semibold">Point B ({maxL} mm)</span>
      </div>
    </div>
  );
};
