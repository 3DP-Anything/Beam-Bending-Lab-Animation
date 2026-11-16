/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BeamAnalysisResult, BeamConfig } from '../types/beam';
import {
  getDeflectionAt,
  getNormalStrainAt,
  getNormalStressAt,
  getSlopeAt,
  getStressColor,
  getVonMisesStressAt,
} from './beamPhysics';

/**
 * Generates a complete, publication-quality, standalone SVG of the beam simulation.
 * Includes all active visual options: beam deformation, mesh colors, supports,
 * reactions, applied load, deflection callout, cross-section plane & vectors,
 * (x,y) coordinates, and the complete stress/strain scale with cursor.
 */
export function generateBeamSvg(
  config: BeamConfig,
  analysis: BeamAnalysisResult,
  width = 960,
  height = 540,
  rectRefAnalysis?: BeamAnalysisResult
): string {
  const isBending = config.testType === 'bending';
  const isStrain = config.visualizeMode === 'strain';
  const scaleRef = rectRefAnalysis ?? analysis;
  const fixedRefMax = isStrain ? scaleRef.refNormalStrainMicro : scaleRef.refNormalStressMpa;

  const L_m = config.lengthMm / 1000;
  const d_m = config.thicknessMm / 1000;

  const originX = Math.max(225, Math.min(275, width * 0.26));

  const tensionRightReserved = Math.max(210, width * 0.26);
  const rightMargin = isBending ? Math.max(120, width * 0.13) : tensionRightReserved;
  const beamDrawLength = Math.max(160, width - originX - rightMargin);

  const beamCenterY = height * 0.34;
  const beamDrawThickness = Math.max(24, Math.min(64, height * 0.09));

  const originY = beamCenterY;
  const fixedPointAY = originY + beamDrawThickness / 2;
  const fixedPointAX = originX;

  const undefTopY = originY - beamDrawThickness / 2;
  const undefBotY = originY + beamDrawThickness / 2;

  let elementsSvg = '';
  let lowestCenterObstructionY = fixedPointAY + 28;
  let momentBottomLimit = fixedPointAY;

  // 1. Background
  elementsSvg += `
    <rect width="${width}" height="${height}" fill="#ffffff" />
  `;

  // 2. Graphic window title & permanent display window in top-left
  const testName = isBending ? '3-Point Bending Test' : 'Uniaxial Tension Test';
  const modeStr = config.visualizeMode === 'geometry' ? 'Geometry' : (isStrain ? 'Strain (ε)' : 'Stress (σ)');
  const matName = config.material.name.split(' (')[0];
  const pType = config.profileType || 'solid_rectangle';
  const isCircShape = pType === 'solid_circle' || pType === 'hollow_circle';
  const dimsStr = isCircShape
    ? `${config.lengthMm} mm × Ø${parseFloat(config.thicknessMm.toFixed(2))} mm${pType === 'hollow_circle' ? ` (t=${parseFloat((config.wallThicknessMm || 1).toFixed(2))}mm)` : ''}`
    : `${config.lengthMm} × ${parseFloat(config.widthMm.toFixed(1))} × ${parseFloat(config.thicknessMm.toFixed(1))} mm`;

  elementsSvg += `
    <!-- Graphic Window Title -->
    <g font-family="system-ui, -apple-system, sans-serif" font-size="11">
      <text x="14" y="23" font-weight="bold" fill="#475569" letter-spacing="0.5">${testName.toUpperCase()}</text>
      <text x="${14 + (isBending ? 146 : 152)}" y="23" fill="#94a3b8">·</text>
      <text x="${14 + (isBending ? 156 : 162)}" y="23" font-weight="500" fill="#64748b">${matName} (${dimsStr}) · ${modeStr}</text>
    </g>

    <!-- Table displaying (x, y, σ, ε, M) values -->
    <g font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">
      <rect x="14" y="32" width="492" height="26" rx="6" fill="rgba(255,255,255,0.95)" stroke="#cbd5e1" stroke-width="1" />
      <text x="24" y="49" fill="#64748b">X: <tspan fill="#0f172a">—</tspan></text>
      <text x="110" y="49" fill="#64748b">Y: <tspan fill="#0f172a">—</tspan></text>
      <line x1="186" y1="36" x2="186" y2="54" stroke="#e2e8f0" stroke-width="1" />
      <text x="196" y="49" fill="#0284c7">σ: <tspan fill="#0f172a">—</tspan></text>
      <line x1="298" y1="36" x2="298" y2="54" stroke="#e2e8f0" stroke-width="1" />
      <text x="308" y="49" fill="#7c3aed">ε: <tspan fill="#0f172a">—</tspan></text>
      <line x1="406" y1="36" x2="406" y2="54" stroke="#e2e8f0" stroke-width="1" />
      <text x="416" y="49" fill="#d97706">M: <tspan fill="#0f172a">—</tspan></text>
    </g>
  `;

  // 2B. 1st Angle Projection: Left View (Cross Section of Beam)
  if (config.showLeftView !== false) {
    const isSectionActive = !!(config.showCrossSectionVectors || config.showMomentOnGraph);
    const evalX_m = isSectionActive
      ? (config.crossSectionPlaneX / 1000)
      : ((config.lengthMm / 2) / 1000);
    const evalX_mm = isSectionActive
      ? Math.round(config.crossSectionPlaneX)
      : Math.round(config.lengthMm / 2);

    const sliderRightX = 84;
    const beamStartX = originX;
    const csCenterX = Math.round((sliderRightX + beamStartX) / 2);
    const aspect = config.widthMm / Math.max(1, config.thicknessMm);
    const maxCsW = Math.max(20, Math.min(54, (beamStartX - sliderRightX) * 0.44));
    const csWidth = Math.max(10, Math.min(maxCsW, Math.round(beamDrawThickness * aspect)));
    const csLeft = Math.round(csCenterX - csWidth / 2);
    const csTop = undefTopY;
    const csHeight = beamDrawThickness;
    const csBot = undefBotY;

    // Projection dashed lines
    elementsSvg += `
      <g stroke="rgba(100, 116, 139, 0.22)" stroke-width="1" stroke-dasharray="3,3">
        <line x1="${csLeft + csWidth}" y1="${csTop}" x2="${originX}" y2="${csTop}" />
        <line x1="${csLeft + csWidth}" y1="${csBot}" x2="${originX}" y2="${csBot}" />
      </g>
    `;

    // Profile clip & outline paths matching canvas rendering
    const radius = csHeight / 2;
    let clipGeometrySvg = `<rect x="${csLeft}" y="${csTop}" width="${csWidth}" height="${csHeight}" />`;
    let outlineSvg = `<rect x="${csLeft}" y="${csTop}" width="${csWidth}" height="${csHeight}" fill="none" stroke="#0f172a" stroke-width="1.5" />`;

    if (pType === 'solid_circle') {
      clipGeometrySvg = `<circle cx="${csCenterX}" cy="${originY}" r="${radius}" />`;
      outlineSvg = `<circle cx="${csCenterX}" cy="${originY}" r="${radius}" fill="none" stroke="#0f172a" stroke-width="1.5" />`;
    } else if (pType === 'hollow_circle') {
      const tRatio = Math.min(0.4, (config.wallThicknessMm || 1) / Math.max(0.1, config.thicknessMm));
      const inRadius = Math.max(1, radius * (1 - tRatio * 2));
      const ringPath = `M ${csCenterX - radius},${originY} A ${radius},${radius} 0 1,0 ${csCenterX + radius},${originY} A ${radius},${radius} 0 1,0 ${csCenterX - radius},${originY} Z M ${csCenterX - inRadius},${originY} A ${inRadius},${inRadius} 0 1,1 ${csCenterX + inRadius},${originY} A ${inRadius},${inRadius} 0 1,1 ${csCenterX - inRadius},${originY} Z`;
      clipGeometrySvg = `<path d="${ringPath}" clip-rule="evenodd" />`;
      outlineSvg = `
        <circle cx="${csCenterX}" cy="${originY}" r="${radius}" fill="none" stroke="#0f172a" stroke-width="1.5" />
        <circle cx="${csCenterX}" cy="${originY}" r="${inRadius}" fill="none" stroke="#0f172a" stroke-width="1.5" />
      `;
    } else if (pType === 'i_beam') {
      const tfRatio = Math.min(0.3, (config.flangeThicknessMm || 1) / Math.max(0.1, config.thicknessMm));
      const twRatio = Math.min(0.4, (config.webThicknessMm || 1) / Math.max(0.1, config.widthMm));
      const tfPx = Math.max(2, csHeight * tfRatio);
      const twPx = Math.max(2, csWidth * twRatio);
      const wL = csCenterX - twPx / 2;
      const wR = csCenterX + twPx / 2;
      const iPath = `M ${csLeft},${csTop} L ${csLeft + csWidth},${csTop} L ${csLeft + csWidth},${csTop + tfPx} L ${wR},${csTop + tfPx} L ${wR},${csBot - tfPx} L ${csLeft + csWidth},${csBot - tfPx} L ${csLeft + csWidth},${csBot} L ${csLeft},${csBot} L ${csLeft},${csBot - tfPx} L ${wL},${csBot - tfPx} L ${wL},${csTop + tfPx} L ${csLeft},${csTop + tfPx} Z`;
      clipGeometrySvg = `<path d="${iPath}" />`;
      outlineSvg = `<path d="${iPath}" fill="none" stroke="#0f172a" stroke-width="1.5" />`;
    }

    // Slices or neutral fill inside clipped cross section
    const numSlices = 60;
    const sliceH = csHeight / numSlices;
    elementsSvg += `
      <defs>
        <clipPath id="left-view-clip">
          ${clipGeometrySvg}
        </clipPath>
      </defs>
      <g id="left-view-cross-section">
        <g clip-path="url(#left-view-clip)">
    `;
    if (config.visualizeMode !== 'geometry') {
      for (let i = 0; i < numSlices; i++) {
        const v = (i + 0.5) / numSlices;
        const yM = (0.5 - v) * (config.thicknessMm / 1000);

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
        elementsSvg += `<rect x="${csLeft - 2}" y="${csTop + i * sliceH}" width="${csWidth + 4}" height="${sliceH + 0.6}" fill="${sliceColor}" />`;
      }
    } else {
      elementsSvg += `
        <defs>
          <pattern id="sectionHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="${csLeft - 2}" y="${csTop - 2}" width="${csWidth + 4}" height="${csHeight + 4}" fill="#f8fafc" />
        <rect x="${csLeft - 2}" y="${csTop - 2}" width="${csWidth + 4}" height="${csHeight + 4}" fill="url(#sectionHatch)" />
      `;
    }
    elementsSvg += `</g>`;

    // Outline and neutral axis
    elementsSvg += `
      ${outlineSvg}
      ${config.showNeutralAxis ? `<line x1="${csLeft - 3}" y1="${originY}" x2="${csLeft + csWidth + 3}" y2="${originY}" stroke="${config.visualizeMode !== 'geometry' && config.colormap !== 'tension_compression' ? '#ffffff' : '#10b981'}" stroke-width="${config.visualizeMode !== 'geometry' && config.colormap !== 'tension_compression' ? '2' : '1.5'}" stroke-dasharray="4,2" />` : ''}
      <text x="${csCenterX}" y="${csTop - 18}" font-family="Inter, system-ui, sans-serif" font-size="9.5" font-weight="bold" fill="#0f172a" text-anchor="middle">Left View</text>
      <text x="${csCenterX}" y="${csTop - 7}" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="${isSectionActive ? '#9333ea' : '#64748b'}" text-anchor="middle">x = ${evalX_mm}mm${isSectionActive ? '' : ' (Mid)'}</text>
      ${config.showDimensionLines ? `
        <!-- Dimensioning b on Left View -->
        <line x1="${csLeft}" y1="${csBot + 2}" x2="${csLeft}" y2="${csBot + 25}" stroke="#0284c7" stroke-width="1.25" stroke-dasharray="3,2" />
        <line x1="${csLeft + csWidth}" y1="${csBot + 2}" x2="${csLeft + csWidth}" y2="${csBot + 25}" stroke="#0284c7" stroke-width="1.25" stroke-dasharray="3,2" />
        <line x1="${csLeft}" y1="${csBot + 20}" x2="${csLeft + csWidth}" y2="${csBot + 20}" stroke="#0284c7" stroke-width="1.25" />
        <polygon points="${csLeft},${csBot + 20} ${csLeft + 5},${csBot + 17.5} ${csLeft + 5},${csBot + 22.5}" fill="#0284c7" />
        <polygon points="${csLeft + csWidth},${csBot + 20} ${csLeft + csWidth - 5},${csBot + 17.5} ${csLeft + csWidth - 5},${csBot + 22.5}" fill="#0284c7" />
        <rect x="${csCenterX - 35}" y="${csBot + 24}" width="70" height="15" rx="3" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
        <text x="${csCenterX}" y="${csBot + 35}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="bold" fill="#0284c7" text-anchor="middle">b = ${parseFloat(config.widthMm.toFixed(1))} mm</text>
      ` : ''}
      ${config.colormap === 'tension_compression' && config.visualizeMode !== 'geometry' ? (() => {
        const unitStr = isStrain ? 'με' : 'MPa';
        const d_m = config.thicknessMm / 1000;
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
        const badgeW = 68;
        const badgeX = csLeft + csWidth + 6;
        if (isBending) {
          return `
            <!-- Left View Tension/Compression Levels -->
            <rect x="${badgeX}" y="${csTop - 8}" width="${badgeW}" height="16" rx="3" fill="rgba(255,255,255,0.95)" stroke="#2563eb" stroke-width="1" />
            <text x="${badgeX + badgeW / 2}" y="${csTop + 4}" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="bold" fill="#2563eb" text-anchor="middle">${compText}</text>
            <rect x="${badgeX}" y="${csBot - 8}" width="${badgeW}" height="16" rx="3" fill="rgba(255,255,255,0.95)" stroke="#dc2626" stroke-width="1" />
            <text x="${badgeX + badgeW / 2}" y="${csBot + 4}" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="bold" fill="#dc2626" text-anchor="middle">${tensText}</text>
          `;
        } else {
          return `
            <rect x="${badgeX}" y="${originY - 8}" width="${badgeW}" height="16" rx="3" fill="rgba(255,255,255,0.95)" stroke="#dc2626" stroke-width="1" />
            <text x="${badgeX + badgeW / 2}" y="${originY + 4}" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="bold" fill="#dc2626" text-anchor="middle">${tensText}</text>
          `;
        }
      })() : ''}
      <text x="${csCenterX}" y="${config.showDimensionLines ? csBot + 50 : csBot + 18}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="#0f172a" text-anchor="middle" dominant-baseline="middle">A = ${analysis.crossSectionAreaMm2.toFixed(1)} mm²</text>
      ${config.showInertia ? `<text x="${csCenterX}" y="${config.showDimensionLines ? csBot + 63 : (!isBending ? csBot + 48 : csBot + 31)}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="#6d28d9" text-anchor="middle" dominant-baseline="middle">I = ${(analysis.secondMomentOfAreaM4 ?? analysis.secondMomentOfAreaMm4 * 1e-12).toExponential(3)} m⁴</text>` : ''}
    </g>`;
  }

  // 3. Original beam shape outline ("original beam shape")
  if (config.showOriginalOutline) {
    elementsSvg += `
      <g>
        <rect x="${originX}" y="${undefTopY}" width="${beamDrawLength}" height="${beamDrawThickness}" stroke="rgba(0,0,0,0.14)" stroke-width="1.5" stroke-dasharray="4,4" fill="none" />
        <text x="${originX - 4}" y="${undefTopY - 6}" font-family="'JetBrains Mono', monospace" font-size="10" fill="#64748b">original beam shape</text>
      </g>
    `;
  }

  // -----------------------------------------------------------------
  // MODE A: BEAM BENDING
  // -----------------------------------------------------------------
  if (isBending) {
    const maxPhysicalDeflM = Math.abs(analysis.maxDeflectionMm) / 1000;
    const maxAllowedPixels = height * 0.22;
    const nominalScale = maxPhysicalDeflM > 0 ? maxAllowedPixels / Math.max(0.002, maxPhysicalDeflM) : 1;
    const rawMultiplier = nominalScale * 0.08 * config.scaleFactor;
    const maxCapDeflPx = config.showMomentOnGraph ? height * 0.125 : height * 0.21;
    const rawMidDeflPx = maxPhysicalDeflM * rawMultiplier;
    const pixelDeflectionMultiplier = (rawMidDeflPx > maxCapDeflPx && maxPhysicalDeflM > 0)
      ? (maxCapDeflPx / maxPhysicalDeflM)
      : rawMultiplier;

    const numSlicesX = 240;
    const numLayersY = 36;

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

        const vx = cx + nx * pixelYOffset;
        const vy = cy + ny * pixelYOffset;

        const signedVal = isStrain ? getNormalStrainAt(realX, realY, config) : getNormalStressAt(realX, realY, config);
        const val = config.colormap === 'tension_compression'
          ? Math.abs(signedVal)
          : isStrain
          ? Math.abs(signedVal)
          : getVonMisesStressAt(realX, realY, config);

        column.push({ x: vx, y: vy, value: val, signedVal });
      }
      grid.push(column);
    }

    // Facets (Mesh slices) or Just the Beam (Geometry mode)
    if (config.visualizeMode !== 'geometry') {
      elementsSvg += `<g>`;
      for (let i = 0; i < numSlicesX; i++) {
        for (let j = 0; j < numLayersY; j++) {
          const v00 = grid[i][j];
          const v10 = grid[i + 1][j];
          const v11 = grid[i + 1][j + 1];
          const v01 = grid[i][j + 1];

          const avgVal = (v00.value + v10.value + v11.value + v01.value) / 4;
          const avgSigned = (v00.signedVal + v10.signedVal + v11.signedVal + v01.signedVal) / 4;
          const col = getStressColor(avgVal, fixedRefMax, config.colormap, avgSigned);

          elementsSvg += `<polygon points="${v00.x.toFixed(2)},${v00.y.toFixed(2)} ${v10.x.toFixed(2)},${v10.y.toFixed(2)} ${v11.x.toFixed(2)},${v11.y.toFixed(2)} ${v01.x.toFixed(2)},${v01.y.toFixed(2)}" fill="${col}" stroke="${col}" stroke-width="0.75" />`;
        }
      }
      elementsSvg += `</g>`;
    }

    // Track actual lowest bottom Y of the deflected beam
    let maxBeamBotY = fixedPointAY;
    for (let i = 0; i <= numSlicesX; i++) {
      if (grid[i][0].y > maxBeamBotY) maxBeamBotY = grid[i][0].y;
    }
    lowestCenterObstructionY = Math.max(lowestCenterObstructionY, maxBeamBotY);

    // Beam Outer Border
    let borderPts = '';
    for (let i = 0; i <= numSlicesX; i++) borderPts += `${grid[i][numLayersY].x.toFixed(2)},${grid[i][numLayersY].y.toFixed(2)} `;
    for (let j = numLayersY; j >= 0; j--) borderPts += `${grid[numSlicesX][j].x.toFixed(2)},${grid[numSlicesX][j].y.toFixed(2)} `;
    for (let i = numSlicesX; i >= 0; i--) borderPts += `${grid[i][0].x.toFixed(2)},${grid[i][0].y.toFixed(2)} `;
    for (let j = 0; j <= numLayersY; j++) borderPts += `${grid[0][j].x.toFixed(2)},${grid[0][j].y.toFixed(2)} `;
    elementsSvg += `<polygon points="${borderPts}" fill="${config.visualizeMode !== 'geometry' ? 'none' : '#e2e8f0'}" stroke="#1e293b" stroke-width="1.75" />`;

    // Neutral Axis
    if (config.showNeutralAxis) {
      const isRainbow = config.visualizeMode !== 'geometry' && config.colormap !== 'tension_compression';
      const midLayer = Math.floor(numLayersY / 2);
      let naD = `M ${grid[0][midLayer].x.toFixed(2)} ${grid[0][midLayer].y.toFixed(2)}`;
      for (let i = 1; i <= numSlicesX; i++) {
        naD += ` L ${grid[i][midLayer].x.toFixed(2)} ${grid[i][midLayer].y.toFixed(2)}`;
      }
      const endPt = grid[numSlicesX][midLayer];
      const fitsOnRight = endPt.x + 8 + 85 < width - 10;
      const naTextX = fitsOnRight ? (endPt.x + 8) : (endPt.x - 8);
      const naAnchor = fitsOnRight ? 'start' : 'end';
      elementsSvg += `
        <g>
          ${isRainbow ? `<path d="${naD}" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="3.5" stroke-dasharray="6,3" />` : ''}
          <path d="${naD}" fill="none" stroke="${isRainbow ? '#ffffff' : 'rgba(15,23,42,0.65)'}" stroke-width="${isRainbow ? '2' : '1.25'}" stroke-dasharray="${isRainbow ? '6,3' : '5,3'}" />
          <text x="${naTextX}" y="${endPt.y + 4}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="${isRainbow ? 'bold' : 'normal'}" fill="${isRainbow ? '#0f172a' : '#64748b'}" text-anchor="${naAnchor}" dominant-baseline="middle">Neutral Axis</text>
        </g>
      `;
    }

    // Supports: Pin A & Roller B
    const supWidth = 32;
    const supHeight = 28;
    const groundY = fixedPointAY + supHeight;

    // Pin A Ground Hatching
    let pinHatchSvg = '';
    for (let hx = fixedPointAX - supWidth / 2 - 6; hx <= fixedPointAX + supWidth / 2 + 4; hx += 6) {
      pinHatchSvg += `<line x1="${hx}" y1="${groundY}" x2="${hx - 5}" y2="${groundY + 8}" stroke="#64748b" stroke-width="1.5" />`;
    }

    // Pin A
    elementsSvg += `
      <g>
        <polygon points="${fixedPointAX},${fixedPointAY} ${fixedPointAX - supWidth / 2},${groundY} ${fixedPointAX + supWidth / 2},${groundY}" fill="#f1f5f9" stroke="#334155" stroke-width="2" />
        <line x1="${fixedPointAX - supWidth / 2 - 8}" y1="${groundY}" x2="${fixedPointAX + supWidth / 2 + 8}" y2="${groundY}" stroke="#334155" stroke-width="2" />
        ${pinHatchSvg}
        <text x="${fixedPointAX}" y="${groundY + 22}" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#0f172a" text-anchor="middle">A (Pin)</text>
      </g>
    `;

    // Roller B
    const rightBottomPos = grid[numSlicesX][0];
    const rollerX = rightBottomPos.x;
    const rollerY = fixedPointAY + supHeight - 4;
    const rightGroundY = rollerY + 3.5 + 2;
    const initialRightX = originX + beamDrawLength;

    // Roller B Ground Hatching
    let rollerHatchSvg = '';
    for (let hx = rollerX - supWidth / 2 - 8; hx <= initialRightX + supWidth / 2 + 4; hx += 6) {
      rollerHatchSvg += `<line x1="${hx}" y1="${rightGroundY}" x2="${hx - 5}" y2="${rightGroundY + 8}" stroke="#64748b" stroke-width="1.5" />`;
    }

    elementsSvg += `
      <g>
        <polygon points="${rollerX},${fixedPointAY} ${rollerX - supWidth / 2},${fixedPointAY + supHeight - 8} ${rollerX + supWidth / 2},${fixedPointAY + supHeight - 8}" fill="#f1f5f9" stroke="#334155" stroke-width="2" />
        <circle cx="${rollerX - 7}" cy="${rollerY}" r="3.5" fill="#cbd5e1" stroke="#334155" stroke-width="1.5" />
        <circle cx="${rollerX}" cy="${rollerY}" r="3.5" fill="#cbd5e1" stroke="#334155" stroke-width="1.5" />
        <circle cx="${rollerX + 7}" cy="${rollerY}" r="3.5" fill="#cbd5e1" stroke="#334155" stroke-width="1.5" />
        <line x1="${rollerX - supWidth / 2 - 12}" y1="${rightGroundY}" x2="${initialRightX + supWidth / 2 + 10}" y2="${rightGroundY}" stroke="#334155" stroke-width="2" />
        ${rollerHatchSvg}
        <text x="${rollerX}" y="${rightGroundY + 22}" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="600" fill="#0f172a" text-anchor="middle">B (Roller)</text>
      </g>
    `;

    // Reactions
    if (config.showReactions && Math.abs(config.loadN) > 0.05) {
      const rLen = Math.min(48, Math.max(22, Math.abs(analysis.leftReactionN) * 2.2));
      elementsSvg += `
        <g stroke="#059669" fill="#059669" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">
          <!-- RA -->
          <line x1="${fixedPointAX}" y1="${groundY + 34 + rLen}" x2="${fixedPointAX}" y2="${groundY + 34}" stroke-width="2.5" />
          <polygon points="${fixedPointAX},${groundY + 34} ${fixedPointAX - 4},${groundY + 41} ${fixedPointAX + 4},${groundY + 41}" />
          <text x="${fixedPointAX}" y="${groundY + 48 + rLen}" text-anchor="middle">RA = ${analysis.leftReactionN.toFixed(2)} N</text>

          <!-- RB -->
          <line x1="${rollerX}" y1="${rightGroundY + 34 + rLen}" x2="${rollerX}" y2="${rightGroundY + 34}" stroke-width="2.5" />
          <polygon points="${rollerX},${rightGroundY + 34} ${rollerX - 4},${rightGroundY + 41} ${rollerX + 4},${rightGroundY + 41}" />
          <text x="${rollerX}" y="${rightGroundY + 48 + rLen}" text-anchor="middle">RB = ${analysis.rightReactionN.toFixed(2)} N</text>
        </g>
      `;
    }

    // Bending moment curve directly on graph
    if (config.showMomentOnGraph) {
      const midIdx = Math.floor(numSlicesX / 2);
      const hasMoment = analysis.maxBendingMomentNm > 0.0001;
      const refM = Math.max(0.01, analysis.refBendingMomentNm || (config.maxLoadN * L_m) / 4);
      const maxMomentScalePx = hasMoment
        ? Math.min(80, (analysis.maxBendingMomentNm / refM) * 65)
        : 0;

      if (hasMoment) {
        let momentPoints = `${fixedPointAX},${fixedPointAY}`;
        for (let i = 0; i <= numSlicesX; i++) {
          const u = i / numSlicesX;
          const momentFrac = u <= 0.5 ? u * 2 : (1 - u) * 2;
          const momentDrop = momentFrac * maxMomentScalePx;
          const botPt = grid[i][0];
          momentPoints += ` ${botPt.x},${botPt.y + momentDrop}`;
        }
        momentPoints += ` ${grid[numSlicesX][0].x},${grid[numSlicesX][0].y}`;

        const midBot = grid[midIdx][0];
        const peakY = midBot.y + maxMomentScalePx;

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
        const isNearMid = Math.abs(uPlane - 0.5) < 0.12;
        const badgeY = isNearMid ? secMomentY + 34 : secMomentY + 16;
        const mText = `M(${planeXMm.toFixed(0)}mm) = ${momentAtSectionNm.toFixed(2)} N·m`;
        momentBottomLimit = Math.max(momentBottomLimit, peakY + 24, badgeY + 14);
        lowestCenterObstructionY = Math.max(lowestCenterObstructionY, momentBottomLimit);

        elementsSvg += `
          <g>
            <polygon points="${momentPoints}" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" stroke-width="2" />
            <circle cx="${midBot.x}" cy="${peakY}" r="4" fill="#6366f1" />
            <text x="${midBot.x}" y="${peakY + 16}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#6366f1" text-anchor="middle">Mmax = ${analysis.maxBendingMomentNm.toFixed(2)} N·m</text>

            <!-- Bending moment at cross-section plane x -->
            <line x1="${secBotX}" y1="${secBotY}" x2="${secMomentX}" y2="${secMomentY}" stroke="#9333ea" stroke-width="1.75" stroke-dasharray="3,2" />
            <circle cx="${secMomentX}" cy="${secMomentY}" r="4.5" fill="#9333ea" stroke="#ffffff" stroke-width="2" />
            <rect x="${secMomentX - 65}" y="${badgeY - 10}" width="130" height="20" rx="4" fill="rgba(255,255,255,0.95)" stroke="#9333ea" stroke-width="1.5" />
            <text x="${secMomentX}" y="${badgeY + 4}" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="bold" fill="#9333ea" text-anchor="middle">${mText}</text>
          </g>
        `;
      } else {
        const midBot = grid[midIdx][0];
        momentBottomLimit = Math.max(momentBottomLimit, midBot.y + 22);
        lowestCenterObstructionY = Math.max(lowestCenterObstructionY, momentBottomLimit);
        elementsSvg += `
          <g stroke="#6366f1" stroke-dasharray="4,3" stroke-width="1.5">
            <line x1="${fixedPointAX}" y1="${fixedPointAY}" x2="${grid[numSlicesX][0].x}" y2="${grid[numSlicesX][0].y}" />
            <text x="${midBot.x}" y="${midBot.y + 16}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#6366f1" stroke="none" text-anchor="middle">M = 0.00 N·m (Zero Load)</text>
          </g>
        `;
      }
    }

    // Load Arrow at Center
    const midIdx = Math.floor(numSlicesX / 2);
    const centerTop = grid[midIdx][numLayersY];
    const loadValN = Math.round(config.loadN);
    const maxLoadValN = Math.max(1, config.maxLoadN);
    const loadArrowLen = Math.min(95, Math.max(38, (loadValN / maxLoadValN) * 85));

    if (loadValN > 0) {
      const arrowStart = centerTop.y - loadArrowLen;
      const arrowEnd = centerTop.y;
      const loadLabel = `W = ${loadValN} N`;

      elementsSvg += `
        <g>
          <line x1="${centerTop.x}" y1="${arrowStart}" x2="${centerTop.x}" y2="${arrowEnd}" stroke="#dc2626" stroke-width="3.5" />
          <polygon points="${centerTop.x},${arrowEnd} ${centerTop.x - 7},${arrowEnd - 12} ${centerTop.x + 7},${arrowEnd - 12}" fill="#dc2626" />
          <rect x="${centerTop.x - 48}" y="${arrowStart - 22}" width="96" height="22" rx="6" fill="#dc2626" />
          <text x="${centerTop.x}" y="${arrowStart - 7}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">${loadLabel}</text>
        </g>
      `;
    }

    // Beam Physical Dimensions: Length (L) and Height (d)
    if (config.showDimensionLines) {
      const dimY = undefTopY - 26;
      const dimX = originX + beamDrawLength + 24;
      elementsSvg += `
        <g stroke="#0284c7" fill="#0284c7">
          <!-- Length L -->
          <line x1="${originX}" y1="${undefTopY - 4}" x2="${originX}" y2="${dimY - 6}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX + beamDrawLength}" y1="${undefTopY - 4}" x2="${originX + beamDrawLength}" y2="${dimY - 6}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX}" y1="${dimY}" x2="${originX + beamDrawLength}" y2="${dimY}" stroke-width="1.25" />
          <polygon points="${originX},${dimY} ${originX + 7},${dimY - 3.5} ${originX + 7},${dimY + 3.5}" />
          <polygon points="${originX + beamDrawLength},${dimY} ${originX + beamDrawLength - 7},${dimY - 3.5} ${originX + beamDrawLength - 7},${dimY + 3.5}" />
          <rect x="${originX + beamDrawLength / 2 - 45}" y="${dimY - 9}" width="90" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
          <text x="${originX + beamDrawLength / 2}" y="${dimY}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle" dominant-baseline="middle">L = ${config.lengthMm} mm</text>

          <!-- Height d -->
          <line x1="${originX + beamDrawLength + 4}" y1="${undefTopY}" x2="${dimX + 8}" y2="${undefTopY}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX + beamDrawLength + 4}" y1="${undefBotY}" x2="${dimX + 8}" y2="${undefBotY}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${dimX}" y1="${undefTopY}" x2="${dimX}" y2="${undefBotY}" stroke-width="1.25" />
          <polygon points="${dimX},${undefTopY} ${dimX - 3.5},${undefTopY + 6} ${dimX + 3.5},${undefTopY + 6}" />
          <polygon points="${dimX},${undefBotY} ${dimX - 3.5},${undefBotY - 6} ${dimX + 3.5},${undefBotY - 6}" />
          <rect x="${dimX + 8}" y="${originY - 10}" width="90" height="20" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
          <text x="${dimX + 13}" y="${originY}" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="bold" fill="#0284c7" text-anchor="start" dominant-baseline="middle">d = ${config.thicknessMm} mm</text>
        </g>
      `;
    }

    // Deflection Callout above unbent beam
    if (config.showDeflection && Math.abs(config.loadN) > 0.05) {
      const topDeformedY = centerTop.y;
      const topNonDeformedY = undefTopY;
      const visualDeflPixels = topDeformedY - topNonDeformedY;

      if (visualDeflPixels > 3) {
        const calloutX = centerTop.x + 42;
        const deflLabelY = topNonDeformedY - 14;
        const deflText = `δ = ${analysis.maxDeflectionMm.toFixed(3)} mm`;

        elementsSvg += `
          <g stroke="#0284c7" fill="#0284c7">
            <!-- Extension lines -->
            <line x1="${centerTop.x}" y1="${topNonDeformedY}" x2="${calloutX + 20}" y2="${topNonDeformedY}" stroke-width="1.5" stroke-dasharray="3,3" />
            <line x1="${centerTop.x}" y1="${topDeformedY}" x2="${calloutX + 20}" y2="${topDeformedY}" stroke-width="1.5" stroke-dasharray="3,3" />

            <!-- Dimension line -->
            <line x1="${calloutX}" y1="${topNonDeformedY}" x2="${calloutX}" y2="${topDeformedY}" stroke-width="1.5" />
            <polygon points="${calloutX},${topNonDeformedY} ${calloutX - 4},${topNonDeformedY + 6} ${calloutX + 4},${topNonDeformedY + 6}" />
            <polygon points="${calloutX},${topDeformedY} ${calloutX - 4},${topDeformedY - 6} ${calloutX + 4},${topDeformedY - 6}" />

            <!-- Leader line above unbent beam -->
            <line x1="${calloutX}" y1="${topNonDeformedY}" x2="${calloutX}" y2="${deflLabelY + 2}" stroke-width="1.5" />

            <!-- Value badge above unbent beam -->
            <rect x="${calloutX - 4}" y="${deflLabelY - 10}" width="128" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
            <text x="${calloutX + 2}" y="${deflLabelY + 3}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#0284c7">${deflText}</text>
          </g>
        `;
      }
    }

    // Cross-Section Plane & Stress/Strain Vectors
    if (config.showCrossSectionVectors || config.showMomentOnGraph) {
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

      const isLeftOfCenter = planeXM <= L_m / 2;
      const userInvert = config.invertVectorDirection ? -1 : 1;
      const normalDir = (isLeftOfCenter ? -1 : 1) * userInvert;

      const maxValAtPlane = isStrain
        ? Math.abs(getNormalStrainAt(planeXM, d_m / 2, config))
        : Math.abs(getNormalStressAt(planeXM, d_m / 2, config));

      const maxVectorPixelLen = Math.min(130, Math.max(20, (maxValAtPlane / fixedRefMax) * 105 * (config.vectorScale || 1.5)));

      elementsSvg += `
        <g>
          <!-- Plane Line -->
          <line x1="${planeTopX}" y1="${planeTopY}" x2="${planeBotX}" y2="${planeBotY}" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="4,2" />
          <circle cx="${planeTopX}" cy="${planeTopY - 10}" r="7" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />
          <text x="${planeTopX}" y="${planeTopY - 22}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#8b5cf6" text-anchor="middle">x = ${planeXMm.toFixed(0)} mm</text>
      `;

      // Vector arrows (only if showCrossSectionVectors is true)
      if (config.showCrossSectionVectors) {
        for (let s = 0; s < 9; s++) {
          const vs = s / 8;
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

            const headAngle = Math.atan2(arrowEndY - ptY, arrowEndX - ptX);
            const h1X = arrowEndX - 7.5 * Math.cos(headAngle - Math.PI / 6);
            const h1Y = arrowEndY - 7.5 * Math.sin(headAngle - Math.PI / 6);
            const h2X = arrowEndX - 7.5 * Math.cos(headAngle + Math.PI / 6);
            const h2Y = arrowEndY - 7.5 * Math.sin(headAngle + Math.PI / 6);

            elementsSvg += `
              <line x1="${ptX}" y1="${ptY}" x2="${arrowEndX}" y2="${arrowEndY}" stroke="${arrowColor}" stroke-width="2.75" />
              <polygon points="${arrowEndX},${arrowEndY} ${h1X},${h1Y} ${h2X},${h2Y}" fill="${arrowColor}" />
            `;
          }
        }

        // Vector Callout labels strictly ABOVE and BELOW the beam
        const unitStr = isStrain ? 'με' : 'MPa';
        const topVal = isStrain ? getNormalStrainAt(planeXM, d_m / 2, config) : getNormalStressAt(planeXM, d_m / 2, config);
        const botVal = isStrain ? getNormalStrainAt(planeXM, -d_m / 2, config) : getNormalStressAt(planeXM, -d_m / 2, config);

        const compText = `Comp: ${Math.abs(topVal).toFixed(1)} ${unitStr}`;
        const tensText = `Tens: ${Math.abs(botVal).toFixed(1)} ${unitStr}`;

        const topLabelY = planeTopY - 14;
        const topLabelX = isLeftOfCenter ? planeTopX - 16 : planeTopX + 16;
        const compBadgeX = isLeftOfCenter ? topLabelX - 110 : topLabelX - 4;

        const botLabelY = planeBotY + 16;
        const botLabelX = isLeftOfCenter ? planeBotX - 16 : planeBotX + 16;
        const tensBadgeX = isLeftOfCenter ? botLabelX - 110 : botLabelX - 4;
        lowestCenterObstructionY = Math.max(lowestCenterObstructionY, botLabelY + 10);

        elementsSvg += `
          <!-- Compression label above -->
          <rect x="${compBadgeX}" y="${topLabelY - 10}" width="114" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#2563eb" stroke-width="1" />
          <text x="${isLeftOfCenter ? topLabelX : topLabelX + 2}" y="${topLabelY + 3}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2563eb" text-anchor="${isLeftOfCenter ? 'end' : 'start'}">${compText}</text>

          <!-- Tension label below -->
          <rect x="${tensBadgeX}" y="${botLabelY - 10}" width="114" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#dc2626" stroke-width="1" />
          <text x="${isLeftOfCenter ? botLabelX : botLabelX + 2}" y="${botLabelY + 3}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#dc2626" text-anchor="${isLeftOfCenter ? 'end' : 'start'}">${tensText}</text>
        `;
      }

      elementsSvg += `</g>`;
    }
  }

  // -----------------------------------------------------------------
  // MODE B: TENSION TEST
  // -----------------------------------------------------------------
  else {
    const axialElongationPx = (analysis.axialElongationMm / 1000) * (beamDrawLength / L_m) * config.scaleFactor * 25;
    const currentSpecimenLen = beamDrawLength + Math.min(beamDrawLength * 0.4, axialElongationPx);
    const specTopY = originY - beamDrawThickness / 2;
    const specBotY = originY + beamDrawThickness / 2;

    const val = isStrain ? analysis.axialStrainMicro : analysis.axialStressMpa;
    const fillColor = config.visualizeMode !== 'geometry'
      ? getStressColor(val, fixedRefMax, config.colormap, val)
      : '#e2e8f0';

    elementsSvg += `
      <!-- Specimen body -->
      <rect x="${originX}" y="${specTopY}" width="${currentSpecimenLen}" height="${beamDrawThickness}" fill="${fillColor}" stroke="#1e293b" stroke-width="2" />

      <!-- Fixed clamp left -->
      <rect x="${originX - 28}" y="${originY - (beamDrawThickness + 36) / 2}" width="28" height="${beamDrawThickness + 36}" fill="#e2e8f0" stroke="#334155" stroke-width="2" />
      ${(() => {
        let clampHatch = '';
        const gripTopY = originY - (beamDrawThickness + 36) / 2;
        const gripH = beamDrawThickness + 36;
        for (let gy = gripTopY + 4; gy < gripTopY + gripH - 4; gy += 6) {
          clampHatch += `<line x1="${originX - 26}" y1="${gy}" x2="${originX - 2}" y2="${gy + 4}" stroke="#64748b" stroke-width="1" />`;
        }
        return clampHatch;
      })()}
      <text x="${originX - 14}" y="${originY + (beamDrawThickness + 36) / 2 + 16}" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Fixed Clamp</text>
    `;

    // Axial Load Arrow at specimen right end
    const loadValN = Math.round(config.loadN);
    const specimenEndX = originX + currentSpecimenLen;

    if (loadValN > 0) {
      const arrowStartX = specimenEndX + 4;
      const arrowLen = Math.min(55, Math.max(26, (loadValN / config.maxLoadN) * 50));
      const arrowEndX = arrowStartX + arrowLen;
      const badgeX = Math.min(width - 100, arrowEndX + 6);

      elementsSvg += `
        <g>
          <line x1="${arrowStartX}" y1="${originY}" x2="${arrowEndX}" y2="${originY}" stroke="#dc2626" stroke-width="3.5" />
          <polygon points="${arrowEndX},${originY} ${arrowEndX - 9},${originY - 5} ${arrowEndX - 9},${originY + 5}" fill="#dc2626" />
          <rect x="${badgeX}" y="${originY - 11}" width="80" height="22" rx="6" fill="#dc2626" />
          <text x="${badgeX + 40}" y="${originY}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">W = ${loadValN} N</text>
        </g>
      `;
    }

    // Specimen Dimensions L and d in tension
    if (config.showDimensionLines) {
      const dimY = specTopY - 26;
      const dimX = originX - 36;
      elementsSvg += `
        <g stroke="#0284c7" fill="#0284c7">
          <!-- Length L -->
          <line x1="${originX}" y1="${specTopY - 4}" x2="${originX}" y2="${dimY - 6}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX + beamDrawLength}" y1="${specTopY - 4}" x2="${originX + beamDrawLength}" y2="${dimY - 6}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX}" y1="${dimY}" x2="${originX + beamDrawLength}" y2="${dimY}" stroke-width="1.25" />
          <polygon points="${originX},${dimY} ${originX + 7},${dimY - 3.5} ${originX + 7},${dimY + 3.5}" />
          <polygon points="${originX + beamDrawLength},${dimY} ${originX + beamDrawLength - 7},${dimY - 3.5} ${originX + beamDrawLength - 7},${dimY + 3.5}" />
          <rect x="${originX + beamDrawLength / 2 - 45}" y="${dimY - 9}" width="90" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
          <text x="${originX + beamDrawLength / 2}" y="${dimY}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle" dominant-baseline="middle">L = ${config.lengthMm} mm</text>

          <!-- Height d -->
          <line x1="${originX - 4}" y1="${specTopY}" x2="${dimX - 6}" y2="${specTopY}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${originX - 4}" y1="${specBotY}" x2="${dimX - 6}" y2="${specBotY}" stroke-width="1.25" stroke-dasharray="3,2" />
          <line x1="${dimX}" y1="${specTopY}" x2="${dimX}" y2="${specBotY}" stroke-width="1.25" />
          <polygon points="${dimX},${specTopY} ${dimX - 3.5},${specTopY + 6} ${dimX + 3.5},${specTopY + 6}" />
          <polygon points="${dimX},${specBotY} ${dimX - 3.5},${specBotY - 6} ${dimX + 3.5},${specBotY - 6}" />
          <rect x="${dimX - 98}" y="${originY - 10}" width="90" height="20" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
          <text x="${dimX - 9}" y="${originY}" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="bold" fill="#0284c7" text-anchor="end" dominant-baseline="middle">d = ${config.thicknessMm} mm</text>
        </g>
      `;
    }

    // Elongation Delta L in tension
    if (config.showDeflection && analysis.axialElongationMm > 0.0001) {
      const origEndPx = originX + beamDrawLength;
      const curEndPx = specimenEndX;
      const dimY = originY - beamDrawThickness / 2 - 46;
      elementsSvg += `
        <g stroke="#0284c7" fill="#0284c7">
          <line x1="${origEndPx}" y1="${specTopY}" x2="${origEndPx}" y2="${dimY - 4}" stroke-width="1.5" stroke-dasharray="3,2" />
          <line x1="${curEndPx}" y1="${specTopY}" x2="${curEndPx}" y2="${dimY - 4}" stroke-width="1.5" stroke-dasharray="3,2" />
          <line x1="${origEndPx}" y1="${dimY}" x2="${curEndPx}" y2="${dimY}" stroke-width="1.5" />
          <rect x="${(origEndPx + curEndPx) / 2 - 50}" y="${dimY - 18}" width="100" height="18" rx="4" fill="rgba(255,255,255,0.95)" stroke="#0284c7" stroke-width="1" />
          <text x="${(origEndPx + curEndPx) / 2}" y="${dimY - 9}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle" dominant-baseline="middle">ΔL = ${analysis.axialElongationMm.toFixed(4)} mm</text>
        </g>
      `;
    }
  }

  // -----------------------------------------------------------------
  // 4. COORDINATE SYSTEM TRIAD AT POINT A (RENDERED OVER THE BEAM)
  // -----------------------------------------------------------------
  if (config.showCoordinateSystem !== false) {
    const triadOriginX = originX;
    const triadOriginY = originY;
    const axisLenX = 54;
    const axisLenY = 38;

    elementsSvg += `
      <g font-family="'JetBrains Mono', monospace">
        <!-- +x arrow halo & main line -->
        <line x1="${triadOriginX - 18}" y1="${triadOriginY}" x2="${triadOriginX + axisLenX}" y2="${triadOriginY}" stroke="rgba(255,255,255,0.95)" stroke-width="4" stroke-linecap="round" />
        <line x1="${triadOriginX - 18}" y1="${triadOriginY}" x2="${triadOriginX + axisLenX}" y2="${triadOriginY}" stroke="#0f172a" stroke-width="2" />
        <!-- +x arrowhead -->
        <polygon points="${triadOriginX + axisLenX + 2},${triadOriginY} ${triadOriginX + axisLenX - 7},${triadOriginY - 5} ${triadOriginX + axisLenX - 7},${triadOriginY + 5}" fill="rgba(255,255,255,0.95)" />
        <polygon points="${triadOriginX + axisLenX},${triadOriginY} ${triadOriginX + axisLenX - 6},${triadOriginY - 3.5} ${triadOriginX + axisLenX - 6},${triadOriginY + 3.5}" fill="#0f172a" />
        <!-- +x label -->
        <text x="${triadOriginX + axisLenX + 5}" y="${triadOriginY}" font-size="11" font-weight="bold" fill="#0f172a" stroke="rgba(255,255,255,0.95)" stroke-width="3" paint-order="stroke fill" dominant-baseline="middle">+x (mm)</text>

        <!-- +y arrow halo & main line -->
        <line x1="${triadOriginX}" y1="${triadOriginY + 16}" x2="${triadOriginX}" y2="${triadOriginY - axisLenY}" stroke="rgba(255,255,255,0.95)" stroke-width="4" />
        <line x1="${triadOriginX}" y1="${triadOriginY + 16}" x2="${triadOriginX}" y2="${triadOriginY - axisLenY}" stroke="#0f172a" stroke-width="2" />
        <!-- +y arrowhead -->
        <polygon points="${triadOriginX},${triadOriginY - axisLenY - 2} ${triadOriginX - 5},${triadOriginY - axisLenY + 7} ${triadOriginX + 5},${triadOriginY - axisLenY + 7}" fill="rgba(255,255,255,0.95)" />
        <polygon points="${triadOriginX},${triadOriginY - axisLenY} ${triadOriginX - 3.5},${triadOriginY - axisLenY + 6} ${triadOriginX + 3.5},${triadOriginY - axisLenY + 6}" fill="#0f172a" />
        <!-- +y label -->
        <text x="${triadOriginX}" y="${triadOriginY - axisLenY - 6}" font-size="11" font-weight="bold" fill="#0f172a" stroke="rgba(255,255,255,0.95)" stroke-width="3" paint-order="stroke fill" text-anchor="middle">+y</text>

        <!-- Origin Point (0,0) -->
        <circle cx="${triadOriginX}" cy="${triadOriginY}" r="4.5" fill="rgba(255,255,255,0.95)" />
        <circle cx="${triadOriginX}" cy="${triadOriginY}" r="3" fill="#0284c7" />
        <text x="${triadOriginX - 6}" y="${triadOriginY + 14}" font-size="10" font-weight="bold" fill="#1e293b" stroke="rgba(255,255,255,0.95)" stroke-width="3" paint-order="stroke fill" text-anchor="end">(0, 0)</text>
      </g>
    `;
  }

  // -----------------------------------------------------------------
  // 5. STRESS / STRAIN SCALE & CROSS-SECTION SCALE (PROPER VERTICAL CLEARANCE)
  // -----------------------------------------------------------------
  const hasCsSlider = !!(config.showCrossSectionVectors || config.showMomentOnGraph);
  const maxAllowedScaleY = hasCsSlider ? height - 100 : height - 36;
  const scaleY = Math.min(
    maxAllowedScaleY,
    Math.max(fixedPointAY + 56, lowestCenterObstructionY + 32)
  );

  if (config.visualizeMode !== 'geometry') {
    const scaleW = Math.min(360, width * 0.44);
    const beamCenterX = originX + beamDrawLength / 2;
    const scaleStartX = beamCenterX - scaleW / 2;

    const currentVal = isBending
      ? (isStrain ? analysis.maxNormalStrainMicro : analysis.maxNormalStressMpa)
      : (isStrain ? analysis.axialStrainMicro : analysis.axialStressMpa);

    let cursorPct = 0;
    if (config.colormap === 'tension_compression') {
      cursorPct = Math.max(0, Math.min(1, 0.5 + (currentVal / fixedRefMax) * 0.5));
    } else {
      cursorPct = Math.max(0, Math.min(1, currentVal / fixedRefMax));
    }
    if (cursorPct > 0.998) cursorPct = 1.0;
    const cursorX = scaleStartX + cursorPct * scaleW;

    const formatV = (v: number) => isStrain ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k με` : (v > 0 && v < 10 ? `${v.toFixed(2)} με` : `${v.toFixed(0)} με`)) : `${v.toFixed(2)} MPa`;

    elementsSvg += `
      <g font-family="'JetBrains Mono', monospace">
        <!-- Scale Title to the left of the scale -->
        <text x="${scaleStartX - 16}" y="${scaleY + 11}" font-size="12" font-weight="bold" fill="#334155" text-anchor="end">${isStrain ? 'Strain scale' : 'Stress scale'}</text>

        <!-- Color Gradient Bar -->
        <rect x="${scaleStartX}" y="${scaleY}" width="${scaleW}" height="14" rx="4" fill="url(#scale-gradient)" stroke="#cbd5e1" stroke-width="1" />

        <!-- Cursor Needle & Pointers (hidden for tens/comp) -->
        ${config.colormap !== 'tension_compression' ? `
          <line x1="${cursorX}" y1="${scaleY - 2}" x2="${cursorX}" y2="${scaleY + 16}" stroke="#0f172a" stroke-width="2.5" />
          <polygon points="${cursorX},${scaleY} ${cursorX - 4},${scaleY - 6} ${cursorX + 4},${scaleY - 6}" fill="#0f172a" />
          <polygon points="${cursorX},${scaleY + 14} ${cursorX - 3},${scaleY + 19} ${cursorX + 3},${scaleY + 19}" fill="#0f172a" />
          <text x="${cursorX}" y="${scaleY - 8}" font-family="'JetBrains Mono', monospace" font-weight="bold" fill="#0f172a" text-anchor="middle"><tspan font-size="18">${isStrain ? 'ε' : 'σ'}</tspan><tspan font-size="9" dx="1">Max</tspan></text>
        ` : ''}

        <!-- Scale Ticks -->
        <text x="${scaleStartX}" y="${scaleY + 28}" font-size="10" fill="#64748b" text-anchor="start">0</text>
        <text x="${scaleStartX + scaleW * 0.25}" y="${scaleY + 28}" font-size="10" fill="#64748b" text-anchor="middle">${formatV(fixedRefMax * 0.25)}</text>
        <text x="${scaleStartX + scaleW * 0.5}" y="${scaleY + 28}" font-size="10" fill="#64748b" text-anchor="middle">${formatV(fixedRefMax * 0.5)}</text>
        <text x="${scaleStartX + scaleW * 0.75}" y="${scaleY + 28}" font-size="10" fill="#64748b" text-anchor="middle">${formatV(fixedRefMax * 0.75)}</text>
        <text x="${scaleStartX + scaleW}" y="${scaleY + 28}" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="end">${formatV(fixedRefMax)}</text>
      </g>
    `;
  }

  // Cross-Section Plane Scale (Positioned with generous clearance below colored scale)
  if (config.showCrossSectionVectors || config.showMomentOnGraph) {
    const isGeometry = config.visualizeMode === 'geometry';
    const csScaleY = isGeometry
      ? Math.min(height - 28, Math.max(fixedPointAY + 54, lowestCenterObstructionY + 26))
      : Math.min(height - 28, scaleY + 72);

    const planeXMm = Math.max(0, Math.min(config.lengthMm, config.crossSectionPlaneX));
    const planeRatio = config.lengthMm > 0 ? planeXMm / config.lengthMm : 0;
    const planeMarkerX = originX + planeRatio * beamDrawLength;
    const momentAtSectionNm = (planeRatio <= 0.5 ? planeRatio * 2 : (1 - planeRatio) * 2) * analysis.maxBendingMomentNm;

    elementsSvg += `
      <g font-family="'JetBrains Mono', monospace">
        <!-- Cross-Section Plane Scale Header -->
        <text x="${originX}" y="${csScaleY - 6}" font-size="10" font-weight="bold" fill="#475569">Cross-Section Plane (x)</text>
        <text x="${originX + beamDrawLength}" y="${csScaleY - 6}" font-size="10" font-weight="bold" fill="#7c3aed" text-anchor="end">x = ${planeXMm.toFixed(0)} mm (${(planeRatio * 100).toFixed(0)}% L)${config.showMomentOnGraph ? ` · M(x) = ${momentAtSectionNm.toFixed(2)} N·m` : ''}</text>

        <!-- Track rail -->
        <line x1="${originX}" y1="${csScaleY + 6}" x2="${originX + beamDrawLength}" y2="${csScaleY + 6}" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round" />
        <line x1="${originX}" y1="${csScaleY + 6}" x2="${planeMarkerX}" y2="${csScaleY + 6}" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round" />

        <!-- Marker circle thumb -->
        <circle cx="${planeMarkerX}" cy="${csScaleY + 6}" r="6" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />

        <!-- Scale Ticks and Labels -->
        <text x="${originX}" y="${csScaleY + 20}" font-size="9" fill="#94a3b8" text-anchor="start">0 mm</text>
        <text x="${originX + beamDrawLength * 0.5}" y="${csScaleY + 20}" font-size="9" fill="#94a3b8" text-anchor="middle">${(config.lengthMm * 0.5).toFixed(0)} mm</text>
        <text x="${originX + beamDrawLength}" y="${csScaleY + 20}" font-size="9" fill="#94a3b8" text-anchor="end">${config.lengthMm} mm</text>
      </g>
    `;
  }

  // Defs with scale gradients
  const gradientStops = config.colormap === 'tension_compression'
    ? `
      <stop offset="0%" stop-color="#1e40af" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#dc2626" />
    `
    : `
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="20%" stop-color="#0ea5e9" />
      <stop offset="40%" stop-color="#10b981" />
      <stop offset="65%" stop-color="#eab308" />
      <stop offset="85%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#e11d48" />
    `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="scale-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      ${gradientStops}
    </linearGradient>
  </defs>
  ${elementsSvg}
</svg>`;
}
