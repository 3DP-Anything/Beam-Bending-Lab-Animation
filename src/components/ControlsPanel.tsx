/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Settings2,
  BarChart3,
  Plus,
  Minus,
  X,
  Sliders,
} from 'lucide-react';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface ControlsPanelProps {
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  cycleSpeed: number;
  onCycleSpeedChange: (speed: number) => void;
  onOpenSettings: () => void;
  onClose?: () => void;
  isDark?: boolean;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  analysis,
  onChange,
  isPlaying,
  onTogglePlay,
  onReset,
  cycleSpeed,
  onCycleSpeedChange,
  onOpenSettings,
  onClose,
}) => {
  const isBending = config.testType === 'bending';
  const step = config.loadStepN || 1;

  const handleStepUp = () => {
    const next = Math.min(config.maxLoadN, Math.round((config.loadN + step) * 100) / 100);
    onChange({ loadN: next });
  };

  const handleStepDown = () => {
    const next = Math.max(0, Math.round((config.loadN - step) * 100) / 100);
    onChange({ loadN: next });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Side Menu Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">Lab Controls & Options</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Collapse Side Menu"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Specimen Summary Banner */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Specimen</span>
              {config.profileType && config.profileType !== 'solid_rectangle' && (
                <span className="text-[9px] bg-purple-100 text-purple-700 font-mono px-1.5 py-0.2 rounded font-semibold">
                  {config.profileType.replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {config.material.name.split(' (')[0]} · {config.lengthMm} × {config.widthMm} × {config.thicknessMm} mm
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              I = {(analysis.secondMomentOfAreaM4 ?? analysis.secondMomentOfAreaMm4 * 1e-12).toExponential(3)} m⁴ · ΔW = {step} N
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            title="Configure Specimen Material, Dimensions & Profile"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit</span>
          </button>
        </div>

        {/* 2. Test Type: Bending vs Tension */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Test Type:
          </label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onChange({ testType: 'bending' })}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                isBending
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Beam Bending
            </button>
            <button
              onClick={() => onChange({ testType: 'tension' })}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                !isBending
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tension Test
            </button>
          </div>
        </div>

        {/* 3. Applied Load Controls & Stepped Animation (No duplicate slider!) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900">
              {isBending ? 'Applied Load (W)' : 'Axial Load (W)'}
            </div>

            {/* Load Value & Step Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleStepDown}
                title={`Decrease load by ${step} N`}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              >
                <Minus className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md text-xs font-mono">
                <input
                  type="number"
                  min="0"
                  max={config.maxLoadN}
                  step={step}
                  value={config.loadN}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(config.maxLoadN, parseFloat(e.target.value) || 0));
                    onChange({ loadN: val });
                  }}
                  className="w-12 text-center font-bold text-red-700 bg-white rounded border border-red-200 px-1 text-xs"
                />
                <span className="font-bold text-red-700">N</span>
              </div>

              <button
                onClick={handleStepUp}
                title={`Increase load by ${step} N`}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400">
            Slide the vertical control on the left of the beam or step through below:
          </div>

          {/* Stepped Auto Animation Loop */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onTogglePlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Auto-Animate</span>
                  </>
                )}
              </button>

              <button
                onClick={onReset}
                title="Reset Load to 0 N"
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[10px]">Speed:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onCycleSpeedChange(spd)}
                  className={`px-1.5 py-0.5 font-mono text-[11px] rounded cursor-pointer ${
                    cycleSpeed === spd
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>


          {/* Engineering Diagrams (Below Canvas) */}
          {isBending && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Diagrams (Below Canvas)</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  onClick={() => onChange({ showMomentDiagram: !config.showMomentDiagram })}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    config.showMomentDiagram
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  BMD
                </button>

                <button
                  onClick={() => onChange({ showShearDiagram: !config.showShearDiagram })}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    config.showShearDiagram
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  SFD
                </button>

                <button
                  onClick={() => onChange({ showCrossSectionProfile: !config.showCrossSectionProfile })}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    config.showCrossSectionProfile
                      ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  σ(y)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};
