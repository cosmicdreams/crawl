// src/core/stages/color-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult, DesignToken } from '../types.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

interface ColorExtractorOptions {
    includeTextColors: boolean;
    includeBackgroundColors: boolean;
    includeBorderColors: boolean;
    minimumOccurrences: number;
    outputDir?: string;
}

interface ColorExtractionResult {
    tokens: DesignToken[];
    stats: {
        totalColors: number;
        uniqueColors: number;
        textColors: number;
        backgroundColors: number;
        borderColors: number;
    };
}

interface ExtractedColor {
    value: string;
    source: string;
    element: string;
    usageCount: number;
    category?: string;
    name?: string;
}

export class ColorExtractorStage implements PipelineStage<CrawlResult, ColorExtractionResult> {
    name = 'color-extractor';

    constructor(private options: ColorExtractorOptions = {
        includeTextColors: true,
        includeBackgroundColors: true,
        includeBorderColors: true,
        minimumOccurrences: 2,
        outputDir: './results'
    }) {}

    async process(input: CrawlResult): Promise<ColorExtractionResult> {
        console.log(`Extracting colors from ${input.crawledPages?.length || 0} pages`);

        const outputDir = this.options.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const colorMap = new Map<string, ExtractedColor>();

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            for (const pageInfo of input.crawledPages || []) {
                console.log(`Extracting colors from ${pageInfo.url}`);

                try {
                    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

                    // Extract text colors
                    if (this.options.includeTextColors) {
                        const textColors = await this.extractTextColors(page);
                        this.addToColorMap(colorMap, textColors, 'text', pageInfo.url);
                    }

                    // Extract background colors
                    if (this.options.includeBackgroundColors) {
                        const bgColors = await this.extractBackgroundColors(page);
                        this.addToColorMap(colorMap, bgColors, 'background', pageInfo.url);
                    }

                    // Extract border colors
                    if (this.options.includeBorderColors) {
                        const borderColors = await this.extractBorderColors(page);
                        this.addToColorMap(colorMap, borderColors, 'border', pageInfo.url);
                    }

                } catch (error) {
                    console.error(`Error extracting colors from ${pageInfo.url}:`, error);
                }
            }
        } finally {
            await browser.close();
        }

        // Convert the color map to design tokens
        const colorTokens: DesignToken[] = [];

        for (const [colorValue, colorInfo] of colorMap.entries()) {
            if (colorInfo.usageCount >= this.options.minimumOccurrences) {
                // Generate a name for the color if not already set
                const name = colorInfo.name || this.generateColorName(colorValue, colorInfo.category || 'unknown');

                colorTokens.push({
                    name,
                    value: colorValue,
                    type: 'color',
                    category: colorInfo.category,
                    description: `Extracted from ${colorInfo.source}`,
                    usageCount: colorInfo.usageCount,
                    source: colorInfo.source
                });
            }
        }

        // Sort by usage count (descending)
        colorTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'color-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(colorTokens, null, 2));
        console.log(`Color extraction completed. Found ${colorTokens.length} colors. Results saved to ${outputFile}`);

        return {
            tokens: colorTokens,
            stats: {
                totalColors: colorMap.size,
                uniqueColors: colorTokens.length,
                textColors: colorTokens.filter(c => c.category === 'text').length,
                backgroundColors: colorTokens.filter(c => c.category === 'background').length,
                borderColors: colorTokens.filter(c => c.category === 'border').length
            }
        };
    }

    private async extractTextColors(page: any): Promise<Record<string, string>> {
        return await page.evaluate(() => {
            const colors = new Map<string, string>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const color = style.color;

                if (color && color !== 'rgba(0, 0, 0, 0)') {
                    colors.set(color, el.tagName.toLowerCase());
                }
            });

            return Object.fromEntries(colors);
        });
    }

    private async extractBackgroundColors(page: any): Promise<Record<string, string>> {
        return await page.evaluate(() => {
            const colors = new Map<string, string>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const bgColor = style.backgroundColor;

                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    colors.set(bgColor, el.tagName.toLowerCase());
                }
            });

            return Object.fromEntries(colors);
        });
    }

    private async extractBorderColors(page: any): Promise<Record<string, string>> {
        return await page.evaluate(() => {
            const colors = new Map<string, string>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const borderColor = style.borderColor;

                if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
                    colors.set(borderColor, el.tagName.toLowerCase());
                }
            });

            return Object.fromEntries(colors);
        });
    }

    private addToColorMap(colorMap: Map<string, ExtractedColor>, colors: Record<string, string>, category: string, source: string): void {
        for (const [colorValue, element] of Object.entries(colors)) {
            // Normalize color to hex if possible
            const normalizedColor = this.normalizeColor(colorValue);

            if (normalizedColor) {
                if (colorMap.has(normalizedColor)) {
                    const existing = colorMap.get(normalizedColor)!;
                    existing.usageCount += 1;
                    // Keep track of different sources
                    if (!existing.source.includes(source)) {
                        existing.source = `${existing.source}, ${source}`;
                    }
                } else {
                    colorMap.set(normalizedColor, {
                        value: normalizedColor,
                        source,
                        element,
                        usageCount: 1,
                        category
                    });
                }
            }
        }
    }

    private normalizeColor(color: string): string | null {
        // Handle hex colors
        if (color.startsWith('#')) {
            return color.toLowerCase();
        }

        // Handle rgb/rgba colors
        const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

            // If fully transparent, ignore
            if (a === 0) return null;

            // Convert to hex
            if (a === 1) {
                const rHex = r.toString(16).padStart(2, '0');
                const gHex = g.toString(16).padStart(2, '0');
                const bHex = b.toString(16).padStart(2, '0');
                return `#${rHex}${gHex}${bHex}`;
            }

            // Keep rgba for semi-transparent colors
            return color;
        }

        // Handle named colors (would need a color name to hex mapping)
        // For simplicity, we'll just return the original color
        return color;
    }

    private generateColorName(colorValue: string, category: string): string {
        // For hex colors, generate a simple name based on the hex value
        if (colorValue.startsWith('#')) {
            const shortHex = colorValue.length > 4 ? colorValue.substring(1, 7) : colorValue.substring(1);
            return `${category}-${shortHex}`;
        }

        // For rgb colors, extract the values
        const rgbMatch = colorValue.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

            // Create a name based on RGB values
            if (a < 1) {
                return `${category}-rgb-${r}-${g}-${b}-${Math.round(a * 100)}`;
            }

            return `${category}-rgb-${r}-${g}-${b}`;
        }

        // Fallback: use the color value as part of the name
        const safeValue = colorValue.replace(/[^a-zA-Z0-9]/g, '-');
        return `${category}-color-${safeValue}`;
    }
}