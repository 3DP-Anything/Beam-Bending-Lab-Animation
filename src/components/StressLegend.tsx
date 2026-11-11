/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StressColormap, VisualizeMode } from '../types/beam';

interface StressLegendProps {
  colormap: StressColormap;
  visualizeMode: VisualizeMode;
  refMaxStress: number;     // MPa under max load
  refMaxStrainMicro: number; // \mu\epsilon under max load
  materialName: string;
  currentStress?: number;   // MPa under selected load
  currentStrainMicro?: number; // \mu\epsilon under selected load
}

export const StressLegend: React.FC<StressLegendProps> = ({
  colormap,
  visualizeMode,
  refMaxStress,
  refMaxStrainMicro,
  materialName: _materialName,
  currentStress = 0,
  currentStrainMicro = 0,
}) => {
  const isStress = visualizeMode === 'stress';
  const safeRefMax = Math.max(1e-6, isStress ? refMaxStress : refMaxStrainMicro);
  const currentVal = Math.max(0, isStress ? currentStress : currentStrainMicro);

  // Generate CSS gradient based on colormap
  let gradientCss = '';
  if (colormap === 'tension_compression') {
    gradientCss = 'linear-gradient(to right, rgb(30, 64, 175) 0%, rgb(241, 245, 249) 50%, rgb(220, 38, 38) 100%)';
  } else if (colormap === 'turbo') {
    gradientCss = 'linear-gradient(to right, #30123b, #4145ab, #4675ed, #39a2fc, #1bcfd4, #24eca6, #61fc4f, #a4fc3b, #d1e834, #f3c63a, #fe9b2d, #f36315, #d93806, #a21a01, #7a0403)';
  } else if (colormap === 'monochrome') {
    gradientCss = 'linear-gradient(to right, #f1f5f9 0%, #0f172a 100%)';
  } else {
    // Classic FEA Rainbow
    gradientCss = 'linear-gradient(to right, rgb(30, 58, 138) 0%, rgb(14, 165, 233) 20%, rgb(16, 185, 129) 40%, rgb(234, 179, 8) 65%, rgb(249, 115, 22) 85%, rgb(225, 29, 72) 100%)';
  }

  const formatVal = (v: number) => {
    if (isStress) return `${v.toFixed(2)} MPa`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k με`;
    if (v > 0 && v < 10) return `${v.toFixed(2)} με`;
    return `${v.toFixed(0)} με`;
  };

  // Cursor position percentage on the bar
  let cursorPct = 0;
  if (colormap === 'tension_compression') {
    cursorPct = Math.max(0, Math.min(100, 50 + (currentVal / safeRefMax) * 50));
  } else {
    cursorPct = Math.max(0, Math.min(100, (currentVal / safeRefMax) * 100));
  }
  if (cursorPct > 99.8) cursorPct = 100;

  return (
    // Clean frameless scale with title to the left and no load/max values displayed above
    <div className="w-full max-w-md mx-auto select-none">
      <div className="flex items-center gap-3">
        {/* Scale title written to the left of the scale */}
        <div className="shrink-0">
          <span className="font-semibold text-xs tracking-wide text-slate-700 whitespace-nowrap block">
            {isStress ? 'Stress scale' : 'Strain scale'}
          </span>
        </div>

        {/* Color bar & cursor & tick labels */}
        <div className="flex-1 min-w-0">
          {/* Relative container for the color bar and cursor */}
          <div className="relative pt-[22px] pb-1">
            {/* Floating cursor indicator above the bar (hidden for tens/comp) */}
            {colormap !== 'tension_compression' && (
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-75 ease-out z-20 pointer-events-none"
                style={{ left: `${cursorPct}%` }}
              >
                {/* σMax or εMax written on top of the moving cursor */}
                <span className="font-mono text-slate-800 whitespace-nowrap leading-none mb-0.5 inline-flex items-baseline justify-center select-none">
                  <span className="text-[18px] font-bold leading-none">{isStress ? 'σ' : 'ε'}</span>
                  <span className="text-[9px] font-bold leading-none ml-0.5">Max</span>
                </span>
                {/* Triangle pointer */}
                <div className="w-0 h-0 border-x-3.5 border-x-transparent border-t-4 border-t-slate-900 drop-shadow-xs" />
              </div>
            )}

            {/* Color bar strip */}
            <div
              className="w-full h-3.5 rounded-md shadow-xs border border-slate-300 relative overflow-visible"
              style={{ background: gradientCss }}
            >
              {/* Needle crossing through the color bar (hidden for tens/comp) */}
              {colormap !== 'tension_compression' && (
                <div
                  className="absolute -top-0.5 bottom-[-2px] w-[3px] bg-white rounded-xs shadow-[0_0_3px_rgba(0,0,0,0.7)] -translate-x-1/2 z-10 transition-all duration-75 pointer-events-none border border-slate-900"
                  style={{ left: `${cursorPct}%` }}
                />
              )}
            </div>

            {/* Bottom indicator tick (hidden for tens/comp) */}
            {colormap !== 'tension_compression' && (
              <div
                className="absolute bottom-[-1px] -translate-x-1/2 flex flex-col items-center transition-all duration-75 ease-out z-20 pointer-events-none"
                style={{ left: `${cursorPct}%` }}
              >
                <div className="w-0 h-0 border-x-3 border-x-transparent border-b-4 border-b-slate-900" />
              </div>
            )}
          </div>

          {/* Scale tick marks beneath the bar */}
          <div className="flex justify-between items-center mt-0.5 text-[10px] font-mono text-slate-500">
            {colormap === 'tension_compression' ? (
              <>
                <span className="text-blue-600 font-semibold">
                  -{formatVal(safeRefMax)} (Comp)
                </span>
                <span className="text-slate-400">0</span>
                <span className="text-red-600 font-semibold">
                  +{formatVal(safeRefMax)} (Tens)
                </span>
              </>
            ) : (
              <>
                <span>0</span>
                <span>{formatVal(safeRefMax * 0.25)}</span>
                <span>{formatVal(safeRefMax * 0.5)}</span>
                <span>{formatVal(safeRefMax * 0.75)}</span>
                <span className="font-semibold text-slate-700">
                  {formatVal(safeRefMax)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
