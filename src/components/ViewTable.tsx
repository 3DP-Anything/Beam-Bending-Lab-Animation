/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Eye,
  Ruler,
  Minus,
  Square,
  ArrowUp,
  Check,
} from 'lucide-react';
import { MomentIcon, VectorIcon, DeflectionIcon } from './EngineeringIcons';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface ViewTableProps {
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  onChange: (updated: Partial<BeamConfig>) => void;
  isDark?: boolean;
}

interface ViewItem {
  id: string;
  name: string;
  description: string;
  readout: string;
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

export const ViewTable: React.FC<ViewTableProps> = ({
  config,
  analysis,
  onChange,
  isDark: _isDark,
}) => {
  const isBending = config.testType === 'bending';

  const bendingItems: ViewItem[] = [
    {
      id: 'dimensions',
      name: 'Dimensions (L, d)',
      description: 'Beam length & thickness dimension lines',
      readout: `L = ${config.lengthMm} mm · d = ${config.thicknessMm} mm`,
      active: config.showDimensionLines,
      onToggle: () => onChange({ showDimensionLines: !config.showDimensionLines }),
      icon: <Ruler className="w-3.5 h-3.5 text-sky-600" />,
    },
    {
      id: 'deflection',
      name: 'Deflection (δ)',
      description: 'Midspan vertical deflection callout',
      readout: `δ = ${analysis.maxDeflectionMm.toFixed(3)} mm`,
      active: config.showDeflection,
      onToggle: () => onChange({ showDeflection: !config.showDeflection }),
      icon: <DeflectionIcon className="w-3.5 h-3.5 text-blue-600" />,
    },
    {
      id: 'moment_on_graph',
      name: 'Bending Moment',
      description: 'M(x) curve overlaid directly on the beam',
      readout: `M_max = ${analysis.maxBendingMomentNm.toFixed(2)} N·m`,
      active: config.showMomentOnGraph,
      onToggle: () => onChange({ showMomentOnGraph: !config.showMomentOnGraph }),
      icon: <MomentIcon className="w-3.5 h-3.5 text-indigo-600" />,
    },
    {
      id: 'vectors',
      name: 'Stress / Strain Vectors',
      description: 'Cross-section vectors at plane x',
      readout: `Plane x = ${Math.round(config.crossSectionPlaneX)} mm`,
      active: config.showCrossSectionVectors,
      onToggle: () => onChange({ showCrossSectionVectors: !config.showCrossSectionVectors }),
      icon: <VectorIcon className="w-3.5 h-3.5 text-purple-600" />,
    },
    {
      id: 'neutral_axis',
      name: 'Neutral Axis',
      description: 'Zero-stress centroid bending axis (y = 0)',
      readout: 'y = 0 mm (NA)',
      active: config.showNeutralAxis,
      onToggle: () => onChange({ showNeutralAxis: !config.showNeutralAxis }),
      icon: <Minus className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />,
    },
    {
      id: 'original_outline',
      name: 'Original Shape',
      description: 'Undeformed reference beam profile',
      readout: 'Undeformed',
      active: config.showOriginalOutline,
      onToggle: () => onChange({ showOriginalOutline: !config.showOriginalOutline }),
      icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
    },
    {
      id: 'reactions',
      name: 'Reactions (RA, RB)',
      description: 'Support reaction vectors at Point A & B',
      readout: `RA = ${(config.loadN / 2).toFixed(1)} N · RB = ${(config.loadN / 2).toFixed(1)} N`,
      active: config.showReactions,
      onToggle: () => onChange({ showReactions: !config.showReactions }),
      icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" />,
    },
  ];

  const tensionItems: ViewItem[] = [
    {
      id: 'dimensions',
      name: 'Dimensions (L, d)',
      description: 'Specimen length & thickness dimension lines',
      readout: `L = ${config.lengthMm} mm · d = ${config.thicknessMm} mm`,
      active: config.showDimensionLines,
      onToggle: () => onChange({ showDimensionLines: !config.showDimensionLines }),
      icon: <Ruler className="w-3.5 h-3.5 text-sky-600" />,
    },
    {
      id: 'deflection',
      name: 'Elongation (ΔL)',
      description: 'Axial stretch under tensile load',
      readout: `ΔL = ${analysis.axialElongationMm.toFixed(4)} mm`,
      active: config.showDeflection,
      onToggle: () => onChange({ showDeflection: !config.showDeflection }),
      icon: <DeflectionIcon className="w-3.5 h-3.5 text-blue-600" />,
    },
    {
      id: 'vectors',
      name: 'Stress / Strain Vectors',
      description: 'Axial vectors along specimen plane x',
      readout: `Plane x = ${Math.round(config.crossSectionPlaneX)} mm`,
      active: config.showCrossSectionVectors,
      onToggle: () => onChange({ showCrossSectionVectors: !config.showCrossSectionVectors }),
      icon: <VectorIcon className="w-3.5 h-3.5 text-purple-600" />,
    },
    {
      id: 'neutral_axis',
      name: 'Centerline Axis',
      description: 'Specimen centroid longitudinal axis',
      readout: 'y = 0 mm (CL)',
      active: config.showNeutralAxis,
      onToggle: () => onChange({ showNeutralAxis: !config.showNeutralAxis }),
      icon: <Minus className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />,
    },
    {
      id: 'original_outline',
      name: 'Original Shape',
      description: 'Un-stretched reference outline',
      readout: 'Undeformed',
      active: config.showOriginalOutline,
      onToggle: () => onChange({ showOriginalOutline: !config.showOriginalOutline }),
      icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
    },
  ];

  const items = isBending ? bendingItems : tensionItems;

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden select-none">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-100/90 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">View</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
          Click any row to toggle on-canvas view
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-1.5 px-3">
                View Option
              </th>
              <th scope="col" className="py-1.5 px-3 hidden sm:table-cell">
                Description
              </th>
              <th scope="col" className="py-1.5 px-3 font-mono">
                Live Readout
              </th>
              <th scope="col" className="py-1.5 px-3 text-center w-20">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={item.onToggle}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <td className="py-1.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="p-0.5 rounded bg-slate-100 group-hover:bg-white border border-slate-200/80 transition-colors">
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                </td>
                <td className="py-1.5 px-3 text-slate-500 hidden sm:table-cell truncate max-w-[280px]">
                  {item.description}
                </td>
                <td className="py-1.5 px-3 font-mono text-[11px] font-medium text-slate-600 whitespace-nowrap">
                  {item.readout}
                </td>
                <td className="py-1.5 px-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      item.active
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {item.active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    <span>{item.active ? 'ON' : 'OFF'}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
