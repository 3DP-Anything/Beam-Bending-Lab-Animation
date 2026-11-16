/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BeamAnalysisResult, BeamConfig, BeamProfileType, MaterialProperties, StressColormap } from '../types/beam';

export interface BeamShapeMeta {
  type: BeamProfileType;
  label: string;
  shortLabel: string;
  desc: string;
  color: string;
}

export const BEAM_SHAPE_ORDER: BeamProfileType[] = [
  'solid_rectangle',
  'i_beam',
  'solid_circle',
  'hollow_circle',
];

export const BEAM_SHAPE_META: Record<BeamProfileType, BeamShapeMeta> = {
  solid_rectangle: {
    type: 'solid_rectangle',
    label: 'Solid Rectangle',
    shortLabel: 'Rectangle',
    desc: 'Standard solid rectangular beam b × d',
    color: '#0284c7',
  },
  i_beam: {
    type: 'i_beam',
    label: 'I-Beam (Flanged)',
    shortLabel: 'I-Beam',
    desc: 'Universal I-section with flanges & web',
    color: '#7c3aed',
  },
  solid_circle: {
    type: 'solid_circle',
    label: 'Solid Circle',
    shortLabel: 'Circle',
    desc: 'Circular solid bar of diameter d',
    color: '#d97706',
  },
  hollow_circle: {
    type: 'hollow_circle',
    label: 'Circular Tube (CHS)',
    shortLabel: 'Tube',
    desc: 'Circular hollow section with wall t',
    color: '#e11d48',
  },
};

export function getOrderedActiveShapes(config: BeamConfig): BeamProfileType[] {
  const raw =
    config.activeShapes && config.activeShapes.length > 0
      ? config.activeShapes
      : [config.profileType || 'solid_rectangle'];
  const unique = Array.from(new Set(raw)).filter((s): s is BeamProfileType =>
    BEAM_SHAPE_ORDER.includes(s)
  );
  if (unique.length === 0) return ['solid_rectangle'];
  // Keep solid_rectangle as primary top beam whenever it is enabled, preserving canonical menu order
  return BEAM_SHAPE_ORDER.filter((s) => unique.includes(s));
}

export const PRESET_MATERIALS: MaterialProperties[] = [
  {
    id: 'mild_steel',
    name: 'Mild Steel (Structural Fe 410)',
    youngsModulus: 205, // GPa
    yieldStrength: 250, // MPa
    poissonsRatio: 0.30,
    density: 7850,
    color: '#334155',
  },
  {
    id: 'aluminum_6061',
    name: 'Aluminum Alloy (6061-T6)',
    youngsModulus: 68.9, // GPa
    yieldStrength: 276, // MPa
    poissonsRatio: 0.33,
    density: 2700,
    color: '#0284c7',
  },
  {
    id: 'brass_c360',
    name: 'Brass (Cartridge C360)',
    youngsModulus: 105, // GPa
    yieldStrength: 205, // MPa
    poissonsRatio: 0.34,
    density: 8500,
    color: '#d97706',
  },
  {
    id: 'copper_pure',
    name: 'Pure Copper (Electrolytic)',
    youngsModulus: 117, // GPa
    yieldStrength: 70, // MPa
    poissonsRatio: 0.35,
    density: 8940,
    color: '#b45309',
  },
  {
    id: 'titanium_gr5',
    name: 'Titanium (Grade 5 Ti-6Al-4V)',
    youngsModulus: 114, // GPa
    yieldStrength: 830, // MPa
    poissonsRatio: 0.32,
    density: 4430,
    color: '#64748b',
  },
  {
    id: 'stainless_304',
    name: 'Stainless Steel (AISI 304)',
    youngsModulus: 193, // GPa
    yieldStrength: 215, // MPa
    poissonsRatio: 0.29,
    density: 8000,
    color: '#475569',
  },
  {
    id: 'timber_pine',
    name: 'Structural Timber (European Pine)',
    youngsModulus: 11.0, // GPa
    yieldStrength: 24.0, // MPa
    poissonsRatio: 0.35,
    density: 520,
    color: '#ca8a04',
  },
  {
    id: 'acrylic_pmma',
    name: 'Acrylic / Plexiglas (PMMA)',
    youngsModulus: 3.2, // GPa
    yieldStrength: 70.0, // MPa
    poissonsRatio: 0.37,
    density: 1190,
    color: '#06b6d4',
  },
  {
    id: 'carbon_cfrp',
    name: 'Carbon Fiber Composite (CFRP)',
    youngsModulus: 150, // GPa
    yieldStrength: 600, // MPa
    poissonsRatio: 0.28,
    density: 1600,
    color: '#0f172a',
  },
];

export interface ProfileSectionProperties {
  areaM2: number;
  areaMm2: number;
  I_m4: number;
  I_mm4: number;
  yMaxM: number;
  yMaxMm: number;
  sectionModulusMm3: number;
}

/**
 * Calculates Second Moment of Area (I), Cross-Section Area (A), and extreme fiber distance (yMax)
 * for standard engineering cross-section profiles.
 */
export function computeProfileProperties(config: BeamConfig): ProfileSectionProperties {
  const pType = config.profileType || 'solid_rectangle';
  const b = Math.max(1, config.widthMm);
  const d = Math.max(1, config.thicknessMm);
  const tw = Math.max(0.2, config.wallThicknessMm || 1);
  const tf = Math.max(0.2, config.flangeThicknessMm || 1);
  const tw_web = Math.max(0.2, config.webThicknessMm || 1);

  let areaMm2 = b * d;
  let I_mm4 = (b * Math.pow(d, 3)) / 12;
  let yMaxMm = d / 2;

  switch (pType) {
    case 'i_beam': {
      const actual_tf = Math.min(d / 3, tf);
      const actual_tw = Math.min(b / 2.5, tw_web);
      const hw = Math.max(0.1, d - 2 * actual_tf);
      areaMm2 = 2 * b * actual_tf + hw * actual_tw;
      I_mm4 = (b * Math.pow(d, 3) - (b - actual_tw) * Math.pow(hw, 3)) / 12;
      yMaxMm = d / 2;
      break;
    }
    case 'solid_circle': {
      const D = d; // use d as diameter
      areaMm2 = (Math.PI * Math.pow(D, 2)) / 4;
      I_mm4 = (Math.PI * Math.pow(D, 4)) / 64;
      yMaxMm = D / 2;
      break;
    }
    case 'hollow_circle': {
      const D = d;
      const t = Math.min(D / 2.5, tw);
      const Din = Math.max(0.1, D - 2 * t);
      areaMm2 = (Math.PI * (Math.pow(D, 2) - Math.pow(Din, 2))) / 4;
      I_mm4 = (Math.PI * (Math.pow(D, 4) - Math.pow(Din, 4))) / 64;
      yMaxMm = D / 2;
      break;
    }
    case 'solid_rectangle':
    default: {
      areaMm2 = b * d;
      I_mm4 = (b * Math.pow(d, 3)) / 12;
      yMaxMm = d / 2;
      break;
    }
  }

  const safeI_mm4 = Math.max(0.01, I_mm4);
  const safeAreaMm2 = Math.max(0.1, areaMm2);
  const safeYMaxMm = Math.max(0.1, yMaxMm);

  return {
    areaMm2: safeAreaMm2,
    areaM2: safeAreaMm2 * 1e-6,
    I_mm4: safeI_mm4,
    I_m4: safeI_mm4 * 1e-12,
    yMaxMm: safeYMaxMm,
    yMaxM: safeYMaxMm * 1e-3,
    sectionModulusMm3: safeI_mm4 / safeYMaxMm,
  };
}

/**
 * Computes new width (b) and height/thickness (d) for a given aspect ratio r = d / b
 * while keeping the cross-sectional area constant.
 */
export function solveDimensionsForAspectRatio(
  config: BeamConfig,
  targetRatio: number,
  targetAreaMm2: number
): { widthMm: number; thicknessMm: number } {
  const safeRatio = Math.max(0.1, Math.min(10, targetRatio));
  const safeArea = Math.max(4, targetAreaMm2);
  const pType = config.profileType || 'solid_rectangle';

  if (pType === 'solid_rectangle') {
    const b = Math.sqrt(safeArea / safeRatio);
    const d = safeRatio * b;
    return {
      widthMm: Math.round(b * 100) / 100,
      thicknessMm: Math.round(d * 100) / 100,
    };
  }

  if (pType === 'solid_circle' || pType === 'hollow_circle') {
    return {
      widthMm: config.widthMm,
      thicknessMm: config.thicknessMm,
    };
  }

  let lo = 1.0;
  let hi = 400.0;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    const area = computeProfileProperties({
      ...config,
      widthMm: mid,
      thicknessMm: mid * safeRatio,
    }).areaMm2;
    if (area < safeArea) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const bestB = (lo + hi) / 2;
  const bestD = bestB * safeRatio;
  return {
    widthMm: Math.round(bestB * 100) / 100,
    thicknessMm: Math.round(bestD * 100) / 100,
  };
}

/**
 * Returns a BeamConfig for targetShape whose cross-sectional area matches
 * the rectangular reference beam (widthMm * thicknessMm).
 * Circular profiles depend only on area and wall thickness, so their diameter
 * remains constant when the rectangular aspect-ratio slider moves.
 */
export function getMatchedAreaShapeConfig(
  rectConfig: BeamConfig,
  targetShape: BeamProfileType
): BeamConfig {
  const targetAreaMm2 = Math.max(
    1,
    Math.max(1, rectConfig.widthMm) * Math.max(1, rectConfig.thicknessMm)
  );
  const wallT = Math.max(0.2, rectConfig.wallThicknessMm || 1);
  const flangeT = Math.max(0.2, rectConfig.flangeThicknessMm || 1);
  const webT = Math.max(0.2, rectConfig.webThicknessMm || 1);

  if (targetShape === 'solid_rectangle') {
    return {
      ...rectConfig,
      profileType: 'solid_rectangle',
      wallThicknessMm: wallT,
      flangeThicknessMm: flangeT,
      webThicknessMm: webT,
    };
  }

  if (targetShape === 'solid_circle') {
    const D = Math.sqrt((4 * targetAreaMm2) / Math.PI);
    const roundedD = Math.round(D * 100) / 100;
    return {
      ...rectConfig,
      profileType: 'solid_circle',
      widthMm: roundedD,
      thicknessMm: roundedD,
      wallThicknessMm: wallT,
      flangeThicknessMm: flangeT,
      webThicknessMm: webT,
    };
  }

  if (targetShape === 'hollow_circle') {
    let lo = 1.0;
    let hi = Math.max(600, targetAreaMm2 / (Math.PI * 0.2) + 20);
    for (let i = 0; i < 44; i++) {
      const mid = (lo + hi) / 2;
      const area = computeProfileProperties({
        ...rectConfig,
        profileType: 'hollow_circle',
        widthMm: mid,
        thicknessMm: mid,
        wallThicknessMm: wallT,
      }).areaMm2;
      if (area < targetAreaMm2) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const bestD = Math.round(((lo + hi) / 2) * 100) / 100;
    return {
      ...rectConfig,
      profileType: 'hollow_circle',
      widthMm: bestD,
      thicknessMm: bestD,
      wallThicknessMm: wallT,
      flangeThicknessMm: flangeT,
      webThicknessMm: webT,
    };
  }

  // Remaining profile: i_beam (keep b/d equal to rectangular beam's b/d and solve for equal area)
  const rectB = Math.max(1, rectConfig.widthMm);
  const rectD = Math.max(1, rectConfig.thicknessMm);
  const targetRatio = rectD / rectB; // d / b === rectD / rectB  <=>  b / d === rectB / rectD
  let lo = 0.5;
  const minThickness = Math.min(flangeT, webT);
  let hi = Math.max(
    1000,
    (targetAreaMm2 / Math.max(0.2, minThickness)) * Math.max(1, 1 / Math.max(0.05, targetRatio)) + 100
  );
  for (let i = 0; i < 48; i++) {
    const midB = (lo + hi) / 2;
    const area = computeProfileProperties({
      ...rectConfig,
      profileType: 'i_beam',
      widthMm: midB,
      thicknessMm: midB * targetRatio,
      wallThicknessMm: wallT,
      flangeThicknessMm: flangeT,
      webThicknessMm: webT,
    }).areaMm2;
    if (area < targetAreaMm2) {
      lo = midB;
    } else {
      hi = midB;
    }
  }
  const bestB = (lo + hi) / 2;
  const bestD = bestB * targetRatio;
  return {
    ...rectConfig,
    profileType: 'i_beam',
    widthMm: Math.round(bestB * 100) / 100,
    thicknessMm: Math.round(bestD * 100) / 100,
    wallThicknessMm: wallT,
    flangeThicknessMm: flangeT,
    webThicknessMm: webT,
  };
}

/**
 * Calculates structural analysis metrics for both Bending and Tension tests.
 */
export function analyzeBeam(config: BeamConfig): BeamAnalysisResult {
  const L = config.lengthMm / 1000;      // m
  const W_N = config.loadN;              // N
  const W_max_N = Math.max(0.1, config.maxLoadN);
  const E_Pa = config.material.youngsModulus * 1e9; // Pa
  const nu = config.material.poissonsRatio;

  // Profile properties: Second Moment of Area (I), Area (A), yMax
  const props = computeProfileProperties(config);
  const { I_m4, I_mm4, areaM2, areaMm2, yMaxM, yMaxMm, sectionModulusMm3 } = props;

  const isTension = config.testType === 'tension';

  // --- BENDING TEST ---
  // Theoretical maximum bending moment for 3-point bending: M_max = W * L / 4
  const maxBendingMomentNm = (Math.abs(W_N) * L) / 4;
  const refBendingMomentNm = (Math.abs(W_max_N) * L) / 4;
  const maxDeflectionM = (W_N * Math.pow(L, 3)) / (48 * E_Pa * I_m4);
  const maxDeflectionMm = maxDeflectionM * 1000;

  // Mechanical moment for stress and strain (verified correct by user)
  const mechBendingMomentNm = (Math.abs(W_N) * L) / 4;
  const refMechBendingMomentNm = (Math.abs(W_max_N) * L) / 4;
  const maxNormalStressPa = (mechBendingMomentNm * yMaxM) / I_m4;
  const maxNormalStressMpa = maxNormalStressPa / 1e6;

  // Reference bending stress under max load (pure applied load: reaches 100% at W = W_max)
  const refBendingStressPa = (refMechBendingMomentNm * yMaxM) / I_m4;

  // --- TENSION TEST ---
  const axialStressPa = W_N / areaM2;
  const axialStressMpa = axialStressPa / 1e6;
  const axialStrain = axialStressPa / E_Pa;
  const axialStrainMicro = axialStrain * 1e6;
  const axialElongationM = (W_N * L) / (areaM2 * E_Pa);
  const axialElongationMm = axialElongationM * 1000;
  const lateralContractionMm = -nu * axialStrain * (config.thicknessMm || 6);

  const refTensileStressPa = W_max_N / areaM2;
  const effectiveRefStressPa = isTension ? refTensileStressPa : refBendingStressPa;
  const refNormalStressMpa = Math.max(1e-6, effectiveRefStressPa / 1e6);

  // Strain in microstrain (\mu\epsilon = \epsilon * 10^6)
  const maxNormalStrain = isTension ? axialStrain : maxNormalStressPa / E_Pa;
  const maxNormalStrainMicro = maxNormalStrain * 1e6;
  const refNormalStrain = effectiveRefStressPa / E_Pa;
  const refNormalStrainMicro = Math.max(1e-6, refNormalStrain * 1e6);

  // Transverse shear stress at neutral axis
  const maxShearStressPa = (3 * (Math.abs(W_N) / 2)) / (2 * areaM2);
  const maxShearStressMpa = maxShearStressPa / 1e6;

  const leftReactionN = W_N / 2;
  const rightReactionN = W_N / 2;

  const currentPeakStressMpa = isTension ? axialStressMpa : maxNormalStressMpa;
  const yieldRatio = currentPeakStressMpa / config.material.yieldStrength;
  const isYielding = yieldRatio >= 1.0;

  return {
    maxDeflectionMm,
    maxBendingMomentNm,
    refBendingMomentNm,
    maxNormalStressMpa,
    refNormalStressMpa,
    maxNormalStrainMicro,
    refNormalStrainMicro,
    maxShearStressMpa,
    leftReactionN,
    rightReactionN,
    secondMomentOfAreaMm4: I_mm4,
    secondMomentOfAreaM4: I_m4,
    momentOfInertiaMm4: I_mm4, // Backwards compatible alias
    crossSectionAreaMm2: areaMm2,
    yMaxMm,
    sectionModulusMm3,
    yieldRatio,
    isYielding,
    axialStressMpa,
    axialStrainMicro,
    axialElongationMm,
    lateralContractionMm,
  };
}

/**
 * Calculates deflection delta(x) in meters for beam bending
 */
export function getDeflectionAt(xM: number, config: BeamConfig): number {
  const L = config.lengthMm / 1000;
  const W_N = config.loadN;
  const E_Pa = config.material.youngsModulus * 1e9;
  const { I_m4 } = computeProfileProperties(config);

  const clampedX = Math.max(0, Math.min(L, xM));
  const xi = clampedX <= L / 2 ? clampedX : L - clampedX;

  return (W_N * xi * (3 * L * L - 4 * xi * xi)) / (48 * E_Pa * I_m4);
}

/**
 * Calculates slope theta(x) = d(delta)/dx
 */
export function getSlopeAt(xM: number, config: BeamConfig): number {
  const L = config.lengthMm / 1000;
  const W_N = config.loadN;
  const E_Pa = config.material.youngsModulus * 1e9;
  const { I_m4 } = computeProfileProperties(config);

  const clampedX = Math.max(0, Math.min(L, xM));

  if (clampedX <= L / 2) {
    return (W_N / (16 * E_Pa * I_m4)) * (L * L - 4 * clampedX * clampedX);
  } else {
    const xi = L - clampedX;
    return -((W_N / (16 * E_Pa * I_m4)) * (L * L - 4 * xi * xi));
  }
}

/**
 * Bending moment M(x) in N*m. Exactly 0 at W = 0 N!
 */
export function getBendingMomentAt(xM: number, config: BeamConfig): number {
  const L = config.lengthMm / 1000;
  const W_N = config.loadN;
  if (Math.abs(W_N) < 1e-6) return 0;

  const clampedX = Math.max(0, Math.min(L, xM));

  if (clampedX <= L / 2) {
    return (W_N / 2) * clampedX;
  } else {
    return (W_N / 2) * (L - clampedX);
  }
}

/**
 * Normal bending stress sigma(x, y) in MPa.
 */
export function getNormalStressAt(xM: number, yM: number, config: BeamConfig): number {
  const { I_m4 } = computeProfileProperties(config);
  const M_Nm = getBendingMomentAt(xM, config);

  const sigmaPa = -(M_Nm * yM) / I_m4;
  return sigmaPa / 1e6; // in MPa
}

/**
 * Normal bending strain epsilon(x, y) in microstrain (\mu\epsilon)
 */
export function getNormalStrainAt(xM: number, yM: number, config: BeamConfig): number {
  const sigmaMpa = getNormalStressAt(xM, yM, config);
  const E_GPa = config.material.youngsModulus;
  return (sigmaMpa / E_GPa) * 1000;
}

/**
 * Shear stress tau(x, y) in MPa.
 */
export function getShearStressAt(xM: number, yM: number, config: BeamConfig): number {
  const L = config.lengthMm / 1000;
  const d = config.thicknessMm / 1000;
  const { areaM2 } = computeProfileProperties(config);
  const W_N = config.loadN;
  const clampedX = Math.max(0, Math.min(L, xM));

  let V_N = 0;
  if (clampedX < L / 2) V_N = W_N / 2;
  else if (clampedX > L / 2) V_N = -W_N / 2;

  const tauPa = ((3 * V_N) / (2 * areaM2)) * (1 - (4 * yM * yM) / (d * d));
  return tauPa / 1e6; // in MPa
}

/**
 * Von Mises equivalent stress in MPa:
 */
export function getVonMisesStressAt(xM: number, yM: number, config: BeamConfig): number {
  const sigma = getNormalStressAt(xM, yM, config);
  const tau = getShearStressAt(xM, yM, config);
  return Math.sqrt(sigma * sigma + 3 * tau * tau);
}

// -------------------------------------------------------------
// Colormaps for FEA Visualization
// -------------------------------------------------------------

export function interpolateColor(
  c1: [number, number, number],
  c2: [number, number, number],
  factor: number
): [number, number, number] {
  const f = Math.max(0, Math.min(1, factor));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * f),
    Math.round(c1[1] + (c2[1] - c1[1]) * f),
    Math.round(c1[2] + (c2[2] - c1[2]) * f),
  ];
}

/**
 * Maps normalized value t in [0, 1] to RGB color string.
 */
export function getStressColor(
  value: number,
  fixedRefMax: number,
  colormap: StressColormap,
  signedValue: number = 0
): string {
  const safeMax = Math.max(1e-6, fixedRefMax);

  if (colormap === 'tension_compression') {
    let norm = Math.max(-1, Math.min(1, signedValue / safeMax));
    if (norm > 0.999) norm = 1.0;
    if (norm < -0.999) norm = -1.0;

    if (norm < 0) {
      const f = 1 + norm;
      const rgb = interpolateColor([30, 64, 175], [241, 245, 249], f);
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    } else {
      const f = norm;
      const rgb = interpolateColor([241, 245, 249], [220, 38, 38], f);
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }

  let t = Math.max(0, Math.min(1, value / safeMax));
  if (t > 0.999) t = 1.0;

  if (colormap === 'monochrome') {
    const l = Math.round(240 - t * 190);
    return `rgb(${l}, ${l}, ${l})`;
  }

  if (colormap === 'turbo') {
    const r = Math.sin(t * Math.PI - 0.2) * 128 + 127;
    const g = Math.sin(t * Math.PI * 1.5 - 0.5) * 120 + 120;
    const b = Math.cos(t * Math.PI * 0.8) * 130 + 120;
    return `rgb(${Math.max(0, Math.min(255, Math.round(r)))}, ${Math.max(0, Math.min(255, Math.round(g)))}, ${Math.max(0, Math.min(255, Math.round(b)))})`;
  }

  // Default: Classic FEA Rainbow
  const stops: { pos: number; color: [number, number, number] }[] = [
    { pos: 0.0, color: [30, 58, 138] },   // Navy
    { pos: 0.2, color: [14, 165, 233] },  // Sky cyan
    { pos: 0.4, color: [16, 185, 129] },  // Green
    { pos: 0.65, color: [234, 179, 8] },  // Amber/Yellow
    { pos: 0.85, color: [249, 115, 22] }, // Orange
    { pos: 1.0, color: [225, 29, 72] },   // Red
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const localFactor = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      const rgb = interpolateColor(stops[i].color, stops[i + 1].color, localFactor);
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }

  return 'rgb(225, 29, 72)';
}
