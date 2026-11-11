/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BeamAnalysisResult, BeamConfig } from '../types/beam';

interface EngineeringDiagramsProps {
  config: BeamConfig;
  analysis: BeamAnalysisResult;
  isDark?: boolean;
}

export const EngineeringDiagrams: React.FC<EngineeringDiagramsProps> = ({
  config,
  analysis,
  isDark = false,
}) => {
  const { lengthMm, loadN, showMomentDiagram, showShearDiagram, showCrossSectionProfile } = config;

  if (!showMomentDiagram && !showShearDiagram && !showCrossSectionProfile) {
    return null;
  }

  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const bgClass = isDark ? 'bg-slate-900/60' : 'bg-slate-50/80';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const M_maxNm = analysis.maxBendingMomentNm; // N*m
  const V_maxN = loadN / 2; // N

  return (
    <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border ${borderClass} ${bgClass}`}>
      {/* 1. Bending Moment Diagram (BMD) */}
      {showMomentDiagram && (() => {
        const peakH = M_maxNm > 0.0001
          ? Math.min(55, Math.max(0, (M_maxNm / Math.max(0.01, analysis.refBendingMomentNm || 1)) * 50))
          : 0;

        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span>Bending Moment Diagram (BMD)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                Mmax = {M_maxNm >= 1 ? `${M_maxNm.toFixed(2)} N·m` : `${(M_maxNm * 1000).toFixed(0)} N·mm`}
              </span>
            </div>
              <div className="relative h-28 w-full border border-dashed rounded-lg flex items-center justify-center p-2 bg-white dark:bg-slate-950">
                <svg viewBox="0 0 200 90" className="w-full h-full overflow-visible">
                  <line x1="10" y1="20" x2="190" y2="20" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
                  <polygon
                    points={`10,20 100,${20 + peakH} 190,20`}
                    fill={isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.18)'}
                    stroke="#6366f1"
                    strokeWidth="2"
                  />
                  {[30, 50, 70, 90, 110, 130, 150, 170].map((x) => {
                    const u = x <= 100 ? (x - 10) / 90 : (190 - x) / 90;
                    const yEnd = 20 + u * peakH;
                    return (
                      <line
                        key={x}
                        x1={x}
                        y1="20"
                        x2={x}
                        y2={yEnd}
                        stroke="#6366f1"
                        strokeWidth="0.75"
                        strokeOpacity="0.4"
                      />
                    );
                  })}
              <text x="10" y="14" fontSize="8" fill={textMuted} textAnchor="middle">0</text>
              <text x="100" y="82" fontSize="9" fontWeight="bold" fill="#6366f1" textAnchor="middle">
                +{M_maxNm.toFixed(2)} N·m
              </text>
              <text x="190" y="14" fontSize="8" fill={textMuted} textAnchor="middle">{lengthMm}mm</text>
            </svg>
          </div>
        </div>
      );
    })()}

      {/* 2. Shear Force Diagram (SFD) */}
      {showShearDiagram && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span>Shear Force Diagram (SFD)</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              V = ±{V_maxN.toFixed(2)} N
            </span>
          </div>
          <div className="relative h-28 w-full border border-dashed rounded-lg flex items-center justify-center p-2 bg-white dark:bg-slate-950">
            <svg viewBox="0 0 200 90" className="w-full h-full overflow-visible">
              <line x1="10" y1="45" x2="190" y2="45" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
              <polygon
                points="10,45 10,22 100,22 100,45"
                fill="rgba(16, 185, 129, 0.2)"
                stroke="#10b981"
                strokeWidth="2"
              />
              <polygon
                points="100,45 100,68 190,68 190,45"
                fill="rgba(239, 68, 68, 0.2)"
                stroke="#ef4444"
                strokeWidth="2"
              />
              <line x1="100" y1="22" x2="100" y2="68" stroke="#10b981" strokeWidth="2" strokeDasharray="3,2" />

              <text x="55" y="36" fontSize="9" fontWeight="bold" fill="#10b981" textAnchor="middle">
                +{V_maxN.toFixed(2)} N
              </text>
              <text x="145" y="60" fontSize="9" fontWeight="bold" fill="#ef4444" textAnchor="middle">
                -{V_maxN.toFixed(2)} N
              </text>
            </svg>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Discontinuity ΔV = -W at midspan
          </div>
        </div>
      )}

      {/* 3. Cross-Section Stress Profile */}
      {showCrossSectionProfile && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span>Midspan Stress Profile σ(y)</span>
            <span className="font-mono text-rose-600 dark:text-rose-400">
              σmax = {analysis.maxNormalStressMpa.toFixed(2)} MPa
            </span>
          </div>
          <div className="relative h-28 w-full border border-dashed rounded-lg flex items-center justify-center p-2 bg-white dark:bg-slate-950">
            <svg viewBox="0 0 200 90" className="w-full h-full overflow-visible">
              <rect x="25" y="15" width="30" height="60" fill={isDark ? '#1e293b' : '#f1f5f9'} stroke="#64748b" strokeWidth="1.5" />
              <line x1="15" y1="45" x2="185" y2="45" stroke="#94a3b8" strokeDasharray="3,2" strokeWidth="1" />
              <text x="58" y="47" fontSize="6.5" fill={textMuted}>Neutral Axis</text>

              <line x1="120" y1="15" x2="120" y2="75" stroke="#475569" strokeWidth="1.5" />
              <polygon points="120,45 120,15 90,15" fill="rgba(30, 64, 175, 0.25)" stroke="#1e40af" strokeWidth="1.5" />
              <polygon points="120,45 120,75 150,75" fill="rgba(220, 38, 38, 0.25)" stroke="#dc2626" strokeWidth="1.5" />

              <line x1="120" y1="25" x2="100" y2="25" stroke="#1e40af" strokeWidth="1" />
              <line x1="120" y1="65" x2="140" y2="65" stroke="#dc2626" strokeWidth="1" />

              <text x="75" y="22" fontSize="7" fontWeight="bold" fill="#1e40af">Comp (-)</text>
              <text x="145" y="72" fontSize="7" fontWeight="bold" fill="#dc2626">Tens (+)</text>
            </svg>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Navier distribution σ(y) = -M·y/I
          </div>
        </div>
      )}
    </div>
  );
};
