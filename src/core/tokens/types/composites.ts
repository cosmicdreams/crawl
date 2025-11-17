// src/core/tokens/types/composites.ts
/**
 * Design Tokens Specification 2025.10 - Composite Token Types
 * https://www.designtokens.org/tr/2025.10/format/
 *
 * Composite types combine multiple sub-values with predefined structures.
 * Sub-values can be explicit values or references to appropriately-typed tokens.
 */

import { Token, TokenValue } from './base.js';
import {
    ColorValue,
    DimensionValue,
    DurationValue,
    CubicBezierValue,
    FontFamilyValue,
    FontWeightValue,
    NumberValue
} from './primitives.js';

// ============================================================================
// BORDER TOKENS
// ============================================================================

/**
 * Valid border style values.
 */
export type BorderStyleValue =
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'double'
    | 'groove'
    | 'ridge'
    | 'inset'
    | 'outset';

/**
 * Border composite value.
 *
 * SPEC REQUIREMENTS:
 * - color: REQUIRED, must be color value or reference to color token
 * - width: REQUIRED, must be dimension value or reference to dimension token
 * - style: REQUIRED, must be valid border style value
 *
 * Example:
 * {
 *   "color": "{colors.border-primary}",
 *   "width": { "value": 1, "unit": "px" },
 *   "style": "solid"
 * }
 */
export interface BorderValue {
    color: TokenValue<ColorValue>;
    width: TokenValue<DimensionValue>;
    style: BorderStyleValue;
}

export type BorderToken = Token<BorderValue>;

// ============================================================================
// SHADOW TOKENS
// ============================================================================

/**
 * Shadow composite value.
 *
 * SPEC REQUIREMENTS:
 * - color: REQUIRED, color value or reference
 * - offsetX: REQUIRED, dimension value or reference
 * - offsetY: REQUIRED, dimension value or reference
 * - blur: REQUIRED, dimension value or reference
 * - spread: REQUIRED, dimension value or reference
 *
 * Example:
 * {
 *   "color": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 0.2 },
 *   "offsetX": { "value": 0, "unit": "px" },
 *   "offsetY": { "value": 4, "unit": "px" },
 *   "blur": { "value": 8, "unit": "px" },
 *   "spread": { "value": 0, "unit": "px" }
 * }
 */
export interface ShadowValue {
    color: TokenValue<ColorValue>;
    offsetX: TokenValue<DimensionValue>;
    offsetY: TokenValue<DimensionValue>;
    blur: TokenValue<DimensionValue>;
    spread: TokenValue<DimensionValue>;
}

export type ShadowToken = Token<ShadowValue>;

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

/**
 * Transition composite value.
 *
 * SPEC REQUIREMENTS:
 * - duration: REQUIRED, duration value or reference
 * - delay: REQUIRED, duration value or reference
 * - timingFunction: REQUIRED, cubic bezier value or reference
 *
 * Example:
 * {
 *   "duration": { "value": 200, "unit": "ms" },
 *   "delay": { "value": 0, "unit": "ms" },
 *   "timingFunction": [0.42, 0, 0.58, 1]
 * }
 */
export interface TransitionValue {
    duration: TokenValue<DurationValue>;
    delay: TokenValue<DurationValue>;
    timingFunction: TokenValue<CubicBezierValue>;
}

export type TransitionToken = Token<TransitionValue>;

// ============================================================================
// STROKE STYLE TOKENS
// ============================================================================

/**
 * Valid line cap values for stroke styles.
 */
export type LineCapValue = 'round' | 'butt' | 'square';

/**
 * Stroke style composite value.
 *
 * SPEC REQUIREMENTS:
 * - dashArray: REQUIRED, array of dimension values (or references)
 * - lineCap: REQUIRED, valid line cap value
 *
 * Example:
 * {
 *   "dashArray": [
 *     { "value": 5, "unit": "px" },
 *     { "value": 5, "unit": "px" }
 *   ],
 *   "lineCap": "round"
 * }
 */
export interface StrokeStyleValue {
    dashArray: TokenValue<DimensionValue>[];
    lineCap: LineCapValue;
}

export type StrokeStyleToken = Token<StrokeStyleValue>;

// ============================================================================
// GRADIENT TOKENS
// ============================================================================

/**
 * Gradient stop defining color and position.
 *
 * SPEC REQUIREMENTS:
 * - color: REQUIRED, color value or reference
 * - position: REQUIRED, number between 0 and 1
 */
export interface GradientStop {
    color: TokenValue<ColorValue>;
    position: number;
}

/**
 * Gradient composite value.
 *
 * SPEC REQUIREMENTS:
 * - stops: REQUIRED, array of at least 2 gradient stops
 * - Stops must be ordered by position
 *
 * Example:
 * {
 *   "stops": [
 *     {
 *       "color": "{colors.gradient-start}",
 *       "position": 0
 *     },
 *     {
 *       "color": "{colors.gradient-end}",
 *       "position": 1
 *     }
 *   ]
 * }
 */
export interface GradientValue {
    stops: GradientStop[];
}

export type GradientToken = Token<GradientValue>;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

/**
 * Typography composite value combining font properties.
 *
 * SPEC REQUIREMENTS:
 * - fontFamily: REQUIRED, font family value or reference
 * - fontSize: REQUIRED, dimension value or reference
 * - fontWeight: REQUIRED, font weight value or reference
 * - lineHeight: REQUIRED, number value or reference
 * - letterSpacing: OPTIONAL, dimension value or reference
 *
 * Example:
 * {
 *   "fontFamily": ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
 *   "fontSize": { "value": 16, "unit": "px" },
 *   "fontWeight": 400,
 *   "lineHeight": 1.5,
 *   "letterSpacing": { "value": 0, "unit": "px" }
 * }
 */
export interface TypographyValue {
    fontFamily: TokenValue<FontFamilyValue>;
    fontSize: TokenValue<DimensionValue>;
    fontWeight: TokenValue<FontWeightValue>;
    lineHeight: TokenValue<NumberValue>;
    letterSpacing?: TokenValue<DimensionValue>;
}

export type TypographyToken = Token<TypographyValue>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isBorderValue(value: any): value is BorderValue {
    return (
        value &&
        typeof value === 'object' &&
        'color' in value &&
        'width' in value &&
        'style' in value
    );
}

export function isShadowValue(value: any): value is ShadowValue {
    return (
        value &&
        typeof value === 'object' &&
        'color' in value &&
        'offsetX' in value &&
        'offsetY' in value &&
        'blur' in value &&
        'spread' in value
    );
}

export function isTransitionValue(value: any): value is TransitionValue {
    return (
        value &&
        typeof value === 'object' &&
        'duration' in value &&
        'delay' in value &&
        'timingFunction' in value
    );
}

export function isStrokeStyleValue(value: any): value is StrokeStyleValue {
    return (
        value &&
        typeof value === 'object' &&
        'dashArray' in value &&
        Array.isArray(value.dashArray) &&
        'lineCap' in value
    );
}

export function isGradientValue(value: any): value is GradientValue {
    return (
        value &&
        typeof value === 'object' &&
        'stops' in value &&
        Array.isArray(value.stops) &&
        value.stops.length >= 2
    );
}

export function isTypographyValue(value: any): value is TypographyValue {
    return (
        value &&
        typeof value === 'object' &&
        'fontFamily' in value &&
        'fontSize' in value &&
        'fontWeight' in value &&
        'lineHeight' in value
    );
}
