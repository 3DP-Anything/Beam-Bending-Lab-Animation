/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calculator, Activity, Palette } from 'lucide-react';
import { BeamConfig } from '../types/beam';

interface AnalysisModeMenuProps {
  config: BeamConfig;
  onChange: (updated: Partial<BeamConfig>) => void;
  isDark?: boolean;
}

export const AnalysisModeMenu: React.FC<AnalysisModeMenuProps> = ({
  config,
  onChange,
  isDark = false,
}) => {
  return (
    <nav
      aria-label="Analysis Mode and Colour Scale Menu"
      className={`w-full border-b px-5 py-1.5 flex items-center justify-start relative z-25 select-none ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="w-full flex items-center justify-start flex-wrap gap-2.5 max-w-[1440px]">
        {/* Menu Bar Label with Calculator Icon */}
        <div
          title="Analysis Mode & Colour Scale"
          className="flex items-center gap-1.5 w-6 sm:w-24 pr-2.5 mr-0.5 border-r border-slate-200 dark:border-slate-700 text-slate-500 shrink-0"
        >
          <Calculator className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline whitespace-nowrap">
            Analysis
          </span>
        </div>

        {/* Measurement Mode Toggle (Geometry vs Stress vs Strain) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1 px-1.5 text-slate-500">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Mode</span>
          </div>
          <button
            type="button"
            onClick={() => onChange({ visualizeMode: 'geometry' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              config.visualizeMode === 'geometry'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Geometry
          </button>
          <button
            type="button"
            onClick={() => onChange({ visualizeMode: 'stress' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              config.visualizeMode === 'stress'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stress (σ)
          </button>
          <button
            type="button"
            onClick={() => onChange({ visualizeMode: 'strain' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              config.visualizeMode === 'strain'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Strain (ε)
          </button>
        </div>

        {/* Colormap Toggle (Tens/Comp vs Rainbow) - Dimmed in geometry mode */}
        <div
          className={`flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 transition-opacity ${
            config.visualizeMode === 'geometry' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center gap-1 px-1.5 text-slate-500">
            <Palette className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Colour</span>
          </div>
          <button
            type="button"
            onClick={() => onChange({ colormap: 'tension_compression' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              config.colormap === 'tension_compression'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tension / Compression Spectrum"
          >
            Tens/Comp
          </button>
          <button
            type="button"
            onClick={() => onChange({ colormap: 'vonmises' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              config.colormap === 'vonmises'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="FEA Rainbow Spectrum (0 to max)"
          >
            Rainbow
          </button>
        </div>
      </div>
    </nav>
  );
};
