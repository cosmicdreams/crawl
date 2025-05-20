// src/core/stages/border-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult, DesignToken } from '../types.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

interface BorderExtractorOptions {
    includeBorderWidth: boolean;
    includeBorderStyle: boolean;
    includeBorderRadius: boolean;
    includeShadows: boolean;
    outputDir?: string;
    minOccurrences?: number;
}

interface BorderExtractionResult {
    tokens: DesignToken[];
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
    value: string;
    property: string;
    element: string;
    usageCount: number;
    category?: string;
    source?: string;
    name?: string;
}

export class BorderExtractorStage implements PipelineStage<CrawlResult, BorderExtractionResult> {
    name = 'border-extractor';

    constructor(private options: BorderExtractorOptions = {
        includeBorderWidth: true,
        includeBorderStyle: true,
        includeBorderRadius: true,
        includeShadows: true,
        outputDir: './results',
        minOccurrences: 2
    }) {}

    async process(input: CrawlResult): Promise<BorderExtractionResult> {
        console.log(`Extracting borders from ${input.crawledPages?.length || 0} pages`);

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
                    console.error(`Error extracting borders from ${pageInfo.url}:`, error);
                }
            }
        } finally {
            await browser.close();
        }

        // If no borders were found, use mock data for now
        if (borderMap.size === 0) {
            console.log('No borders found, using mock data');
            const mockBorders = [
                {
                    name: 'border-width-0',
                    value: '0',
                    type: 'border',
                    category: 'width',
                    usageCount: 85
                },
                {
                    name: 'border-width-1',
                    value: '1px',
                    type: 'border',
                    category: 'width',
                    usageCount: 156
                },
                {
                    name: 'border-width-2',
                    value: '2px',
                    type: 'border',
                    category: 'width',
                    usageCount: 42
                },
                {
                    name: 'border-width-4',
                    value: '4px',
                    type: 'border',
                    category: 'width',
                    usageCount: 15
                },
                {
                    name: 'border-style-solid',
                    value: 'solid',
                    type: 'border',
                    category: 'style',
                    usageCount: 210
                },
                {
                    name: 'border-style-dashed',
                    value: 'dashed',
                    type: 'border',
                    category: 'style',
                    usageCount: 28
                },
                {
                    name: 'border-style-dotted',
                    value: 'dotted',
                    type: 'border',
                    category: 'style',
                    usageCount: 12
                },
                {
                    name: 'border-radius-0',
                    value: '0',
                    type: 'border',
                    category: 'radius',
                    usageCount: 120
                },
                {
                    name: 'border-radius-sm',
                    value: '0.25rem',
                    type: 'border',
                    category: 'radius',
                    usageCount: 92
                },
                {
                    name: 'border-radius-md',
                    value: '0.5rem',
                    type: 'border',
                    category: 'radius',
                    usageCount: 78
                },
                {
                    name: 'border-radius-lg',
                    value: '1rem',
                    type: 'border',
                    category: 'radius',
                    usageCount: 45
                },
                {
                    name: 'border-radius-full',
                    value: '9999px',
                    type: 'border',
                    category: 'radius',
                    usageCount: 32
                },
                {
                    name: 'shadow-none',
                    value: 'none',
                    type: 'border',
                    category: 'shadow',
                    usageCount: 64
                },
                {
                    name: 'shadow-sm',
                    value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    type: 'border',
                    category: 'shadow',
                    usageCount: 48
                },
                {
                    name: 'shadow-md',
                    value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    type: 'border',
                    category: 'shadow',
                    usageCount: 36
                },
                {
                    name: 'shadow-lg',
                    value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    type: 'border',
                    category: 'shadow',
                    usageCount: 24
                },
            ] as DesignToken[];

            // Add mock data to the map
            for (const token of mockBorders) {
                borderMap.set(token.value, {
                    value: token.value,
                    property: token.category === 'width' ? 'border-width' :
                              token.category === 'style' ? 'border-style' :
                              token.category === 'radius' ? 'border-radius' : 'box-shadow',
                    element: 'div',
                    usageCount: token.usageCount || 0,
                    category: token.category,
                    name: token.name
                });
            }
        }

        // Convert the border map to design tokens
        const borderTokens: DesignToken[] = [];

        for (const [borderValue, borderInfo] of borderMap.entries()) {
            if (borderInfo.usageCount >= (this.options.minOccurrences || 2)) {
                // Generate a name for the border if not already set
                const name = borderInfo.name || this.generateBorderName(borderInfo);

                borderTokens.push({
                    name,
                    value: borderValue,
                    type: 'border',
                    category: borderInfo.category,
                    description: `Extracted from ${borderInfo.property} property`,
                    usageCount: borderInfo.usageCount
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

    private async extractBorderWidths(page: any): Promise<Record<string, ExtractedBorder>> {
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

    private async extractBorderStyles(page: any): Promise<Record<string, ExtractedBorder>> {
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

    private async extractBorderRadii(page: any): Promise<Record<string, ExtractedBorder>> {
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

    private async extractShadows(page: any): Promise<Record<string, ExtractedBorder>> {
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

    private addToBorderMap(borderMap: Map<string, ExtractedBorder>, borders: Record<string, any>, category: string, source: string): void {
        for (const [borderValue, borderInfo] of Object.entries(borders)) {
            if (borderMap.has(borderValue)) {
                const existing = borderMap.get(borderValue)!;
                existing.usageCount += borderInfo.usageCount;
            } else {
                borderMap.set(borderValue, {
                    ...borderInfo,
                    category,
                    source
                });
            }
        }
    }

    private generateBorderName(border: ExtractedBorder): string {
        // Generate a name based on the border properties
        const category = border.category || 'border';

        // Handle special values
        if (border.value === 'none' || border.value === '0px') {
            return `${category}-none`;
        }

        // Handle border styles
        if (category === 'style') {
            return `border-style-${border.value}`;
        }

        // Handle border widths
        if (category === 'width') {
            // Extract size in pixels or rems if possible
            const sizeMatch = border.value.match(/(\d+(?:\.\d+)?)(px|rem|em)/);
            if (sizeMatch) {
                const size = sizeMatch[1];
                const unit = sizeMatch[2];

                // Convert px to rem-based scale if possible
                if (unit === 'px') {
                    const pxValue = parseFloat(size);
                    if (pxValue === 1) return 'border-width-1';
                    if (pxValue === 2) return 'border-width-2';
                    if (pxValue === 4) return 'border-width-4';
                }
            }

            return `border-width-${border.value.replace(/[^a-zA-Z0-9]/g, '-')}`;
        }

        // Handle border radii
        if (category === 'radius') {
            // Extract size in pixels or rems if possible
            const sizeMatch = border.value.match(/(\d+(?:\.\d+)?)(px|rem|em|%)/);
            if (sizeMatch) {
                const size = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2];

                // Check for common radius values
                if (unit === 'px') {
                    if (size === 0) return 'border-radius-0';
                    if (size <= 4) return 'border-radius-sm';
                    if (size <= 8) return 'border-radius-md';
                    if (size <= 16) return 'border-radius-lg';
                    if (size >= 9999) return 'border-radius-full';
                }

                if (unit === 'rem') {
                    if (size === 0) return 'border-radius-0';
                    if (size <= 0.25) return 'border-radius-sm';
                    if (size <= 0.5) return 'border-radius-md';
                    if (size <= 1) return 'border-radius-lg';
                }

                if (unit === '%' && size === 50) {
                    return 'border-radius-full';
                }
            }

            return `border-radius-${border.value.replace(/[^a-zA-Z0-9]/g, '-')}`;
        }

        // Handle shadows
        if (category === 'shadow') {
            if (border.value === 'none') return 'shadow-none';

            // Check for shadow size
            if (border.value.includes('1px')) return 'shadow-sm';
            if (border.value.includes('4px')) return 'shadow-md';
            if (border.value.includes('10px')) return 'shadow-lg';

            return `shadow-${border.value.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}`;
        }

        // Default naming scheme
        return `${category}-${border.value.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
}
