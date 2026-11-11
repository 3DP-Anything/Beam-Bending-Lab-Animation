/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileCode,
  FileImage,
  Film,
  Copy,
  Check,
  Loader2,
  Share2,
} from 'lucide-react';
import { BeamConfig } from '../types/beam';
import { analyzeBeam } from '../utils/beamPhysics';
import { generateBeamSvg } from '../utils/svgExporter';
import { createGifFromCanvases, downloadBlob, recordVideoFromCanvas } from '../utils/gifExporter';

interface ExportGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BeamConfig;
}

export const ExportGraphModal: React.FC<ExportGraphModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [exportType, setExportType] = useState<'svg' | 'png' | 'gif' | 'video'>('svg');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null);

  const analysis = useMemo(() => analyzeBeam(config), [config]);
  const svgContent = useMemo(
    () => (isOpen ? generateBeamSvg(config, analysis, 960, 540) : ''),
    [isOpen, config, analysis]
  );

  if (!isOpen) return null;

  // Handle SVG Download
  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const filename = `beam_${config.testType}_${config.visualizeMode}_${config.loadN}N.svg`;
    downloadBlob(blob, filename);
  };

  // Handle Copy SVG to Clipboard
  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopiedSuccess('svg');
      setTimeout(() => setCopiedSuccess(null), 2500);
    } catch (err) {
      console.error('Failed to copy SVG: ', err);
    }
  };

  // Handle High-Res PNG Export (rendered from SVG to ensure scale and all options are included)
  const handleDownloadPng = async () => {
    setIsExporting(true);
    setProgressMsg('Rendering high-resolution image...');
    try {
      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              const filename = `beam_${config.testType}_${config.visualizeMode}_${config.loadN}N.png`;
              downloadBlob(blob, filename);
            }
            setIsExporting(false);
            URL.revokeObjectURL(url);
          }, 'image/png');
        } else {
          setIsExporting(false);
          URL.revokeObjectURL(url);
        }
      };

      img.src = url;
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  // Handle Copy PNG Image to Clipboard
  const handleCopyPng = async () => {
    setIsExporting(true);
    setProgressMsg('Copying image to clipboard...');
    try {
      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              try {
                await navigator.clipboard.write([
                  new window.ClipboardItem({ 'image/png': blob }),
                ]);
                setCopiedSuccess('png');
                setTimeout(() => setCopiedSuccess(null), 2500);
              } catch (e) {
                console.error(e);
              }
            }
            setIsExporting(false);
            URL.revokeObjectURL(url);
          }, 'image/png');
        }
      };

      img.src = url;
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  // Handle Looping GIF Export
  const handleExportGif = async () => {
    setIsExporting(true);
    setProgressMsg('Generating animated GIF frames...');
    try {
      const framesCount = 40;
      const canvases: HTMLCanvasElement[] = [];

      for (let i = 0; i < framesCount; i++) {
        const wave = (Math.sin((i / framesCount) * 2 * Math.PI - Math.PI / 2) + 1) / 2;
        const currentLoad = Math.round(config.maxLoadN * wave);
        const frameConf: BeamConfig = { ...config, loadN: currentLoad };
        const frameAnalysis = analyzeBeam(frameConf);

        const frameSvg = generateBeamSvg(frameConf, frameAnalysis, 960, 540);
        const img = new Image();
        const svgBlob = new Blob([frameSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 960;
            canvas.height = 540;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            canvases.push(canvas);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });
      }

      setProgressMsg('Encoding looping GIF (half speed)...');
      const gifBlob = await createGifFromCanvases(canvases, {
        width: 960,
        height: 540,
        fps: 10,
      });
      downloadBlob(gifBlob, `beam_${config.testType}_animated.gif`);
      setIsExporting(false);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Graph</h2>
              <p className="text-xs text-slate-500">
                Export includes the deformed beam, selected load, dimensions, and the complete stress/strain scale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Format Selection Tabs */}
          <div className="grid grid-cols-3 gap-3">
            {/* SVG Option */}
            <button
              onClick={() => setExportType('svg')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportType === 'svg'
                  ? 'border-red-600 bg-red-50/70 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <FileCode className={`w-5 h-5 ${exportType === 'svg' ? 'text-red-600' : 'text-slate-500'}`} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Recommended</span>
              </div>
              <div className="font-bold text-xs text-slate-900">SVG (Vector Graphic)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Infinitely scalable, crisp vector graphics with scale</div>
            </button>

            {/* PNG Option */}
            <button
              onClick={() => setExportType('png')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportType === 'png'
                  ? 'border-red-600 bg-red-50/70 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileImage className={`w-5 h-5 mb-1 ${exportType === 'png' ? 'text-red-600' : 'text-slate-500'}`} />
              <div className="font-bold text-xs text-slate-900">PNG (High-Res Image)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Full 1920×1080 static graphic with complete scale</div>
            </button>

            {/* GIF Option */}
            <button
              onClick={() => setExportType('gif')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportType === 'gif'
                  ? 'border-red-600 bg-red-50/70 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Film className={`w-5 h-5 mb-1 ${exportType === 'gif' ? 'text-red-600' : 'text-slate-500'}`} />
              <div className="font-bold text-xs text-slate-900">Animated GIF</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Looping auto-loading animation for presentations</div>
            </button>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Export Preview (Includes Stress Scale & Active Options):
              </span>
              <span className="font-mono text-[11px]">
                {config.material.name.split(' (')[0]} · W = {Math.round(config.loadN)} N
              </span>
            </div>

            <div
              className="w-full aspect-16/9 max-h-[340px] rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex items-center justify-center p-2"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                <span className="font-medium text-slate-700">{progressMsg}</span>
              </>
            ) : (
              <span>Ready to export with active settings and scale.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {exportType === 'svg' && (
              <>
                <button
                  onClick={handleCopySvg}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedSuccess === 'svg' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy SVG</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSvg}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download SVG</span>
                </button>
              </>
            )}

            {exportType === 'png' && (
              <>
                <button
                  onClick={handleCopyPng}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {copiedSuccess === 'png' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadPng}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG (1920×1080)</span>
                </button>
              </>
            )}

            {exportType === 'gif' && (
              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Animated GIF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
