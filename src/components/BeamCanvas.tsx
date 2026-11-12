import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Minus, Play, Pause } from 'lucide-react';
import { BeamConfig, SlideTheme } from '../types/beam';
import {
  analyzeBeam,
  getBendingMomentAt,
  getDeflectionAt,
  getNormalStrainAt,
  getNormalStressAt,
  getSlopeAt,
  getStressColor,
  getVonMisesStressAt,
} from '../utils/beamPhysics';
import { StressLegend } from './StressLegend';
import { CrossSectionSlider } from './CrossSectionSlider';

interface BeamCanvasProps {
  config: BeamConfig;
  theme?: SlideTheme;
  interactive?: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onLoadChange?: (newLoad: number) => void;
  onPlaneChange?: (newPlaneX: number) => void;
  onChange?: (updated: Partial<BeamConfig>) => void;
  width?: number;
  height?: number;
  className?: string;
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
}

export const BeamCanvas: React.FC<BeamCanvasProps> = ({
  config,
  theme = 'white',
  interactive = true,
  isPlaying = false,
  onTogglePlay,
  onLoadChange,
  onPlaneChange,
  onChange,
  width,
  height,
  className = '',
  canvasRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadTrackRef = useRef<HTMLDivElement>(null);

  const isDraggingPlaneRef = useRef(false);
  const hoverPointRef = useRef<{
    x: number;
    y: number;
    xMm: number;
    yMm: number;
    stress: number;
    strain: number;
    moment: number;
    delta: number;
    rawX: number;
    rawY: number;
  } | null>(null);

  const [canvasMetrics, setCanvasMetrics] = useState<{ width: number; height: number }>({
    width: width || 800,
    height: height || 480,
  });
  const [isScrubbingLoad, setIsScrubbingLoad] = useState(false);
  const [hoverLoadRatio, setHoverLoadRatio] = useState<number | null>(null);

  const drawCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const isDark = theme === 'dark';
      const isTransparent = theme === 'transparent';
      const isBending = config.testType === 'bending';
      const isStrain = config.visualizeMode === 'strain';

      ctx.clearRect(0, 0, w, h);

      if (!isTransparent) {
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }

      const textPrimary = isDark ? '#f8fafc' : '#0f172a';
      const textMuted = isDark ? '#94a3b8' : '#64748b';
      const supportColor = isDark ? '#cbd5e1' : '#334155';
      const groundHatch = isDark ? '#475569' : '#94a3b8';

      // Analysis
      const analysis = analyzeBeam(config);

      // Fixed scale reference adapting to material yield / self-weight under max load
      const fixedRefMax = isStrain ? analysis.refNormalStrainMicro : analysis.refNormalStressMpa;

      const L_m = config.lengthMm / 1000;
      const d_m = config.thicknessMm / 1000;

      // Layout positioning:
      // Load slider on far left (x=14..66), Left View cross section (x=72..142),
      // and generous gap before Point A originX (x >= 225) so it never overlaps with (0,0) coordinates!
      const originX = isBending
        ? Math.max(225, Math.min(275, w * 0.26))
        : Math.max(225, Math.min(275, w * 0.26));

      // Right margin
      const tensionRightReserved = Math.max(200, w * 0.24);
      const rightMargin = isBending ? Math.max(50, w * 0.07) : tensionRightReserved;
      const beamDrawLength = Math.max(160, w - originX - rightMargin);

      const beamCenterY = h * 0.35;
      const beamDrawThickness = Math.max(24, Math.min(64, h * 0.09));

      const originY = beamCenterY;
      const fixedPointAY = originY + beamDrawThickness / 2;
      const fixedPointAX = originX;

      const undefTopY = originY - beamDrawThickness / 2;
      const undefBotY = fixedPointAY;

      // -------------------------------------------------------------
      // 1ST ANGLE PROJECTION: LEFT VIEW (BEAM CROSS SECTION)
      // Positioned with a generous 80+ px gap before (0,0) coordinates!
      // -------------------------------------------------------------
      if (config.showLeftView !== false) {
        const isSectionActive = !!(config.showCrossSectionVectors || config.showMomentOnGraph);
        const evalX_m = isSectionActive
          ? (config.crossSectionPlaneX / 1000)
          : ((config.lengthMm / 2) / 1000);
        const evalX_mm = isSectionActive
          ? Math.round(config.crossSectionPlaneX)
          : Math.round(config.lengthMm / 2);

        // Dedicated zone dynamically centered between load slider (x=68) and beam (originX)
        const sliderRightX = 68;
        const beamStartX = originX;
        const csCenterX = Math.round((sliderRightX + beamStartX) / 2);
        const aspect = config.widthMm / Math.max(1, config.thicknessMm);
        const maxCsW = Math.max(20, Math.min(48, (beamStartX - sliderRightX) * 0.4));
        const csWidth = Math.max(20, Math.min(44, Math.min(maxCsW, Math.round(beamDrawThickness * aspect))));
        const csLeft = Math.round(csCenterX - csWidth / 2);
        const csTop = undefTopY;
        const csHeight = beamDrawThickness;
        const csBot = undefBotY;

        ctx.save();

        // A. 1st Angle Projection Construction Lines (Alignment with Front View)
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(100, 116, 139, 0.22)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;

        // Top alignment projection line
        ctx.beginPath();
        ctx.moveTo(csLeft + csWidth, csTop);
        ctx.lineTo(originX, csTop);
        ctx.stroke();

        // Bottom alignment projection line
        ctx.beginPath();
        ctx.moveTo(csLeft + csWidth, csBot);
        ctx.lineTo(originX, csBot);
        ctx.stroke();

        // B. Coloured Stress / Strain Values across Cross Section
        // Center of beam if cross-section option not activated, at cross-section plane if activated
        const numSlices = 60;
        const sliceH = csHeight / numSlices;
        const pType = config.profileType || 'solid_rectangle';

        ctx.save();
        ctx.beginPath();

        if (pType === 'solid_circle') {
          const radius = csHeight / 2;
          ctx.arc(csCenterX, originY, radius, 0, Math.PI * 2);
          ctx.clip();
        } else if (pType === 'hollow_circle') {
          const radius = csHeight / 2;
          const tRatio = Math.min(0.4, (config.wallThicknessMm || 1.5) / config.thicknessMm);
          const inRadius = radius * (1 - tRatio * 2);
          ctx.arc(csCenterX, originY, radius, 0, Math.PI * 2);
          ctx.arc(csCenterX, originY, Math.max(1, inRadius), 0, Math.PI * 2, true);
          ctx.clip();
        } else if (pType === 'i_beam') {
          const tfRatio = Math.min(0.3, (config.flangeThicknessMm || 1.5) / config.thicknessMm);
          const twRatio = Math.min(0.4, (config.webThicknessMm || 1.5) / config.widthMm);
          const tfPx = csHeight * tfRatio;
          const twPx = csWidth * twRatio;
          const webLeft = csCenterX - twPx / 2;
          ctx.rect(csLeft, csTop, csWidth, tfPx);
          ctx.rect(webLeft, csTop + tfPx, twPx, csHeight - 2 * tfPx);
          ctx.rect(csLeft, csBot - tfPx, csWidth, tfPx);
          ctx.clip();
        } else if (pType === 'hollow_rectangle') {
          const tRatio = Math.min(0.35, (config.wallThicknessMm || 1.5) / config.thicknessMm);
          const tPx = csHeight * tRatio;
          ctx.rect(csLeft, csTop, csWidth, csHeight);
          const inW = Math.max(2, csWidth - 2 * tPx);
          const inH = Math.max(2, csHeight - 2 * tPx);
          ctx.rect(csLeft + csWidth - tPx, csTop + tPx, -inW, inH);
          ctx.clip();
        } else if (pType === 't_section') {
          const tfRatio = Math.min(0.35, (config.flangeThicknessMm || 1.5) / config.thicknessMm);
          const twRatio = Math.min(0.4, (config.webThicknessMm || 1.5) / config.widthMm);
          const tfPx = csHeight * tfRatio;
          const twPx = csWidth * twRatio;
          ctx.rect(csLeft, csTop, csWidth, tfPx);
          ctx.rect(csCenterX - twPx / 2, csTop + tfPx, twPx, csHeight - tfPx);
          ctx.clip();
        } else {
          ctx.rect(csLeft, csTop, csWidth, csHeight);
          ctx.clip();
        }

        // Draw horizontal color strips or neutral geometry fill
        if (config.visualizeMode !== 'geometry') {
          for (let i = 0; i < numSlices; i++) {
            const v = (i + 0.5) / numSlices;
            const yM = (0.5 - v) * d_m; // in meters from NA

            let signedVal = 0;
            if (isBending) {
              const sigmaMpa = getNormalStressAt(evalX_m, yM, config);
              const strainMicro = (sigmaMpa / config.material.youngsModulus) * 1000;
              signedVal = isStrain ? strainMicro : sigmaMpa;
            } else {
              const areaM2 = Math.max(1e-9, analysis.crossSectionAreaMm2 * 1e-6);
              const sigmaMpa = (config.loadN / areaM2) / 1e6;
              const strainMicro = (sigmaMpa / config.material.youngsModulus) * 1000;
              signedVal = isStrain ? strainMicro : sigmaMpa;
            }

            const sliceColor = getStressColor(Math.abs(signedVal), fixedRefMax, config.colormap, signedVal);
            ctx.fillStyle = sliceColor;
            ctx.fillRect(csLeft - 1, csTop + i * sliceH, csWidth + 2, sliceH + 0.6);
          }
        } else {
          // Geometry mode: clean neutral base + engineering 45° section hatching
          ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
          ctx.fillRect(csLeft - 2, csTop - 2, csWidth + 4, csHeight + 4);

          ctx.save();
          ctx.setLineDash([]); // Continuous solid lines (no dashes)
          ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(71, 85, 105, 0.55)';
          ctx.lineWidth = 1;
          const hatchStep = 6;
          ctx.beginPath();
          // Diagonal hatching lines at 45 degrees across the section
          const totalSpan = csWidth + csHeight;
          for (let offset = -csHeight; offset <= totalSpan; offset += hatchStep) {
            ctx.moveTo(csLeft + offset, csTop);
            ctx.lineTo(csLeft + offset + csHeight, csTop + csHeight);
          }
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore(); // remove clip

        // C. Technical Profile Outline
        ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        if (pType === 'solid_circle') {
          ctx.beginPath();
          ctx.arc(csCenterX, originY, csHeight / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pType === 'hollow_circle') {
          const radius = csHeight / 2;
          const tRatio = Math.min(0.4, (config.wallThicknessMm || 1.5) / config.thicknessMm);
          const inRadius = radius * (1 - tRatio * 2);
          ctx.beginPath();
          ctx.arc(csCenterX, originY, radius, 0, Math.PI * 2);
          ctx.arc(csCenterX, originY, Math.max(1, inRadius), 0, Math.PI * 2);
          ctx.stroke();
        } else if (pType === 'i_beam') {
          const tfRatio = Math.min(0.3, (config.flangeThicknessMm || 1.5) / config.thicknessMm);
          const twRatio = Math.min(0.4, (config.webThicknessMm || 1.5) / config.widthMm);
          const tfPx = csHeight * tfRatio;
          const twPx = csWidth * twRatio;
          const wL = csCenterX - twPx / 2;
          const wR = csCenterX + twPx / 2;
          ctx.beginPath();
          ctx.moveTo(csLeft, csTop);
          ctx.lineTo(csLeft + csWidth, csTop);
          ctx.lineTo(csLeft + csWidth, csTop + tfPx);
          ctx.lineTo(wR, csTop + tfPx);
          ctx.lineTo(wR, csBot - tfPx);
          ctx.lineTo(csLeft + csWidth, csBot - tfPx);
          ctx.lineTo(csLeft + csWidth, csBot);
          ctx.lineTo(csLeft, csBot);
          ctx.lineTo(csLeft, csBot - tfPx);
          ctx.lineTo(wL, csBot - tfPx);
          ctx.lineTo(wL, csTop + tfPx);
          ctx.lineTo(csLeft, csTop + tfPx);
          ctx.closePath();
          ctx.stroke();
        } else if (pType === 'hollow_rectangle') {
          ctx.strokeRect(csLeft, csTop, csWidth, csHeight);
          const tRatio = Math.min(0.35, (config.wallThicknessMm || 1.5) / config.thicknessMm);
          const tPx = csHeight * tRatio;
          ctx.strokeRect(csLeft + tPx, csTop + tPx, csWidth - 2 * tPx, csHeight - 2 * tPx);
        } else if (pType === 't_section') {
          const tfRatio = Math.min(0.35, (config.flangeThicknessMm || 1.5) / config.thicknessMm);
          const twRatio = Math.min(0.4, (config.webThicknessMm || 1.5) / config.widthMm);
          const tfPx = csHeight * tfRatio;
          const twPx = csWidth * twRatio;
          const wL = csCenterX - twPx / 2;
          const wR = csCenterX + twPx / 2;
          ctx.beginPath();
          ctx.moveTo(csLeft, csTop);
          ctx.lineTo(csLeft + csWidth, csTop);
          ctx.lineTo(csLeft + csWidth, csTop + tfPx);
          ctx.lineTo(wR, csTop + tfPx);
          ctx.lineTo(wR, csBot);
          ctx.lineTo(wL, csBot);
          ctx.lineTo(wL, csTop + tfPx);
          ctx.lineTo(csLeft, csTop + tfPx);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.strokeRect(csLeft, csTop, csWidth, csHeight);
        }

        // D. Neutral Axis Line across Cross-Section
        const isRainbowActive = config.visualizeMode !== 'geometry' && config.colormap !== 'tension_compression';
        ctx.strokeStyle = isRainbowActive ? '#ffffff' : '#10b981';
        ctx.lineWidth = isRainbowActive ? 2 : 1.5;
        ctx.setLineDash(isRainbowActive ? [4, 2] : [3, 2]);
        ctx.beginPath();
        ctx.moveTo(csLeft - 3, originY);
        ctx.lineTo(csLeft + csWidth + 3, originY);
        ctx.stroke();

        // E. Text Annotations: Title & Active Cross-Section Evaluation Callout
        ctx.textAlign = 'center';
        ctx.font = 'bold 9.5px Inter, system-ui, sans-serif';
        ctx.fillStyle = textPrimary;
        ctx.fillText('Left View', csCenterX, csTop - 18);

        ctx.font = '8.5px "JetBrains Mono", monospace';
        if (isSectionActive) {
          ctx.fillStyle = '#9333ea';
          ctx.fillText(`x = ${evalX_mm}mm`, csCenterX, csTop - 7);
        } else {
          ctx.fillStyle = textMuted;
          ctx.fillText(`x = ${evalX_mm}mm (Mid)`, csCenterX, csTop - 7);
        }

        // F. Engineering dimensioning for width b on the Left View
        if (config.showDimensionLines) {
          ctx.save();
          const dimColor = '#0284c7';
          const dimYb = csBot + 20;

          // Extension lines at left (csLeft) and right (csLeft + csWidth)
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1.25;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(csLeft, csBot + 2);
          ctx.lineTo(csLeft, dimYb + 5);
          ctx.moveTo(csLeft + csWidth, csBot + 2);
          ctx.lineTo(csLeft + csWidth, dimYb + 5);
          ctx.stroke();

          // Dimension line
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(csLeft, dimYb);
          ctx.lineTo(csLeft + csWidth, dimYb);
          ctx.stroke();

          // Arrowheads
          ctx.fillStyle = dimColor;
          if (csWidth >= 22) {
            // Arrows inside pointing outward to extension lines
            ctx.beginPath();
            ctx.moveTo(csLeft, dimYb);
            ctx.lineTo(csLeft + 5, dimYb - 2.5);
            ctx.lineTo(csLeft + 5, dimYb + 2.5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(csLeft + csWidth, dimYb);
            ctx.lineTo(csLeft + csWidth - 5, dimYb - 2.5);
            ctx.lineTo(csLeft + csWidth - 5, dimYb + 2.5);
            ctx.closePath();
            ctx.fill();
          } else {
            // Arrows outside pointing inward
            ctx.beginPath();
            ctx.moveTo(csLeft, dimYb);
            ctx.lineTo(csLeft - 5, dimYb - 2.5);
            ctx.lineTo(csLeft - 5, dimYb + 2.5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(csLeft + csWidth, dimYb);
            ctx.lineTo(csLeft + csWidth + 5, dimYb - 2.5);
            ctx.lineTo(csLeft + csWidth + 5, dimYb + 2.5);
            ctx.closePath();
            ctx.fill();
          }

          // Dimension text badge for b
          const bText = `b = ${config.widthMm} mm`;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const bW = ctx.measureText(bText).width + 8;
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(csCenterX - bW / 2, dimYb + 4, bW, 15, 3);
          ctx.fill();
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = dimColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bText, csCenterX, dimYb + 11.5);

          ctx.restore();
        }

        // G. Tension & Compression Levels on Left View (Visible when Tens/Comp is active)
        if (config.colormap === 'tension_compression' && config.visualizeMode !== 'geometry') {
          ctx.save();
          const unitStr = isStrain ? 'με' : 'MPa';
          let topVal = 0;
          let botVal = 0;
          if (isBending) {
            topVal = isStrain
              ? getNormalStrainAt(evalX_m, d_m / 2, config)
              : getNormalStressAt(evalX_m, d_m / 2, config);
            botVal = isStrain
              ? getNormalStrainAt(evalX_m, -d_m / 2, config)
              : getNormalStressAt(evalX_m, -d_m / 2, config);
          } else {
            const areaM2 = Math.max(1e-9, analysis.crossSectionAreaMm2 * 1e-6);
            const sigmaMpa = (config.loadN / areaM2) / 1e6;
            const strainMicro = (sigmaMpa / config.material.youngsModulus) * 1000;
            const axialVal = isStrain ? strainMicro : sigmaMpa;
            topVal = axialVal;
            botVal = axialVal;
          }

          const compVal = Math.abs(topVal);
          const tensVal = Math.abs(botVal);
          const compText = `Comp: ${compVal.toFixed(1)} ${unitStr}`;
          const tensText = `Tens: ${tensVal.toFixed(1)} ${unitStr}`;

          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          const compW = ctx.measureText(compText).width + 8;
          const tensW = ctx.measureText(tensText).width + 8;
          const maxBadgeW = Math.max(compW, tensW);

          // Place on right side of cross section if space permits, otherwise on left
          const spaceRight = beamStartX - (csLeft + csWidth);
          const placeOnRight = spaceRight >= maxBadgeW + 8;
          const badgeX = placeOnRight ? csLeft + csWidth + 6 : csLeft - maxBadgeW - 6;

          if (isBending) {
            // Compression badge at top fiber (csTop)
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(badgeX, csTop - 8, maxBadgeW, 16, 3);
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#2563eb';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(compText, badgeX + maxBadgeW / 2, csTop);

            // Tension badge at bottom fiber (csBot)
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(badgeX, csBot - 8, maxBadgeW, 16, 3);
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tensText, badgeX + maxBadgeW / 2, csBot);
          } else {
            // Pure tension test
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(badgeX, originY - 8, maxBadgeW, 16, 3);
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tensText, badgeX + maxBadgeW / 2, originY);
          }

          ctx.restore();
        }

        ctx.restore();
      }

      // -------------------------------------------------------------
      // DRAW UNDEFORMED OUTLINE ("original beam shape")
      // -------------------------------------------------------------
      if (config.showOriginalOutline) {
        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.14)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(originX, undefTopY, beamDrawLength, beamDrawThickness);

        ctx.fillStyle = textMuted;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('original beam shape', originX - 4, undefTopY - 6);
        ctx.restore();
      }

      // -------------------------------------------------------------
      // 1. GRAPHIC WINDOW HEADER ("3-Point Bending Test ...")
      // Positioned at the top, just above the table displaying (X, Y, σ, ε, M) values
      // -------------------------------------------------------------
      const testName = isBending ? '3-Point Bending Test' : 'Uniaxial Tension Test';
      const modeStr = config.visualizeMode === 'geometry' ? 'Geometry' : (isStrain ? 'Strain (ε)' : 'Stress (σ)');
      const matName = config.material.name.split(' (')[0];
      const dimsStr = `${config.lengthMm} × ${config.widthMm} × ${config.thicknessMm} mm`;

      const titleX = 14;
      const titleY = 12;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Test name in uppercase bold
      ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.fillText(testName.toUpperCase(), titleX, titleY);
      const testNameW = ctx.measureText(testName.toUpperCase()).width;

      // Middle dot separator
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.fillText('·', titleX + testNameW + 6, titleY);

      // Material, dimensions, and active mode
      ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      const detailsStr = `${matName} (${dimsStr}) · ${modeStr}`;
      ctx.fillText(detailsStr, titleX + testNameW + 14, titleY);
      ctx.restore();

      // -------------------------------------------------------------
      // 2. PERMANENT DISPLAY WINDOW IN TOP-LEFT OF CANVAS
      // -------------------------------------------------------------
      ctx.save();
      const hp = hoverPointRef.current;
      const xValStr = hp ? `${hp.xMm.toFixed(1)} mm` : '—';
      const yValStr = hp
        ? Math.abs(hp.yMm) < 0.05
          ? '0.0 mm'
          : `${hp.yMm > 0 ? '+' : ''}${hp.yMm.toFixed(1)} mm`
        : '—';
      const stressValStr = hp
        ? Math.abs(hp.stress) < 0.005
          ? '0.00 MPa'
          : `${hp.stress > 0 ? '+' : ''}${hp.stress.toFixed(2)} MPa`
        : '—';
      const strainValStr = hp
        ? Math.abs(hp.strain) < 0.05
          ? '0.0 με'
          : `${hp.strain > 0 ? '+' : ''}${hp.strain.toFixed(1)} με`
        : '—';
      const momentValStr = hp
        ? Math.abs(hp.moment) < 0.005
          ? '0.00 N·m'
          : `${hp.moment.toFixed(2)} N·m`
        : '—';

      const hudX = 14;
      const hudY = 32;
      const isNarrow = w < 720;

      if (!isNarrow) {
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Pre-measure to ensure hudW fits all values with generous padding
        const lblX_W = ctx.measureText('X:').width;
        const valX_W = Math.max(48, ctx.measureText(xValStr).width);
        const lblY_W = ctx.measureText('Y:').width;
        const valY_W = Math.max(44, ctx.measureText(yValStr).width);
        const lblS_W = ctx.measureText('σ:').width;
        const valS_W = Math.max(68, ctx.measureText(stressValStr).width);
        const lblE_W = ctx.measureText('ε:').width;
        const valE_W = Math.max(62, ctx.measureText(strainValStr).width);
        const lblM_W = ctx.measureText('M:').width;
        const valM_W = Math.max(58, ctx.measureText(momentValStr).width);

        const gapLabelValue = 6;
        const gapItemDivider = 12;
        const padX = 12;

        const totalW =
          padX +
          (lblX_W + gapLabelValue + valX_W) + gapItemDivider +
          (lblY_W + gapLabelValue + valY_W) + gapItemDivider +
          1 + gapItemDivider +
          (lblS_W + gapLabelValue + valS_W) + gapItemDivider +
          1 + gapItemDivider +
          (lblE_W + gapLabelValue + valE_W) + gapItemDivider +
          1 + gapItemDivider +
          (lblM_W + gapLabelValue + valM_W) +
          padX;

        const hudW = Math.max(520, Math.round(totalW));
        const hudH = 26;

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.8)' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 6);
        ctx.fill();
        ctx.stroke();

        const midY = hudY + hudH / 2;
        let curX = hudX + padX;

        // Slot 1: X
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('X:', curX, midY);
        curX += lblX_W + gapLabelValue;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(xValStr, curX, midY);
        curX += valX_W + gapItemDivider;

        // Slot 2: Y
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('Y:', curX, midY);
        curX += lblY_W + gapLabelValue;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(yValStr, curX, midY);
        curX += valY_W + gapItemDivider;

        // Divider 1
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.5)' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(curX, hudY + 4);
        ctx.lineTo(curX, hudY + hudH - 4);
        ctx.stroke();
        curX += 1 + gapItemDivider;

        // Slot 3: Stress sigma
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.fillText('σ:', curX, midY);
        curX += lblS_W + gapLabelValue;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(stressValStr, curX, midY);
        curX += valS_W + gapItemDivider;

        // Divider 2
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.5)' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(curX, hudY + 4);
        ctx.lineTo(curX, hudY + hudH - 4);
        ctx.stroke();
        curX += 1 + gapItemDivider;

        // Slot 4: Strain epsilon
        ctx.fillStyle = isDark ? '#c084fc' : '#7c3aed';
        ctx.fillText('ε:', curX, midY);
        curX += lblE_W + gapLabelValue;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(strainValStr, curX, midY);
        curX += valE_W + gapItemDivider;

        // Divider 3
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.5)' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(curX, hudY + 4);
        ctx.lineTo(curX, hudY + hudH - 4);
        ctx.stroke();
        curX += 1 + gapItemDivider;

        // Slot 5: Bending Moment M
        ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
        ctx.fillText('M:', curX, midY);
        curX += lblM_W + gapLabelValue;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(momentValStr, curX, midY);
      } else {
        // Narrow screens: 2 rows
        const hudW = 340;
        const hudH = 46;

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.8)' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const row1Y = hudY + 13;
        const row2Y = hudY + 33;

        // Row 1: X & Y
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('X:', hudX + 12, row1Y);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(xValStr, hudX + 12 + ctx.measureText('X:').width + 6, row1Y);

        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('Y:', hudX + 130, row1Y);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(yValStr, hudX + 130 + ctx.measureText('Y:').width + 6, row1Y);

        // Divider row
        ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.4)' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(hudX + 8, hudY + 23);
        ctx.lineTo(hudX + hudW - 8, hudY + 23);
        ctx.stroke();

        // Row 2: sigma, epsilon, M
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.fillText('σ:', hudX + 12, row2Y);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(stressValStr, hudX + 12 + ctx.measureText('σ:').width + 6, row2Y);

        ctx.fillStyle = isDark ? '#c084fc' : '#7c3aed';
        ctx.fillText('ε:', hudX + 130, row2Y);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(strainValStr, hudX + 130 + ctx.measureText('ε:').width + 6, row2Y);

        ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
        ctx.fillText('M:', hudX + 235, row2Y);
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(momentValStr, hudX + 235 + ctx.measureText('M:').width + 6, row2Y);
      }
      ctx.restore();

      // =============================================================
      // MODE A: BEAM BENDING TEST (3-Point Bending)
      // =============================================================
      if (isBending) {
        const maxPhysicalDeflM = Math.abs(analysis.maxDeflectionMm) / 1000;
        const maxAllowedPixels = h * 0.22;
        const nominalScale = maxPhysicalDeflM > 0 ? maxAllowedPixels / Math.max(0.002, maxPhysicalDeflM) : 1;
        const pixelDeflectionMultiplier = nominalScale * 0.08 * config.scaleFactor;

        const numSlicesX = 240;
        const numLayersY = 36;

        // Kinematic shortening: Point B rolls inward to the left
        let totalShorteningPixels = 0;
        const dX_slice = beamDrawLength / numSlicesX;
        for (let i = 0; i < numSlicesX; i++) {
          const u = (i + 0.5) / numSlicesX;
          const realX = u * L_m;
          const slope = getSlopeAt(realX, config) * (pixelDeflectionMultiplier / (beamDrawLength / L_m));
          const theta = Math.atan(slope);
          totalShorteningPixels += dX_slice * (1 - Math.cos(theta));
        }

        interface Vertex {
          x: number;
          y: number;
          value: number;
          signedVal: number;
        }

        const grid: Vertex[][] = [];

        for (let i = 0; i <= numSlicesX; i++) {
          const u = i / numSlicesX;
          const realX = u * L_m;
          const realDeltaM = getDeflectionAt(realX, config);
          const pixelDelta = realDeltaM * pixelDeflectionMultiplier;

          const slope = getSlopeAt(realX, config) * (pixelDeflectionMultiplier / (beamDrawLength / L_m));
          const theta = Math.atan(slope);

          const cx = originX + u * (beamDrawLength - totalShorteningPixels * u);
          const cy = originY + pixelDelta;

          const nx = Math.sin(theta);
          const ny = -Math.cos(theta);

          const column: Vertex[] = [];

          for (let j = 0; j <= numLayersY; j++) {
            const v = j / numLayersY;
            const realY = (v - 0.5) * d_m;
            const pixelYOffset = (v - 0.5) * beamDrawThickness;

            let vx = cx + nx * pixelYOffset;
            let vy = cy + ny * pixelYOffset;

            // Point A strictly stationary
            if (i === 0) {
              const pivotTheta = Math.atan(getSlopeAt(0, config) * (pixelDeflectionMultiplier / (beamDrawLength / L_m)));
              vx = fixedPointAX + Math.sin(pivotTheta) * (v * beamDrawThickness);
              vy = fixedPointAY - Math.cos(pivotTheta) * (v * beamDrawThickness);
            }

            let value = 0;
            let signedVal = 0;

            if (isStrain) {
              signedVal = getNormalStrainAt(realX, realY, config);
              value = config.colormap === 'tension_compression' ? Math.abs(signedVal) : Math.abs(signedVal);
            } else {
              signedVal = getNormalStressAt(realX, realY, config);
              value = config.colormap === 'tension_compression' ? Math.abs(signedVal) : getVonMisesStressAt(realX, realY, config);
            }

            column.push({ x: vx, y: vy, value, signedVal });
          }
          grid.push(column);
        }

        // 1. Render Quads or Just the Beam (Geometry mode)
        if (config.visualizeMode !== 'geometry') {
          for (let i = 0; i < numSlicesX; i++) {
            for (let j = 0; j < numLayersY; j++) {
              const v00 = grid[i][j];
              const v10 = grid[i + 1][j];
              const v11 = grid[i + 1][j + 1];
              const v01 = grid[i][j + 1];

              const avgVal = (v00.value + v10.value + v11.value + v01.value) / 4;
              const avgSigned = (v00.signedVal + v10.signedVal + v11.signedVal + v01.signedVal) / 4;
              const fillColor = getStressColor(avgVal, fixedRefMax, config.colormap, avgSigned);

              ctx.beginPath();
              ctx.moveTo(v00.x, v00.y);
              ctx.lineTo(v10.x, v10.y);
              ctx.lineTo(v11.x, v11.y);
              ctx.lineTo(v01.x, v01.y);
              ctx.closePath();
              ctx.fillStyle = fillColor;
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = 0.75;
              ctx.stroke();
              ctx.fill();
            }
          }
        } else {
          // Just the beam: clean solid neutral material fill
          ctx.beginPath();
          for (let i = 0; i <= numSlicesX; i++) {
            const p = grid[i][numLayersY];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          for (let j = numLayersY; j >= 0; j--) ctx.lineTo(grid[numSlicesX][j].x, grid[numSlicesX][j].y);
          for (let i = numSlicesX; i >= 0; i--) ctx.lineTo(grid[i][0].x, grid[i][0].y);
          for (let j = 0; j <= numLayersY; j++) ctx.lineTo(grid[0][j].x, grid[0][j].y);
          ctx.closePath();
          ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
          ctx.fill();
        }

        // 2. Beam Contour
        ctx.beginPath();
        for (let i = 0; i <= numSlicesX; i++) {
          const p = grid[i][numLayersY];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        for (let j = numLayersY; j >= 0; j--) ctx.lineTo(grid[numSlicesX][j].x, grid[numSlicesX][j].y);
        for (let i = numSlicesX; i >= 0; i--) ctx.lineTo(grid[i][0].x, grid[i][0].y);
        for (let j = 0; j <= numLayersY; j++) ctx.lineTo(grid[0][j].x, grid[0][j].y);
        ctx.closePath();
        ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.lineWidth = 1.75;
        ctx.stroke();

        // 3. Neutral Axis
        if (config.showNeutralAxis) {
          ctx.save();
          const isRainbowActive = config.visualizeMode !== 'geometry' && config.colormap !== 'tension_compression';
          const midLayer = Math.floor(numLayersY / 2);

          ctx.beginPath();
          for (let i = 0; i <= numSlicesX; i++) {
            const p = grid[i][midLayer];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }

          if (isRainbowActive) {
            // High-contrast subtle dark backing halo, then crisp bright white dashed line
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = 3.5;
            ctx.setLineDash([6, 3]);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.stroke();
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.65)';
            ctx.setLineDash([5, 3]);
            ctx.lineWidth = 1.25;
            ctx.stroke();
          }

          const endPoint = grid[numSlicesX][midLayer];
          ctx.fillStyle = isDark ? '#f8fafc' : (isRainbowActive ? '#0f172a' : textMuted);
          ctx.font = isRainbowActive ? 'bold 11px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
          const textW = ctx.measureText('Neutral Axis').width;
          const fitsRight = endPoint.x + 8 + textW < w - 12;
          ctx.textAlign = fitsRight ? 'left' : 'right';
          ctx.fillText('Neutral Axis', fitsRight ? (endPoint.x + 8) : (endPoint.x - 8), endPoint.y + 4);
          ctx.restore();
        }

        // 4. BENDING MOMENT DIRECTLY ONTO THE GRAPH
        if (config.showMomentOnGraph) {
          ctx.save();
          const midIdx = Math.floor(numSlicesX / 2);
          const hasMoment = analysis.maxBendingMomentNm > 0.0001;
          const refM = Math.max(0.01, analysis.refBendingMomentNm || (config.maxLoadN * L_m) / 4);
          const maxMomentScalePx = hasMoment
            ? Math.min(80, (analysis.maxBendingMomentNm / refM) * 65)
            : 0;

          if (hasMoment) {
            ctx.beginPath();
            ctx.moveTo(fixedPointAX, fixedPointAY);

            for (let i = 0; i <= numSlicesX; i++) {
              const u = i / numSlicesX;
              const momentFrac = u <= 0.5 ? u * 2 : (1 - u) * 2;
              const momentDrop = momentFrac * maxMomentScalePx;
              const botPt = grid[i][0];
              ctx.lineTo(botPt.x, botPt.y + momentDrop);
            }
            ctx.lineTo(grid[numSlicesX][0].x, grid[numSlicesX][0].y);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, fixedPointAY, 0, fixedPointAY + maxMomentScalePx + 20);
            grad.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
            grad.addColorStop(1, 'rgba(99, 102, 241, 0.45)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.stroke();

            const midBot = grid[midIdx][0];
            const peakY = midBot.y + maxMomentScalePx;

            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(midBot.x, peakY, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Mmax = ${analysis.maxBendingMomentNm.toFixed(2)} N·m`, midBot.x, peakY + 16);

            // Display value of bending moment at the cross-section plane
            const planeXMm = Math.max(0, Math.min(config.lengthMm, config.crossSectionPlaneX));
            const uPlane = config.lengthMm > 0 ? planeXMm / config.lengthMm : 0;
            const planeMomentFrac = uPlane <= 0.5 ? uPlane * 2 : (1 - uPlane) * 2;
            const planeMomentDrop = planeMomentFrac * maxMomentScalePx;
            const momentAtSectionNm = planeMomentFrac * analysis.maxBendingMomentNm;

            const sliceIdxFloat = uPlane * numSlicesX;
            const sliceLow = Math.max(0, Math.min(numSlicesX - 1, Math.floor(sliceIdxFloat)));
            const frac = sliceIdxFloat - sliceLow;
            const pBot0 = grid[sliceLow][0];
            const pBot1 = grid[Math.min(numSlicesX, sliceLow + 1)][0];
            const secBotX = pBot0.x + (pBot1.x - pBot0.x) * frac;
            const secBotY = pBot0.y + (pBot1.y - pBot0.y) * frac;

            const secMomentX = secBotX;
            const secMomentY = secBotY + planeMomentDrop;

            // Vertical dashed guideline from beam down to moment curve at section plane
            ctx.save();
            ctx.strokeStyle = '#9333ea';
            ctx.lineWidth = 1.75;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(secBotX, secBotY);
            ctx.lineTo(secMomentX, secMomentY);
            ctx.stroke();
            ctx.restore();

            // Highlight point on the moment curve at section x
            ctx.save();
            ctx.fillStyle = '#9333ea';
            ctx.beginPath();
            ctx.arc(secMomentX, secMomentY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Value badge at the section: M(x) = ... N·m
            const mText = `M(${planeXMm.toFixed(0)}mm) = ${momentAtSectionNm.toFixed(2)} N·m`;
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            const mTextW = ctx.measureText(mText).width;
            const isNearMid = Math.abs(uPlane - 0.5) < 0.12;
            const badgeY = isNearMid ? secMomentY + 34 : secMomentY + 16;
            const badgeX = Math.max(originX + mTextW / 2 + 6, Math.min(originX + beamDrawLength - mTextW / 2 - 6, secMomentX));

            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
            ctx.beginPath();
            ctx.roundRect(badgeX - mTextW / 2 - 6, badgeY - 10, mTextW + 12, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#9333ea';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#9333ea';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mText, badgeX, badgeY);
            ctx.restore();
          } else {
            // At zero load, draw flat baseline with 0.00 N·m label (no false triangle)
            const midBot = grid[midIdx][0];
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(fixedPointAX, fixedPointAY);
            ctx.lineTo(grid[numSlicesX][0].x, grid[numSlicesX][0].y);
            ctx.stroke();

            ctx.fillStyle = '#6366f1';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('M = 0.00 N·m (Zero Load)', midBot.x, midBot.y + 16);
          }
          ctx.restore();
        }

        // 5. Left Support A (Stationary Pin)
        const supHeight = 28;
        const supWidth = 32;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fixedPointAX, fixedPointAY);
        ctx.lineTo(fixedPointAX - supWidth / 2, fixedPointAY + supHeight);
        ctx.lineTo(fixedPointAX + supWidth / 2, fixedPointAY + supHeight);
        ctx.closePath();
        ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
        ctx.fill();
        ctx.strokeStyle = supportColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const groundY = fixedPointAY + supHeight;
        ctx.beginPath();
        ctx.moveTo(fixedPointAX - supWidth / 2 - 8, groundY);
        ctx.lineTo(fixedPointAX + supWidth / 2 + 8, groundY);
        ctx.strokeStyle = supportColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = groundHatch;
        ctx.lineWidth = 1.5;
        for (let hx = fixedPointAX - supWidth / 2 - 6; hx <= fixedPointAX + supWidth / 2 + 4; hx += 6) {
          ctx.beginPath();
          ctx.moveTo(hx, groundY);
          ctx.lineTo(hx - 5, groundY + 8);
          ctx.stroke();
        }

        ctx.fillStyle = textPrimary;
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A (Pin)', fixedPointAX, groundY + 22);

        if (config.showReactions && Math.abs(config.loadN) > 0.05) {
          const rLen = Math.min(48, Math.max(22, Math.abs(analysis.leftReactionN) * 2.2));
          const rStartY = groundY + 34 + rLen;
          const rEndY = groundY + 34;

          ctx.beginPath();
          ctx.moveTo(fixedPointAX, rStartY);
          ctx.lineTo(fixedPointAX, rEndY);
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(fixedPointAX, rEndY);
          ctx.lineTo(fixedPointAX - 4, rEndY + 7);
          ctx.lineTo(fixedPointAX + 4, rEndY + 7);
          ctx.closePath();
          ctx.fillStyle = '#059669';
          ctx.fill();

          ctx.fillStyle = '#059669';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText(`RA = ${analysis.leftReactionN.toFixed(2)} N`, fixedPointAX, rStartY + 14);
        }
        ctx.restore();

        // 6. Right Support B (Roller Support - Rolls inward)
        const rightBottomPos = grid[numSlicesX][0];
        const rollerX = rightBottomPos.x;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rollerX, fixedPointAY);
        ctx.lineTo(rollerX - supWidth / 2, fixedPointAY + supHeight - 8);
        ctx.lineTo(rollerX + supWidth / 2, fixedPointAY + supHeight - 8);
        ctx.closePath();
        ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
        ctx.fill();
        ctx.strokeStyle = supportColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const rollerY = fixedPointAY + supHeight - 4;
        const rollerRadius = 3.5;
        [-7, 0, 7].forEach((offset) => {
          ctx.beginPath();
          ctx.arc(rollerX + offset, rollerY, rollerRadius, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
          ctx.fill();
          ctx.strokeStyle = supportColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        const rightGroundY = rollerY + rollerRadius + 2;
        const initialRightX = originX + beamDrawLength;
        ctx.beginPath();
        ctx.moveTo(rollerX - supWidth / 2 - 12, rightGroundY);
        ctx.lineTo(initialRightX + supWidth / 2 + 10, rightGroundY);
        ctx.strokeStyle = supportColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = groundHatch;
        ctx.lineWidth = 1.5;
        for (let hx = rollerX - supWidth / 2 - 8; hx <= initialRightX + supWidth / 2 + 4; hx += 6) {
          ctx.beginPath();
          ctx.moveTo(hx, rightGroundY);
          ctx.lineTo(hx - 5, rightGroundY + 8);
          ctx.stroke();
        }

        ctx.fillStyle = textPrimary;
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('B (Roller)', rollerX, rightGroundY + 22);

        if (config.showReactions && Math.abs(config.loadN) > 0.05) {
          const rLen = Math.min(48, Math.max(22, Math.abs(analysis.rightReactionN) * 2.2));
          const rStartY = rightGroundY + 34 + rLen;
          const rEndY = rightGroundY + 34;

          ctx.beginPath();
          ctx.moveTo(rollerX, rStartY);
          ctx.lineTo(rollerX, rEndY);
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rollerX, rEndY);
          ctx.lineTo(rollerX - 4, rEndY + 7);
          ctx.lineTo(rollerX + 4, rEndY + 7);
          ctx.closePath();
          ctx.fillStyle = '#059669';
          ctx.fill();

          ctx.fillStyle = '#059669';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText(`RB = ${analysis.rightReactionN.toFixed(2)} N`, rollerX, rStartY + 14);
        }
        ctx.restore();

        // 7. Load W Arrow at Center
        const midIdx = Math.floor(numSlicesX / 2);
        const centerTop = grid[midIdx][numLayersY];
        const loadValN = Math.round(config.loadN);
        const maxLoadValN = Math.max(1, config.maxLoadN);
        const loadRatio = Math.max(0, Math.min(1, loadValN / maxLoadValN));
        const loadArrowLen = Math.min(95, Math.max(38, loadRatio * 85));

        ctx.save();
        if (loadValN > 0) {
          const arrowStart = centerTop.y - loadArrowLen;
          const arrowEnd = centerTop.y;

          ctx.beginPath();
          ctx.moveTo(centerTop.x, arrowStart);
          ctx.lineTo(centerTop.x, arrowEnd);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(centerTop.x, arrowEnd);
          ctx.lineTo(centerTop.x - 7, arrowEnd - 12);
          ctx.lineTo(centerTop.x + 7, arrowEnd - 12);
          ctx.closePath();
          ctx.fillStyle = '#dc2626';
          ctx.fill();

          const badgeY = arrowStart - 12;
          const loadLabel = `W = ${loadValN} N`;
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          const labelWidth = ctx.measureText(loadLabel).width + 16;

          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(centerTop.x - labelWidth / 2, badgeY - 14, labelWidth, 22, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(loadLabel, centerTop.x, badgeY - 3);

          ctx.fillStyle = textMuted;
          ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('Center Load (L/2)', centerTop.x, badgeY - 22);
        } else {
          ctx.fillStyle = textMuted;
          ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No Load (W = 0 N)', centerTop.x, centerTop.y - 18);
        }
        ctx.restore();

        // 8. Beam Physical Dimensions: Length (L) and Height (d)
        if (config.showDimensionLines) {
          ctx.save();
          const dimY = undefTopY - 26;
          const dimColor = '#0284c7';

          // --- 1. LENGTH DIMENSION (L) ---
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1.25;
          ctx.setLineDash([3, 2]);

          // Extension lines at left (originX) and right (originX + beamDrawLength)
          ctx.beginPath();
          ctx.moveTo(originX, undefTopY - 4);
          ctx.lineTo(originX, dimY - 6);
          ctx.moveTo(originX + beamDrawLength, undefTopY - 4);
          ctx.lineTo(originX + beamDrawLength, dimY - 6);
          ctx.stroke();

          // Dimension line
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(originX, dimY);
          ctx.lineTo(originX + beamDrawLength, dimY);
          ctx.stroke();

          // Arrowheads
          // Left arrow (pointing left to originX)
          ctx.beginPath();
          ctx.moveTo(originX, dimY);
          ctx.lineTo(originX + 7, dimY - 3.5);
          ctx.lineTo(originX + 7, dimY + 3.5);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          // Right arrow (pointing right to originX + beamDrawLength)
          ctx.beginPath();
          ctx.moveTo(originX + beamDrawLength, dimY);
          ctx.lineTo(originX + beamDrawLength - 7, dimY - 3.5);
          ctx.lineTo(originX + beamDrawLength - 7, dimY + 3.5);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          // Length badge
          const lenText = `L = ${config.lengthMm} mm`;
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const lenW = ctx.measureText(lenText).width + 12;
          const lenX = originX + (beamDrawLength - lenW) / 2;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(lenX, dimY - 9, lenW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = dimColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lenText, originX + beamDrawLength / 2, dimY);

          // --- 2. HEIGHT / THICKNESS DIMENSION (d) ---
          const dimX = originX + beamDrawLength + 24;

          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1.25;
          ctx.setLineDash([3, 2]);

          // Horizontal extension lines at top and bottom of unbent beam
          ctx.beginPath();
          ctx.moveTo(originX + beamDrawLength + 4, undefTopY);
          ctx.lineTo(dimX + 8, undefTopY);
          ctx.moveTo(originX + beamDrawLength + 4, undefBotY);
          ctx.lineTo(dimX + 8, undefBotY);
          ctx.stroke();

          // Vertical dimension line
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(dimX, undefTopY);
          ctx.lineTo(dimX, undefBotY);
          ctx.stroke();

          // Arrowheads
          // Top arrow (pointing up to undefTopY)
          ctx.beginPath();
          ctx.moveTo(dimX, undefTopY);
          ctx.lineTo(dimX - 3.5, undefTopY + 6);
          ctx.lineTo(dimX + 3.5, undefTopY + 6);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          // Bottom arrow (pointing down to undefBotY)
          ctx.beginPath();
          ctx.moveTo(dimX, undefBotY);
          ctx.lineTo(dimX - 3.5, undefBotY - 6);
          ctx.lineTo(dimX + 3.5, undefBotY - 6);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          // Height (d) badge
          const hText = `d = ${config.thicknessMm} mm`;
          const hW = ctx.measureText(hText).width + 10;
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(dimX + 8, originY - 9, hW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = dimColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(hText, dimX + 13, originY);

          ctx.restore();
        }

        // 9. Deflection Dimension: Top of non-deformed to top of deformed
        if (config.showDeflection) {
          ctx.save();
          const topDeformedY = centerTop.y;
          const topNonDeformedY = undefTopY;
          const visualDeflPixels = topDeformedY - topNonDeformedY;

          const calloutX = centerTop.x + 42;
          const deflLabelY = topNonDeformedY - 14;
          const deflText = `δ = ${analysis.maxDeflectionMm.toFixed(3)} mm`;

          if (visualDeflPixels > 2) {
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            ctx.moveTo(centerTop.x, topNonDeformedY);
            ctx.lineTo(calloutX + 20, topNonDeformedY);
            ctx.moveTo(centerTop.x, topDeformedY);
            ctx.lineTo(calloutX + 20, topDeformedY);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(calloutX, topNonDeformedY);
            ctx.lineTo(calloutX, topDeformedY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(calloutX, topNonDeformedY);
            ctx.lineTo(calloutX - 4, topNonDeformedY + 6);
            ctx.lineTo(calloutX + 4, topNonDeformedY + 6);
            ctx.closePath();
            ctx.fillStyle = '#0284c7';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(calloutX, topDeformedY);
            ctx.lineTo(calloutX - 4, topDeformedY - 6);
            ctx.lineTo(calloutX + 4, topDeformedY - 6);
            ctx.closePath();
            ctx.fillStyle = '#0284c7';
            ctx.fill();

            // Leader line extending UP above the unbent beam
            ctx.beginPath();
            ctx.moveTo(calloutX, topNonDeformedY);
            ctx.lineTo(calloutX, deflLabelY + 2);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Value badge displayed cleanly ABOVE the unbent beam (not overlapping deformed beam)
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const deflW = ctx.measureText(deflText).width + 12;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(calloutX - 4, deflLabelY - 10, deflW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#0284c7';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(deflText, calloutX + 2, deflLabelY - 1);
          ctx.restore();
        }

        // 9. Movable Cross-Section Plane & Stress/Strain Vectors
        const showPlaneLine = config.showCrossSectionVectors || config.showMomentOnGraph;
        if (showPlaneLine) {
          ctx.save();
          const planeXMm = Math.max(0, Math.min(config.lengthMm, config.crossSectionPlaneX));
          const planeXM = planeXMm / 1000;
          const uPlane = planeXM / L_m;

          const sliceIdxFloat = uPlane * numSlicesX;
          const sliceLow = Math.max(0, Math.min(numSlicesX - 1, Math.floor(sliceIdxFloat)));
          const frac = sliceIdxFloat - sliceLow;

          const pBot0 = grid[sliceLow][0];
          const pBot1 = grid[sliceLow + 1][0];
          const pTop0 = grid[sliceLow][numLayersY];
          const pTop1 = grid[sliceLow + 1][numLayersY];

          const planeBotX = pBot0.x + (pBot1.x - pBot0.x) * frac;
          const planeBotY = pBot0.y + (pBot1.y - pBot0.y) * frac;
          const planeTopX = pTop0.x + (pTop1.x - pTop0.x) * frac;
          const planeTopY = pTop0.y + (pTop1.y - pTop0.y) * frac;

          const slopePlane = getSlopeAt(planeXM, config) * (pixelDeflectionMultiplier / (beamDrawLength / L_m));
          const thetaPlane = Math.atan(slopePlane);
          const tangentX = Math.cos(thetaPlane);
          const tangentY = Math.sin(thetaPlane);

          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(planeTopX, planeTopY);
          ctx.lineTo(planeBotX, planeBotY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(planeTopX, planeTopY - 10, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#8b5cf6';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`x = ${planeXMm.toFixed(0)} mm`, planeTopX, planeTopY - 22);

          // Stress / Strain Vectors (only rendered if vector display is turned on)
          if (config.showCrossSectionVectors) {
            const isLeftOfCenter = planeXM <= L_m / 2;
            const userInvert = config.invertVectorDirection ? -1 : 1;
            const normalDir = (isLeftOfCenter ? -1 : 1) * userInvert;

            const numVectorSamples = 9;
            const maxValAtPlane = isStrain
              ? Math.abs(getNormalStrainAt(planeXM, d_m / 2, config))
              : Math.abs(getNormalStressAt(planeXM, d_m / 2, config));

            const maxVectorPixelLen = Math.min(130, Math.max(20, (maxValAtPlane / fixedRefMax) * 105 * (config.vectorScale || 1.5)));

            for (let s = 0; s < numVectorSamples; s++) {
              const vs = s / (numVectorSamples - 1);
              const sampleYRelM = (vs - 0.5) * d_m;
              const normVal = isStrain
                ? getNormalStrainAt(planeXM, sampleYRelM, config)
                : getNormalStressAt(planeXM, sampleYRelM, config);

              const ptX = planeBotX + (planeTopX - planeBotX) * vs;
              const ptY = planeBotY + (planeTopY - planeBotY) * vs;

              const ratio = fixedRefMax > 0 ? normVal / fixedRefMax : 0;
              const arrowLen = ratio * maxVectorPixelLen * normalDir;

              if (Math.abs(arrowLen) > 2) {
                const arrowEndX = ptX + tangentX * arrowLen;
                const arrowEndY = ptY + tangentY * arrowLen;

                const isCompression = normVal < 0;
                const arrowColor = isCompression ? '#2563eb' : '#dc2626';

                ctx.beginPath();
                ctx.moveTo(ptX, ptY);
                ctx.lineTo(arrowEndX, arrowEndY);
                ctx.strokeStyle = arrowColor;
                ctx.lineWidth = 2.75;
                ctx.stroke();

                const headAngle = Math.atan2(arrowEndY - ptY, arrowEndX - ptX);
                const headLen = 7.5;
                ctx.beginPath();
                ctx.moveTo(arrowEndX, arrowEndY);
                ctx.lineTo(
                  arrowEndX - headLen * Math.cos(headAngle - Math.PI / 6),
                  arrowEndY - headLen * Math.sin(headAngle - Math.PI / 6)
                );
                ctx.lineTo(
                  arrowEndX - headLen * Math.cos(headAngle + Math.PI / 6),
                  arrowEndY - headLen * Math.sin(headAngle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fillStyle = arrowColor;
                ctx.fill();
              }
            }

            // Stress/Strain vector values displayed STRICTLY ABOVE and BELOW the beam (never on the colored beam)
            const unitStr = isStrain ? 'με' : 'MPa';
            const topVal = isStrain ? getNormalStrainAt(planeXM, d_m / 2, config) : getNormalStressAt(planeXM, d_m / 2, config);
            const botVal = isStrain ? getNormalStrainAt(planeXM, -d_m / 2, config) : getNormalStressAt(planeXM, -d_m / 2, config);

            const compText = `Comp: ${Math.abs(topVal).toFixed(1)} ${unitStr}`;
            const tensText = `Tens: ${Math.abs(botVal).toFixed(1)} ${unitStr}`;

            ctx.font = '600 11px "JetBrains Mono", monospace';
            const compW = ctx.measureText(compText).width + 12;
            const tensW = ctx.measureText(tensText).width + 12;

            // 1. Compression label: STRICTLY ABOVE the beam's top surface
            const topLabelY = planeTopY - 14;
            const topLabelX = isLeftOfCenter ? planeTopX - 16 : planeTopX + 16;
            const compBadgeX = isLeftOfCenter ? topLabelX - compW + 4 : topLabelX - 4;

            ctx.save();
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(compBadgeX, topLabelY - 10, compW, 18, 4);
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#2563eb';
            ctx.textAlign = isLeftOfCenter ? 'right' : 'left';
            ctx.fillText(compText, topLabelX, topLabelY + 3);
            ctx.restore();

            // 2. Tension label: STRICTLY BELOW the beam's bottom surface
            const botLabelY = planeBotY + 16;
            const botLabelX = isLeftOfCenter ? planeBotX - 16 : planeBotX + 16;
            const tensBadgeX = isLeftOfCenter ? botLabelX - tensW + 4 : botLabelX - 4;

            ctx.save();
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(tensBadgeX, botLabelY - 10, tensW, 18, 4);
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.textAlign = isLeftOfCenter ? 'right' : 'left';
            ctx.fillText(tensText, botLabelX, botLabelY + 3);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // =============================================================
      // MODE B: TENSION TEST (NO BLOCK ON RIGHT HAND SIDE AS REQUESTED!)
      // =============================================================
      else {
        // Specimen maintains its size on screen
        const axialElongationPx = (analysis.axialElongationMm / 1000) * (beamDrawLength / L_m) * config.scaleFactor * 25;
        const currentSpecimenLen = beamDrawLength + Math.min(beamDrawLength * 0.4, axialElongationPx);

        const contractionPx = (Math.abs(analysis.lateralContractionMm) / config.thicknessMm) * beamDrawThickness * config.scaleFactor * 25;
        const currentThickness = Math.max(12, beamDrawThickness - contractionPx);

        const specTopY = originY - currentThickness / 2;
        const specBotY = originY + currentThickness / 2;

        const val = isStrain ? analysis.axialStrainMicro : analysis.axialStressMpa;
        const fillColor = config.visualizeMode !== 'geometry'
          ? getStressColor(val, fixedRefMax, config.colormap, val)
          : (isDark ? '#334155' : '#e2e8f0');

        // Render uniform tension specimen body
        ctx.fillStyle = fillColor;
        ctx.fillRect(originX, specTopY, currentSpecimenLen, currentThickness);

        ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, specTopY, currentSpecimenLen, currentThickness);

        // 1. LEFT GRIP (Fixed Clamp)
        const gripW = 28;
        const gripH = beamDrawThickness + 36;
        const gripTopY = originY - gripH / 2;

        ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
        ctx.fillRect(originX - gripW, gripTopY, gripW, gripH);
        ctx.strokeStyle = supportColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(originX - gripW, gripTopY, gripW, gripH);

        ctx.strokeStyle = groundHatch;
        ctx.lineWidth = 1;
        for (let gy = gripTopY + 4; gy < gripTopY + gripH - 4; gy += 6) {
          ctx.beginPath();
          ctx.moveTo(originX - gripW + 2, gy);
          ctx.lineTo(originX - 2, gy + 4);
          ctx.stroke();
        }

        ctx.fillStyle = textPrimary;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Fixed Clamp', originX - gripW / 2, gripTopY + gripH + 16);

        // NOTE: USER REQUESTED TO REMOVE THE BLOCK ON THE RIGHT HAND SIDE!
        // Right end face is now clean with the tensile load arrow applied directly!
        const specimenEndX = originX + currentSpecimenLen;

        // 2. HORIZONTAL AXIAL LOAD ARROW AT SPECIMEN RIGHT END
        const loadValN = Math.round(config.loadN);
        if (loadValN > 0) {
          const arrowStartX = specimenEndX + 4;
          const maxArrowLen = Math.min(55, Math.max(26, (loadValN / config.maxLoadN) * 50));
          const arrowEndX = arrowStartX + maxArrowLen;

          ctx.beginPath();
          ctx.moveTo(arrowStartX, originY);
          ctx.lineTo(arrowEndX, originY);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowEndX, originY);
          ctx.lineTo(arrowEndX - 9, originY - 5);
          ctx.lineTo(arrowEndX - 9, originY + 5);
          ctx.closePath();
          ctx.fillStyle = '#dc2626';
          ctx.fill();

          const loadLabel = `W = ${loadValN} N`;
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          const labelW = ctx.measureText(loadLabel).width + 16;
          
          // Ensure badge stays safely inside the canvas frame under any screen width
          const badgeX = Math.min(w - labelW - 16, arrowEndX + 6);

          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(badgeX, originY - 11, labelW, 22, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(loadLabel, badgeX + labelW / 2, originY);
        }

        // 3. PHYSICAL SPECIMEN DIMENSIONS: LENGTH (L) AND HEIGHT (d)
        if (config.showDimensionLines) {
          ctx.save();
          const dimColor = '#0284c7';
          const dimY = specTopY - 26;

          // Length (L)
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1.25;
          ctx.setLineDash([3, 2]);

          ctx.beginPath();
          ctx.moveTo(originX, specTopY - 4);
          ctx.lineTo(originX, dimY - 6);
          ctx.moveTo(originX + beamDrawLength, specTopY - 4);
          ctx.lineTo(originX + beamDrawLength, dimY - 6);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(originX, dimY);
          ctx.lineTo(originX + beamDrawLength, dimY);
          ctx.stroke();

          // Arrows
          ctx.beginPath();
          ctx.moveTo(originX, dimY);
          ctx.lineTo(originX + 7, dimY - 3.5);
          ctx.lineTo(originX + 7, dimY + 3.5);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(originX + beamDrawLength, dimY);
          ctx.lineTo(originX + beamDrawLength - 7, dimY - 3.5);
          ctx.lineTo(originX + beamDrawLength - 7, dimY + 3.5);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          const lenText = `L = ${config.lengthMm} mm`;
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const lenW = ctx.measureText(lenText).width + 12;
          const lenX = originX + (beamDrawLength - lenW) / 2;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(lenX, dimY - 9, lenW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = dimColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lenText, originX + beamDrawLength / 2, dimY);

          // Height / Thickness (d)
          const dimX = originX - 36;
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1.25;
          ctx.setLineDash([3, 2]);

          ctx.beginPath();
          ctx.moveTo(originX - 4, specTopY);
          ctx.lineTo(dimX - 6, specTopY);
          ctx.moveTo(originX - 4, specBotY);
          ctx.lineTo(dimX - 6, specBotY);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(dimX, specTopY);
          ctx.lineTo(dimX, specBotY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(dimX, specTopY);
          ctx.lineTo(dimX - 3.5, specTopY + 6);
          ctx.lineTo(dimX + 3.5, specTopY + 6);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(dimX, specBotY);
          ctx.lineTo(dimX - 3.5, specBotY - 6);
          ctx.lineTo(dimX + 3.5, specBotY - 6);
          ctx.closePath();
          ctx.fillStyle = dimColor;
          ctx.fill();

          const hText = `d = ${config.thicknessMm} mm`;
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const hW = ctx.measureText(hText).width + 10;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(dimX - hW - 4, originY - 9, hW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = dimColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = dimColor;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(hText, dimX - 9, originY);

          ctx.restore();
        }

        // 4. ELONGATION DIMENSION DELTA L
        if (config.showDeflection && analysis.axialElongationMm > 0.0001) {
          ctx.save();
          const origEndPx = originX + beamDrawLength;
          const curEndPx = specimenEndX;
          const dimY = originY - beamDrawThickness / 2 - 46;

          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);

          ctx.beginPath();
          ctx.moveTo(origEndPx, specTopY);
          ctx.lineTo(origEndPx, dimY - 4);
          ctx.moveTo(curEndPx, specTopY);
          ctx.lineTo(curEndPx, dimY - 4);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(origEndPx, dimY);
          ctx.lineTo(curEndPx, dimY);
          ctx.stroke();

          ctx.fillStyle = '#0284c7';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`ΔL = ${analysis.axialElongationMm.toFixed(4)} mm`, (origEndPx + curEndPx) / 2, dimY - 8);
          ctx.restore();
        }

        // 4. MOVABLE CROSS-SECTION PLANE IN TENSION
        if (config.showCrossSectionVectors) {
          ctx.save();
          const planeRatio = config.crossSectionPlaneX / config.lengthMm;
          const planePixelX = originX + planeRatio * currentSpecimenLen;

          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(planePixelX, specTopY - 4);
          ctx.lineTo(planePixelX, specBotY + 4);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(planePixelX, specTopY - 10, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#8b5cf6';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`x = ${config.crossSectionPlaneX.toFixed(0)} mm`, planePixelX, specTopY - 22);

          const numVectorSamples = 7;
          const maxVectorPixelLen = Math.min(100, Math.max(15, (val / fixedRefMax) * 80 * (config.vectorScale || 1.5)));

          for (let s = 0; s < numVectorSamples; s++) {
            const vs = (s + 0.5) / numVectorSamples;
            const ptY = specTopY + vs * currentThickness;
            const arrowEndX = planePixelX + maxVectorPixelLen;

            if (maxVectorPixelLen > 3) {
              ctx.beginPath();
              ctx.moveTo(planePixelX, ptY);
              ctx.lineTo(arrowEndX, ptY);
              ctx.strokeStyle = '#dc2626';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(arrowEndX, ptY);
              ctx.lineTo(arrowEndX - 7, ptY - 4);
              ctx.lineTo(arrowEndX - 7, ptY + 4);
              ctx.closePath();
              ctx.fillStyle = '#dc2626';
              ctx.fill();
            }
          }

          // In tension test: Display stress and strain ABOVE and BELOW the specimen (not on the colored body)
          const tensStressText = `σ = ${analysis.axialStressMpa.toFixed(2)} MPa`;
          const tensStrainText = `ε = ${analysis.axialStrainMicro < 10 ? analysis.axialStrainMicro.toFixed(2) : analysis.axialStrainMicro.toFixed(1)} με`;

          ctx.font = '600 11px "JetBrains Mono", monospace';
          const stressW = ctx.measureText(tensStressText).width + 12;
          const strainW = ctx.measureText(tensStrainText).width + 12;

          // Above the specimen (strictly above specTopY)
          const tensionTopLabelY = specTopY - 14;
          ctx.save();
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(planePixelX - stressW / 2, tensionTopLabelY - 10, stressW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#dc2626';
          ctx.textAlign = 'center';
          ctx.fillText(tensStressText, planePixelX, tensionTopLabelY + 3);
          ctx.restore();

          // Below the specimen (strictly below specBotY)
          const tensionBotLabelY = specBotY + 16;
          ctx.save();
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(planePixelX - strainW / 2, tensionBotLabelY - 10, strainW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.fillText(tensStrainText, planePixelX, tensionBotLabelY + 3);
          ctx.restore();

          ctx.restore();
        }
      }

      // -------------------------------------------------------------
      // X, Y COORDINATE SYSTEM TRIAD
      // Rendered OVER the beam in ALL modes (Geometry, Stress, Strain)
      // Governed by View Options (config.showCoordinateSystem)
      // -------------------------------------------------------------
      if (config.showCoordinateSystem !== false) {
        ctx.save();
        const triadOriginX = originX;
        const triadOriginY = originY;
        const axisLenX = 54;
        const axisLenY = 38;

        // Halo styles ensure crisp, high-contrast visibility over beam fills (stress color, geometry hatching)
        const haloStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const triadStroke = isDark ? '#f8fafc' : '#0f172a';

        // 1. +x axis arrow (horizontal along beam neutral axis)
        // White halo backdrop
        ctx.beginPath();
        ctx.moveTo(triadOriginX - 18, triadOriginY);
        ctx.lineTo(triadOriginX + axisLenX, triadOriginY);
        ctx.strokeStyle = haloStyle;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Sharp primary line
        ctx.beginPath();
        ctx.moveTo(triadOriginX - 18, triadOriginY);
        ctx.lineTo(triadOriginX + axisLenX, triadOriginY);
        ctx.strokeStyle = triadStroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // +x arrowhead halo
        ctx.beginPath();
        ctx.moveTo(triadOriginX + axisLenX + 2, triadOriginY);
        ctx.lineTo(triadOriginX + axisLenX - 7, triadOriginY - 5);
        ctx.lineTo(triadOriginX + axisLenX - 7, triadOriginY + 5);
        ctx.closePath();
        ctx.fillStyle = haloStyle;
        ctx.fill();

        // +x arrowhead
        ctx.beginPath();
        ctx.moveTo(triadOriginX + axisLenX, triadOriginY);
        ctx.lineTo(triadOriginX + axisLenX - 6, triadOriginY - 3.5);
        ctx.lineTo(triadOriginX + axisLenX - 6, triadOriginY + 3.5);
        ctx.closePath();
        ctx.fillStyle = triadStroke;
        ctx.fill();

        // +x label
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = haloStyle;
        ctx.lineWidth = 3.5;
        ctx.strokeText('+x (mm)', triadOriginX + axisLenX + 5, triadOriginY);
        ctx.fillStyle = triadStroke;
        ctx.fillText('+x (mm)', triadOriginX + axisLenX + 5, triadOriginY);

        // 2. +y axis arrow (vertical upward)
        // White halo backdrop
        ctx.beginPath();
        ctx.moveTo(triadOriginX, triadOriginY + 16);
        ctx.lineTo(triadOriginX, triadOriginY - axisLenY);
        ctx.strokeStyle = haloStyle;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Sharp primary line
        ctx.beginPath();
        ctx.moveTo(triadOriginX, triadOriginY + 16);
        ctx.lineTo(triadOriginX, triadOriginY - axisLenY);
        ctx.strokeStyle = triadStroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // +y arrowhead halo
        ctx.beginPath();
        ctx.moveTo(triadOriginX, triadOriginY - axisLenY - 2);
        ctx.lineTo(triadOriginX - 5, triadOriginY - axisLenY + 7);
        ctx.lineTo(triadOriginX + 5, triadOriginY - axisLenY + 7);
        ctx.closePath();
        ctx.fillStyle = haloStyle;
        ctx.fill();

        // +y arrowhead
        ctx.beginPath();
        ctx.moveTo(triadOriginX, triadOriginY - axisLenY);
        ctx.lineTo(triadOriginX - 3.5, triadOriginY - axisLenY + 6);
        ctx.lineTo(triadOriginX + 3.5, triadOriginY - axisLenY + 6);
        ctx.closePath();
        ctx.fillStyle = triadStroke;
        ctx.fill();

        // +y label
        ctx.textAlign = 'center';
        ctx.strokeStyle = haloStyle;
        ctx.lineWidth = 3.5;
        ctx.strokeText('+y', triadOriginX, triadOriginY - axisLenY - 6);
        ctx.fillStyle = triadStroke;
        ctx.fillText('+y', triadOriginX, triadOriginY - axisLenY - 6);

        // 3. Origin Point (0, 0)
        ctx.beginPath();
        ctx.arc(triadOriginX, triadOriginY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = haloStyle;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(triadOriginX, triadOriginY, 3, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.fill();

        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.strokeStyle = haloStyle;
        ctx.lineWidth = 3.5;
        ctx.strokeText('(0, 0)', triadOriginX - 6, triadOriginY + 14);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText('(0, 0)', triadOriginX - 6, triadOriginY + 14);

        ctx.restore();
      }

      // -------------------------------------------------------------
      // HOVER PROBE CROSSHAIR
      // (Rendered strictly when mouse is over the beam)
      // -------------------------------------------------------------
      if (hoverPointRef.current) {
        const hp = hoverPointRef.current;
        ctx.save();

        // 1. Crosshair reticle ticks
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;

        // Horizontal crosshair ticks
        ctx.beginPath();
        ctx.moveTo(hp.rawX - 14, hp.rawY);
        ctx.lineTo(hp.rawX - 4, hp.rawY);
        ctx.moveTo(hp.rawX + 4, hp.rawY);
        ctx.lineTo(hp.rawX + 14, hp.rawY);
        // Vertical crosshair ticks
        ctx.moveTo(hp.rawX, hp.rawY - 14);
        ctx.lineTo(hp.rawX, hp.rawY - 4);
        ctx.moveTo(hp.rawX, hp.rawY + 4);
        ctx.lineTo(hp.rawX, hp.rawY + 14);
        ctx.stroke();

        // Outer reticle circle
        ctx.beginPath();
        ctx.arc(hp.rawX, hp.rawY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(hp.rawX, hp.rawY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();

        ctx.restore();
      }
    },
    [config, theme]
  );

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const renderWidth = width || rect.width || 800;
    const renderHeight = height || rect.height || 480;

    setCanvasMetrics({ width: renderWidth, height: renderHeight });

    canvas.width = renderWidth * dpr;
    canvas.height = renderHeight * dpr;
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    drawCanvas(canvas);
  }, [width, height, drawCanvas]);

  useEffect(() => {
    updateCanvasSize();
    if (canvasRefCallback) {
      canvasRefCallback(canvasRef.current);
    }
  }, [updateCanvasSize, canvasRefCallback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [updateCanvasSize]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    const isBending = config.testType === 'bending';
    const originX = Math.max(225, Math.min(275, rect.width * 0.26));
    const tensionRightReserved = Math.max(200, rect.width * 0.24);
    const rightMargin = isBending ? Math.max(50, rect.width * 0.07) : tensionRightReserved;
    const beamLengthPx = Math.max(160, rect.width - originX - rightMargin);

    const planeRatio = config.crossSectionPlaneX / config.lengthMm;
    const planePixelX = originX + planeRatio * beamLengthPx;

    if (Math.abs(clientX - planePixelX) < 22 && onPlaneChange) {
      isDraggingPlaneRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const isBending = config.testType === 'bending';
    const originX = Math.max(225, Math.min(275, rect.width * 0.26));
    const tensionRightReserved = Math.max(200, rect.width * 0.24);
    const rightMargin = isBending ? Math.max(50, rect.width * 0.07) : tensionRightReserved;
    const beamLengthPx = Math.max(160, rect.width - originX - rightMargin);

    if (isDraggingPlaneRef.current && onPlaneChange) {
      const u = Math.max(0, Math.min(1, (clientX - originX) / beamLengthPx));
      const newPlaneMm = Math.round(u * config.lengthMm);
      onPlaneChange(newPlaneMm);
      return;
    }

    // Strict hover inspection over the beam body
    const u = (clientX - originX) / beamLengthPx;
    let isOverBeam = false;

    if (u >= 0 && u <= 1) {
      const realX_m = u * (config.lengthMm / 1000);
      const originY = rect.height * 0.35;
      const beamDrawThickness = Math.max(24, Math.min(64, rect.height * 0.09));

      let beamCenterAtX = originY;
      let realDeltaM = 0;

      if (isBending) {
        const analysis = analyzeBeam(config);
        const maxPhysicalDeflM = Math.abs(analysis.maxDeflectionMm) / 1000;
        const maxAllowedPixels = rect.height * 0.22;
        const nominalScale = maxPhysicalDeflM > 0 ? maxAllowedPixels / Math.max(0.002, maxPhysicalDeflM) : 1;
        const pixelDeflectionMultiplier = nominalScale * 0.08 * config.scaleFactor;

        realDeltaM = getDeflectionAt(realX_m, config);
        const pixelDelta = realDeltaM * pixelDeflectionMultiplier;
        beamCenterAtX = originY + pixelDelta;
      }

      const distFromCenterY = clientY - beamCenterAtX;
      const halfThicknessPx = beamDrawThickness / 2;

      // Mouse is strictly over the beam profile
      if (Math.abs(distFromCenterY) <= halfThicknessPx + 1.5) {
        isOverBeam = true;

        // Normalized v: +1 at top surface, 0 at neutral axis, -1 at bottom surface
        const v = Math.max(-1, Math.min(1, -distFromCenterY / halfThicknessPx));
        const halfThickMm = config.thicknessMm / 2;
        const yMm = v * halfThickMm;
        const yM = yMm / 1000;
        const xMm = u * config.lengthMm;

        let momentNm = 0;
        let normalStressMpa = 0;
        let normalStrainMicro = 0;

        if (isBending) {
          momentNm = getBendingMomentAt(realX_m, config);
          normalStressMpa = getNormalStressAt(realX_m, yM, config);
          normalStrainMicro = getNormalStrainAt(realX_m, yM, config);
        } else {
          // Tension test
          const areaM2 = (config.widthMm * config.thicknessMm) / 1e6;
          normalStressMpa = (config.loadN / areaM2) / 1e6;
          normalStrainMicro = (normalStressMpa / config.material.youngsModulus) * 1000;
          momentNm = 0;
        }

        hoverPointRef.current = {
          x: realX_m,
          y: yM,
          xMm,
          yMm,
          stress: normalStressMpa,
          strain: normalStrainMicro,
          moment: momentNm,
          delta: realDeltaM,
          rawX: clientX,
          rawY: clientY,
        };
        canvas.style.cursor = 'crosshair';
        drawCanvas(canvas);
      }
    }

    if (!isOverBeam) {
      canvas.style.cursor = 'default';
      if (hoverPointRef.current) {
        hoverPointRef.current = null;
        drawCanvas(canvas);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingPlaneRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  // YouTube Vertical Load Slider Handlers
  const handleLoadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onLoadChange || !loadTrackRef.current) return;
    setIsScrubbingLoad(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = loadTrackRef.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
    const step = config.loadStepN || 1;
    let val = Math.round((u * config.maxLoadN) / step) * step;
    val = Math.max(0, Math.min(config.maxLoadN, val));
    onLoadChange(parseFloat(val.toFixed(step < 1 ? 2 : 0)));
  };

  const handleLoadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loadTrackRef.current) return;
    const rect = loadTrackRef.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
    setHoverLoadRatio(u);

    if (isScrubbingLoad && onLoadChange) {
      const step = config.loadStepN || 1;
      let val = Math.round((u * config.maxLoadN) / step) * step;
      val = Math.max(0, Math.min(config.maxLoadN, val));
      onLoadChange(parseFloat(val.toFixed(step < 1 ? 2 : 0)));
    }
  };

  const handleLoadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbingLoad(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const stepUpLoad = () => {
    if (!onLoadChange) return;
    const step = config.loadStepN || 1;
    const nextVal = Math.min(config.maxLoadN, config.loadN + step);
    onLoadChange(parseFloat(nextVal.toFixed(step < 1 ? 2 : 0)));
  };

  const stepDownLoad = () => {
    if (!onLoadChange) return;
    const step = config.loadStepN || 1;
    const nextVal = Math.max(0, config.loadN - step);
    onLoadChange(parseFloat(nextVal.toFixed(step < 1 ? 2 : 0)));
  };

  // Metrics for positioning YouTube player controls
  // Metrics for positioning player controls
  const isBending = config.testType === 'bending';
  const analysis = analyzeBeam(config);
  const beamCenterY = canvasMetrics.height * 0.35;
  const beamDrawThickness = Math.max(24, Math.min(64, canvasMetrics.height * 0.09));
  const fixedPointAY = beamCenterY + beamDrawThickness / 2;

  const w = canvasMetrics.width;
  const originX = Math.max(225, Math.min(275, w * 0.26));
  const tensionRightReserved = Math.max(210, w * 0.26);
  const rightMargin = isBending ? Math.max(120, w * 0.12) : tensionRightReserved;
  const beamDrawLength = Math.max(160, w - originX - rightMargin);
  const beamCenterX = originX + beamDrawLength / 2;

  const isGeometryMode = config.visualizeMode === 'geometry';
  const showCrossSectionSlider = (config.showCrossSectionVectors || config.showMomentOnGraph) && !!onChange;

  // Calculate bottom reach of bending moment curve and Mmax label
  const hasMoment = isBending && analysis.maxBendingMomentNm > 0.0001;
  const refM = Math.max(0.01, analysis.refBendingMomentNm || (config.maxLoadN * (config.lengthMm / 1000)) / 4);
  const maxMomentScalePx = hasMoment ? Math.min(80, (analysis.maxBendingMomentNm / refM) * 65) : 0;
  const midDeflectionPx = isBending ? Math.min(45, (analysis.maxDeflectionMm / Math.max(0.001, config.thicknessMm)) * 25) : 0;
  const momentPeakEstY = fixedPointAY + midDeflectionPx + maxMomentScalePx;
  const momentBottomLimit = hasMoment ? (momentPeakEstY + 36) : (fixedPointAY + 30);

  // Position color scale with generous clearance below Mmax text and bending moment curve
  const scaleTop = isBending && config.showMomentOnGraph
    ? Math.max(fixedPointAY + 152, momentBottomLimit + 36)
    : (fixedPointAY + 56);

  // Cross section scale positioned with generous clearance below colored scale (or below moment curve in geometry mode)
  const sliderTop = isGeometryMode
    ? (isBending && config.showMomentOnGraph ? Math.max(fixedPointAY + 145, momentBottomLimit + 26) : (fixedPointAY + 54))
    : (scaleTop + 76);

  // Vertical Load Slider positioned to the far left hand side of the graph area
  const loadSliderLeft = 14;
  const loadSliderTop = Math.max(w < 720 ? 86 : 68, fixedPointAY - 95);

  const loadPct = Math.max(0, Math.min(100, (config.loadN / Math.max(0.1, config.maxLoadN)) * 100));

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (canvasRef.current) canvasRef.current.style.cursor = 'default';
          if (hoverPointRef.current) {
            hoverPointRef.current = null;
            if (canvasRef.current) drawCanvas(canvasRef.current);
          }
        }}
        className="w-full h-full block cursor-default touch-none"
      />

      {/* 1. YouTube Vertical Load Slider (directly in the graph window, no box over the graph) */}
      {interactive && onLoadChange && (
        <div
          className="absolute z-20 flex flex-col items-center select-none pointer-events-auto"
          style={{
            left: `${loadSliderLeft}px`,
            top: `${loadSliderTop}px`,
            width: '52px',
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-slate-700 tracking-wide">Load (W)</span>
            <span className="font-mono text-[9px] text-slate-400 font-semibold">{Math.round(config.maxLoadN)}N</span>
          </div>

          {/* Step Up Button (+) */}
          <button
            onClick={stepUpLoad}
            title={`Increase load by ${config.loadStepN || 1} N`}
            className="w-6 h-5 mb-1 rounded hover:bg-slate-200/70 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* YouTube Vertical Track */}
          <div
            ref={loadTrackRef}
            onPointerDown={handleLoadPointerDown}
            onPointerMove={handleLoadPointerMove}
            onPointerUp={handleLoadPointerUp}
            onPointerLeave={() => setHoverLoadRatio(null)}
            className="relative w-6 h-[95px] flex items-center justify-center cursor-pointer group touch-none"
            title="Drag or click to adjust Load (W)"
          >
            {/* Dark background rail (YouTube player scrubber style) */}
            <div className="w-1.5 group-hover:w-2.5 transition-all duration-150 h-full bg-slate-300 rounded-full relative overflow-hidden shadow-inner">
              {/* Red Progress Fill from bottom to top */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-full transition-all duration-75"
                style={{ height: `${loadPct}%` }}
              />
            </div>

            {/* Red Circular Scrubber Thumb */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-md shadow-red-500/40 pointer-events-none group-hover:scale-125 transition-all duration-75"
              style={{ bottom: `calc(${loadPct}% - 7px)` }}
            />

            {/* Floating Tooltip Badge next to thumb */}
            <div
              className={`absolute left-7 -translate-y-1/2 bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30 transition-opacity duration-150 ${
                isScrubbingLoad || hoverLoadRatio !== null ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ bottom: `calc(${loadPct}% - 7px)` }}
            >
              W = {config.loadN} N
            </div>
          </div>

          {/* Step Down Button (-) */}
          <button
            onClick={stepDownLoad}
            title={`Decrease load by ${config.loadStepN || 1} N`}
            className="w-6 h-5 mt-1 rounded hover:bg-slate-200/70 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="font-mono text-[9px] text-slate-400 mt-0.5 font-semibold">0 N</span>

          {/* Play animation button below the load slider on the left hand side of the graph */}
          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Load Animation' : 'Auto-Animate Load Cycle'}
              className={`mt-2 flex items-center justify-center w-8 h-8 rounded-lg shadow-sm font-semibold text-xs transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 hover:scale-105'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
          )}
        </div>
      )}

      {/* 2. Overlays inside Diagram Window: Colored Scale & Cross Section Player */}
      {/* A. Colored Scale (Centered with beam centerline, positioned much closer to beam, hidden in geometry mode) */}
      {!isGeometryMode && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-200"
          style={{
            left: `${beamCenterX}px`,
            top: `${scaleTop}px`,
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '440px',
          }}
        >
          <div className="w-full pointer-events-auto">
            <StressLegend
              colormap={config.colormap}
              visualizeMode={config.visualizeMode}
              refMaxStress={analysis.refNormalStressMpa}
              refMaxStrainMicro={analysis.refNormalStrainMicro}
              materialName={config.material.name}
              currentStress={isBending ? analysis.maxNormalStressMpa : analysis.axialStressMpa}
              currentStrainMicro={isBending ? analysis.maxNormalStrainMicro : analysis.axialStrainMicro}
            />
          </div>
        </div>
      )}

      {/* B. Cross-Section Player (Size exactly equal to beam's length and aligned with Point A & Point B) */}
      {showCrossSectionSlider && (
        <div
          className="absolute z-20 pointer-events-auto transition-all duration-150"
          style={{
            left: `${originX}px`,
            width: `${beamDrawLength}px`,
            top: `${sliderTop}px`,
          }}
        >
          <CrossSectionSlider
            config={config}
            analysis={analysis}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
};
