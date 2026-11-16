/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StressColormap = 'vonmises' | 'tension_compression' | 'turbo' | 'monochrome';
export type TestType = 'bending' | 'tension';
export type VisualizeMode = 'stress' | 'strain' | 'geometry';
export type ScaleReferenceMode = 'material_yield' | 'max_load';
export type BeamProfileType =
  | 'solid_rectangle'
  | 'i_beam'
  | 'solid_circle'
  | 'hollow_circle';

export interface MaterialProperties {
  id: string;
  name: string;
  youngsModulus: number; // in GPa (e.g. 205 for mild steel)
  yieldStrength: number;  // in MPa (e.g. 250 for mild steel)
  poissonsRatio: number; // e.g. 0.30 for steel
  density: number;        // in kg/m^3
  color: string;
}

export interface BeamConfig {
  testType: TestType;             // 'bending' or 'tension'
  visualizeMode: VisualizeMode;   // 'stress' or 'strain'
  scaleReferenceMode: ScaleReferenceMode; // 'material_yield' (adapts to material) or 'max_load'
  profileType: BeamProfileType;   // Cross-section profile geometry
  activeShapes?: BeamProfileType[]; // Active beam shapes displayed & compared (default: ['solid_rectangle'])
  lengthMm: number;               // L: Length in mm (default: 400 mm)
  widthMm: number;                // b: Width / outer width in mm (default: 20 mm)
  thicknessMm: number;            // d: Thickness / total depth / outer diameter in mm (default: 6 mm)
  wallThicknessMm: number;        // t_w: Wall thickness for hollow sections (default: 1.5 mm)
  flangeThicknessMm: number;      // t_f: Flange thickness for I/T sections (default: 1.5 mm)
  webThicknessMm: number;         // t_w: Web thickness for I/T sections (default: 1.5 mm)
  loadN: number;                  // W: Current load in N (default: 0 N)
  maxLoadN: number;               // W_max: Maximum load in N (default: 14 N)
  loadStepN: number;              // Step value for load in N (default: 1 N)
  material: MaterialProperties;
  scaleFactor: number;            // Visual amplification multiplier
  colormap: StressColormap;
  crossSectionPlaneX: number;     // Position x in mm of movable plane (default: 100 mm)
  showCrossSectionVectors: boolean; // Display stress/strain vectors along the plane
  vectorScale: number;            // Multiplier for vector length (default: 1.5)
  invertVectorDirection: boolean;  // Invert arrow orientation
  showMomentOnGraph: boolean;     // Visualize bending moment curve directly on the canvas graph!
  showNeutralAxis: boolean;
  showOriginalOutline: boolean;
  showDimensionLines: boolean;    // Display beam length (L) and height (d)
  showDeflection: boolean;        // Display beam deflection (delta)
  showReactions: boolean;
  showLeftView?: boolean;         // 1st angle projection Left View cross section
  showInertia?: boolean;          // Display Second Moment of Area (I) value in m^4
  showCoordinateSystem?: boolean; // Cartesian (x, y) coordinate system triad at origin Point A
  showStressStrainGraph?: boolean;   // Stress vs Strain graph below diagram
  showLoadDeflectionGraph?: boolean; // Load vs Deflection graph below diagram
  showMomentDiagram: boolean;
  showShearDiagram: boolean;
  showCrossSectionProfile: boolean;
}

export interface BeamAnalysisResult {
  // Bending values
  maxDeflectionMm: number;      // mm
  maxBendingMomentNm: number;   // N*m
  refBendingMomentNm: number;   // N*m under maxLoad
  maxNormalStressMpa: number;   // MPa (at current load W)
  refNormalStressMpa: number;   // MPa (for the scale bar, reaches max at max load)
  maxNormalStrainMicro: number; // microstrain (\mu\epsilon = \Delta L / L * 10^6)
  refNormalStrainMicro: number; // microstrain for strain scale bar
  maxShearStressMpa: number;    // MPa
  leftReactionN: number;        // N
  rightReactionN: number;       // N
  secondMomentOfAreaMm4: number; // Second Moment of Area (I) in mm^4
  secondMomentOfAreaM4: number;  // Second Moment of Area (I) in m^4
  momentOfInertiaMm4: number;   // Alias for backwards compatibility
  crossSectionAreaMm2: number;  // Cross-sectional Area in mm^2
  yMaxMm: number;               // Distance from neutral axis to extreme fiber in mm
  sectionModulusMm3: number;    // Z = I / yMax in mm^3
  yieldRatio: number;           // maxNormalStress / yieldStrength
  isYielding: boolean;

  // Tension Test values
  axialStressMpa: number;       // \sigma = W / A
  axialStrainMicro: number;     // \epsilon = \sigma / E in \mu\epsilon
  axialElongationMm: number;    // \Delta L = (W * L) / (A * E) in mm
  lateralContractionMm: number; // \Delta d = -\nu * \epsilon * d in mm
}

export type PresentationAspectRatio = '16:9' | '4:3' | 'fullscreen';
export type SlideTheme = 'white' | 'dark' | 'transparent';
