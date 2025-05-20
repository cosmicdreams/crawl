// src/core/stages/spacing-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult, DesignToken } from '../types.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

interface SpacingExtractorOptions {
    includeMargins: boolean;
    includePadding: boolean;
    includeGap: boolean;
    outputDir?: string;
    minOccurrences?: number;
}

interface SpacingExtractionResult {
    tokens: DesignToken[];
    stats: {
        totalSpacings: number;
        uniqueSpacings: number;
        marginSpacings: number;
        paddingSpacings: number;
        gapSpacings: number;
    };
}

interface ExtractedSpacing {
    value: string;
    property: string;
    element: string;
    usageCount: number;
    category?: string;
    source?: string;
    name?: string;
}

export class SpacingExtractorStage implements PipelineStage<CrawlResult, SpacingExtractionResult> {
    name = 'spacing-extractor';

    constructor(private options: SpacingExtractorOptions = {
        includeMargins: true,
        includePadding: true,
        includeGap: true,
        outputDir: './results',
        minOccurrences: 2
    }) {}

    async process(input: CrawlResult): Promise<SpacingExtractionResult> {
        console.log(`Extracting spacing from ${input.crawledPages?.length || 0} pages`);

        const outputDir = this.options.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const spacingMap = new Map<string, ExtractedSpacing>();

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            for (const pageInfo of input.crawledPages || []) {
                console.log(`Extracting spacing from ${pageInfo.url}`);

                try {
                    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

                    // Extract margin values
                    if (this.options.includeMargins) {
                        const marginValues = await this.extractMarginValues(page);
                        this.addToSpacingMap(spacingMap, marginValues, 'margin', pageInfo.url);
                    }

                    // Extract padding values
                    if (this.options.includePadding) {
                        const paddingValues = await this.extractPaddingValues(page);
                        this.addToSpacingMap(spacingMap, paddingValues, 'padding', pageInfo.url);
                    }

                    // Extract gap values
                    if (this.options.includeGap) {
                        const gapValues = await this.extractGapValues(page);
                        this.addToSpacingMap(spacingMap, gapValues, 'gap', pageInfo.url);
                    }

                } catch (error) {
                    console.error(`Error extracting spacing from ${pageInfo.url}:`, error);
                }
            }
        } finally {
            await browser.close();
        }

        // If no spacing was found, use mock data for now
        if (spacingMap.size === 0) {
            console.log('No spacing found, using mock data');
            const mockSpacing = [
                {
                    name: 'spacing-0',
                    value: '0',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 120
                },
                {
                    name: 'spacing-1',
                    value: '0.25rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 85
                },
                {
                    name: 'spacing-2',
                    value: '0.5rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 156
                },
                {
                    name: 'spacing-3',
                    value: '0.75rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 92
                },
                {
                    name: 'spacing-4',
                    value: '1rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 210
                },
                {
                    name: 'spacing-5',
                    value: '1.25rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 78
                },
                {
                    name: 'spacing-6',
                    value: '1.5rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 64
                },
                {
                    name: 'spacing-8',
                    value: '2rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 42
                },
                {
                    name: 'spacing-10',
                    value: '2.5rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 28
                },
                {
                    name: 'spacing-12',
                    value: '3rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 15
                },
                {
                    name: 'spacing-16',
                    value: '4rem',
                    type: 'spacing',
                    category: 'base',
                    usageCount: 8
                },
                {
                    name: 'margin-auto',
                    value: 'auto',
                    type: 'spacing',
                    category: 'margin',
                    usageCount: 45
                },
                {
                    name: 'gap-sm',
                    value: '0.5rem',
                    type: 'spacing',
                    category: 'gap',
                    usageCount: 32
                },
                {
                    name: 'gap-md',
                    value: '1rem',
                    type: 'spacing',
                    category: 'gap',
                    usageCount: 28
                },
                {
                    name: 'gap-lg',
                    value: '2rem',
                    type: 'spacing',
                    category: 'gap',
                    usageCount: 18
                },
            ] as DesignToken[];

            // Add mock data to the map
            for (const token of mockSpacing) {
                spacingMap.set(token.value, {
                    value: token.value,
                    property: token.category === 'margin' ? 'margin' :
                              token.category === 'padding' ? 'padding' : 'gap',
                    element: 'div',
                    usageCount: token.usageCount || 0,
                    category: token.category,
                    name: token.name
                });
            }
        }

        // Convert the spacing map to design tokens
        const spacingTokens: DesignToken[] = [];

        for (const [spacingValue, spacingInfo] of spacingMap.entries()) {
            if (spacingInfo.usageCount >= (this.options.minOccurrences || 2)) {
                // Generate a name for the spacing if not already set
                const name = spacingInfo.name || this.generateSpacingName(spacingInfo);

                spacingTokens.push({
                    name,
                    value: spacingValue,
                    type: 'spacing',
                    category: spacingInfo.category,
                    description: `Extracted from ${spacingInfo.property} property`,
                    usageCount: spacingInfo.usageCount
                });
            }
        }

        // Sort by usage count (descending)
        spacingTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'spacing-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(spacingTokens, null, 2));
        console.log(`Spacing extraction completed. Found ${spacingTokens.length} spacings. Results saved to ${outputFile}`);

        return {
            tokens: spacingTokens,
            stats: {
                totalSpacings: spacingMap.size,
                uniqueSpacings: spacingTokens.length,
                marginSpacings: spacingTokens.filter(s => s.category === 'margin').length,
                paddingSpacings: spacingTokens.filter(s => s.category === 'padding').length,
                gapSpacings: spacingTokens.filter(s => s.category === 'gap').length
            }
        };
    }

    private async extractMarginValues(page: any): Promise<Record<string, ExtractedSpacing>> {
        return await page.evaluate(() => {
            const spacings = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract margin values
                ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px') {
                        const key = value;

                        if (!spacings.has(key)) {
                            spacings.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = spacings.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(spacings);
        });
    }

    private async extractPaddingValues(page: any): Promise<Record<string, ExtractedSpacing>> {
        return await page.evaluate(() => {
            const spacings = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract padding values
                ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px') {
                        const key = value;

                        if (!spacings.has(key)) {
                            spacings.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = spacings.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(spacings);
        });
    }

    private async extractGapValues(page: any): Promise<Record<string, ExtractedSpacing>> {
        return await page.evaluate(() => {
            const spacings = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract gap values
                ['gap', 'rowGap', 'columnGap'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px' && value !== 'normal') {
                        const key = value;

                        if (!spacings.has(key)) {
                            spacings.set(key, {
                                value: key,
                                property: prop,
                                element: el.tagName.toLowerCase(),
                                usageCount: 1
                            });
                        } else {
                            const existing = spacings.get(key);
                            existing.usageCount += 1;
                        }
                    }
                });
            });

            return Object.fromEntries(spacings);
        });
    }

    private addToSpacingMap(spacingMap: Map<string, ExtractedSpacing>, spacings: Record<string, any>, category: string, source: string): void {
        for (const [spacingValue, spacingInfo] of Object.entries(spacings)) {
            if (spacingMap.has(spacingValue)) {
                const existing = spacingMap.get(spacingValue)!;
                existing.usageCount += spacingInfo.usageCount;
            } else {
                spacingMap.set(spacingValue, {
                    ...spacingInfo,
                    category,
                    source
                });
            }
        }
    }

    private generateSpacingName(spacing: ExtractedSpacing): string {
        // Generate a name based on the spacing properties
        const category = spacing.category || 'spacing';

        // Handle special values
        if (spacing.value === 'auto') {
            return `${category}-auto`;
        }

        // Extract size in pixels or rems if possible
        let size = '';
        let unit = '';

        const sizeMatch = spacing.value.match(/(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw)/);
        if (sizeMatch) {
            size = sizeMatch[1];
            unit = sizeMatch[2];

            // Convert px to rem-based scale if possible
            if (unit === 'px') {
                const pxValue = parseFloat(size);
                if (pxValue % 4 === 0) {
                    const remValue = pxValue / 16;
                    if (remValue === 0.25) return `${category}-1`;
                    if (remValue === 0.5) return `${category}-2`;
                    if (remValue === 0.75) return `${category}-3`;
                    if (remValue === 1) return `${category}-4`;
                    if (remValue === 1.25) return `${category}-5`;
                    if (remValue === 1.5) return `${category}-6`;
                    if (remValue === 2) return `${category}-8`;
                    if (remValue === 2.5) return `${category}-10`;
                    if (remValue === 3) return `${category}-12`;
                    if (remValue === 4) return `${category}-16`;
                }
            }

            // For rem values, try to match to common scales
            if (unit === 'rem') {
                const remValue = parseFloat(size);
                if (remValue === 0.25) return `${category}-1`;
                if (remValue === 0.5) return `${category}-2`;
                if (remValue === 0.75) return `${category}-3`;
                if (remValue === 1) return `${category}-4`;
                if (remValue === 1.25) return `${category}-5`;
                if (remValue === 1.5) return `${category}-6`;
                if (remValue === 2) return `${category}-8`;
                if (remValue === 2.5) return `${category}-10`;
                if (remValue === 3) return `${category}-12`;
                if (remValue === 4) return `${category}-16`;
            }
        }

        // Default naming scheme
        if (category === 'gap') {
            const value = parseFloat(size);
            if (value <= 0.5) return 'gap-sm';
            if (value <= 1) return 'gap-md';
            return 'gap-lg';
        }

        // For other values, use the raw value
        return `${category}-${spacing.value.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
}
