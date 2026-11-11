/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Minus,
  Ruler,
  ArrowUp,
  Box,
  Eye,
} from 'lucide-react';
import { MomentIcon, VectorIcon, DeflectionIcon, CoordinateIcon } from './EngineeringIcons';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface ViewSideMenuProps {
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
  isDark?: boolean;
}

export const ViewSideMenu: React.FC<ViewSideMenuProps> = ({
  config,
  analysis,
  onChange,
  isDark = false,
}) => {
  const isBending = config.testType === 'bending';

  const viewOptions = [
    {
      id: 'coordinate_system',
      title: 'Coordinate System (x, y)',
      subtitle: 'Cartesian origin (0, 0) triad at Point A with horizontal +x and vertical +y axes',
      readout: 'Point A (x = 0, y = 0)',
      active: config.showCoordinateSystem !== false,
      onToggle: () => onChange({ showCoordinateSystem: config.showCoordinateSystem === false ? true : false }),
      icon: <CoordinateIcon className="w-4 h-4" />,
      activeClasses: 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs',
      iconColor: 'text-slate-800',
    },
    {
      id: 'left_view',
      title: 'Left View (Cross-Section)',
      subtitle: '1st angle projection beam cross-section with stress depth coloring and section hatching',
      readout: `b = ${config.widthMm} mm · d = ${config.thicknessMm} mm`,
      active: config.showLeftView !== false,
      onToggle: () => onChange({ showLeftView: config.showLeftView === false ? true : false }),
      icon: <Box className="w-4 h-4" />,
      activeClasses: 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs',
      iconColor: 'text-rose-600',
    },
    {
      id: 'dimensions',
      title: 'Dimensions (L, b, d)',
      subtitle: 'Technical engineering dimension lines for length (L), width (b), and height/thickness (d)',
      readout: `L = ${config.lengthMm} mm · b = ${config.widthMm} mm · d = ${config.thicknessMm} mm`,
      active: !!config.showDimensionLines,
      onToggle: () => onChange({ showDimensionLines: !config.showDimensionLines }),
      icon: <Ruler className="w-4 h-4" />,
      activeClasses: 'bg-sky-50 text-sky-600 border-sky-200 shadow-2xs',
      iconColor: 'text-sky-600',
    },
    {
      id: 'neutral_axis',
      title: 'Neutral Axis (NA)',
      subtitle: isBending
        ? 'Zero-stress longitudinal centroidal bending axis (y = 0) with high-contrast indicator'
        : 'Centerline longitudinal centroid axis (y = 0)',
      readout: 'y = 0 mm (Centroidal NA)',
      active: !!config.showNeutralAxis,
      onToggle: () => onChange({ showNeutralAxis: !config.showNeutralAxis }),
      icon: <Minus className="w-4 h-4 stroke-[3]" />,
      activeClasses: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-2xs',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'deflection',
      title: 'Deflection Curve & Sag',
      subtitle: isBending
        ? 'Deflected beam elastic curve, peak midpoint sag δ_max, and deflection callout'
        : 'Axial elongation ΔL and displacement callout',
      readout: isBending
        ? `δ_max = ${analysis.maxDeflectionMm.toFixed(3)} mm`
        : `ΔL = ${analysis.axialElongationMm.toFixed(4)} mm`,
      active: !!config.showDeflection,
      onToggle: () => onChange({ showDeflection: !config.showDeflection }),
      icon: <DeflectionIcon className="w-4 h-4" />,
      activeClasses: 'bg-blue-50 text-blue-600 border-blue-200 shadow-2xs',
      iconColor: 'text-blue-600',
    },
    {
      id: 'bending_moment',
      title: 'Bending Moment Diagram',
      subtitle: isBending
        ? 'Bending moment M(x) curve overlaid directly on the beam profile with interactive probe'
        : 'Internal axial force line overlaid on specimen',
      readout: isBending
        ? `M_max = ${analysis.maxBendingMomentNm.toFixed(2)} N·m`
        : `N = ${config.loadN} N (Axial)`,
      active: !!config.showMomentOnGraph,
      onToggle: () => onChange({ showMomentOnGraph: !config.showMomentOnGraph }),
      icon: <MomentIcon className="w-4 h-4" />,
      activeClasses: 'bg-amber-50 text-amber-600 border-amber-200 shadow-2xs',
      iconColor: 'text-amber-600',
    },
    {
      id: 'vectors',
      title: 'Stress / Strain Vectors',
      subtitle: isBending
        ? 'Cross-section normal stress and strain arrow distribution at movable section plane x'
        : 'Axial vector force and deformation arrows along specimen',
      readout: `Plane x = ${Math.round(config.crossSectionPlaneX)} mm (${((config.crossSectionPlaneX / config.lengthMm) * 100).toFixed(0)}% L)`,
      active: !!config.showCrossSectionVectors,
      onToggle: () => onChange({ showCrossSectionVectors: !config.showCrossSectionVectors }),
      icon: <VectorIcon className="w-4 h-4" />,
      activeClasses: 'bg-purple-50 text-purple-600 border-purple-200 shadow-2xs',
      iconColor: 'text-purple-600',
    },
    {
      id: 'reactions',
      title: 'Support Reactions (RA, RB)',
      subtitle: isBending
        ? 'Support reaction force vectors RA and RB at Point A (Pin) and Point B (Roller)'
        : 'Reaction anchor forces at the fixed clamp',
      readout: isBending
        ? `RA = ${(config.loadN / 2).toFixed(1)} N · RB = ${(config.loadN / 2).toFixed(1)} N`
        : `R_clamp = ${config.loadN} N`,
      active: !!config.showReactions,
      onToggle: () => onChange({ showReactions: !config.showReactions }),
      icon: <ArrowUp className="w-4 h-4" />,
      activeClasses: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-2xs',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <aside
      aria-label="View Overlays Menu"
      className="absolute right-3.5 top-1/2 -translate-y-1/2 z-30 select-none pointer-events-auto"
    >
      <div
        className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border shadow-lg backdrop-blur-md transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-black/40'
            : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-900/10'
        }`}
      >
        {/* Subtle Side Menu Label */}
        <div
          title="View Overlays & Displays"
          className="w-8 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-0.5"
        >
          <Eye className="w-3.5 h-3.5" />
        </div>

        <div className="w-5 h-px bg-slate-200 dark:bg-slate-700 mb-0.5" />

        {/* View Option Icon Buttons */}
        {viewOptions.map((opt) => (
          <div key={opt.id} className="relative group">
            <button
              onClick={opt.onToggle}
              aria-label={opt.title}
              aria-pressed={opt.active}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 border cursor-pointer ${
                opt.active
                  ? `opacity-100 ${opt.activeClasses}`
                  : 'opacity-35 hover:opacity-85 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-transparent'
              }`}
            >
              <span className={opt.active ? opt.iconColor : 'text-current'}>
                {opt.icon}
              </span>
            </button>

            {/* Hover Tooltip / Flyout Info Card (positioned to the left of the side menu) */}
            <div
              role="tooltip"
              className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1.5 group-hover:translate-x-0 transition-all duration-150 z-50 w-64"
            >
              <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-xl p-3 shadow-xl border border-slate-700/80 text-left relative">
                {/* Right-pointing triangle arrow */}
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-slate-900/95"
                  aria-hidden="true"
                />

                {/* Header row: Title and Status */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-white tracking-tight">
                    {opt.title}
                  </span>
                  <span
                    className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                      opt.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {opt.active ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Subtitle / Description info */}
                <p className="text-[11px] text-slate-300 leading-snug">
                  {opt.subtitle}
                </p>

                {/* Real-time value readout */}
                {opt.readout && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="text-slate-400">Value:</span>
                    <span className="text-amber-300 font-semibold">{opt.readout}</span>
                  </div>
                )}

                {/* Click action instruction */}
                <div className="mt-1 text-[9.5px] text-slate-400/90 italic flex items-center justify-between">
                  <span>Click icon to {opt.active ? 'turn off' : 'activate'}</span>
                  <span className="text-indigo-400 font-medium">Toggle</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
