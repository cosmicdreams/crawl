// src/core/stages/border-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {
    convertCSSSizeToDimension,
    convertCSSBoxShadowToSpec
} from '../tokens/converters/value-converters.js';
import { DimensionValue } from '../tokens/types/primitives.js';
import { BorderStyleValue, ShadowValue } from '../tokens/types/composites.js';
import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';

interface BorderExtractorOptions {
    includeBorderWidth: boolean;
    includeBorderStyle: boolean;
    includeBorderRadius: boolean;
    includeShadows: boolean;
    outputDir?: string;
    minimumOccurrences?: number;
}

interface BorderExtractionResult {
    tokens: ExtractedTokenData[];
    stats: {
        totalBorders: number;
        uniqueBorders: number;
        borderWidths: number;
        borderStyles: number;
        borderRadii: number;
        shadows: number;
    };
}

interface ExtractedBorder {
    cssValue: string;
    specValue: DimensionValue | BorderStyleValue | ShadowValue;
    property: string;
    element: string;
    usageCount: number;
    category: 'width' | 'style' | 'radius' | 'shadow';
    sourceUrls: string[];
}

export class BorderExtractorStage implements PipelineStage<CrawlResult, BorderExtractionResult> {
    name = 'border-extractor';

    constructor(private options: BorderExtractorOptions = {
        includeBorderWidth: true,
        includeBorderStyle: true,
        includeBorderRadius: true,
        includeShadows: true,
        outputDir: './results',
        minimumOccurrences: 2
    }) {}

    async process(input: CrawlResult): Promise<BorderExtractionResult> {
        logger.info('Extracting borders', { pageCount: input.crawledPages?.length || 0 });

        const outputDir = this.options.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const borderMap = new Map<string, ExtractedBorder>();

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            for (const pageInfo of input.crawledPages || []) {
                console.log(`Extracting borders from ${pageInfo.url}`);

                try {
                    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

                    // Extract border width values
                    if (this.options.includeBorderWidth) {
                        const borderWidths = await this.extractBorderWidths(page);
                        this.addToBorderMap(borderMap, borderWidths, 'width', pageInfo.url);
                    }

                    // Extract border style values
                    if (this.options.includeBorderStyle) {
                        const borderStyles = await this.extractBorderStyles(page);
                        this.addToBorderMap(borderMap, borderStyles, 'style', pageInfo.url);
                    }

                    // Extract border radius values
                    if (this.options.includeBorderRadius) {
                        const borderRadii = await this.extractBorderRadii(page);
                        this.addToBorderMap(borderMap, borderRadii, 'radius', pageInfo.url);
                    }

                    // Extract shadow values
                    if (this.options.includeShadows) {
                        const shadows = await this.extractShadows(page);
                        this.addToBorderMap(borderMap, shadows, 'shadow', pageInfo.url);
                    }

                } catch (error) {
                    logger.error(`Error extracting borders from ${pageInfo.url}`, { error });
                }
            }
        } finally {
            await browser.close();
        }

        // Convert the border map to spec-compliant design tokens
        const borderTokens: ExtractedTokenData[] = [];

        for (const [key, borderInfo] of borderMap.entries()) {
            if (borderInfo.usageCount >= (this.options.minimumOccurrences || 2)) {
                // Generate a name for the border
                const name = this.generateBorderName(borderInfo);

                // Determine the token type based on category
                let tokenType: 'dimension' | 'border' | 'shadow' | 'strokeStyle';
                if (borderInfo.category === 'width' || borderInfo.category === 'radius') {
                    tokenType = 'dimension';
                } else if (borderInfo.category === 'style') {
                    tokenType = 'strokeStyle';
                } else {
                    tokenType = 'shadow';
                }

                borderTokens.push({
                    type: tokenType,
                    name,
                    value: borderInfo.specValue,
                    category: borderInfo.category,
                    description: `${borderInfo.category} extracted from ${borderInfo.sourceUrls.length} page(s)`,
                    usageCount: borderInfo.usageCount,
                    source: borderInfo.property,
                    sourceUrls: borderInfo.sourceUrls
                });
            }
        }

        // Sort by usage count (descending)
        borderTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'border-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(borderTokens, null, 2));
        console.log(`Border extraction completed. Found ${borderTokens.length} borders. Results saved to ${outputFile}`);

        return {
            tokens: borderTokens,
            stats: {
                totalBorders: borderMap.size,
                uniqueBorders: borderTokens.length,
                borderWidths: borderTokens.filter(b => b.category === 'width').length,
                borderStyles: borderTokens.filter(b => b.category === 'style').length,
                borderRadii: borderTokens.filter(b => b.category === 'radius').length,
                shadows: borderTokens.filter(b => b.category === 'shadow').length
            }
        };
    }

    private async extractBorderWidths(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const borders = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract border width values
                ['borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px' && value !== 'medium') {
                        const key = value;

                        if (!borders.has(key)) {
                            borders.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = borders.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(borders);
        });
    }

    private async extractBorderStyles(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const borders = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract border style values
                ['borderStyle', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== 'none' && value !== 'hidden') {
                        const key = value;

                        if (!borders.has(key)) {
                            borders.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = borders.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(borders);
        });
    }

    private async extractBorderRadii(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const borders = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract border radius values
                ['borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px') {
                        const key = value;

                        if (!borders.has(key)) {
                            borders.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = borders.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(borders);
        });
    }

    private async extractShadows(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const shadows = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract box shadow values
                const value = style.getPropertyValue('box-shadow');
                if (value && value !== 'none') {
                    const key = value;

                    if (!shadows.has(key)) {
                        shadows.set(key, {
                            value: key,
                            property: 'box-shadow',
                            element: el.tagName.toLowerCase(),
                            usageCount: 1
                        });
                    } else {
                        const existing = shadows.get(key);
                        existing.usageCount += 1;
                    }
                }
            });

            return Object.fromEntries(shadows);
        });
    }

    private addToBorderMap(
        borderMap: Map<string, ExtractedBorder>,
        borders: Record<string, any>,
        category: 'width' | 'style' | 'radius' | 'shadow',
        sourceUrl: string
    ): void {
        for (const [cssValue, borderInfo] of Object.entries(borders)) {
            try {
                // Convert CSS value to spec-compliant format based on category
                let specValue: DimensionValue | BorderStyleValue | ShadowValue;

                if (category === 'width' || category === 'radius') {
                    specValue = convertCSSSizeToDimension(cssValue);
                } else if (category === 'style') {
                    specValue = cssValue as BorderStyleValue;
                } else if (category === 'shadow') {
                    specValue = convertCSSBoxShadowToSpec(cssValue);
                }

                // Use the CSS value as the map key for deduplication
                const mapKey = cssValue;

                if (borderMap.has(mapKey)) {
                    const existing = borderMap.get(mapKey)!;
                    existing.usageCount += borderInfo.usageCount;
                    // Add source URL if not already tracked
                    if (!existing.sourceUrls.includes(sourceUrl)) {
                        existing.sourceUrls.push(sourceUrl);
                    }
                } else {
                    borderMap.set(mapKey, {
                        cssValue,
                        specValue: specValue!,
                        property: borderInfo.property,
                        element: borderInfo.element,
                        usageCount: borderInfo.usageCount,
                        category,
                        sourceUrls: [sourceUrl]
                    });
                }
            } catch (error) {
                // Skip border values that can't be converted
                logger.warn(`Failed to convert border value: ${cssValue}`, { error });
            }
        }
    }

    private generateBorderName(border: ExtractedBorder): string {
        const category = border.category;

        // Handle border widths
        if (category === 'width') {
            const { value, unit } = border.specValue as DimensionValue;

            // Common border width values
            if (value === 0) return 'border-width-0';
            if (value === 1 && unit === 'px') return 'border-width-1';
            if (value === 2 && unit === 'px') return 'border-width-2';
            if (value === 4 && unit === 'px') return 'border-width-4';

            return `border-width-${value}-${unit}`;
        }

        // Handle border styles
        if (category === 'style') {
            return `border-style-${border.specValue}`;
        }

        // Handle border radii
        if (category === 'radius') {
            const { value, unit } = border.specValue as DimensionValue;

            // Common radius values
            if (value === 0) return 'border-radius-0';

            // Map to semantic names
            if (unit === 'rem') {
                if (value <= 0.25) return 'border-radius-sm';
                if (value <= 0.5) return 'border-radius-md';
                if (value <= 1) return 'border-radius-lg';
            }

            if (unit === 'px') {
                if (value <= 4) return 'border-radius-sm';
                if (value <= 8) return 'border-radius-md';
                if (value <= 16) return 'border-radius-lg';
                if (value >= 9999) return 'border-radius-full';
            }

            return `border-radius-${value}-${unit}`;
        }

        // Handle shadows
        if (category === 'shadow') {
            const shadowValue = border.specValue as ShadowValue;
            const blur = shadowValue.blur as DimensionValue;

            // Map to semantic shadow sizes based on blur
            if (blur.value <= 2) return 'shadow-sm';
            if (blur.value <= 8) return 'shadow-md';
            if (blur.value <= 16) return 'shadow-lg';

            return `shadow-${blur.value}-${blur.unit}`;
        }

        // Default naming scheme
        return `border-${category}-unknown`;
    }
}
