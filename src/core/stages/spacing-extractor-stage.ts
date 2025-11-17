// src/core/stages/spacing-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { convertCSSSizeToDimension } from '../tokens/converters/value-converters.js';
import { DimensionValue } from '../tokens/types/primitives.js';
import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';

interface SpacingExtractorOptions {
    includeMargins: boolean;
    includePadding: boolean;
    includeGap: boolean;
    minimumOccurrences: number;
    outputDir?: string;
}

interface SpacingExtractionResult {
    tokens: ExtractedTokenData[];
    stats: {
        totalSpacings: number;
        uniqueSpacings: number;
        marginSpacings: number;
        paddingSpacings: number;
        gapSpacings: number;
    };
}

interface ExtractedSpacing {
    cssValue: string;              // Original CSS spacing value
    specValue: DimensionValue;     // Spec-compliant DimensionValue object
    property: string;
    element: string;
    usageCount: number;
    category?: string;
    name?: string;
    sourceUrls: string[];
}

export class SpacingExtractorStage implements PipelineStage<CrawlResult, SpacingExtractionResult> {
    name = 'spacing-extractor';

    constructor(private options: SpacingExtractorOptions = {
        includeMargins: true,
        includePadding: true,
        includeGap: true,
        minimumOccurrences: 2,
        outputDir: './results'
    }) {}

    async process(input: CrawlResult): Promise<SpacingExtractionResult> {
        logger.info('Extracting spacing', { pageCount: input.crawledPages?.length || 0 });

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

        // Convert the spacing map to spec-compliant design tokens
        const spacingTokens: ExtractedTokenData[] = [];

        for (const [key, spacingInfo] of spacingMap.entries()) {
            if (spacingInfo.usageCount >= this.options.minimumOccurrences) {
                // Generate a name for the spacing if not already set
                const name = spacingInfo.name || this.generateSpacingName(spacingInfo);

                spacingTokens.push({
                    type: 'dimension',  // Per Design Tokens Specification 2025.10, spacing uses dimension type
                    name,
                    value: spacingInfo.specValue,  // Spec-compliant DimensionValue object
                    category: spacingInfo.category,
                    description: `${spacingInfo.category || 'Spacing'} extracted from ${spacingInfo.sourceUrls.length} page(s)`,
                    usageCount: spacingInfo.usageCount,
                    source: spacingInfo.property,
                    sourceUrls: spacingInfo.sourceUrls
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

    private async extractMarginValues(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const spacings = new Map<string, any>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract margin values
                ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
                    const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                    if (value && value !== '0px' && value !== 'auto') {
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

    private async extractPaddingValues(page: any): Promise<Record<string, any>> {
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

    private async extractGapValues(page: any): Promise<Record<string, any>> {
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

    private addToSpacingMap(
        spacingMap: Map<string, ExtractedSpacing>,
        spacings: Record<string, any>,
        category: string,
        sourceUrl: string
    ): void {
        for (const [cssValue, spacingInfo] of Object.entries(spacings)) {
            try {
                // Convert CSS spacing to spec-compliant DimensionValue
                const specValue = convertCSSSizeToDimension(cssValue);

                // Use the CSS value as the map key for deduplication
                const mapKey = cssValue;

                if (spacingMap.has(mapKey)) {
                    const existing = spacingMap.get(mapKey)!;
                    existing.usageCount += spacingInfo.usageCount;
                    // Add source URL if not already tracked
                    if (!existing.sourceUrls.includes(sourceUrl)) {
                        existing.sourceUrls.push(sourceUrl);
                    }
                } else {
                    spacingMap.set(mapKey, {
                        cssValue,
                        specValue,
                        property: spacingInfo.property,
                        element: spacingInfo.element,
                        usageCount: spacingInfo.usageCount,
                        category,
                        sourceUrls: [sourceUrl]
                    });
                }
            } catch (error) {
                // Skip spacing values that can't be converted
                logger.warn(`Failed to convert spacing value: ${cssValue}`, { error });
            }
        }
    }

    private generateSpacingName(spacing: ExtractedSpacing): string {
        const category = spacing.category || 'spacing';

        // Convert to a common scale if possible
        const { value, unit } = spacing.specValue;

        // For px values, convert to rem-based scale
        if (unit === 'px') {
            const remValue = value / 16;  // Assuming 16px = 1rem

            // Map to common spacing scale
            if (remValue === 0) return `${category}-0`;
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

        // For rem values, direct mapping
        if (unit === 'rem') {
            if (value === 0) return `${category}-0`;
            if (value === 0.25) return `${category}-1`;
            if (value === 0.5) return `${category}-2`;
            if (value === 0.75) return `${category}-3`;
            if (value === 1) return `${category}-4`;
            if (value === 1.25) return `${category}-5`;
            if (value === 1.5) return `${category}-6`;
            if (value === 2) return `${category}-8`;
            if (value === 2.5) return `${category}-10`;
            if (value === 3) return `${category}-12`;
            if (value === 4) return `${category}-16`;
        }

        // For gap values, use size-based naming
        if (category === 'gap') {
            if (value <= 0.5) return 'gap-sm';
            if (value <= 1) return 'gap-md';
            return 'gap-lg';
        }

        // Default naming: category-value-unit
        return `${category}-${value}-${unit}`.toLowerCase();
    }
}
