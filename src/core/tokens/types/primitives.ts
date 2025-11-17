// src/core/tokens/types/primitives.ts
/**
 * Design Tokens Specification 2025.10 - Primitive Token Types
 * https://www.designtokens.org/tr/2025.10/format/
 *
 * Primitive types represent atomic design values that cannot be broken down further.
 */

import { Token, TokenValue } from './base.js';

// ============================================================================
// COLOR TOKENS
// ============================================================================

/**
 * Supported color spaces as defined by the specification.
 */
export type ColorSpace = 'srgb' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020';

/**
 * Color value object as defined by the specification.
 *
 * SPEC REQUIREMENTS:
 * - colorSpace: REQUIRED
 * - components: REQUIRED array of 3 numbers [R, G, B] in range [0, 1]
 * - alpha: OPTIONAL number in range [0, 1], defaults to 1
 * - hex: OPTIONAL hexadecimal representation (for convenience)
 *
 * Example:
 * {
 *   "colorSpace": "srgb",
 *   "components": [0, 0.4, 0.8],
 *   "alpha": 1,
 *   "hex": "#0066cc"
 * }
 */
export interface ColorValue {
    colorSpace: ColorSpace;
    components: [number, number, number];
    alpha?: number;
    hex?: string;
}

export type ColorToken = Token<TokenValue<ColorValue>>;

// ============================================================================
// DIMENSION TOKENS
// ============================================================================

/**
 * Allowed units for dimension values.
 * SPEC REQUIREMENT: Only 'px' and 'rem' are valid.
 */
export type DimensionUnit = 'px' | 'rem';

/**
 * Dimension value for distance measurements.
 *
 * SPEC REQUIREMENTS:
 * - value: REQUIRED number
 * - unit: REQUIRED, must be 'px' or 'rem'
 *
 * Example:
 * { "value": 16, "unit": "px" }
 */
export interface DimensionValue {
    value: number;
    unit: DimensionUnit;
}

export type DimensionToken = Token<TokenValue<DimensionValue>>;

// ============================================================================
// FONT FAMILY TOKENS
// ============================================================================

/**
 * Font family value.
 * Can be a single font name or an array for fallback fonts.
 *
 * SPEC REQUIREMENTS:
 * - String: Single font family
 * - Array: Ordered list of fallback fonts
 *
 * Examples:
 * "Helvetica Neue"
 * ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
 */
export type FontFamilyValue = string | string[];

export type FontFamilyToken = Token<TokenValue<FontFamilyValue>>;

// ============================================================================
// FONT WEIGHT TOKENS
// ============================================================================

/**
 * Preset font weight names as defined by the spec.
 */
export type FontWeightPreset =
    | 'thin'       // 100
    | 'hairline'   // 100
    | 'extra-light'// 200
    | 'ultra-light'// 200
    | 'light'      // 300
    | 'normal'     // 400
    | 'regular'    // 400
    | 'book'       // 400
    | 'medium'     // 500
    | 'semi-bold'  // 600
    | 'demi-bold'  // 600
    | 'bold'       // 700
    | 'extra-bold' // 800
    | 'ultra-bold' // 800
    | 'black'      // 900
    | 'heavy'      // 900
    | 'extra-black'// 950
    | 'ultra-black';// 950

/**
 * Font weight value.
 *
 * SPEC REQUIREMENTS:
 * - Number: Must be in range [1, 1000]
 * - String: Must be a valid preset name
 *
 * Examples:
 * 400
 * "bold"
 * "semi-bold"
 */
export type FontWeightValue = number | FontWeightPreset;

export type FontWeightToken = Token<TokenValue<FontWeightValue>>;

// ============================================================================
// DURATION TOKENS
// ============================================================================

/**
 * Allowed units for duration values.
 * SPEC REQUIREMENT: Only 'ms' and 's' are valid.
 */
export type DurationUnit = 'ms' | 's';

/**
 * Duration value for animation timing.
 *
 * SPEC REQUIREMENTS:
 * - value: REQUIRED number
 * - unit: REQUIRED, must be 'ms' or 's'
 *
 * Example:
 * { "value": 200, "unit": "ms" }
 */
export interface DurationValue {
    value: number;
    unit: DurationUnit;
}

export type DurationToken = Token<TokenValue<DurationValue>>;

// ============================================================================
// CUBIC BEZIER TOKENS
// ============================================================================

/**
 * Cubic Bézier value for animation easing.
 *
 * SPEC REQUIREMENTS:
 * - Array of exactly 4 numbers: [P1x, P1y, P2x, P2y]
 * - P1x and P2x must be in range [0, 1]
 * - P1y and P2y can be any number (allows overshoot)
 *
 * Example:
 * [0.42, 0, 0.58, 1]  // ease-in-out
 */
export type CubicBezierValue = [number, number, number, number];

export type CubicBezierToken = Token<TokenValue<CubicBezierValue>>;

// ============================================================================
// NUMBER TOKENS
// ============================================================================

/**
 * Number value for unitless quantities.
 *
 * SPEC REQUIREMENTS:
 * - Any valid JSON number
 * - Used for things like line-height, opacity, z-index
 *
 * Example:
 * 1.5  // line-height
 * 0.8  // opacity
 */
export type NumberValue = number;

export type NumberToken = Token<TokenValue<NumberValue>>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isColorValue(value: any): value is ColorValue {
    return (
        value &&
        typeof value === 'object' &&
        'colorSpace' in value &&
        'components' in value &&
        Array.isArray(value.components) &&
        value.components.length === 3
    );
}

export function isDimensionValue(value: any): value is DimensionValue {
    return (
        value &&
        typeof value === 'object' &&
        'value' in value &&
        typeof value.value === 'number' &&
        'unit' in value &&
        (value.unit === 'px' || value.unit === 'rem')
    );
}

export function isDurationValue(value: any): value is DurationValue {
    return (
        value &&
        typeof value === 'object' &&
        'value' in value &&
        typeof value.value === 'number' &&
        'unit' in value &&
        (value.unit === 'ms' || value.unit === 's')
    );
}

export function isCubicBezierValue(value: any): value is CubicBezierValue {
    return (
        Array.isArray(value) &&
        value.length === 4 &&
        value.every((n) => typeof n === 'number')
    );
}

export function isFontFamilyValue(value: any): value is FontFamilyValue {
    return (
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((v) => typeof v === 'string'))
    );
}

export function isFontWeightValue(value: any): value is FontWeightValue {
    if (typeof value === 'number') {
        return value >= 1 && value <= 1000;
    }
    if (typeof value === 'string') {
        const validPresets: FontWeightPreset[] = [
            'thin', 'hairline', 'extra-light', 'ultra-light', 'light',
            'normal', 'regular', 'book', 'medium', 'semi-bold', 'demi-bold',
            'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy',
            'extra-black', 'ultra-black'
        ];
        return validPresets.includes(value as FontWeightPreset);
    }
    return false;
}
