/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Film,
  FileImage,
  Copy,
  Check,
  Presentation,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BeamConfig, SlideTheme } from '../types/beam';
import { createGifFromCanvases, downloadBlob, recordVideoFromCanvas } from '../utils/gifExporter';
import { analyzeBeam, getDeflectionAt, getNormalStressAt, getSlopeAt, getStressColor, getVonMisesStressAt } from '../utils/beamPhysics';

interface PowerPointExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BeamConfig;
  isDark?: boolean;
}

export const PowerPointExportModal: React.FC<PowerPointExportModalProps> = ({
  isOpen,
  onClose,
  config,
  isDark = false,
}) => {
  const [exportType, setExportType] = useState<'gif' | 'video' | 'png'>('gif');
  const [slideTheme, setSlideTheme] = useState<SlideTheme>('white');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3'>('16:9');
  const [durationSec, setDurationSec] = useState<number>(5.0);
  const [fps, setFps] = useState<number>(25);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const renderFrameToCanvas = (
    canvas: HTMLCanvasElement,
    currentLoadN: number,
    theme: SlideTheme
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (theme === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (theme === 'dark') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    }

    const frameConfig: BeamConfig = { ...config, loadN: currentLoadN };
    const analysis = analyzeBeam(frameConfig);
    const fixedRefStress = Math.max(0.1, analysis.refNormalStressMpa);

    const isThemeDark = theme === 'dark';
    const textPrimary = isThemeDark ? '#f8fafc' : '#0f172a';
    const textMuted = isThemeDark ? '#94a3b8' : '#64748b';
    const supportColor = isThemeDark ? '#cbd5e1' : '#334155';
    const groundHatch = isThemeDark ? '#475569' : '#94a3b8';

    const L_m = frameConfig.lengthMm / 1000;
    const d_m = frameConfig.thicknessMm / 1000;

    const marginX = w * 0.12;
    const beamDrawLength = w - 2 * marginX;
    const beamCenterY = h * 0.44;
    const beamDrawThickness = Math.max(20, h * 0.08);

    const originX = marginX;
    const originY = beamCenterY;

    const maxDeflM = Math.abs(analysis.maxDeflectionMm) / 1000;
    const visualAmp = config.scaleFactor;
    const maxAllowedPixels = h * 0.22;
    const nominalScale = maxDeflM > 0 ? maxAllowedPixels / Math.max(0.002, maxDeflM) : 1;
    const pixelDeflectionMultiplier = nominalScale * 0.08 * visualAmp;

    const numSlicesX = 80;
    const numLayersY = 12;

    const undefTopY = originY - beamDrawThickness / 2;

    // Undeformed reference
    if (config.showOriginalOutline) {
      ctx.save();
      ctx.strokeStyle = isThemeDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(originX, undefTopY, beamDrawLength, beamDrawThickness);
      ctx.restore();
    }

    // Grid coordinates with corrected physical kinematics
    interface V { x: number; y: number; stress: number; signedStress: number; }
    const grid: V[][] = [];

    for (let i = 0; i <= numSlicesX; i++) {
      const u = i / numSlicesX;
      const realX = u * L_m;
      const realDeltaM = getDeflectionAt(realX, frameConfig);
      const pixelDelta = realDeltaM * pixelDeflectionMultiplier;

      const slope = getSlopeAt(realX, frameConfig) * (pixelDeflectionMultiplier / (beamDrawLength / L_m));
      const theta = Math.atan(slope);

      const cx = originX + u * beamDrawLength;
      const cy = originY + pixelDelta;

      // Correct normal vector pointing up
      const nx = Math.sin(theta);
      const ny = -Math.cos(theta);

      const column: V[] = [];
      for (let j = 0; j <= numLayersY; j++) {
        const v = j / numLayersY;
        const realY = (v - 0.5) * d_m;
        const pixelYOffset = (v - 0.5) * beamDrawThickness;

        const vx = cx + nx * pixelYOffset;
        const vy = cy + ny * pixelYOffset;

        const signed = getNormalStressAt(realX, realY, frameConfig);
        const stress = frameConfig.colormap === 'tension_compression' ? Math.abs(signed) : getVonMisesStressAt(realX, realY, frameConfig);

        column.push({ x: vx, y: vy, stress, signedStress: signed });
      }
      grid.push(column);
    }

    // Fill facets (Fixed to W_max scale)
    for (let i = 0; i < numSlicesX; i++) {
      for (let j = 0; j < numLayersY; j++) {
        const v00 = grid[i][j];
        const v10 = grid[i + 1][j];
        const v11 = grid[i + 1][j + 1];
        const v01 = grid[i][j + 1];

        const avgStress = (v00.stress + v10.stress + v11.stress + v01.stress) / 4;
        const avgSigned = (v00.signedStress + v10.signedStress + v11.signedStress + v01.signedStress) / 4;
        const col = getStressColor(avgStress, fixedRefStress, frameConfig.colormap, avgSigned);

        ctx.beginPath();
        ctx.moveTo(v00.x, v00.y);
        ctx.lineTo(v10.x, v10.y);
        ctx.lineTo(v11.x, v11.y);
        ctx.lineTo(v01.x, v01.y);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
    }

    // Outline
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
    ctx.strokeStyle = isThemeDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.75;
    ctx.stroke();

    // Supports
    const leftP = grid[0][0];
    const rightP = grid[numSlicesX][0];
    const supH = 26;
    const supW = 28;

    // Left pin
    ctx.beginPath();
    ctx.moveTo(leftP.x, leftP.y);
    ctx.lineTo(leftP.x - supW / 2, leftP.y + supH);
    ctx.lineTo(leftP.x + supW / 2, leftP.y + supH);
    ctx.closePath();
    ctx.fillStyle = isThemeDark ? '#1e293b' : '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = supportColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    const pinGroundY = leftP.y + supH;
    ctx.beginPath();
    ctx.moveTo(leftP.x - supW / 2 - 8, pinGroundY);
    ctx.lineTo(leftP.x + supW / 2 + 8, pinGroundY);
    ctx.strokeStyle = supportColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = groundHatch;
    ctx.lineWidth = 1.5;
    for (let hx = leftP.x - supW / 2 - 6; hx <= leftP.x + supW / 2 + 4; hx += 6) {
      ctx.beginPath();
      ctx.moveTo(hx, pinGroundY);
      ctx.lineTo(hx - 5, pinGroundY + 8);
      ctx.stroke();
    }

    // Right roller
    ctx.beginPath();
    ctx.moveTo(rightP.x, rightP.y);
    ctx.lineTo(rightP.x - supW / 2, rightP.y + supH - 7);
    ctx.lineTo(rightP.x + supW / 2, rightP.y + supH - 7);
    ctx.closePath();
    ctx.fillStyle = isThemeDark ? '#1e293b' : '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = supportColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    const rollerY = rightP.y + supH - 3.5;
    [-6, 0, 6].forEach((offset) => {
      ctx.beginPath();
      ctx.arc(rightP.x + offset, rollerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = isThemeDark ? '#475569' : '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = supportColor;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    });

    const rollerGroundY = rollerY + 3 + 2;
    const initialRightX = originX + beamDrawLength;
    ctx.beginPath();
    ctx.moveTo(rightP.x - supW / 2 - 10, rollerGroundY);
    ctx.lineTo(initialRightX + supW / 2 + 8, rollerGroundY);
    ctx.strokeStyle = supportColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = groundHatch;
    ctx.lineWidth = 1.5;
    for (let hx = rightP.x - supW / 2 - 7; hx <= initialRightX + supW / 2 + 4; hx += 6) {
      ctx.beginPath();
      ctx.moveTo(hx, rollerGroundY);
      ctx.lineTo(hx - 5, rollerGroundY + 8);
      ctx.stroke();
    }

    // Load Arrow (NO RED RECTANGLE AT CONTACT POINT)
    const midIdx = Math.floor(numSlicesX / 2);
    const centerTop = grid[midIdx][numLayersY];
    const loadArrowLen = Math.min(80, Math.max(30, (currentLoadN / Math.max(1, config.maxLoadN)) * 75));

    if (Math.abs(currentLoadN) > 0.05) {
      const arrowStart = centerTop.y - loadArrowLen;
      const arrowEnd = centerTop.y; // Touches beam surface directly

      ctx.beginPath();
      ctx.moveTo(centerTop.x, arrowStart);
      ctx.lineTo(centerTop.x, arrowEnd);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerTop.x, arrowEnd);
      ctx.lineTo(centerTop.x - 6, arrowEnd - 10);
      ctx.lineTo(centerTop.x + 6, arrowEnd - 10);
      ctx.closePath();
      ctx.fillStyle = '#dc2626';
      ctx.fill();

      // Label badge: "W = ... N"
      const loadLabel = `W = ${currentLoadN.toFixed(1)} N`;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      const labelW = ctx.measureText(loadLabel).width + 12;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(centerTop.x - labelW / 2, arrowStart - 18, labelW, 20, 5);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(loadLabel, centerTop.x, arrowStart - 8);
    }

    // Top Deflection Callout
    const topDeformedY = centerTop.y;
    const topNonDeformedY = undefTopY;
    if (topDeformedY - topNonDeformedY > 2) {
      const calloutX = centerTop.x + 36;
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(centerTop.x, topNonDeformedY);
      ctx.lineTo(calloutX + 15, topNonDeformedY);
      ctx.moveTo(centerTop.x, topDeformedY);
      ctx.lineTo(calloutX + 15, topDeformedY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(calloutX, topNonDeformedY);
      ctx.lineTo(calloutX, topDeformedY);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`δ = ${analysis.maxDeflectionMm.toFixed(3)} mm`, calloutX + 4, (topNonDeformedY + topDeformedY) / 2 + 3);
    }

    // Slide Header
    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Beam Bending & Stress Distribution', marginX, 34);

    ctx.fillStyle = textMuted;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(
      `Material: ${config.material.name} | L = ${config.lengthMm}mm, b = ${config.widthMm}mm, d = ${config.thicknessMm}mm | Wmax = ${config.maxLoadN}N`,
      marginX,
      52
    );
  };

  const handleExportGif = async () => {
    try {
      setIsExporting(true);
      setProgress(5);
      setProgressMsg('Rendering frames of beam oscillation...');

      const exportWidth = aspectRatio === '16:9' ? 800 : 720;
      const exportHeight = aspectRatio === '16:9' ? 450 : 540;

      const totalFrames = Math.round(durationSec * fps);
      const frameCanvases: HTMLCanvasElement[] = [];

      const peakLoad = config.maxLoadN > 0 ? config.maxLoadN : 14;

      for (let f = 0; f < totalFrames; f++) {
        const t = f / totalFrames;
        const loadFactor = Math.sin(t * Math.PI);
        const frameLoad = peakLoad * loadFactor;

        const offscreen = document.createElement('canvas');
        offscreen.width = exportWidth;
        offscreen.height = exportHeight;
        renderFrameToCanvas(offscreen, frameLoad, slideTheme);
        frameCanvases.push(offscreen);
      }

      setProgress(40);
      setProgressMsg('Encoding animated GIF for PowerPoint...');

      const gifBlob = await createGifFromCanvases(frameCanvases, {
        width: exportWidth,
        height: exportHeight,
        fps,
        onProgress: (p) => {
          setProgress(40 + Math.round(p * 0.55));
        },
      });

      setProgress(100);
      setProgressMsg('Done! Saving PowerPoint GIF...');
      downloadBlob(gifBlob, `beam_deformation_W${config.maxLoadN}N_${Date.now()}.gif`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      alert('Failed to generate GIF. Please try lower FPS or duration.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleExportVideo = async () => {
    try {
      setIsExporting(true);
      setProgress(10);
      setProgressMsg('Recording high-definition video loop...');

      const exportWidth = aspectRatio === '16:9' ? 1280 : 960;
      const exportHeight = aspectRatio === '16:9' ? 720 : 720;

      const offscreen = document.createElement('canvas');
      offscreen.width = exportWidth;
      offscreen.height = exportHeight;

      const peakLoad = config.maxLoadN > 0 ? config.maxLoadN : 14;

      const videoBlob = await recordVideoFromCanvas(
        offscreen,
        (progressRatio) => {
          const loadFactor = Math.sin(progressRatio * Math.PI);
          renderFrameToCanvas(offscreen, peakLoad * loadFactor, slideTheme);
        },
        durationSec * 1000,
        fps,
        (pct) => setProgress(pct)
      );

      setProgress(100);
      setProgressMsg('Saving presentation video clip...');
      downloadBlob(videoBlob, `beam_bending_W${config.maxLoadN}N_${Date.now()}.webm`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      alert('Failed to record video.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleExportPng = () => {
    const exportWidth = aspectRatio === '16:9' ? 1920 : 1440;
    const exportHeight = aspectRatio === '16:9' ? 1080 : 1080;

    const offscreen = document.createElement('canvas');
    offscreen.width = exportWidth;
    offscreen.height = exportHeight;
    renderFrameToCanvas(offscreen, config.loadN, slideTheme);

    offscreen.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `beam_deformation_W${config.loadN.toFixed(1)}N_${Date.now()}.png`);
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      }
    }, 'image/png');
  };

  const handleCopyToClipboard = async () => {
    try {
      const exportWidth = 1920;
      const exportHeight = 1080;
      const offscreen = document.createElement('canvas');
      offscreen.width = exportWidth;
      offscreen.height = exportHeight;
      renderFrameToCanvas(offscreen, config.loadN, slideTheme);

      offscreen.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy failed', err);
      handleExportPng();
    }
  };

  const bgModal = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${bgModal}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Export for PowerPoint Presentation</h2>
              <p className="text-xs text-slate-500">Insert an animated beam deflection loop directly into your slides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Select Output Format:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportType('gif')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  exportType === 'gif'
                    ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 ring-1 ring-red-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <Film className="w-4 h-4 text-red-600" />
                  <span>Animated GIF</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Loops continuously in PowerPoint without playback settings. Recommended!
                </div>
              </button>

              <button
                onClick={() => setExportType('video')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  exportType === 'video'
                    ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 ring-1 ring-red-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <Film className="w-4 h-4 text-sky-600" />
                  <span>Video Clip (WebM)</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Smooth high-definition video loop for PowerPoint Video Player.
                </div>
              </button>

              <button
                onClick={() => setExportType('png')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  exportType === 'png'
                    ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 ring-1 ring-red-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <FileImage className="w-4 h-4 text-emerald-600" />
                  <span>Slide Snapshot (PNG)</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  High-res static slide graphic or instant clipboard copy.
                </div>
              </button>
            </div>
          </div>

          {/* Theme & Ratio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Slide Background:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSlideTheme('white')}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium ${
                    slideTheme === 'white'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  White Slide
                </button>
                <button
                  onClick={() => setSlideTheme('dark')}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium ${
                    slideTheme === 'dark'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Dark Slide
                </button>
                <button
                  onClick={() => setSlideTheme('transparent')}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium ${
                    slideTheme === 'transparent'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Transparent
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Aspect Ratio:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium ${
                    aspectRatio === '16:9'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  16:9 (Widescreen)
                </button>
                <button
                  onClick={() => setAspectRatio('4:3')}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium ${
                    aspectRatio === '4:3'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  4:3 (Standard)
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 mb-1">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>How to Insert in Microsoft PowerPoint:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300/90 text-[11px] leading-relaxed">
              <li>Click the button below to download the animated file.</li>
              <li>In PowerPoint, drag & drop the downloaded <strong>.gif</strong> or <strong>.webm</strong> file directly onto your slide.</li>
              <li>Animated GIFs play and loop automatically during your PowerPoint slideshow (F5).</li>
            </ol>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <span>{progressMsg}</span>
                </span>
                <span className="font-mono font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div>
            {exportType === 'png' ? (
              <button
                onClick={handleCopyToClipboard}
                disabled={isExporting}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied! Paste into PPT (Ctrl+V)</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>

            {exportType === 'gif' && (
              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PowerPoint GIF</span>
              </button>
            )}

            {exportType === 'video' && (
              <button
                onClick={handleExportVideo}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Video Loop</span>
              </button>
            )}

            {exportType === 'png' && (
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Slide PNG</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
