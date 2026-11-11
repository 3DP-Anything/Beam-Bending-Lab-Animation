/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Settings2, Activity, Palette } from 'lucide-react';
import { BeamConfig } from '../types/beam';

interface TopBarProps {
  config: BeamConfig;
  onChange: (updated: Partial<BeamConfig>) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  config,
  onChange,
  onOpenSettings,
  onOpenExport,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 bg-white shadow-xs sticky top-0 z-30">
      {/* Left: Wordmark Title */}
      <div className="flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded-sm bg-red-600 inline-block shadow-xs"></span>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Beam Bending Lab
        </h1>
      </div>

      {/* Center: Display Toggle Options */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Measurement Mode Toggle (Stress vs Strain vs Geometry) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1 px-1.5 text-slate-500">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Mode</span>
          </div>
          <button
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

        {/* Colormap Toggle (Rainbow vs Tens/Comp) - Dimmed in geometry mode */}
        <div className={`flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 transition-opacity ${
          config.visualizeMode === 'geometry' ? 'opacity-40 pointer-events-none' : ''
        }`}>
          <div className="flex items-center gap-1 px-1.5 text-slate-500">
            <Palette className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Colour</span>
          </div>
          <button
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

      {/* Right: Action Buttons in Title Bar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Open Specimen Dimensions, Material, Profile & Lab Settings"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Settings2 className="w-4 h-4 text-slate-600" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Export Graph button (Single instance in the app) */}
        <button
          onClick={onOpenExport}
          title="Export Graph as SVG, PNG, or GIF"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export Graph</span>
        </button>
      </div>
    </header>
  );
};
