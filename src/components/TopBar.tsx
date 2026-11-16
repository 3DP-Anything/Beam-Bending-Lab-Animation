/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Settings2 } from 'lucide-react';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSettings,
  onOpenExport,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 bg-white shadow-xs sticky top-0 z-30">
      {/* Left: Wordmark Title */}
      <div className="flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded-sm bg-red-600 inline-block shadow-xs"></span>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          EN1213-14 Beam Bending Lab
        </h1>
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
