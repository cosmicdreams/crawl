// src/core/tokens/converters/color-converter.ts
/**
 * Converts CSS color strings to spec-compliant ColorValue objects.
 */

import { ColorValue, ColorSpace } from '../types/primitives.js';

/**
 * Convert CSS color string to spec-compliant ColorValue.
 *
 * Supports:
 * - Hex: #RGB, #RRGGBB, #RRGGBBAA
 * - RGB: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * - Named colors: red, blue, etc.
 *
 * @param cssColor CSS color string
 * @param colorSpace Target color space (default: 'srgb')
 * @returns Spec-compliant ColorValue object
 */
export function convertCSSColorToSpec(
    cssColor: string,
    colorSpace: ColorSpace = 'srgb'
): ColorValue {
    const normalized = cssColor.trim().toLowerCase();

    // Try hex format first
    if (normalized.startsWith('#')) {
        return convertHexToSpec(normalized, colorSpace);
    }

    // Try rgb/rgba format
    if (normalized.startsWith('rgb')) {
        return convertRGBToSpec(normalized, colorSpace);
    }

    // Try hsl/hsla format
    if (normalized.startsWith('hsl')) {
        return convertHSLToSpec(normalized, colorSpace);
    }

    // Try named color
    const namedColor = NAMED_COLORS[normalized];
    if (namedColor) {
        return convertHexToSpec(namedColor, colorSpace);
    }

    // Fallback: treat as hex
    throw new Error(`Unable to parse CSS color: ${cssColor}`);
}

/**
 * Convert hex color to spec format.
 *
 * Supports: #RGB, #RRGGBB, #RRGGBBAA
 */
function convertHexToSpec(hex: string, colorSpace: ColorSpace): ColorValue {
    let cleanHex = hex.replace('#', '');

    // Expand shorthand #RGB to #RRGGBB
    if (cleanHex.length === 3) {
        cleanHex = cleanHex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    // Parse RGB components
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    // Parse alpha if present
    let alpha = 1;
    if (cleanHex.length === 8) {
        alpha = parseInt(cleanHex.substring(6, 8), 16) / 255;
    }

    return {
        colorSpace,
        components: [
            Math.round(r * 1000) / 1000,
            Math.round(g * 1000) / 1000,
            Math.round(b * 1000) / 1000
        ],
        alpha: alpha !== 1 ? Math.round(alpha * 1000) / 1000 : undefined,
        hex: `#${cleanHex.substring(0, 6)}`
    };
}

/**
 * Convert rgb/rgba to spec format.
 *
 * Supports: rgb(r, g, b), rgba(r, g, b, a)
 */
function convertRGBToSpec(rgb: string, colorSpace: ColorSpace): ColorValue {
    const match = rgb.match(/rgba?\(([^)]+)\)/);
    if (!match) {
        throw new Error(`Invalid RGB color: ${rgb}`);
    }

    const parts = match[1].split(',').map((p) => p.trim());

    const r = parseFloat(parts[0]) / 255;
    const g = parseFloat(parts[1]) / 255;
    const b = parseFloat(parts[2]) / 255;
    const alpha = parts[3] ? parseFloat(parts[3]) : 1;

    // Convert to hex for convenience
    const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
    const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
    const bHex = Math.round(b * 255).toString(16).padStart(2, '0');
    const hex = `#${rHex}${gHex}${bHex}`;

    return {
        colorSpace,
        components: [
            Math.round(r * 1000) / 1000,
            Math.round(g * 1000) / 1000,
            Math.round(b * 1000) / 1000
        ],
        alpha: alpha !== 1 ? Math.round(alpha * 1000) / 1000 : undefined,
        hex
    };
}

/**
 * Convert hsl/hsla to spec format.
 *
 * Supports: hsl(h, s%, l%), hsla(h, s%, l%, a)
 */
function convertHSLToSpec(hsl: string, colorSpace: ColorSpace): ColorValue {
    const match = hsl.match(/hsla?\(([^)]+)\)/);
    if (!match) {
        throw new Error(`Invalid HSL color: ${hsl}`);
    }

    const parts = match[1].split(',').map((p) => p.trim());

    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1].replace('%', '')) / 100;
    const l = parseFloat(parts[2].replace('%', '')) / 100;
    const alpha = parts[3] ? parseFloat(parts[3]) : 1;

    // Convert HSL to RGB
    const [r, g, b] = hslToRgb(h, s, l);

    // Convert to hex
    const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
    const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
    const bHex = Math.round(b * 255).toString(16).padStart(2, '0');
    const hex = `#${rHex}${gHex}${bHex}`;

    return {
        colorSpace,
        components: [
            Math.round(r * 1000) / 1000,
            Math.round(g * 1000) / 1000,
            Math.round(b * 1000) / 1000
        ],
        alpha: alpha !== 1 ? Math.round(alpha * 1000) / 1000 : undefined,
        hex
    };
}

/**
 * Convert HSL to RGB (helper function).
 *
 * @param h Hue (0-360)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns RGB components [0-1, 0-1, 0-1]
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
}

/**
 * Common named CSS colors mapping to hex values.
 * Subset for common use cases - full list would be larger.
 */
const NAMED_COLORS: Record<string, string> = {
    // Red tones
    red: '#ff0000',
    crimson: '#dc143c',
    firebrick: '#b22222',
    darkred: '#8b0000',

    // Pink tones
    pink: '#ffc0cb',
    hotpink: '#ff69b4',
    deeppink: '#ff1493',

    // Orange tones
    orange: '#ffa500',
    orangered: '#ff4500',
    darkorange: '#ff8c00',

    // Yellow tones
    yellow: '#ffff00',
    gold: '#ffd700',
    khaki: '#f0e68c',

    // Green tones
    green: '#008000',
    lime: '#00ff00',
    forestgreen: '#228b22',
    darkgreen: '#006400',
    olive: '#808000',

    // Blue tones
    blue: '#0000ff',
    navy: '#000080',
    darkblue: '#00008b',
    mediumblue: '#0000cd',
    royalblue: '#4169e1',
    steelblue: '#4682b4',
    lightblue: '#add8e6',
    skyblue: '#87ceeb',

    // Purple tones
    purple: '#800080',
    indigo: '#4b0082',
    violet: '#ee82ee',
    magenta: '#ff00ff',

    // Brown tones
    brown: '#a52a2a',
    maroon: '#800000',
    sienna: '#a0522d',

    // White/Gray/Black
    white: '#ffffff',
    black: '#000000',
    gray: '#808080',
    grey: '#808080',
    silver: '#c0c0c0',
    lightgray: '#d3d3d3',
    darkgray: '#a9a9a9',

    // Special
    transparent: '#00000000'
};
