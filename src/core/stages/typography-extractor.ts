// src/core/stages/typography-extractor.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { Browser, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { convertCSSPropertiesToTypography } from '../tokens/converters/value-converters.js';
import { TypographyValue } from '../tokens/types/composites.js';
import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';

interface TypographyExtractorOptions {
    includeHeadings: boolean;
    includeBodyText: boolean;
    includeSpecialText: boolean;
    minimumOccurrences: number;
    outputDir?: string;
}

interface TypographyExtractionResult {
    tokens: ExtractedTokenData[];
    stats: {
        totalStyles: number;
        uniqueStyles: number;
        headingStyles: number;
        bodyStyles: number;
        specialStyles: number;
    };
}

interface ExtractedTypography {
    cssProperties: {
        fontFamily: string;
        fontSize: string;
        fontWeight: string;
        lineHeight: string;
        letterSpacing?: string;
    };
    specValue: TypographyValue;     // Spec-compliant TypographyValue object
    source: string;
    element: string;
    usageCount: number;
    category?: string;
    name?: string;
    sourceUrls: string[];
}

export class TypographyExtractor implements PipelineStage<CrawlResult, TypographyExtractionResult> {
    name = 'typography-extractor';

    constructor(private options: TypographyExtractorOptions = {
        includeHeadings: true,
        includeBodyText: true,
        includeSpecialText: true,
        minimumOccurrences: 2,
        outputDir: './results'
    }) {}

    async process(input: CrawlResult): Promise<TypographyExtractionResult> {
        logger.info('Extracting typography', { pageCount: input.crawledPages?.length || 0 });

        const outputDir = this.options.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const typographyMap = new Map<string, ExtractedTypography>();

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            for (const pageInfo of input.crawledPages || []) {
                console.log(`Extracting typography from ${pageInfo.url}`);

                try {
                    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

                    // Extract heading styles
                    if (this.options.includeHeadings) {
                        const headingStyles = await this.extractHeadingStyles(page);
                        this.addToTypographyMap(typographyMap, headingStyles, 'heading', pageInfo.url);
                    }

                    // Extract body text styles
                    if (this.options.includeBodyText) {
                        const bodyStyles = await this.extractBodyTextStyles(page);
                        this.addToTypographyMap(typographyMap, bodyStyles, 'body', pageInfo.url);
                    }

                    // Extract special text styles
                    if (this.options.includeSpecialText) {
                        const specialStyles = await this.extractSpecialTextStyles(page);
                        this.addToTypographyMap(typographyMap, specialStyles, 'special', pageInfo.url);
                    }

                } catch (error) {
                    console.error(`Error extracting typography from ${pageInfo.url}:`, error);
                }
            }
        } finally {
            await browser.close();
        }

        // Convert the typography map to spec-compliant design tokens
        const typographyTokens: ExtractedTokenData[] = [];

        for (const [key, typographyInfo] of typographyMap.entries()) {
            if (typographyInfo.usageCount >= this.options.minimumOccurrences) {
                // Generate a name for the typography style if not already set
                const name = typographyInfo.name || this.generateTypographyName(typographyInfo);

                typographyTokens.push({
                    type: 'typography',
                    name,
                    value: typographyInfo.specValue,  // Spec-compliant TypographyValue object
                    category: typographyInfo.category,
                    description: `${typographyInfo.category || 'Typography'} extracted from ${typographyInfo.sourceUrls.length} page(s)`,
                    usageCount: typographyInfo.usageCount,
                    source: typographyInfo.source,
                    sourceUrls: typographyInfo.sourceUrls
                });
            }
        }

        // Sort by usage count (descending)
        typographyTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'typography-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(typographyTokens, null, 2));
        console.log(`Typography extraction completed. Found ${typographyTokens.length} typography styles. Results saved to ${outputFile}`);

        return {
            tokens: typographyTokens,
            stats: {
                totalStyles: typographyMap.size,
                uniqueStyles: typographyTokens.length,
                headingStyles: typographyTokens.filter(t => t.category === 'heading').length,
                bodyStyles: typographyTokens.filter(t => t.category === 'body').length,
                specialStyles: typographyTokens.filter(t => t.category === 'special').length
            }
        };
    }

    private async extractHeadingStyles(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const styles = new Map<string, any>();
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

            headings.forEach(el => {
                const style = window.getComputedStyle(el);
                const key = `${el.tagName}-${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;

                if (!styles.has(key)) {
                    styles.set(key, {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing,
                        element: el.tagName.toLowerCase()
                    });
                }
            });

            return Object.fromEntries(styles);
        });
    }

    private async extractBodyTextStyles(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const styles = new Map<string, any>();
            const bodyElements = document.querySelectorAll('p, span, div, a, li');

            bodyElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const key = `${el.tagName}-${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;

                if (!styles.has(key)) {
                    styles.set(key, {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing,
                        element: el.tagName.toLowerCase()
                    });
                }
            });

            return Object.fromEntries(styles);
        });
    }

    private async extractSpecialTextStyles(page: any): Promise<Record<string, any>> {
        return await page.evaluate(() => {
            const styles = new Map<string, any>();
            const specialElements = document.querySelectorAll('code, pre, blockquote, em, strong, mark');

            specialElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const key = `${el.tagName}-${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;

                if (!styles.has(key)) {
                    styles.set(key, {
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing,
                        element: el.tagName.toLowerCase()
                    });
                }
            });

            return Object.fromEntries(styles);
        });
    }

    private addToTypographyMap(
        typographyMap: Map<string, ExtractedTypography>,
        styles: Record<string, any>,
        category: string,
        sourceUrl: string
    ): void {
        for (const [key, styleProps] of Object.entries(styles)) {
            try {
                // Convert CSS properties to spec-compliant TypographyValue
                const specValue = convertCSSPropertiesToTypography(styleProps);

                // Use the key as the map key for deduplication
                const mapKey = key;

                if (typographyMap.has(mapKey)) {
                    const existing = typographyMap.get(mapKey)!;
                    existing.usageCount += 1;
                    // Add source URL if not already tracked
                    if (!existing.sourceUrls.includes(sourceUrl)) {
                        existing.sourceUrls.push(sourceUrl);
                        existing.source = `${existing.source}, ${styleProps.element}`;
                    }
                } else {
                    typographyMap.set(mapKey, {
                        cssProperties: styleProps,
                        specValue,
                        source: styleProps.element,
                        element: styleProps.element,
                        usageCount: 1,
                        category,
                        sourceUrls: [sourceUrl]
                    });
                }
            } catch (error) {
                // Skip styles that can't be converted
                logger.warn(`Failed to convert typography style: ${key}`, { error });
            }
        }
    }

    private generateTypographyName(info: ExtractedTypography): string {
        // Generate semantic name based on element and category
        if (info.category === 'heading') {
            return `heading-${info.element}`;
        }

        if (info.category === 'body') {
            if (info.element === 'p') return 'body-text';
            if (info.element === 'span') return 'body-inline';
            if (info.element === 'a') return 'body-link';
            return `body-${info.element}`;
        }

        if (info.category === 'special') {
            if (info.element === 'code') return 'text-code';
            if (info.element === 'blockquote') return 'text-quote';
            if (info.element === 'em') return 'text-emphasis';
            if (info.element === 'strong') return 'text-strong';
            return `text-${info.element}`;
        }

        return `typography-${info.category}-${info.element}`.toLowerCase();
    }
}
