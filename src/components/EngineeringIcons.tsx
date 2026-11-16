/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * 3/4 Circular Arrow representing Bending Moment (M)
 */
export const MomentIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* 3/4 circular arc sweeping 270 degrees clockwise from (12, 4) to (4, 12) */}
    <path d="M 12 4 A 8 8 0 1 1 4 12" />
    {/* Arrowhead at (4, 12) pointing upward */}
    <polyline points="1.5 15.5 4 11.5 7.5 15.5" />
  </svg>
);

/**
 * 1 horizontal arrow pointing right above 1 horizontal arrow pointing left representing Stress/Strain Vectors
 */
export const VectorIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Top arrow pointing right */}
    <line x1="4" y1="8" x2="20" y2="8" />
    <polyline points="15.5 4.5 20 8 15.5 11.5" />

    {/* Bottom arrow pointing left */}
    <line x1="20" y1="16" x2="4" y2="16" />
    <polyline points="8.5 12.5 4 16 8.5 19.5" />
  </svg>
);

/**
 * Semi-circular line with 1 vertical arrow pointing down at midpoint representing beam deflection under load
 */
export const DeflectionIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Vertical arrow pointing down at the midpoint */}
    <line x1="12" y1="3" x2="12" y2="13.5" />
    <polyline points="8.5 10 12 13.5 15.5 10" />

    {/* Curved beam sagging downward under the load */}
    <path d="M 3 11 C 3 18.5, 21 18.5, 21 11" />
  </svg>
);

/**
 * Cartesian Coordinate System Triad (+x pointing right, +y pointing up, origin dot)
 */
export const CoordinateIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Origin point */}
    <circle cx="6" cy="18" r="1.5" fill="currentColor" />
    {/* +x horizontal arrow */}
    <line x1="6" y1="18" x2="20" y2="18" />
    <polyline points="16.5 14.5 20 18 16.5 21.5" />
    {/* +y vertical arrow */}
    <line x1="6" y1="18" x2="6" y2="4" />
    <polyline points="2.5 7.5 6 4 9.5 7.5" />
  </svg>
);

/**
 * Second Moment of Area (I) symbol icon
 */
export const InertiaIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Top horizontal serif */}
    <line x1="7" y1="5" x2="17" y2="5" />
    {/* Vertical stem */}
    <line x1="12" y1="5" x2="12" y2="19" />
    {/* Bottom horizontal serif */}
    <line x1="7" y1="19" x2="17" y2="19" />
  </svg>
);

/**
 * Stress vs Strain Graph icon: vertical/horizontal axes, upward curve, σ and ε labels
 */
export const StressStrainGraphIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Vertical (σ) and horizontal (ε) axes */}
    <polyline points="7.5 2.5 7.5 16.5 22 16.5" />
    {/* Curve going up */}
    <path d="M 7.5 16.5 Q 14.5 12.5 21 3.5" />
    {/* Axis symbols σ and ε */}
    <text
      x="3.6"
      y="10"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="9.5"
      fontWeight="700"
      fontFamily="Georgia, Cambria, 'Times New Roman', serif"
    >
      σ
    </text>
    <text
      x="15.5"
      y="23"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="9.5"
      fontWeight="700"
      fontFamily="Georgia, Cambria, 'Times New Roman', serif"
    >
      ε
    </text>
  </svg>
);

/**
 * Load vs Deflection Graph icon: vertical/horizontal axes, upward curve, W and δ labels
 */
export const LoadDeflectionGraphIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Vertical (W) and horizontal (δ) axes */}
    <polyline points="7.5 2.5 7.5 16.5 22 16.5" />
    {/* Curve going up */}
    <path d="M 7.5 16.5 Q 14.5 12.5 21 3.5" />
    {/* Axis symbols W and δ */}
    <text
      x="3.6"
      y="9.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="7.2"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      W
    </text>
    <text
      x="15.5"
      y="23"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="9.5"
      fontWeight="700"
      fontFamily="Georgia, Cambria, 'Times New Roman', serif"
    >
      δ
    </text>
  </svg>
);

export const SolidRectangleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="1.2" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IBeamIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M5 5H19V8.5H13.8V15.5H19V19H5V15.5H10.2V8.5H5V5Z"
      fill="currentColor"
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  </svg>
);

export const SolidCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="7.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const HollowCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" />
  </svg>
);

export const BeamShapeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-4 h-4' }) => {
  switch (type) {
    case 'i_beam':
      return <IBeamIcon className={className} />;
    case 'solid_circle':
      return <SolidCircleIcon className={className} />;
    case 'hollow_circle':
      return <HollowCircleIcon className={className} />;
    case 'solid_rectangle':
    default:
      return <SolidRectangleIcon className={className} />;
  }
};


