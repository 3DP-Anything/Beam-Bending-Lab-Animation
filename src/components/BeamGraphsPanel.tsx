/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { BeamAnalysisResult, BeamConfig, BeamProfileType } from '../types/beam';
import {
  BEAM_SHAPE_META,
  computeProfileProperties,
  getMatchedAreaShapeConfig,
  getOrderedActiveShapes,
} from '../utils/beamPhysics';

interface BeamGraphsPanelProps {
  config: BeamConfig;
  analysis: BeamAnalysisResult;
}

function formatAxisNumber(val: number): string {
  if (Math.abs(val) < 1e-9) return '0';
  const abs = Math.abs(val);
  if (abs >= 1000) return val.toFixed(0);
  if (abs >= 100) return val.toFixed(1);
  if (abs >= 10) return val.toFixed(1);
  if (abs >= 1) return val.toFixed(2);
  if (abs >= 0.01) return val.toFixed(3);
  return val.toFixed(4);
}

function formatMeterValue(val: number): string {
  if (Math.abs(val) < 1e-12) return '0';
  const abs = Math.abs(val);
  if (abs >= 1) return val.toFixed(2);
  if (abs >= 0.01) return val.toFixed(4);
  if (abs >= 0.001) return val.toFixed(5);
  if (abs >= 0.0001) return val.toFixed(6);
  return val.toExponential(2);
}

function formatStiffnessNm(val: number): string {
  if (!Number.isFinite(val)) return '∞ (Support)';
  const abs = Math.abs(val);
  if (abs >= 1e6) return `${(val / 1e6).toFixed(2)} MN/m`;
  if (abs >= 1e4) return `${(val / 1e3).toFixed(1)} kN/m`;
  if (abs >= 100) return `${val.toFixed(0)} N/m`;
  return `${val.toFixed(1)} N/m`;
}

function buildLoadIntervalPoints(maxLoadN: number, stepN: number): number[] {
  const safeMax = Math.max(0.1, maxLoadN);
  const safeStep = Math.max(0.1, stepN);
  const count = Math.floor((safeMax + 1e-7) / safeStep);
  const points: number[] = [];
  const maxRenderedPoints = 250;

  if (count <= maxRenderedPoints) {
    for (let i = 0; i <= count; i++) {
      const w = Math.min(safeMax, Math.round(i * safeStep * 1000) / 1000);
      points.push(w);
    }
  } else {
    const stride = Math.ceil(count / maxRenderedPoints);
    for (let i = 0; i <= count; i += stride) {
      const w = Math.min(safeMax, Math.round(i * safeStep * 1000) / 1000);
      points.push(w);
    }
  }

  if (points.length === 0 || safeMax - points[points.length - 1] > 1e-4) {
    points.push(Math.round(safeMax * 1000) / 1000);
  }
  return points;
}

interface ShapeSeries {
  shape: BeamProfileType;
  label: string;
  ssColor: string;
  ldColor: string;
  props: ReturnType<typeof computeProfileProperties>;
  yTopM: number;
  getTopStressAtLoad: (W: number) => number;
  getTopStrainAtLoad: (W: number) => number;
  getDeflectionAtLoadM: (W: number) => number;
  peakGlobalStressMpa: number;
  peakGlobalDeflM: number;
  endStress: number;
  endStrain: number;
  endDeflectionM: number;
  currStress: number;
  currStrain: number;
  currDeflectionM: number;
  inspectStress: number;
  inspectStrain: number;
  inspectDeflectionM: number;
  localStiffnessNm: number;
}

export const BeamGraphsPanel: React.FC<BeamGraphsPanelProps> = ({ config }) => {
  const [hoverLoadSS, setHoverLoadSS] = useState<number | null>(null);
  const [hoverLoadLD, setHoverLoadLD] = useState<number | null>(null);
  const scaleAnchorRef = useRef<{
    key: string;
    rectAreaMm2: number;
    maxStressMpa: number;
    maxDeflectionM: number;
  } | null>(null);

  const showSS = !!config.showStressStrainGraph;
  const showLD = !!config.showLoadDeflectionGraph;
  const showBoth = showSS && showLD;

  const isBending = config.testType === 'bending';
  const L_m = Math.max(1e-6, config.lengthMm / 1000);
  const xMm = Math.max(0, Math.min(config.lengthMm, config.crossSectionPlaneX));
  const xM = xMm / 1000;
  const halfThicknessMm = config.thicknessMm / 2;
  const yTopM = Math.max(0.0001, halfThicknessMm / 1000);

  const W_max = Math.max(0.1, config.maxLoadN);
  const W_step = Math.max(0.1, config.loadStepN || 1);
  const W_curr = Math.max(0, Math.min(W_max, config.loadN));

  const E_GPa = Math.max(0.01, config.material.youngsModulus);
  const E_Pa = E_GPa * 1e9;

  const loadPoints = useMemo(() => buildLoadIntervalPoints(W_max, W_step), [W_max, W_step]);

  const activeShapes = getOrderedActiveShapes(config);
  const isMultiShape = activeShapes.length > 1;

  const inspectSSLoad = hoverLoadSS !== null ? hoverLoadSS : W_curr;
  const inspectLDLoad = hoverLoadLD !== null ? hoverLoadLD : W_curr;

  const seriesList: ShapeSeries[] = activeShapes.map((shape) => {
    const shapeConfig = getMatchedAreaShapeConfig(config, shape);
    const props = computeProfileProperties(shapeConfig);
    const shapeYTopM = Math.max(0.0001, (shapeConfig.thicknessMm / 2) / 1000);
    const meta = BEAM_SHAPE_META[shape];

    const getTopStressAtLoad = (W: number): number => {
      if (isBending) {
        const xi = xM <= L_m / 2 ? xM : L_m - xM;
        const M_Nm = (Math.abs(W) / 2) * xi;
        return ((M_Nm * shapeYTopM) / props.I_m4) / 1e6;
      }
      return (Math.abs(W) / props.areaM2) / 1e6;
    };

    const getTopStrainAtLoad = (W: number): number => {
      return (getTopStressAtLoad(W) / E_GPa) * 1000;
    };

    const getDeflectionAtLoadM = (W: number): number => {
      if (isBending) {
        const xi = xM <= L_m / 2 ? xM : L_m - xM;
        return (W * xi * (3 * L_m * L_m - 4 * xi * xi)) / (48 * E_Pa * props.I_m4);
      }
      return (W * xM) / (props.areaM2 * E_Pa);
    };

    const peakGlobalStressMpa = isBending
      ? Math.max(
          (((W_max * L_m) / 4) * props.yMaxM / props.I_m4) / 1e6,
          (((W_max * L_m) / 4) * shapeYTopM / props.I_m4) / 1e6
        )
      : (W_max / props.areaM2) / 1e6;

    const peakGlobalDeflM = isBending
      ? Math.max(1e-10, (W_max * Math.pow(L_m, 3)) / (48 * E_Pa * props.I_m4))
      : Math.max(1e-10, (W_max * L_m) / (props.areaM2 * E_Pa));

    const endStress = getTopStressAtLoad(W_max);
    const endStrain = getTopStrainAtLoad(W_max);
    const endDeflectionM = getDeflectionAtLoadM(W_max);

    return {
      shape,
      label: meta.shortLabel,
      ssColor: isMultiShape ? meta.color : '#0284c7',
      ldColor: isMultiShape ? meta.color : '#dc2626',
      props,
      yTopM: shapeYTopM,
      getTopStressAtLoad,
      getTopStrainAtLoad,
      getDeflectionAtLoadM,
      peakGlobalStressMpa,
      peakGlobalDeflM,
      endStress,
      endStrain,
      endDeflectionM,
      currStress: getTopStressAtLoad(W_curr),
      currStrain: getTopStrainAtLoad(W_curr),
      currDeflectionM: getDeflectionAtLoadM(W_curr),
      inspectStress: getTopStressAtLoad(inspectSSLoad),
      inspectStrain: getTopStrainAtLoad(inspectSSLoad),
      inspectDeflectionM: getDeflectionAtLoadM(inspectLDLoad),
      localStiffnessNm: endDeflectionM > 1e-11 ? W_max / endDeflectionM : Infinity,
    };
  });

  // Compute instantaneous envelope across all active shapes (and swapped orientation for constant-area ratio slider stability)
  let currentMaxStressEnvelope = 1e-6;
  let currentMaxDeflEnvelope = 1e-10;
  let swappedMaxStressEnvelope = 1e-6;
  let swappedMaxDeflEnvelope = 1e-10;

  for (const s of seriesList) {
    currentMaxStressEnvelope = Math.max(currentMaxStressEnvelope, s.peakGlobalStressMpa);
    currentMaxDeflEnvelope = Math.max(currentMaxDeflEnvelope, s.peakGlobalDeflM);

    if (isBending) {
      const swappedConfig = getMatchedAreaShapeConfig(
        {
          ...config,
          widthMm: config.thicknessMm,
          thicknessMm: config.widthMm,
        },
        s.shape
      );
      const swappedProps = computeProfileProperties(swappedConfig);
      const swappedYTopM = Math.max(0.0001, (swappedConfig.thicknessMm / 2) / 1000);
      const swappedStress = (((W_max * L_m) / 4) * Math.max(swappedProps.yMaxM, swappedYTopM) / swappedProps.I_m4) / 1e6;
      const swappedDefl = (W_max * Math.pow(L_m, 3)) / (48 * E_Pa * swappedProps.I_m4);
      swappedMaxStressEnvelope = Math.max(swappedMaxStressEnvelope, swappedStress);
      swappedMaxDeflEnvelope = Math.max(swappedMaxDeflEnvelope, swappedDefl);
    }
  }

  const rectAreaMm2 = Math.max(1, config.widthMm * config.thicknessMm);
  const scaleKey = [
    config.testType,
    activeShapes.join(','),
    config.lengthMm,
    W_max,
    config.material.id,
    E_GPa,
    config.wallThicknessMm || 1,
    config.flangeThicknessMm || 1,
    config.webThicknessMm || 1,
  ].join('|');

  const prevAnchor = scaleAnchorRef.current;
  const areaDiffRatio = prevAnchor
    ? Math.abs(rectAreaMm2 - prevAnchor.rectAreaMm2) / Math.max(1, prevAnchor.rectAreaMm2)
    : 1;

  if (!prevAnchor || prevAnchor.key !== scaleKey || areaDiffRatio > 0.03) {
    scaleAnchorRef.current = {
      key: scaleKey,
      rectAreaMm2,
      maxStressMpa: Math.max(currentMaxStressEnvelope, swappedMaxStressEnvelope),
      maxDeflectionM: Math.max(currentMaxDeflEnvelope, swappedMaxDeflEnvelope),
    };
  } else {
    scaleAnchorRef.current = {
      ...prevAnchor,
      maxStressMpa: Math.max(prevAnchor.maxStressMpa, currentMaxStressEnvelope),
      maxDeflectionM: Math.max(prevAnchor.maxDeflectionM, currentMaxDeflEnvelope),
    };
  }

  const refMaxStressMpa = scaleAnchorRef.current.maxStressMpa;
  const refMaxStrainMicro = Math.max(1e-6, (refMaxStressMpa / E_GPa) * 1000);
  const refMaxDeflectionM = scaleAnchorRef.current.maxDeflectionM;

  if (!showSS && !showLD) return null;

  const primarySeries = seriesList[0];

  // Shared SVG geometry
  const vbW = 540;
  const vbH = 208;
  const padL = 64;
  const padR = 26;
  const padT = 16;
  const padB = 38;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Yield line if within chart scale
  const yieldStrengthMpa = config.material.yieldStrength;
  const showYieldOnSS = yieldStrengthMpa > 0 && yieldStrengthMpa <= refMaxStressMpa * 1.02;
  const yieldY = padT + plotH - Math.min(1, yieldStrengthMpa / refMaxStressMpa) * plotH;

  const snapToNearestLoadPoint = (targetLoad: number): number => {
    let best = loadPoints[0];
    let bestDist = Math.abs(targetLoad - best);
    for (let i = 1; i < loadPoints.length; i++) {
      const d = Math.abs(targetLoad - loadPoints[i]);
      if (d < bestDist) {
        bestDist = d;
        best = loadPoints[i];
      }
    }
    return best;
  };

  // Use the longest Stress-Strain curve for horizontal pointer hover mapping
  const maxSSEndStrain = seriesList.reduce((m, s) => Math.max(m, s.endStrain), 0);
  const maxSSEndX = padL + (maxSSEndStrain / refMaxStrainMicro) * plotW;

  const handleSSPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * vbW;
    const clampedX = Math.max(padL, Math.min(padL + plotW, relX));
    const maxPxX = Math.max(padL + 1, maxSSEndX);
    const ratio = maxSSEndStrain > 1e-9 ? Math.max(0, Math.min(1, (clampedX - padL) / (maxPxX - padL))) : 0;
    setHoverLoadSS(snapToNearestLoadPoint(ratio * W_max));
  };

  const handleLDPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = ((e.clientY - rect.top) / rect.height) * vbH;
    const clampedY = Math.max(padT, Math.min(padT + plotH, relY));
    const ratio = (padT + plotH - clampedY) / plotH;
    setHoverLoadLD(snapToNearestLoadPoint(Math.max(0, Math.min(1, ratio)) * W_max));
  };

  // Draw longest Stress-Strain lines first so shorter stiff shapes remain visible on top
  const ssDrawOrder = [...seriesList].sort((a, b) => b.endStress - a.endStress);

  // Use longest active shape on SS for hover crosshair coordinate
  const ssLeadSeries = ssDrawOrder[0] || primarySeries;
  const ssLeadHoverX = padL + (ssLeadSeries.inspectStrain / refMaxStrainMicro) * plotW;
  const ssLeadHoverY = padT + plotH - (ssLeadSeries.inspectStress / refMaxStressMpa) * plotH;

  return (
    <section
      aria-label="Engineering Response Graphs"
      className="w-full shrink-0 bg-white border-t border-slate-200 px-5 py-3"
    >
      <div
        className={
          showBoth
            ? 'max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x lg:divide-slate-200'
            : 'max-w-3xl mx-auto grid grid-cols-1'
        }
      >
        {/* ============================================================ */}
        {/* GRAPH 1: STRESS vs STRAIN (at slider X, top fiber y = d/2)   */}
        {/* ============================================================ */}
        {showSS && (
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1 px-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                  Stress vs Strain
                </h2>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  x = {Math.round(xMm)} mm · y = {formatAxisNumber(halfThicknessMm)} mm (top) · ΔW = {formatAxisNumber(W_step)} N
                </span>
              </div>

              {!isMultiShape ? (
                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-600">
                  <span>
                    E = <strong className="text-slate-800">{E_GPa} GPa</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    σ_max = <strong className="text-sky-700">{formatAxisNumber(primarySeries.inspectStress)} MPa</strong>
                  </span>
                  <span>
                    ε_max = <strong className="text-sky-700">{formatAxisNumber(primarySeries.inspectStrain)} με</strong>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] font-mono tabular-nums text-slate-600">
                  E = <strong className="text-slate-800">{E_GPa} GPa</strong> · W = <strong className="text-slate-800">{formatAxisNumber(inspectSSLoad)} N</strong>
                </div>
              )}
            </div>

            {/* Inline multi-shape comparison legend */}
            {isMultiShape && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 mb-1 text-[10.5px] font-mono tabular-nums text-slate-600">
                {seriesList.map((s) => (
                  <div key={`ss-leg-${s.shape}`} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-0.5 inline-block shrink-0"
                      style={{ backgroundColor: s.ssColor }}
                      aria-hidden="true"
                    />
                    <span className="font-sans font-semibold text-slate-800">{s.label}:</span>
                    <span style={{ color: s.ssColor }} className="font-bold">
                      {formatAxisNumber(s.inspectStress)} MPa
                    </span>
                    <span className="text-slate-400">
                      ({formatAxisNumber(s.inspectStrain)} με)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="w-full">
              <svg
                viewBox={`0 0 ${vbW} ${vbH}`}
                className="w-full h-[190px] sm:h-[205px] block select-none cursor-crosshair overflow-visible"
                onPointerMove={handleSSPointerMove}
                onPointerLeave={() => setHoverLoadSS(null)}
              >
                {/* Grid lines */}
                {yTicks.map((t) => {
                  const gy = padT + plotH - t * plotH;
                  return (
                    <g key={`ss-y-${t}`}>
                      <line
                        x1={padL}
                        y1={gy}
                        x2={padL + plotW}
                        y2={gy}
                        stroke={t === 0 ? '#94a3b8' : '#e2e8f0'}
                        strokeWidth={t === 0 ? 1.25 : 0.75}
                      />
                      <text
                        x={padL - 8}
                        y={gy + 3.5}
                        textAnchor="end"
                        className="fill-slate-500 font-mono text-[9.5px]"
                      >
                        {formatAxisNumber(t * refMaxStressMpa)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((t) => {
                  const gx = padL + t * plotW;
                  return (
                    <g key={`ss-x-${t}`}>
                      <line
                        x1={gx}
                        y1={padT}
                        x2={gx}
                        y2={padT + plotH}
                        stroke={t === 0 ? '#94a3b8' : '#e2e8f0'}
                        strokeWidth={t === 0 ? 1.25 : 0.75}
                      />
                      <text
                        x={gx}
                        y={padT + plotH + 14}
                        textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}
                        className="fill-slate-500 font-mono text-[9.5px]"
                      >
                        {formatAxisNumber(t * refMaxStrainMicro)}
                      </text>
                    </g>
                  );
                })}

                {/* Yield threshold marker if within scale */}
                {showYieldOnSS && (
                  <g>
                    <line
                      x1={padL}
                      y1={yieldY}
                      x2={padL + plotW}
                      y2={yieldY}
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeDasharray="4,3"
                    />
                    <text
                      x={padL + plotW - 4}
                      y={yieldY - 4}
                      textAnchor="end"
                      className="fill-amber-600 font-mono text-[8.5px] font-semibold"
                    >
                      Yield σy = {yieldStrengthMpa} MPa
                    </text>
                  </g>
                )}

                {/* Subtle shaded area beneath primary curve when single-shape */}
                {!isMultiShape && primarySeries.endStrain > 1e-6 && (
                  <polygon
                    points={`${padL},${padT + plotH} ${padL + (primarySeries.endStrain / refMaxStrainMicro) * plotW},${padT + plotH - (primarySeries.endStress / refMaxStressMpa) * plotH} ${padL + (primarySeries.endStrain / refMaxStrainMicro) * plotW},${padT + plotH}`}
                    fill="rgba(2, 132, 199, 0.08)"
                  />
                )}

                {/* Curves and interval points for all active shapes */}
                {ssDrawOrder.map((s, orderIdx) => {
                  const x0 = padL;
                  const y0 = padT + plotH;
                  const endX = padL + (s.endStrain / refMaxStrainMicro) * plotW;
                  const endY = padT + plotH - (s.endStress / refMaxStressMpa) * plotH;
                  const currX = padL + (s.currStrain / refMaxStrainMicro) * plotW;
                  const currY = padT + plotH - (s.currStress / refMaxStressMpa) * plotH;
                  const hoverX = padL + (s.inspectStrain / refMaxStrainMicro) * plotW;
                  const hoverY = padT + plotH - (s.inspectStress / refMaxStressMpa) * plotH;

                  return (
                    <g key={`ss-series-${s.shape}`}>
                      <line
                        x1={x0}
                        y1={y0}
                        x2={endX}
                        y2={endY}
                        stroke={s.ssColor}
                        strokeWidth={isMultiShape ? Math.max(1.8, 3.0 - orderIdx * 0.25) : 2.25}
                        strokeLinecap="round"
                      />

                      {loadPoints.map((wVal, idx) => {
                        const ptStrain = s.getTopStrainAtLoad(wVal);
                        const ptStress = s.getTopStressAtLoad(wVal);
                        const cx = padL + (ptStrain / refMaxStrainMicro) * plotW;
                        const cy = padT + plotH - (ptStress / refMaxStressMpa) * plotH;
                        const isMaxPt = idx === loadPoints.length - 1;
                        return (
                          <circle
                            key={`ss-pt-${s.shape}-${idx}-${wVal}`}
                            cx={cx}
                            cy={cy}
                            r={isMaxPt ? 3.8 : 2.4}
                            fill="#ffffff"
                            stroke={s.ssColor}
                            strokeWidth={isMaxPt ? 2.1 : 1.4}
                          />
                        );
                      })}

                      {/* Current load operating dot */}
                      <circle
                        cx={currX}
                        cy={currY}
                        r={isMultiShape ? 4.2 : 4.75}
                        fill={s.ssColor}
                        stroke="#ffffff"
                        strokeWidth="1.6"
                      />

                      {/* Hover dot for each shape */}
                      {hoverLoadSS !== null && (
                        <circle
                          cx={hoverX}
                          cy={hoverY}
                          r="4.25"
                          fill="#0f172a"
                          stroke={s.ssColor}
                          strokeWidth="1.6"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Active crosshair guidelines */}
                <line
                  x1={ssLeadHoverX}
                  y1={ssLeadHoverY}
                  x2={ssLeadHoverX}
                  y2={padT + plotH}
                  stroke={hoverLoadSS !== null ? '#64748b' : ssLeadSeries.ssColor}
                  strokeWidth="1"
                  strokeDasharray="3,2"
                  opacity="0.65"
                />
                <line
                  x1={padL}
                  y1={ssLeadHoverY}
                  x2={ssLeadHoverX}
                  y2={ssLeadHoverY}
                  stroke={hoverLoadSS !== null ? '#64748b' : ssLeadSeries.ssColor}
                  strokeWidth="1"
                  strokeDasharray="3,2"
                  opacity="0.65"
                />

                {hoverLoadSS !== null && (
                  <text
                    x={Math.min(padL + plotW - 42, ssLeadHoverX + 8)}
                    y={Math.max(padT + 10, ssLeadHoverY - 8)}
                    className="fill-slate-800 font-mono text-[9px] font-bold"
                  >
                    W={formatAxisNumber(inspectSSLoad)}N
                  </text>
                )}

                {/* Axis Titles */}
                <text
                  x={padL + plotW / 2}
                  y={vbH - 5}
                  textAnchor="middle"
                  className="fill-slate-600 font-sans text-[10.5px] font-semibold"
                >
                  Max Normal Strain ε_max (με) at y = d/2
                </text>
                <text
                  x={14}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 14 ${padT + plotH / 2})`}
                  className="fill-slate-600 font-sans text-[10.5px] font-semibold"
                >
                  Max Stress σ_max (MPa)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* GRAPH 2: LOAD vs DEFLECTION (at slider X, units: m)          */}
        {/* ============================================================ */}
        {showLD && (
          <div className={`flex flex-col min-w-0 ${showBoth ? 'lg:pl-6' : ''}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1 px-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                  {isBending ? 'Load vs Deflection' : 'Load vs Axial Displacement'}
                </h2>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  x = {Math.round(xMm)} mm · ΔW = {formatAxisNumber(W_step)} N
                </span>
              </div>

              {!isMultiShape ? (
                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-600">
                  <span>
                    k(x) ={' '}
                    <strong className="text-slate-800">
                      {formatStiffnessNm(primarySeries.localStiffnessNm)}
                    </strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    W = <strong className="text-red-600">{formatAxisNumber(inspectLDLoad)} N</strong>
                  </span>
                  <span>
                    {isBending ? 'δ' : 'Δx'} ={' '}
                    <strong className="text-red-600">{formatMeterValue(primarySeries.inspectDeflectionM)} m</strong>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] font-mono tabular-nums text-slate-600">
                  W = <strong className="text-slate-800">{formatAxisNumber(inspectLDLoad)} N</strong>
                </div>
              )}
            </div>

            {/* Inline multi-shape comparison legend */}
            {isMultiShape && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 mb-1 text-[10.5px] font-mono tabular-nums text-slate-600">
                {seriesList.map((s) => (
                  <div key={`ld-leg-${s.shape}`} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-0.5 inline-block shrink-0"
                      style={{ backgroundColor: s.ldColor }}
                      aria-hidden="true"
                    />
                    <span className="font-sans font-semibold text-slate-800">{s.label}:</span>
                    <span style={{ color: s.ldColor }} className="font-bold">
                      {formatMeterValue(s.inspectDeflectionM)} m
                    </span>
                    <span className="text-slate-400">
                      ({formatStiffnessNm(s.localStiffnessNm)})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="w-full">
              <svg
                viewBox={`0 0 ${vbW} ${vbH}`}
                className="w-full h-[190px] sm:h-[205px] block select-none cursor-crosshair overflow-visible"
                onPointerMove={handleLDPointerMove}
                onPointerLeave={() => setHoverLoadLD(null)}
              >
                {/* Grid lines */}
                {yTicks.map((t) => {
                  const gy = padT + plotH - t * plotH;
                  return (
                    <g key={`ld-y-${t}`}>
                      <line
                        x1={padL}
                        y1={gy}
                        x2={padL + plotW}
                        y2={gy}
                        stroke={t === 0 ? '#94a3b8' : '#e2e8f0'}
                        strokeWidth={t === 0 ? 1.25 : 0.75}
                      />
                      <text
                        x={padL - 8}
                        y={gy + 3.5}
                        textAnchor="end"
                        className="fill-slate-500 font-mono text-[9.5px]"
                      >
                        {formatAxisNumber(t * W_max)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((t) => {
                  const gx = padL + t * plotW;
                  return (
                    <g key={`ld-x-${t}`}>
                      <line
                        x1={gx}
                        y1={padT}
                        x2={gx}
                        y2={padT + plotH}
                        stroke={t === 0 ? '#94a3b8' : '#e2e8f0'}
                        strokeWidth={t === 0 ? 1.25 : 0.75}
                      />
                      <text
                        x={gx}
                        y={padT + plotH + 14}
                        textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}
                        className="fill-slate-500 font-mono text-[9.5px]"
                      >
                        {formatMeterValue(t * refMaxDeflectionM)}
                      </text>
                    </g>
                  );
                })}

                {/* Subtle shaded area beneath primary Load vs Deflection curve when single-shape */}
                {!isMultiShape && primarySeries.endDeflectionM > 1e-12 && (
                  <polygon
                    points={`${padL},${padT + plotH} ${padL + (primarySeries.endDeflectionM / refMaxDeflectionM) * plotW},${padT} ${padL + (primarySeries.endDeflectionM / refMaxDeflectionM) * plotW},${padT + plotH}`}
                    fill="rgba(220, 38, 38, 0.08)"
                  />
                )}

                {/* Horizontal load guideline */}
                <line
                  x1={padL}
                  y1={padT + plotH - (inspectLDLoad / W_max) * plotH}
                  x2={padL + plotW}
                  y2={padT + plotH - (inspectLDLoad / W_max) * plotH}
                  stroke={hoverLoadLD !== null ? '#94a3b8' : '#cbd5e1'}
                  strokeWidth="1"
                  strokeDasharray="3,2"
                  opacity={hoverLoadLD !== null || W_curr > 0 ? 0.7 : 0}
                />

                {/* Load vs Deflection curves & interval points for all active shapes */}
                {seriesList.map((s) => {
                  const x0 = padL;
                  const y0 = padT + plotH;
                  const endX = padL + (s.endDeflectionM / refMaxDeflectionM) * plotW;
                  const endY = padT;
                  const currX = padL + (s.currDeflectionM / refMaxDeflectionM) * plotW;
                  const currY = padT + plotH - (W_curr / W_max) * plotH;
                  const hoverX = padL + (s.inspectDeflectionM / refMaxDeflectionM) * plotW;
                  const hoverY = padT + plotH - (inspectLDLoad / W_max) * plotH;

                  return (
                    <g key={`ld-series-${s.shape}`}>
                      <line
                        x1={x0}
                        y1={y0}
                        x2={endX}
                        y2={endY}
                        stroke={s.ldColor}
                        strokeWidth="2.25"
                        strokeLinecap="round"
                      />

                      {loadPoints.map((wVal, idx) => {
                        const ptDeflM = s.getDeflectionAtLoadM(wVal);
                        const cx = padL + (ptDeflM / refMaxDeflectionM) * plotW;
                        const cy = padT + plotH - (wVal / W_max) * plotH;
                        const isMaxPt = idx === loadPoints.length - 1;
                        return (
                          <circle
                            key={`ld-pt-${s.shape}-${idx}-${wVal}`}
                            cx={cx}
                            cy={cy}
                            r={isMaxPt ? 3.6 : 2.4}
                            fill="#ffffff"
                            stroke={s.ldColor}
                            strokeWidth={isMaxPt ? 2.0 : 1.4}
                          />
                        );
                      })}

                      {/* Current load marker */}
                      <circle
                        cx={currX}
                        cy={currY}
                        r={isMultiShape ? 4.2 : 4.75}
                        fill={s.ldColor}
                        stroke="#ffffff"
                        strokeWidth="1.6"
                      />

                      {/* Vertical crosshair drop for single-shape or hover dot for multi-shape */}
                      {!isMultiShape && (
                        <line
                          x1={hoverX}
                          y1={hoverY}
                          x2={hoverX}
                          y2={y0}
                          stroke={hoverLoadLD !== null ? '#64748b' : s.ldColor}
                          strokeWidth="1"
                          strokeDasharray="3,2"
                          opacity="0.7"
                        />
                      )}

                      {hoverLoadLD !== null && (
                        <circle
                          cx={hoverX}
                          cy={hoverY}
                          r="4.25"
                          fill="#0f172a"
                          stroke={s.ldColor}
                          strokeWidth="1.6"
                        />
                      )}
                    </g>
                  );
                })}

                {hoverLoadLD !== null && !isMultiShape && (
                  <text
                    x={Math.min(
                      padL + plotW - 96,
                      padL + (primarySeries.inspectDeflectionM / refMaxDeflectionM) * plotW + 8
                    )}
                    y={Math.max(
                      padT + 10,
                      padT + plotH - (inspectLDLoad / W_max) * plotH - 8
                    )}
                    className="fill-slate-800 font-mono text-[9px] font-bold"
                  >
                    ({formatMeterValue(primarySeries.inspectDeflectionM)}m, {formatAxisNumber(inspectLDLoad)}N)
                  </text>
                )}

                {hoverLoadLD !== null && isMultiShape && (
                  <text
                    x={padL + 6}
                    y={Math.max(
                      padT + 10,
                      padT + plotH - (inspectLDLoad / W_max) * plotH - 6
                    )}
                    className="fill-slate-800 font-mono text-[9px] font-bold"
                  >
                    W={formatAxisNumber(inspectLDLoad)}N
                  </text>
                )}

                {/* Axis Titles */}
                <text
                  x={padL + plotW / 2}
                  y={vbH - 5}
                  textAnchor="middle"
                  className="fill-slate-600 font-sans text-[10.5px] font-semibold"
                >
                  {isBending ? 'Deflection δ (m)' : 'Axial Displacement Δx (m)'}
                </text>
                <text
                  x={14}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 14 ${padT + plotH / 2})`}
                  className="fill-slate-600 font-sans text-[10.5px] font-semibold"
                >
                  Load W (N)
                </text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
