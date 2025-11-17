// src/core/tokens/converters/value-converters.ts
/**
 * Converters for primitive CSS values to spec-compliant formats.
 */

import {
    DimensionValue,
    DurationValue,
    CubicBezierValue,
    FontFamilyValue,
    FontWeightValue
} from '../types/primitives.js';
import {
    BorderValue,
    TypographyValue,
    BorderStyleValue,
    ShadowValue
} from '../types/composites.js';
import { convertCSSColorToSpec } from './color-converter.js';

// ============================================================================
// DIMENSION CONVERTERS
// ============================================================================

/**
 * Convert CSS size string to spec-compliant DimensionValue.
 *
 * Supports: px, rem
 * Examples: "16px", "1.5rem", "0"
 */
export function convertCSSSizeToDimension(cssSize: string): DimensionValue {
    const normalized = cssSize.trim().toLowerCase();

    // Handle unitless 0
    if (normalized === '0') {
        return { value: 0, unit: 'px' };
    }

    // Parse value and unit
    const match = normalized.match(/^([-\d.]+)(px|rem)$/);
    if (!match) {
        throw new Error(`Invalid CSS size: ${cssSize}. Expected format: "16px" or "1.5rem"`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] as 'px' | 'rem';

    return {
        value: Math.round(value * 1000) / 1000,
        unit
    };
}

// ============================================================================
// DURATION CONVERTERS
// ============================================================================

/**
 * Convert CSS time string to spec-compliant DurationValue.
 *
 * Supports: ms, s
 * Examples: "200ms", "0.2s", "1s"
 */
export function convertCSSTimeToDuration(cssTime: string): DurationValue {
    const normalized = cssTime.trim().toLowerCase();

    // Handle unitless 0
    if (normalized === '0') {
        return { value: 0, unit: 'ms' };
    }

    // Parse value and unit
    const match = normalized.match(/^([-\d.]+)(ms|s)$/);
    if (!match) {
        throw new Error(`Invalid CSS time: ${cssTime}. Expected format: "200ms" or "0.2s"`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] as 'ms' | 's';

    return {
        value: Math.round(value * 1000) / 1000,
        unit
    };
}

// ============================================================================
// CUBIC BEZIER CONVERTERS
// ============================================================================

/**
 * Convert CSS timing function to spec-compliant CubicBezierValue.
 *
 * Supports:
 * - cubic-bezier(x1, y1, x2, y2)
 * - Named presets: ease, ease-in, ease-out, ease-in-out, linear
 *
 * Examples:
 * "cubic-bezier(0.42, 0, 0.58, 1)"
 * "ease-in-out"
 */
export function convertCSSTimingFunctionToCubicBezier(cssTimingFunction: string): CubicBezierValue {
    const normalized = cssTimingFunction.trim().toLowerCase();

    // Check for named presets first
    const presets: Record<string, CubicBezierValue> = {
        linear: [0, 0, 1, 1],
        ease: [0.25, 0.1, 0.25, 1],
        'ease-in': [0.42, 0, 1, 1],
        'ease-out': [0, 0, 0.58, 1],
        'ease-in-out': [0.42, 0, 0.58, 1]
    };

    if (presets[normalized]) {
        return presets[normalized];
    }

    // Parse cubic-bezier() function
    const match = normalized.match(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
    if (!match) {
        throw new Error(`Invalid timing function: ${cssTimingFunction}`);
    }

    const x1 = parseFloat(match[1]);
    const y1 = parseFloat(match[2]);
    const x2 = parseFloat(match[3]);
    const y2 = parseFloat(match[4]);

    // Validate x coordinates are in [0, 1] range
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
        throw new Error(`Cubic bezier x-coordinates must be in range [0, 1]: ${cssTimingFunction}`);
    }

    return [
        Math.round(x1 * 1000) / 1000,
        Math.round(y1 * 1000) / 1000,
        Math.round(x2 * 1000) / 1000,
        Math.round(y2 * 1000) / 1000
    ];
}

// ============================================================================
// FONT CONVERTERS
// ============================================================================

/**
 * Convert CSS font-family string to spec-compliant FontFamilyValue.
 *
 * Examples:
 * "Arial" → "Arial"
 * "'Helvetica Neue', Helvetica, Arial, sans-serif" → ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
 */
export function convertCSSFontFamilyToSpec(cssFontFamily: string): FontFamilyValue {
    // Split by comma and clean up
    const fonts = cssFontFamily
        .split(',')
        .map((font) =>
            font
                .trim()
                .replace(/^["']|["']$/g, '') // Remove quotes
        )
        .filter((font) => font.length > 0);

    // Return single font or array
    return fonts.length === 1 ? fonts[0] : fonts;
}

/**
 * Convert CSS font-weight to spec-compliant FontWeightValue.
 *
 * Supports:
 * - Numbers: 100, 200, ..., 900
 * - Named: normal, bold, lighter, bolder
 *
 * Examples:
 * "400" → 400
 * "bold" → "bold"
 */
export function convertCSSFontWeightToSpec(cssFontWeight: string | number): FontWeightValue {
    // Handle numeric values
    if (typeof cssFontWeight === 'number') {
        if (cssFontWeight >= 1 && cssFontWeight <= 1000) {
            return cssFontWeight;
        }
        throw new Error(`Invalid font weight: ${cssFontWeight}. Must be in range [1, 1000]`);
    }

    const normalized = cssFontWeight.trim().toLowerCase();

    // Handle numeric strings
    const numericValue = parseInt(normalized, 10);
    if (!isNaN(numericValue)) {
        if (numericValue >= 1 && numericValue <= 1000) {
            return numericValue;
        }
        throw new Error(`Invalid font weight: ${cssFontWeight}. Must be in range [1, 1000]`);
    }

    // Map CSS keywords to spec presets
    const keywordMap: Record<string, FontWeightValue> = {
        normal: 400,
        bold: 700,
        lighter: 300, // Relative, approximated
        bolder: 700 // Relative, approximated
    };

    if (keywordMap[normalized] !== undefined) {
        return keywordMap[normalized];
    }

    // Try as spec preset name
    const validPresets = [
        'thin',
        'hairline',
        'extra-light',
        'ultra-light',
        'light',
        'normal',
        'regular',
        'book',
        'medium',
        'semi-bold',
        'demi-bold',
        'bold',
        'extra-bold',
        'ultra-bold',
        'black',
        'heavy',
        'extra-black',
        'ultra-black'
    ];

    if (validPresets.includes(normalized)) {
        return normalized as FontWeightValue;
    }

    throw new Error(`Invalid font weight: ${cssFontWeight}`);
}

// ============================================================================
// COMPOSITE CONVERTERS
// ============================================================================

/**
 * Convert CSS box-shadow string to spec-compliant ShadowValue.
 *
 * Supports: "0 4px 8px 0 rgba(0, 0, 0, 0.1)"
 * Format: offsetX offsetY blur spread color
 *
 * Note: Only supports single shadow (not multiple comma-separated shadows).
 * Inset shadows are not supported.
 */
export function convertCSSBoxShadowToSpec(cssBoxShadow: string): ShadowValue {
    const normalized = cssBoxShadow.trim().toLowerCase();

    // Handle 'none' case
    if (normalized === 'none') {
        throw new Error('Cannot convert "none" shadow to ShadowValue. Handle separately.');
    }

    // Parse box-shadow format supports both:
    // 1. Color first (browser computed style): "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"
    // 2. Color last (CSS authored): "0px 1px 2px 0px rgba(0, 0, 0, 0.05)"

    const parts = normalized.split(/\s+/);

    if (parts.length < 4) {
        throw new Error(`Invalid box-shadow: ${cssBoxShadow}. Expected at least 4 parts: offsetX offsetY blur spread/color`);
    }

    // Determine if color is first or last
    const startsWithColor = parts[0].startsWith('rgba') || parts[0].startsWith('rgb') ||
        parts[0].startsWith('hsl') || parts[0].startsWith('hsla') ||
        parts[0].startsWith('#');

    let dimensions: string[] = [];
    let colorParts: string[] = [];

    if (startsWithColor) {
        // Color first: rgba(...) offsetX offsetY blur spread
        // Collect all color parts (could be split by spaces within rgba)
        let colorEndIndex = 0;
        for (let i = 0; i < parts.length; i++) {
            colorParts.push(parts[i]);
            // Color ends when we hit the closing parenthesis
            if (parts[i].includes(')')) {
                colorEndIndex = i;
                break;
            }
        }
        // Everything after color is dimensions
        dimensions = parts.slice(colorEndIndex + 1);
    } else {
        // Color last: offsetX offsetY blur spread rgba(...)
        // Extract the dimensions (first 2-4 values)
        let inColor = false;
        for (const part of parts) {
            // If we hit rgba(), rgb(), hsl(), hsla(), or hex color, everything after is color
            if (part.startsWith('rgba') || part.startsWith('rgb') ||
                part.startsWith('hsl') || part.startsWith('hsla') ||
                part.startsWith('#')) {
                inColor = true;
            }

            if (inColor) {
                colorParts.push(part);
            } else {
                dimensions.push(part);
            }
        }
    }

    // We expect 2-4 dimensions: offsetX, offsetY, [blur], [spread]
    if (dimensions.length < 2 || dimensions.length > 4) {
        throw new Error(`Invalid box-shadow dimensions: ${cssBoxShadow}. Expected 2-4 dimension values.`);
    }

    const offsetX = convertCSSSizeToDimension(dimensions[0]);
    const offsetY = convertCSSSizeToDimension(dimensions[1]);
    const blur = dimensions.length >= 3 ? convertCSSSizeToDimension(dimensions[2]) : { value: 0, unit: 'px' as const };
    const spread = dimensions.length >= 4 ? convertCSSSizeToDimension(dimensions[3]) : { value: 0, unit: 'px' as const };

    // Parse color
    const colorString = colorParts.join(' ').trim();
    if (!colorString) {
        throw new Error(`No color found in box-shadow: ${cssBoxShadow}`);
    }

    const color = convertCSSColorToSpec(colorString);

    return {
        color,
        offsetX,
        offsetY,
        blur,
        spread
    };
}

/**
 * Convert CSS border shorthand to spec-compliant BorderValue.
 *
 * Supports: "1px solid #000000"
 * Note: This is a simplified parser. Full CSS border parsing is complex.
 */
export function convertCSSBorderToSpec(cssBorder: string): BorderValue {
    const parts = cssBorder.trim().split(/\s+/);

    if (parts.length < 3) {
        throw new Error(`Invalid CSS border: ${cssBorder}. Expected format: "1px solid #000000"`);
    }

    // Parse width (first token that looks like a size)
    const widthPart = parts.find((p) => /^\d+/.test(p));
    if (!widthPart) {
        throw new Error(`No width found in border: ${cssBorder}`);
    }

    // Parse style (should be a border style keyword)
    const stylePart = parts.find((p) =>
        ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'].includes(p)
    );
    if (!stylePart) {
        throw new Error(`No valid style found in border: ${cssBorder}`);
    }

    // Parse color (remaining part)
    const colorPart = parts.find((p) => p !== widthPart && p !== stylePart);
    if (!colorPart) {
        throw new Error(`No color found in border: ${cssBorder}`);
    }

    return {
        width: convertCSSSizeToDimension(widthPart),
        style: stylePart as BorderStyleValue,
        color: convertCSSColorToSpec(colorPart)
    };
}

/**
 * Parse CSS font shorthand into TypographyValue components.
 *
 * This is a simplified parser. Full CSS font parsing is extremely complex.
 * Example: "400 16px/1.5 'Helvetica Neue', Arial, sans-serif"
 */
export function convertCSSFontToTypography(cssFont: string): Partial<TypographyValue> {
    const result: Partial<TypographyValue> = {};

    // This would need a proper CSS font parser for production use
    // For now, return empty partial that can be filled by individual extractors
    console.warn('CSS font shorthand parsing not fully implemented. Use individual property extractors.');

    return result;
}

/**
 * Parse computed CSS properties into TypographyValue.
 *
 * @param props Object with individual CSS properties
 */
export function convertCSSPropertiesToTypography(props: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string | number;
    lineHeight?: string | number;
    letterSpacing?: string;
}): TypographyValue {
    // Parse font family
    if (!props.fontFamily) {
        throw new Error('fontFamily is required for typography token');
    }
    const fontFamily = convertCSSFontFamilyToSpec(props.fontFamily);

    // Parse font size
    if (!props.fontSize) {
        throw new Error('fontSize is required for typography token');
    }
    const fontSize = convertCSSSizeToDimension(props.fontSize);

    // Parse font weight
    const fontWeight = props.fontWeight
        ? convertCSSFontWeightToSpec(props.fontWeight)
        : 400;

    // Parse line height
    let lineHeight: number = 1.5;
    if (props.lineHeight !== undefined) {
        if (typeof props.lineHeight === 'number') {
            lineHeight = props.lineHeight;
        } else {
            // Remove 'px' or other units and parse as unitless multiplier
            const cleaned = props.lineHeight.replace(/px|rem|em/gi, '').trim();
            lineHeight = parseFloat(cleaned);
        }
    }

    // Parse letter spacing (optional)
    // Note: "normal" is the CSS default and means no extra spacing, so treat it as undefined
    const letterSpacing = props.letterSpacing && props.letterSpacing !== 'normal'
        ? convertCSSSizeToDimension(props.letterSpacing)
        : undefined;

    return {
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing
    };
}
