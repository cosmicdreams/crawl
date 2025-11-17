// tests/integration/spec-compliance.test.ts
/**
 * Spec Compliance Validation Test Suite
 * Validates that all extractors output tokens compliant with Design Tokens Specification 2025.10
 * Reference: https://www.designtokens.org/tr/2025.10/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColorExtractorStage } from '../../src/core/stages/color-extractor-stage.js';
import { TypographyExtractor } from '../../src/core/stages/typography-extractor.ts';
import { SpacingExtractorStage } from '../../src/core/stages/spacing-extractor-stage.js';
import { BorderExtractorStage } from '../../src/core/stages/border-extractor-stage.js';
import { AnimationExtractorStage } from '../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../src/core/types.js';
import { chromium, Browser } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    ColorValue,
    DimensionValue,
    DurationValue,
    CubicBezierValue,
    FontFamilyValue,
    FontWeightValue
} from '../../src/core/tokens/types/primitives.js';
import {
    TypographyValue,
    BorderStyleValue,
    ShadowValue,
    TransitionValue
} from '../../src/core/tokens/types/composites.js';

describe('Design Tokens Specification 2025.10 Compliance', () => {
    let browser: Browser;
    let testOutputDir: string;
    let testHtmlPath: string;
    let crawlResult: CrawlResult;

    const comprehensiveTestHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .color-test { color: #3b82f6; background-color: rgba(59, 130, 246, 0.5); }
                .typography-test { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 500; line-height: 1.5; }
                .spacing-test { margin: 16px; padding: 24px; gap: 8px; }
                .border-test { border-width: 2px; border-style: solid; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .animation-test { transition: opacity 0.3s ease-in-out; }
            </style>
        </head>
        <body>
            <div class="color-test">Color Test</div>
            <div class="typography-test">Typography Test</div>
            <div class="spacing-test">Spacing Test</div>
            <div class="border-test">Border Test</div>
            <div class="animation-test">Animation Test</div>
        </body>
        </html>
    `;

    beforeAll(async () => {
        browser = await chromium.launch();
        testOutputDir = path.join(process.cwd(), 'test-output-spec-compliance');

        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Create test HTML file
        testHtmlPath = path.join(testOutputDir, 'comprehensive-test.html');
        fs.writeFileSync(testHtmlPath, comprehensiveTestHtml);

        // Set up crawl result
        crawlResult = {
            baseUrl: `file://${testHtmlPath}`,
            crawledPages: [
                {
                    url: `file://${testHtmlPath}`,
                    title: 'Comprehensive Test Page',
                    status: 200,
                    contentType: 'text/html'
                }
            ],
            timestamp: new Date().toISOString()
        };
    });

    afterAll(async () => {
        await browser.close();
        // Clean up test files
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('ColorValue Spec Compliance', () => {
        it('should output ColorValue objects with required properties', async () => {
            const extractor = new ColorExtractorStage({
                includeForeground: true,
                includeBackground: true,
                includeBorder: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                const value = token.value as ColorValue;

                // Required properties per spec
                expect(value).toHaveProperty('colorSpace');
                expect(value).toHaveProperty('components');
                expect(value).toHaveProperty('alpha');
                expect(value).toHaveProperty('hex');

                // Validate colorSpace is valid
                expect(['srgb', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020']).toContain(value.colorSpace);

                // Validate components is array of numbers
                expect(Array.isArray(value.components)).toBe(true);
                expect(value.components.length).toBe(3);
                value.components.forEach(component => {
                    expect(typeof component).toBe('number');
                    expect(component).toBeGreaterThanOrEqual(0);
                    expect(component).toBeLessThanOrEqual(255);
                });

                // Validate alpha is number between 0 and 1
                expect(typeof value.alpha).toBe('number');
                expect(value.alpha).toBeGreaterThanOrEqual(0);
                expect(value.alpha).toBeLessThanOrEqual(1);

                // Validate hex is string
                expect(typeof value.hex).toBe('string');
                expect(value.hex).toMatch(/^#[0-9a-f]{6}$/i);
            });
        });
    });

    describe('DimensionValue Spec Compliance', () => {
        it('should output DimensionValue objects for spacing', async () => {
            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                const value = token.value as DimensionValue;

                // Required properties per spec
                expect(value).toHaveProperty('value');
                expect(value).toHaveProperty('unit');

                // Validate value is number
                expect(typeof value.value).toBe('number');

                // Validate unit is valid
                expect(['px', 'rem']).toContain(value.unit);
            });
        });

        it('should output DimensionValue objects for border widths', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            const widthTokens = result.tokens.filter(t => t.category === 'width');

            widthTokens.forEach(token => {
                const value = token.value as DimensionValue;

                expect(value).toHaveProperty('value');
                expect(value).toHaveProperty('unit');
                expect(typeof value.value).toBe('number');
                expect(['px', 'rem']).toContain(value.unit);
            });
        });
    });

    describe('TypographyValue Spec Compliance', () => {
        it('should output TypographyValue composite objects', async () => {
            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                const value = token.value as TypographyValue;

                // Required properties per spec for typography composite
                expect(value).toHaveProperty('fontFamily');
                expect(value).toHaveProperty('fontSize');
                expect(value).toHaveProperty('fontWeight');
                expect(value).toHaveProperty('lineHeight');

                // Validate fontFamily
                if (typeof value.fontFamily === 'string') {
                    expect(value.fontFamily.length).toBeGreaterThan(0);
                } else {
                    expect(Array.isArray(value.fontFamily)).toBe(true);
                }

                // Validate fontSize is DimensionValue
                expect(value.fontSize).toHaveProperty('value');
                expect(value.fontSize).toHaveProperty('unit');

                // Validate fontWeight is number or string
                expect(['number', 'string']).toContain(typeof value.fontWeight);

                // Validate lineHeight is number
                expect(typeof value.lineHeight).toBe('number');

                // Validate letterSpacing if present
                if (value.letterSpacing) {
                    expect(value.letterSpacing).toHaveProperty('value');
                    expect(value.letterSpacing).toHaveProperty('unit');
                }
            });
        });
    });

    describe('ShadowValue Spec Compliance', () => {
        it('should output ShadowValue composite objects', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            const shadowTokens = result.tokens.filter(t => t.category === 'shadow');

            shadowTokens.forEach(token => {
                const value = token.value as ShadowValue;

                // Required properties per spec for shadow composite
                expect(value).toHaveProperty('color');
                expect(value).toHaveProperty('offsetX');
                expect(value).toHaveProperty('offsetY');
                expect(value).toHaveProperty('blur');
                expect(value).toHaveProperty('spread');

                // Validate color is ColorValue
                expect(value.color).toHaveProperty('colorSpace');
                expect(value.color).toHaveProperty('components');
                expect(value.color).toHaveProperty('alpha');
                expect(value.color).toHaveProperty('hex');

                // Validate offsets, blur, spread are DimensionValues
                [value.offsetX, value.offsetY, value.blur, value.spread].forEach(dim => {
                    expect(dim).toHaveProperty('value');
                    expect(dim).toHaveProperty('unit');
                });
            });
        });
    });

    describe('TransitionValue Spec Compliance', () => {
        it('should output TransitionValue composite objects', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                const value = token.value as TransitionValue;

                // Required properties per spec for transition composite
                expect(value).toHaveProperty('duration');
                expect(value).toHaveProperty('delay');
                expect(value).toHaveProperty('timingFunction');

                // Validate duration is DurationValue
                expect(value.duration).toHaveProperty('value');
                expect(value.duration).toHaveProperty('unit');
                expect(['ms', 's']).toContain(value.duration.unit);

                // Validate delay is DurationValue
                expect(value.delay).toHaveProperty('value');
                expect(value.delay).toHaveProperty('unit');
                expect(['ms', 's']).toContain(value.delay.unit);

                // Validate timingFunction is CubicBezierValue (array of 4 numbers)
                expect(Array.isArray(value.timingFunction)).toBe(true);
                expect(value.timingFunction).toHaveLength(4);
                value.timingFunction.forEach(num => {
                    expect(typeof num).toBe('number');
                });
            });
        });
    });

    describe('BorderStyleValue Spec Compliance', () => {
        it('should output valid BorderStyleValue strings', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: true,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            const styleTokens = result.tokens.filter(t => t.category === 'style');

            styleTokens.forEach(token => {
                const value = token.value as BorderStyleValue;

                // Validate value is one of the allowed border styles
                expect(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']).toContain(value);
            });
        });
    });

    describe('ExtractedTokenData Structure Compliance', () => {
        it('should include required metadata fields', async () => {
            const extractor = new ColorExtractorStage({
                includeForeground: true,
                includeBackground: true,
                includeBorder: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                // Required fields for ExtractedTokenData
                expect(token).toHaveProperty('type');
                expect(token).toHaveProperty('name');
                expect(token).toHaveProperty('value');

                // Optional but recommended fields
                expect(token).toHaveProperty('category');
                expect(token).toHaveProperty('description');
                expect(token).toHaveProperty('usageCount');
                expect(token).toHaveProperty('sourceUrls');

                // Validate types
                expect(typeof token.type).toBe('string');
                expect(typeof token.name).toBe('string');
                expect(typeof token.category).toBe('string');
                expect(typeof token.usageCount).toBe('number');
                expect(Array.isArray(token.sourceUrls)).toBe(true);
            });
        });

        it('should use correct token type mappings', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeForeground: true,
                includeBackground: true,
                includeBorder: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const spacingExtractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const borderExtractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const colorResult = await colorExtractor.process(crawlResult);
            const spacingResult = await spacingExtractor.process(crawlResult);
            const borderResult = await borderExtractor.process(crawlResult);

            // Validate color tokens use 'color' type
            colorResult.tokens.forEach(token => {
                expect(token.type).toBe('color');
            });

            // Validate spacing tokens use 'dimension' type
            spacingResult.tokens.forEach(token => {
                expect(token.type).toBe('dimension');
            });

            // Validate border tokens use correct types based on category
            const widthTokens = borderResult.tokens.filter(t => t.category === 'width');
            widthTokens.forEach(token => {
                expect(token.type).toBe('dimension');
            });

            const styleTokens = borderResult.tokens.filter(t => t.category === 'style');
            styleTokens.forEach(token => {
                expect(token.type).toBe('strokeStyle');
            });

            const shadowTokens = borderResult.tokens.filter(t => t.category === 'shadow');
            shadowTokens.forEach(token => {
                expect(token.type).toBe('shadow');
            });
        });
    });

    describe('Cross-Extractor Consistency', () => {
        it('should use consistent value object structures across extractors', async () => {
            const spacingExtractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const borderExtractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: true,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const spacingResult = await spacingExtractor.process(crawlResult);
            const borderResult = await borderExtractor.process(crawlResult);

            // Both should produce DimensionValue objects
            const spacingDimension = spacingResult.tokens[0]?.value as DimensionValue;
            const borderDimension = borderResult.tokens.find(t => t.category === 'width')?.value as DimensionValue;

            if (spacingDimension && borderDimension) {
                // Both should have same structure
                expect(Object.keys(spacingDimension).sort()).toEqual(Object.keys(borderDimension).sort());

                // Both should have same property types
                expect(typeof spacingDimension.value).toBe(typeof borderDimension.value);
                expect(typeof spacingDimension.unit).toBe(typeof borderDimension.unit);
            }
        });

        it('should use consistent naming patterns across extractors', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeForeground: true,
                    includeBackground: true,
                    includeBorder: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            results.forEach(result => {
                result.tokens.forEach(token => {
                    // Names should be kebab-case
                    expect(token.name).toMatch(/^[a-z0-9-]+$/);

                    // Names should start with category or type prefix
                    expect(token.name.length).toBeGreaterThan(0);
                });
            });
        });
    });

    describe('Spec Version Compatibility', () => {
        it('should be compatible with Design Tokens Specification 2025.10', async () => {
            // This test verifies that the token structure matches the spec version
            const colorExtractor = new ColorExtractorStage({
                includeForeground: true,
                includeBackground: true,
                includeBorder: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            // Spec 2025.10 requires:
            // - ColorValue must have colorSpace, components, alpha, hex
            // - No deprecated properties should be present
            result.tokens.forEach(token => {
                const value = token.value as ColorValue;

                // Required properties present
                expect(value).toHaveProperty('colorSpace');
                expect(value).toHaveProperty('components');
                expect(value).toHaveProperty('alpha');
                expect(value).toHaveProperty('hex');

                // No deprecated properties (e.g., old 'rgb' or 'hsl' objects)
                expect(value).not.toHaveProperty('rgb');
                expect(value).not.toHaveProperty('hsl');
            });
        });
    });
});
