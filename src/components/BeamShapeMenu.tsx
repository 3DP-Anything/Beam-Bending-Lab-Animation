/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Puzzle } from 'lucide-react';
import { BeamConfig, BeamProfileType } from '../types/beam';
import {
  BEAM_SHAPE_META,
  BEAM_SHAPE_ORDER,
  analyzeBeam,
  getMatchedAreaShapeConfig,
  getOrderedActiveShapes,
} from '../utils/beamPhysics';
import { BeamShapeIcon } from './EngineeringIcons';

interface BeamShapeMenuProps {
  config: BeamConfig;
  onChange: (updated: Partial<BeamConfig>) => void;
  isDark?: boolean;
}

export const BeamShapeMenu: React.FC<BeamShapeMenuProps> = ({
  config,
  onChange,
  isDark = false,
}) => {
  const activeShapes = getOrderedActiveShapes(config);
  const isBending = config.testType === 'bending';

  const handleToggleShape = (shape: BeamProfileType) => {
    const isCurrentlyActive = activeShapes.includes(shape);
    if (isCurrentlyActive) {
      if (activeShapes.length <= 1) {
        // Keep at least one beam shape active
        return;
      }
      const next = activeShapes.filter((s) => s !== shape);
      const orderedNext = BEAM_SHAPE_ORDER.filter((s) => next.includes(s));
      onChange({
        activeShapes: orderedNext,
        profileType: orderedNext[0],
      });
    } else {
      const next = BEAM_SHAPE_ORDER.filter(
        (s) => s === shape || activeShapes.includes(s)
      );
      onChange({
        activeShapes: next,
        profileType: next[0],
      });
    }
  };

  return (
    <nav
      aria-label="Beam Cross-Section Shapes Menu"
      className={`w-full border-b px-5 py-1.5 flex items-center justify-start relative z-10 select-none ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="w-full flex items-center justify-start flex-wrap gap-1.5 max-w-[1440px]">
        {/* Horizontal Menu Label */}
        <div
          title="Select one or more beam cross-section shapes to display and compare"
          className="flex items-center gap-1.5 w-6 sm:w-24 pr-2.5 mr-0.5 border-r border-slate-200 dark:border-slate-700 text-slate-500 shrink-0"
        >
          <Puzzle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline whitespace-nowrap">
            Shapes
          </span>
        </div>

        {/* Multi-Select Beam Shape Toggle Buttons */}
        {BEAM_SHAPE_ORDER.map((shape) => {
          const meta = BEAM_SHAPE_META[shape];
          const isActive = activeShapes.includes(shape);
          const isOnlyActive = isActive && activeShapes.length === 1;
          const shapeConfig = getMatchedAreaShapeConfig(config, shape);
          const shapeAnalysis = analyzeBeam(shapeConfig);
          const isCircular = shape === 'solid_circle' || shape === 'hollow_circle';

          return (
            <div key={shape} className="relative group">
              <button
                type="button"
                onClick={() => handleToggleShape(shape)}
                aria-label={`${meta.label} beam shape`}
                aria-pressed={isActive}
                className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all duration-150 border whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-50 text-slate-900 border-slate-300 shadow-2xs font-semibold'
                    : 'opacity-55 hover:opacity-95 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 border-transparent'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0 transition-opacity"
                  style={{
                    backgroundColor: meta.color,
                    opacity: isActive ? 1 : 0.4,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="shrink-0"
                  style={{ color: isActive ? meta.color : 'currentColor' }}
                >
                  <BeamShapeIcon type={shape} className="w-4 h-4" />
                </span>
                <span className="whitespace-nowrap">{meta.shortLabel}</span>
              </button>

              {/* Hover Tooltip Flyout below button */}
              <div
                role="tooltip"
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50 w-64"
              >
                <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-xl p-3 shadow-xl border border-slate-700/80 text-left relative">
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-b-[6px] border-b-slate-900/95"
                    aria-hidden="true"
                  />

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-white tracking-tight flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isActive ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {meta.desc}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5 tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Size:</span>
                      <span>
                        {isCircular
                          ? `D = ${parseFloat(shapeConfig.thicknessMm.toFixed(2))} mm`
                          : `${parseFloat(shapeConfig.widthMm.toFixed(1))} × ${parseFloat(shapeConfig.thicknessMm.toFixed(1))} mm`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Area (A):</span>
                      <span className="text-amber-300 font-semibold">
                        {shapeAnalysis.crossSectionAreaMm2.toFixed(1)} mm²
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Inertia (I):</span>
                      <span>
                        {(
                          shapeAnalysis.secondMomentOfAreaM4 ??
                          shapeAnalysis.secondMomentOfAreaMm4 * 1e-12
                        ).toExponential(3)}{' '}
                        m⁴
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">
                        {isBending ? 'Peak σ / δ:' : 'Axial σ / ΔL:'}
                      </span>
                      <span>
                        {isBending
                          ? `${shapeAnalysis.maxNormalStressMpa.toFixed(2)} MPa · ${shapeAnalysis.maxDeflectionMm.toFixed(3)} mm`
                          : `${shapeAnalysis.axialStressMpa.toFixed(2)} MPa · ${shapeAnalysis.axialElongationMm.toFixed(4)} mm`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 text-[9.5px] text-slate-400/90 italic flex items-center justify-between">
                    <span>
                      {isOnlyActive
                        ? 'At least one beam shape remains active'
                        : isActive
                          ? 'Click to hide this beam'
                          : 'Click to display below rectangle'}
                    </span>
                    {!isOnlyActive && (
                      <span className="text-indigo-400 font-medium">Toggle</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
