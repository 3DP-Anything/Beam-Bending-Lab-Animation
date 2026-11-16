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
import {
  BEAM_SHAPE_META,
  PRESET_MATERIALS,
  analyzeBeam,
  getMatchedAreaShapeConfig,
  getOrderedActiveShapes,
} from './utils/beamPhysics';
import { BeamCanvas } from './components/BeamCanvas';
import { SpecimenSettingsModal } from './components/SpecimenSettingsModal';
import { ViewSideMenu } from './components/ViewSideMenu';
import { BeamShapeMenu } from './components/BeamShapeMenu';
import { AnalysisModeMenu } from './components/AnalysisModeMenu';
import { BeamGraphsPanel } from './components/BeamGraphsPanel';
import { ExportGraphModal } from './components/ExportGraphModal';
import { TopBar } from './components/TopBar';

const INITIAL_CONFIG: BeamConfig = {
  testType: 'bending',      // Default: 'bending'
  visualizeMode: 'geometry',  // Default: 'geometry'
  scaleReferenceMode: 'material_yield',
  profileType: 'solid_rectangle', // Default: solid rectangle
  activeShapes: ['solid_rectangle'],
  lengthMm: 400,            // L = 400 mm
  widthMm: 20,              // b = 20 mm
  thicknessMm: 6,           // d = 6 mm
  wallThicknessMm: 1,       // t_w = 1 mm
  flangeThicknessMm: 1,     // t_f = 1 mm
  webThicknessMm: 1,        // t_w = 1 mm
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
  showInertia: false,
  showCoordinateSystem: true,
  showStressStrainGraph: false,
  showLoadDeflectionGraph: false,
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

  const orderedShapes = getOrderedActiveShapes(config);
  const primaryShape = orderedShapes[0];
  const secondaryShapes = orderedShapes.slice(1);
  const isMultiShape = orderedShapes.length > 1;
  const primaryConfig: BeamConfig = getMatchedAreaShapeConfig(config, primaryShape);
  const analysis = analyzeBeam(primaryConfig);
  const rectRefAnalysis =
    primaryShape === 'solid_rectangle'
      ? analysis
      : analyzeBeam(getMatchedAreaShapeConfig(config, 'solid_rectangle'));
  const hasAnyGraph = !!(config.showStressStrainGraph || config.showLoadDeflectionGraph);
  const shouldScrollMain = hasAnyGraph || isMultiShape;
  const isGeometry = config.visualizeMode === 'geometry';
  const hasMomentOverlay = config.testType === 'bending' && !!config.showMomentOnGraph;
  const primaryHeightPx = hasMomentOverlay
    ? isGeometry
      ? 425
      : 480
    : isGeometry
      ? 365
      : 405;
  const compactDiagramHeightClass = hasMomentOverlay
    ? isGeometry
      ? 'shrink-0 h-[425px]'
      : 'shrink-0 h-[480px]'
    : isGeometry
      ? 'shrink-0 h-[365px]'
      : 'shrink-0 h-[405px]';
  const comparisonRowHeightClass = hasMomentOverlay
    ? 'shrink-0 h-[355px]'
    : 'shrink-0 h-[305px]';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Bar with 'EN1213-14 Beam Bending Lab' title, Settings, and Export Graph */}
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Horizontal Analysis Mode & Colour Scale Menu directly below the Top Bar */}
      <AnalysisModeMenu
        config={primaryConfig}
        onChange={handleConfigChange}
      />

      {/* Horizontal View Options Bar directly below the Analysis Menu */}
      <ViewSideMenu
        config={primaryConfig}
        analysis={analysis}
        onChange={handleConfigChange}
      />

      {/* Horizontal Beam Shape Selection Menu directly below the View Menu */}
      <BeamShapeMenu
        config={config}
        onChange={handleConfigChange}
      />

      {/* Main Graphic Window - Primary Beam + Optional Secondary Shapes + Response Graphs */}
      <main
        className={`flex-1 w-full bg-white flex flex-col ${
          shouldScrollMain ? 'overflow-y-auto' : 'h-full overflow-hidden'
        }`}
      >
        {/* Primary Beam (Default: Solid Rectangle) */}
        <div
          className={`relative w-full overflow-hidden ${
            shouldScrollMain ? compactDiagramHeightClass : 'flex-1 h-full'
          }`}
        >
          <BeamCanvas
            config={primaryConfig}
            theme="white"
            interactive={true}
            shapeBadge={
              isMultiShape
                ? {
                    label: BEAM_SHAPE_META[primaryShape].label,
                    color: BEAM_SHAPE_META[primaryShape].color,
                  }
                : undefined
            }
            referenceHeight={isMultiShape ? primaryHeightPx : undefined}
            refMaxStressMpa={rectRefAnalysis.refNormalStressMpa}
            refMaxStrainMicro={rectRefAnalysis.refNormalStrainMicro}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onLoadChange={(newLoad) => handleConfigChange({ loadN: newLoad })}
            onPlaneChange={(newPlaneX) => handleConfigChange({ crossSectionPlaneX: newPlaneX })}
            onChange={handleConfigChange}
          />
        </div>

        {/* Additional Selected Beam Shapes Displayed Below Original Beam */}
        {secondaryShapes.map((shape) => {
          const shapeConfig: BeamConfig = getMatchedAreaShapeConfig(config, shape);
          const meta = BEAM_SHAPE_META[shape];
          return (
            <div
              key={`comparison-beam-${shape}`}
              className={`relative w-full overflow-hidden border-t border-slate-200 ${comparisonRowHeightClass}`}
            >
              <BeamCanvas
                config={shapeConfig}
                theme="white"
                interactive={true}
                isComparison={true}
                shapeBadge={{ label: meta.label, color: meta.color }}
                referenceHeight={primaryHeightPx}
                refMaxStressMpa={rectRefAnalysis.refNormalStressMpa}
                refMaxStrainMicro={rectRefAnalysis.refNormalStrainMicro}
                onPlaneChange={(newPlaneX) => handleConfigChange({ crossSectionPlaneX: newPlaneX })}
              />
            </div>
          );
        })}

        {/* Stress vs Strain and/or Load vs Deflection Graphs below the diagrams */}
        {hasAnyGraph && (
          <BeamGraphsPanel
            config={config}
            analysis={analysis}
          />
        )}
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
