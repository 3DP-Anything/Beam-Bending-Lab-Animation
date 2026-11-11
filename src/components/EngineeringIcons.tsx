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
