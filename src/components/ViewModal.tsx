/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Eye,
  Minus,
  Ruler,
  ArrowUp,
  Check,
  RotateCcw,
  Box,
} from 'lucide-react';
import { MomentIcon, VectorIcon, DeflectionIcon, CoordinateIcon } from './EngineeringIcons';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface ViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
}

export const ViewModal: React.FC<ViewModalProps> = ({
  isOpen,
  onClose,
  config,
  analysis,
  onChange,
}) => {
  if (!isOpen) return null;

  const isBending = config.testType === 'bending';

  // View Options:
  // 1-Stress/Strain vectors, 2-Neutral axis, 3-Bending Moment, 4-Deflection, 5-Dimensions, 6-Reactions, 7-Left View
  const viewOptions = [
    {
      num: 1,
      id: 'vectors',
      title: 'Stress / Strain Vectors',
      subtitle: isBending
        ? 'Cross-section normal stress & strain arrow distribution at plane x'
        : 'Axial vector force and deformation arrows along specimen',
      readout: `Plane x = ${Math.round(config.crossSectionPlaneX)} mm (${((config.crossSectionPlaneX / config.lengthMm) * 100).toFixed(0)}% L)`,
      active: !!config.showCrossSectionVectors,
      onToggle: () => onChange({ showCrossSectionVectors: !config.showCrossSectionVectors }),
      icon: <VectorIcon className="w-4 h-4 text-purple-600" />,
      colorClass: 'purple',
    },
    {
      num: 2,
      id: 'neutral_axis',
      title: 'Neutral Axis',
      subtitle: isBending
        ? 'Zero-stress longitudinal centroidal bending axis (y = 0)'
        : 'Specimen centerline longitudinal centroid axis',
      readout: 'y = 0 mm (Centroidal NA)',
      active: !!config.showNeutralAxis,
      onToggle: () => onChange({ showNeutralAxis: !config.showNeutralAxis }),
      icon: <Minus className="w-4 h-4 text-emerald-600 stroke-[3]" />,
      colorClass: 'emerald',
    },
    {
      num: 3,
      id: 'bending_moment',
      title: 'Bending Moment',
      subtitle: isBending
        ? 'Bending moment M(x) curve overlaid directly on the beam profile'
        : 'Internal axial load line overlaid on specimen',
      readout: isBending
        ? `M_max = ${analysis.maxBendingMomentNm.toFixed(2)} N·m`
        : `N = ${config.loadN} N (Axial)`,
      active: !!config.showMomentOnGraph,
      onToggle: () => onChange({ showMomentOnGraph: !config.showMomentOnGraph }),
      icon: <MomentIcon className="w-4 h-4 text-indigo-600" />,
      colorClass: 'indigo',
    },
    {
      num: 4,
      id: 'deflection',
      title: 'Deflection',
      subtitle: isBending
        ? 'Deflected beam elastic curve, peak midpoint sag, and digital deflection gauge'
        : 'Axial elongation ΔL and strain gauge callout',
      readout: isBending
        ? `δ_max = ${analysis.maxDeflectionMm.toFixed(3)} mm`
        : `ΔL = ${analysis.axialElongationMm.toFixed(4)} mm`,
      active: !!config.showDeflection,
      onToggle: () => onChange({ showDeflection: !config.showDeflection }),
      icon: <DeflectionIcon className="w-4 h-4 text-blue-600" />,
      colorClass: 'blue',
    },
    {
      num: 5,
      id: 'dimensions',
      title: 'Dimensions',
      subtitle: 'Technical engineering dimension lines for length (L), width (b), and height/thickness (d)',
      readout: `L = ${config.lengthMm} mm · b = ${config.widthMm} mm · d = ${config.thicknessMm} mm`,
      active: !!config.showDimensionLines,
      onToggle: () => onChange({ showDimensionLines: !config.showDimensionLines }),
      icon: <Ruler className="w-4 h-4 text-sky-600" />,
      colorClass: 'sky',
    },
    {
      num: 6,
      id: 'reactions',
      title: 'Reactions',
      subtitle: isBending
        ? 'Support reaction force vectors RA and RB at Point A & Point B'
        : 'Reaction anchor forces at the fixed clamp',
      readout: isBending
        ? `RA = ${(config.loadN / 2).toFixed(1)} N · RB = ${(config.loadN / 2).toFixed(1)} N`
        : `R_clamp = ${config.loadN} N`,
      active: !!config.showReactions,
      onToggle: () => onChange({ showReactions: !config.showReactions }),
      icon: <ArrowUp className="w-4 h-4 text-amber-600" />,
      colorClass: 'amber',
    },
    {
      num: 7,
      id: 'left_view',
      title: 'Left View (Cross-Section)',
      subtitle: '1st angle projection beam cross-section with stress/strain depth coloring',
      readout: `b = ${config.widthMm} mm · d = ${config.thicknessMm} mm`,
      active: config.showLeftView !== false,
      onToggle: () => onChange({ showLeftView: config.showLeftView === false ? true : false }),
      icon: <Box className="w-4 h-4 text-rose-600" />,
      colorClass: 'rose',
    },
    {
      num: 8,
      id: 'coordinate_system',
      title: 'Coordinate System (x, y)',
      subtitle: 'Cartesian origin (0, 0) triad at left support with +x and +y axes',
      readout: 'Point A (x = 0, y = 0)',
      active: config.showCoordinateSystem !== false,
      onToggle: () => onChange({ showCoordinateSystem: config.showCoordinateSystem === false ? true : false }),
      icon: <CoordinateIcon className="w-4 h-4 text-slate-700" />,
      colorClass: 'slate',
    },
  ];

  const handleEnableAll = () => {
    onChange({
      showCrossSectionVectors: true,
      showNeutralAxis: true,
      showMomentOnGraph: true,
      showDeflection: true,
      showDimensionLines: true,
      showReactions: true,
      showLeftView: true,
      showCoordinateSystem: true,
    });
  };

  const handleResetDefaults = () => {
    onChange({
      showCrossSectionVectors: false,
      showNeutralAxis: false,
      showMomentOnGraph: false,
      showDeflection: false,
      showDimensionLines: false,
      showReactions: false,
      showLeftView: true,
      showCoordinateSystem: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">View Options</h2>
              <p className="text-xs text-slate-500">Toggle engineering annotations and display overlays</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: 6 view options in exact ordered sequence */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {viewOptions.map((opt) => (
            <div
              key={opt.id}
              onClick={opt.onToggle}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3.5 ${
                opt.active
                  ? 'bg-slate-50/90 border-slate-300 shadow-2xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50/50 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Number Badge 1 to 6 */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    opt.active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {opt.num}
                </div>

                {/* Icon */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs">
                  {opt.icon}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{opt.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate">
                      {opt.readout}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{opt.subtitle}</p>
                </div>
              </div>

              {/* iOS-Style Toggle Switch */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={opt.active}
                  onClick={(e) => {
                    e.stopPropagation();
                    opt.onToggle();
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    opt.active ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      opt.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
            <button
              onClick={handleEnableAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              Enable All
            </button>
          </div>

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
