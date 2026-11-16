/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Ruler,
  Settings2,
  Sliders,
  Check,
  Box,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  BarChart3,
  Flame,
  SplitSquareVertical,
} from 'lucide-react';
import { BeamAnalysisResult, BeamConfig, BeamProfileType } from '../types/beam';
import { PRESET_MATERIALS } from '../utils/beamPhysics';

interface SpecimenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  cycleSpeed?: number;
  onCycleSpeedChange?: (speed: number) => void;
}

const PROFILE_PRESETS: { type: BeamProfileType; label: string; desc: string }[] = [
  { type: 'solid_rectangle', label: 'Solid Rectangle', desc: 'Standard flat bar b × d' },
  { type: 'i_beam', label: 'I-Beam (Flanged)', desc: 'Universal beam with flanges & web' },
  { type: 'solid_circle', label: 'Solid Round Bar', desc: 'Circular rod diameter d' },
  { type: 'hollow_circle', label: 'Circular Tube (CHS)', desc: 'Hollow cylinder with wall t' },
];

export const SpecimenSettingsModal: React.FC<SpecimenSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  analysis,
  onChange,
  isPlaying = false,
  onTogglePlay,
  onReset,
  cycleSpeed = 1,
  onCycleSpeedChange,
}) => {
  if (!isOpen) return null;

  const isBending = config.testType === 'bending';
  const step = config.loadStepN || 1;
  const maxLoadInt = Math.round(config.maxLoadN);
  const currentProfile = config.profileType || 'solid_rectangle';
  const isCircular = currentProfile === 'solid_circle' || currentProfile === 'hollow_circle';

  const handleStepUp = () => {
    const next = Math.min(config.maxLoadN, Math.round((config.loadN + step) * 100) / 100);
    onChange({ loadN: next });
  };

  const handleStepDown = () => {
    const next = Math.max(0, Math.round((config.loadN - step) * 100) / 100);
    onChange({ loadN: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Lab & Specimen Settings</h2>
              <p className="text-xs text-slate-500">Configure test mode, applied loads, specimen dimensions, and profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900">
          {/* 1. Test Mode Selection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                Laboratory Test Mode
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {isBending ? '3-Point Bending' : 'Axial Tension'}
              </span>
            </div>

            <div className="flex bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => onChange({ testType: 'bending' })}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isBending
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Beam Bending Test
              </button>
              <button
                onClick={() => onChange({ testType: 'tension' })}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isBending
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tensile Test
              </button>
            </div>
          </div>

          {/* 2. Applied Load & Live Animation Controls */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-red-600" />
                Applied Load & Stepped Animation
              </span>
              <span className="text-xs font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                W = {config.loadN} N / {maxLoadInt} N
              </span>
            </div>

            {/* Stepper + Input + Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Current Load */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Applied Force (W):</label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={handleStepDown}
                    title={`Decrease by ${step} N`}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-md flex-1 justify-center">
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
                      className="w-14 text-center font-bold text-red-700 bg-white rounded border border-red-200 text-xs py-0.5"
                    />
                    <span className="font-bold text-red-700 text-xs">N</span>
                  </div>
                  <button
                    onClick={handleStepUp}
                    title={`Increase by ${step} N`}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Max Load Wmax */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Maximum Limit (Wmax):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={maxLoadInt}
                    onChange={(e) => {
                      const newMax = Math.max(1, Math.round(parseFloat(e.target.value) || 14));
                      onChange({
                        maxLoadN: newMax,
                        loadN: Math.min(config.loadN, newMax),
                      });
                    }}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center bg-white"
                  />
                  <span className="text-xs font-mono font-semibold text-slate-500">N</span>
                </div>
              </div>

              {/* Step Value ΔW */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Step Increment (ΔW):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.5"
                    value={config.loadStepN || 1}
                    onChange={(e) => {
                      const newStep = Math.max(0.1, parseFloat(e.target.value) || 1);
                      onChange({ loadStepN: newStep });
                    }}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-red-300 text-center bg-red-50 text-red-700"
                  />
                  <span className="text-xs font-mono font-semibold text-red-600">N</span>
                </div>
              </div>
            </div>

            {/* Stepped Auto Animation Row */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {onTogglePlay && (
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
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Animation</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Auto-Animate Cycle</span>
                      </>
                    )}
                  </button>
                )}

                {onReset && (
                  <button
                    onClick={onReset}
                    title="Reset Load to 0 N"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset 0 N</span>
                  </button>
                )}
              </div>

              {onCycleSpeedChange && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500 text-[10px]">Speed:</span>
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onCycleSpeedChange(spd)}
                      className={`px-2 py-0.5 font-mono text-[11px] rounded cursor-pointer ${
                        cycleSpeed === spd
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Beam Cross-Section Profile Selection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-purple-600" />
                Cross-Section Profile
              </span>
              <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {PROFILE_PRESETS.find((p) => p.type === currentProfile)?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROFILE_PRESETS.map((p) => {
                const isSelected = currentProfile === p.type;
                return (
                  <button
                    key={p.type}
                    onClick={() => {
                      const prevShapes = config.activeShapes && config.activeShapes.length > 0
                        ? config.activeShapes
                        : [currentProfile];
                      const nextShapes = prevShapes.includes(p.type)
                        ? prevShapes
                        : [...prevShapes, p.type];
                      onChange({ profileType: p.type, activeShapes: nextShapes });
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs ring-2 ring-purple-300'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Specimen Dimensions (L, b, d) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-indigo-600" />
                Specimen Dimensions & Profile Geometry
              </span>
              <span className="text-xs font-mono text-slate-500">
                L = {config.lengthMm} mm · {isCircular ? `D = ${config.thicknessMm} mm` : `${config.widthMm} × ${config.thicknessMm} mm`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Length L */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Span Length (L):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="10"
                    value={config.lengthMm}
                    onChange={(e) => {
                      const newL = Math.max(50, Math.min(1000, parseFloat(e.target.value) || 300));
                      onChange({
                        lengthMm: newL,
                        crossSectionPlaneX: Math.min(config.crossSectionPlaneX, newL),
                      });
                    }}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>

              {/* Width b */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {isCircular ? 'Outer Diameter (D):' : 'Width (b):'}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="2"
                    max="100"
                    step="1"
                    value={config.widthMm}
                    onChange={(e) => onChange({ widthMm: Math.max(2, parseFloat(e.target.value) || 20) })}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>

              {/* Thickness / Height d */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {isCircular ? 'Outer Diameter (D):' : 'Height / Thickness (d):'}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={config.thicknessMm}
                    onChange={(e) => onChange({ thicknessMm: Math.max(1, parseFloat(e.target.value) || 6) })}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>
            </div>

            {/* Profile section thickness parameters (default 1 mm) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Wall Thickness (t) · Tube:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.2"
                    max="10"
                    step="0.1"
                    value={config.wallThicknessMm || 1}
                    onChange={(e) => onChange({ wallThicknessMm: Math.max(0.2, parseFloat(e.target.value) || 1) })}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Flange Thickness (tf) · I-Beam:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.2"
                    max="10"
                    step="0.1"
                    value={config.flangeThicknessMm || 1}
                    onChange={(e) => onChange({ flangeThicknessMm: Math.max(0.2, parseFloat(e.target.value) || 1) })}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Web Thickness (tw) · I-Beam:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.2"
                    max="10"
                    step="0.1"
                    value={config.webThicknessMm || 1}
                    onChange={(e) => onChange({ webThicknessMm: Math.max(0.2, parseFloat(e.target.value) || 1) })}
                    className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
              </div>
            </div>

            {/* Calculated Section Properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-500">Cross-Section Area (A)</div>
                <div className="font-mono font-bold text-slate-900">{analysis.crossSectionAreaMm2.toFixed(1)} mm²</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold text-purple-700">Second Moment of Area (I)</div>
                <div className="font-mono font-bold text-purple-700" title={`${analysis.secondMomentOfAreaMm4.toFixed(1)} mm⁴`}>
                  {(analysis.secondMomentOfAreaM4 ?? (analysis.secondMomentOfAreaMm4 * 1e-12)).toExponential(3)} m⁴
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-500">Section Modulus (Z)</div>
                <div className="font-mono font-bold text-slate-900">{analysis.sectionModulusMm3.toFixed(1)} mm³</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] text-slate-500">Extreme Fiber (ymax)</div>
                <div className="font-mono font-bold text-slate-900">{analysis.yMaxMm.toFixed(2)} mm</div>
              </div>
            </div>
          </div>

          {/* 5. Material Selection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                Beam Material
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                σy = {config.material.yieldStrength} MPa
              </span>
            </div>

            <select
              value={config.material.id}
              onChange={(e) => {
                const mat = PRESET_MATERIALS.find((m) => m.id === e.target.value);
                if (mat) onChange({ material: mat });
              }}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {PRESET_MATERIALS.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} (E = {mat.youngsModulus} GPa, σy = {mat.yieldStrength} MPa)
                </option>
              ))}
            </select>

            {/* Quick Material Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {['mild_steel', 'aluminum_6061', 'brass_c360', 'timber_pine'].map((id) => {
                const m = PRESET_MATERIALS.find((p) => p.id === id);
                if (!m) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onChange({ material: m })}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center font-medium transition-all cursor-pointer truncate ${
                      config.material.id === id
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {m.name.split(' (')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Vector Arrow Size Control */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <SplitSquareVertical className="w-4 h-4 text-purple-600" />
                Stress / Strain Vector Arrow Size
              </span>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {(config.vectorScale || 1.5).toFixed(1)}x Scale
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Adjusts the visual magnification scale of the stress and strain vector arrows along the cross-section plane.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[1.0, 1.5, 2.0, 2.5].map((scale) => (
                <button
                  key={scale}
                  onClick={() => onChange({ vectorScale: scale })}
                  className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                    (config.vectorScale || 1.5) === scale
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {scale.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          {/* 7. Engineering Diagrams Toggle */}
          {isBending && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Engineering Diagrams (Below Graph)</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => onChange({ showMomentDiagram: !config.showMomentDiagram })}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    config.showMomentDiagram
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">BMD</span>
                  <span className={`text-[10px] ${config.showMomentDiagram ? 'text-indigo-100' : 'text-slate-400'}`}>Bending Moment</span>
                </button>

                <button
                  onClick={() => onChange({ showShearDiagram: !config.showShearDiagram })}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    config.showShearDiagram
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">SFD</span>
                  <span className={`text-[10px] ${config.showShearDiagram ? 'text-emerald-100' : 'text-slate-400'}`}>Shear Force</span>
                </button>

                <button
                  onClick={() => onChange({ showCrossSectionProfile: !config.showCrossSectionProfile })}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    config.showCrossSectionProfile
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">σ(y) Profile</span>
                  <span className={`text-[10px] ${config.showCrossSectionProfile ? 'text-rose-100' : 'text-slate-400'}`}>Stress Depth</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Settings are applied instantly to the live simulation.</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
