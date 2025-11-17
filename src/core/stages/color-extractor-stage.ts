// src/core/stages/color-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { convertCSSColorToSpec } from '../tokens/converters/color-converter.js';
import { ColorValue } from '../tokens/types/primitives.js';
import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';

interface ColorExtractorOptions {
    includeTextColors: boolean;
    includeBackgroundColors: boolean;
    includeBorderColors: boolean;
    minimumOccurrences: number;
    outputDir?: string;
}

interface ColorExtractionResult {
    tokens: ExtractedTokenData[];
    stats: {
        totalColors: number;
        uniqueColors: number;
        textColors: number;
        backgroundColors: number;
        borderColors: number;
    };
}

interface ExtractedColor {
    cssValue: string;          // Original CSS color string
    specValue: ColorValue;     // Spec-compliant ColorValue object
    source: string;
    element: string;
    usageCount: number;
    category?: string;
    name?: string;
    sourceUrls: string[];
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
        logger.info('Extracting colors', { pageCount: input.crawledPages?.length || 0 });

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

        // Convert the color map to spec-compliant design tokens
        const colorTokens: ExtractedTokenData[] = [];

        for (const [colorKey, colorInfo] of colorMap.entries()) {
            if (colorInfo.usageCount >= this.options.minimumOccurrences) {
                // Generate a name for the color if not already set
                const name = colorInfo.name || this.generateColorName(colorInfo.specValue.hex || colorKey, colorInfo.category || 'unknown');

                colorTokens.push({
                    type: 'color',
                    name,
                    value: colorInfo.specValue,  // Spec-compliant ColorValue object
                    category: colorInfo.category,
                    description: `${colorInfo.category || 'Color'} extracted from ${colorInfo.sourceUrls.length} page(s)`,
                    usageCount: colorInfo.usageCount,
                    source: colorInfo.source,
                    sourceUrls: colorInfo.sourceUrls
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

    private addToColorMap(colorMap: Map<string, ExtractedColor>, colors: Record<string, string>, category: string, sourceUrl: string): void {
        for (const [cssColor, element] of Object.entries(colors)) {
            try {
                // Convert CSS color to spec-compliant ColorValue
                const specValue = convertCSSColorToSpec(cssColor);

                // Use hex as the map key for deduplication
                const mapKey = specValue.hex || cssColor;

                if (colorMap.has(mapKey)) {
                    const existing = colorMap.get(mapKey)!;
                    existing.usageCount += 1;
                    // Add source URL if not already tracked
                    if (!existing.sourceUrls.includes(sourceUrl)) {
                        existing.sourceUrls.push(sourceUrl);
                        existing.source = `${existing.source}, ${element}`;
                    }
                } else {
                    colorMap.set(mapKey, {
                        cssValue: cssColor,
                        specValue,
                        source: element,
                        element,
                        usageCount: 1,
                        category,
                        sourceUrls: [sourceUrl]
                    });
                }
            } catch (error) {
                // Skip colors that can't be converted (e.g., invalid CSS)
                logger.warn(`Failed to convert color: ${cssColor}`, { error });
            }
        }
    }

    // Removed normalizeColor() - now using convertCSSColorToSpec() from converters

    private generateColorName(hexValue: string, category: string): string {
        // Generate semantic name from hex value
        // Remove # and use as identifier
        const cleanHex = hexValue.replace('#', '');
        return `${category}-${cleanHex}`.toLowerCase();
    }
}