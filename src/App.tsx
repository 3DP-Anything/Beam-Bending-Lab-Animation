/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
} from 'lucide-react';
import { BeamConfig } from './types/beam';
import { PRESET_MATERIALS, analyzeBeam } from './utils/beamPhysics';
import { BeamCanvas } from './components/BeamCanvas';
import { SpecimenSettingsModal } from './components/SpecimenSettingsModal';
import { ViewSideMenu } from './components/ViewSideMenu';
import { ExportGraphModal } from './components/ExportGraphModal';
import { TopBar } from './components/TopBar';

const INITIAL_CONFIG: BeamConfig = {
  testType: 'bending',      // Default: 'bending'
  visualizeMode: 'geometry',  // Default: 'geometry'
  scaleReferenceMode: 'material_yield',
  profileType: 'solid_rectangle', // Default: solid rectangle
  lengthMm: 400,            // L = 400 mm
  widthMm: 20,              // b = 20 mm
  thicknessMm: 6,           // d = 6 mm
  wallThicknessMm: 1.5,     // t_w = 1.5 mm
  flangeThicknessMm: 1.5,   // t_f = 1.5 mm
  webThicknessMm: 1.5,      // t_w = 1.5 mm
  loadN: 0,                 // Default 0 N (No load on opening)
  maxLoadN: 14.0,           // Default max load = 14 N
  loadStepN: 1.0,           // Default load step = 1 N
  material: PRESET_MATERIALS[0], // Default: Mild Steel
  scaleFactor: 15,          // Visual amplification
  colormap: 'tension_compression',
  crossSectionPlaneX: 100,  // Movable plane position at x = 100 mm
  showCrossSectionVectors: false,
  vectorScale: 1.5,
  invertVectorDirection: false,
  showMomentOnGraph: false,
  showNeutralAxis: false,
  showOriginalOutline: false,
  showDimensionLines: false,
  showDeflection: false,
  showReactions: false,
  showLeftView: true,
  showCoordinateSystem: true,
  showMomentDiagram: false,
  showShearDiagram: false,
  showCrossSectionProfile: false,
};

export default function App() {
  const [config, setConfig] = useState<BeamConfig>(INITIAL_CONFIG);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [cycleSpeed, setCycleSpeed] = useState<number>(1.0);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const animationFrameRef = useRef<number | null>(null);
  const animDirectionRef = useRef<number>(1);
  const animLastStepTimeRef = useRef<number>(0);

  // Enforce clean light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleConfigChange = useCallback((updated: Partial<BeamConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      if (updated.lengthMm !== undefined && next.crossSectionPlaneX > updated.lengthMm) {
        next.crossSectionPlaneX = updated.lengthMm;
      }
      return next;
    });
  }, []);

  // Stepped Auto-Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const stepIntervalMs = Math.max(50, 220 / cycleSpeed);

    const animate = (timestamp: number) => {
      if (timestamp - animLastStepTimeRef.current >= stepIntervalMs) {
        animLastStepTimeRef.current = timestamp;

        setConfig((prev) => {
          const step = prev.loadStepN || 1;
          const maxLoad = prev.maxLoadN;
          let nextLoad = prev.loadN + animDirectionRef.current * step;

          if (nextLoad >= maxLoad) {
            nextLoad = maxLoad;
            animDirectionRef.current = -1;
          } else if (nextLoad <= 0) {
            nextLoad = 0;
            animDirectionRef.current = 1;
          }

          nextLoad = Math.max(0, Math.min(maxLoad, Math.round(nextLoad * 100) / 100));
          return { ...prev, loadN: nextLoad };
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, cycleSpeed]);

  const analysis = analyzeBeam(config);
  const isBending = config.testType === 'bending';
  const isStrain = config.visualizeMode === 'strain';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Bar with 'Beam Bending Lab' title, Settings, and Export Graph */}
      <TopBar
        config={config}
        onChange={handleConfigChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Graphic Window - Only window visible below top bar, fully expanded */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-white">
        <BeamCanvas
          config={config}
          theme="white"
          interactive={true}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onLoadChange={(newLoad) => handleConfigChange({ loadN: newLoad })}
          onPlaneChange={(newPlaneX) => handleConfigChange({ crossSectionPlaneX: newPlaneX })}
          onChange={handleConfigChange}
        />

        {/* View Options Side Menu directly within the main window */}
        <ViewSideMenu
          config={config}
          analysis={analysis}
          onChange={handleConfigChange}
        />
      </main>

      {/* Specimen & Material Settings Modal with Integrated Lab Controls (Opened from Top Bar Settings Button) */}
      <SpecimenSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        analysis={analysis}
        onChange={handleConfigChange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReset={() => handleConfigChange({ loadN: 0 })}
        cycleSpeed={cycleSpeed}
        onCycleSpeedChange={setCycleSpeed}
      />

      {/* Export Graph Modal (SVG, PNG, GIF with Scale & Active Options) */}
      <ExportGraphModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        config={config}
      />
    </div>
  );
}
