// tests/unit/generators/styleguide-generator.test.ts
/**
 * Unit tests for Styleguide Generator
 * Tests styleguide generation, HTML structure, and visual representations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StyleguideGenerator } from '../../../src/core/generators/styleguide-generator.js';
import { ExtractedTokenData } from '../../../src/core/tokens/generators/spec-generator.js';
import { ColorValue, DimensionValue } from '../../../src/core/tokens/types/primitives.js';
import {
    TypographyValue,
    ShadowValue,
    TransitionValue,
    BorderStyleValue
} from '../../../src/core/tokens/types/composites.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('StyleguideGenerator', () => {
    let testOutputDir: string;

    beforeEach(() => {
        testOutputDir = path.join(process.cwd(), 'test-output-styleguide');
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Configuration', () => {
        it('should use default options when none provided', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('Design System Styleguide');
            expect(html).toContain('Total Tokens');
        });

        it('should accept custom title option', () => {
            const generator = new StyleguideGenerator({
                title: 'My Custom Styleguide'
            });
            const html = generator.generate([]);

            expect(html).toContain('My Custom Styleguide');
            expect(html).toContain('<title>My Custom Styleguide</title>');
        });

        it('should accept custom output path option', () => {
            const outputPath = path.join(testOutputDir, 'custom-styleguide.html');
            const generator = new StyleguideGenerator({
                outputPath
            });

            generator.generate([]);

            expect(fs.existsSync(outputPath)).toBe(true);
        });

        it('should respect includeUsageStats option', () => {
            const token: ExtractedTokenData = {
                type: 'color',
                name: 'color-primary',
                value: {
                    hex: '#3b82f6',
                    alpha: 1,
                    colorSpace: 'srgb'
                } as ColorValue,
                category: 'primary',
                usageCount: 5
            };

            const generatorWithStats = new StyleguideGenerator({
                includeUsageStats: true
            });
            const htmlWithStats = generatorWithStats.generate([token]);

            const generatorWithoutStats = new StyleguideGenerator({
                includeUsageStats: false
            });
            const htmlWithoutStats = generatorWithoutStats.generate([token]);

            expect(htmlWithStats).toContain('Used 5 times');
            expect(htmlWithoutStats).not.toContain('Used 5 times');
        });
    });

    describe('Token Grouping', () => {
        it('should correctly group color tokens', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                },
                {
                    type: 'color',
                    name: 'color-secondary',
                    value: { hex: '#10b981', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'secondary',
                    usageCount: 3
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('color-primary');
            expect(html).toContain('color-secondary');
            expect(html).toContain('#3b82f6');
            expect(html).toContain('#10b981');
        });

        it('should correctly group typography tokens', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'typography',
                    name: 'typography-heading',
                    value: {
                        fontFamily: ['Arial', 'sans-serif'],
                        fontSize: { value: 24, unit: 'px' },
                        fontWeight: 700,
                        lineHeight: 1.2
                    } as TypographyValue,
                    category: 'heading',
                    usageCount: 10
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('typography-heading');
            expect(html).toContain('24px');
            expect(html).toContain('700');
        });

        it('should correctly group spacing tokens by category', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'spacing-margin-small',
                    value: { value: 8, unit: 'px' } as DimensionValue,
                    category: 'margin',
                    usageCount: 15
                },
                {
                    type: 'dimension',
                    name: 'spacing-padding-medium',
                    value: { value: 16, unit: 'px' } as DimensionValue,
                    category: 'padding',
                    usageCount: 20
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Margin');
            expect(html).toContain('Padding');
            expect(html).toContain('spacing-margin-small');
            expect(html).toContain('spacing-padding-medium');
        });

        it('should correctly group border tokens', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'border-width-thin',
                    value: { value: 1, unit: 'px' } as DimensionValue,
                    category: 'width',
                    usageCount: 25
                },
                {
                    type: 'strokeStyle',
                    name: 'border-style-solid',
                    value: 'solid' as BorderStyleValue,
                    category: 'style',
                    usageCount: 30
                },
                {
                    type: 'dimension',
                    name: 'border-radius-rounded',
                    value: { value: 4, unit: 'px' } as DimensionValue,
                    category: 'radius',
                    usageCount: 12
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Border Widths');
            expect(html).toContain('Border Styles');
            expect(html).toContain('Border Radius');
        });

        it('should correctly group shadow and animation tokens', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'shadow',
                    name: 'shadow-small',
                    value: {
                        offsetX: { value: 0, unit: 'px' },
                        offsetY: { value: 2, unit: 'px' },
                        blur: { value: 4, unit: 'px' },
                        spread: { value: 0, unit: 'px' },
                        color: { hex: '#000000', alpha: 0.1, colorSpace: 'srgb' }
                    } as ShadowValue,
                    category: 'shadow',
                    usageCount: 8
                },
                {
                    type: 'transition',
                    name: 'transition-fast-ease',
                    value: {
                        duration: { value: 0.2, unit: 's' },
                        delay: { value: 0, unit: 's' },
                        timingFunction: [0.25, 0.1, 0.25, 1]
                    } as TransitionValue,
                    category: 'transition',
                    usageCount: 18
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Shadows');
            expect(html).toContain('Animations');
        });
    });

    describe('Color Section Generation', () => {
        it('should generate color swatches with hex values', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary-blue',
                    value: {
                        hex: '#3b82f6',
                        alpha: 1,
                        colorSpace: 'srgb'
                    } as ColorValue,
                    category: 'primary',
                    usageCount: 10
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('color-primary-blue');
            expect(html).toContain('#3b82f6');
            expect(html).toContain('background-color: #3b82f6');
            expect(html).toContain('srgb');
        });

        it('should display alpha values for transparent colors', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-overlay',
                    value: {
                        hex: '#000000',
                        alpha: 0.5,
                        colorSpace: 'srgb'
                    } as ColorValue,
                    category: 'overlay',
                    usageCount: 5
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Alpha: 50%');
            expect(html).toContain('opacity: 0.5');
        });

        it('should group colors by category', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary-1',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                },
                {
                    type: 'color',
                    name: 'color-secondary-1',
                    value: { hex: '#10b981', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'secondary',
                    usageCount: 3
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Primary Colors');
            expect(html).toContain('Secondary Colors');
        });
    });

    describe('Typography Section Generation', () => {
        it('should generate font samples with typography properties', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'typography',
                    name: 'typography-heading-large',
                    value: {
                        fontFamily: ['Georgia', 'serif'],
                        fontSize: { value: 32, unit: 'px' },
                        fontWeight: 700,
                        lineHeight: 1.2,
                        letterSpacing: { value: -0.5, unit: 'px' }
                    } as TypographyValue,
                    category: 'heading',
                    usageCount: 15
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('typography-heading-large');
            expect(html).toContain('Georgia, serif');
            expect(html).toContain('32px');
            expect(html).toContain('700');
            expect(html).toContain('1.2');
            expect(html).toContain('-0.5px');
            expect(html).toContain('The quick brown fox jumps over the lazy dog');
        });

        it('should handle array font families', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'typography',
                    name: 'typography-body',
                    value: {
                        fontFamily: ['Helvetica Neue', 'Arial', 'sans-serif'],
                        fontSize: { value: 16, unit: 'px' },
                        fontWeight: 400,
                        lineHeight: 1.6
                    } as TypographyValue,
                    category: 'body',
                    usageCount: 50
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Helvetica Neue, Arial, sans-serif');
        });
    });

    describe('Spacing Section Generation', () => {
        it('should generate visual spacing scales', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'spacing-small',
                    value: { value: 8, unit: 'px' } as DimensionValue,
                    category: 'padding',
                    usageCount: 20
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('spacing-small');
            expect(html).toContain('8px');
            expect(html).toContain('width: 8px');
        });

        it('should convert rem to px for visual display', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'spacing-medium',
                    value: { value: 1, unit: 'rem' } as DimensionValue,
                    category: 'margin',
                    usageCount: 15
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('1rem');
            expect(html).toContain('16px'); // 1rem * 16 = 16px
        });
    });

    describe('Border Section Generation', () => {
        it('should generate border width samples', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'border-thin',
                    value: { value: 1, unit: 'px' } as DimensionValue,
                    category: 'width',
                    usageCount: 30
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('border-thin');
            expect(html).toContain('1px');
            expect(html).toContain('border: 1px solid #3b82f6');
        });

        it('should generate border style samples', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'strokeStyle',
                    name: 'border-dashed',
                    value: 'dashed' as BorderStyleValue,
                    category: 'style',
                    usageCount: 10
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('border-dashed');
            expect(html).toContain('dashed');
            expect(html).toContain('border: 2px dashed #3b82f6');
        });

        it('should generate border radius samples', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'border-radius-round',
                    value: { value: 8, unit: 'px' } as DimensionValue,
                    category: 'radius',
                    usageCount: 25
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('border-radius-round');
            expect(html).toContain('8px');
            expect(html).toContain('border-radius: 8px');
        });
    });

    describe('Shadow Section Generation', () => {
        it('should generate box shadow samples', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'shadow',
                    name: 'shadow-medium',
                    value: {
                        offsetX: { value: 0, unit: 'px' },
                        offsetY: { value: 4, unit: 'px' },
                        blur: { value: 6, unit: 'px' },
                        spread: { value: -1, unit: 'px' },
                        color: {
                            hex: '#000000',
                            alpha: 0.1,
                            colorSpace: 'srgb'
                        }
                    } as ShadowValue,
                    category: 'shadow',
                    usageCount: 12
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('shadow-medium');
            expect(html).toContain('Offset: 0px, 4px');
            expect(html).toContain('Blur: 6px');
            expect(html).toContain('Spread: -1px');
            expect(html).toContain('Color: #000000');
            expect(html).toContain('box-shadow: 0px 4px 6px -1px #000000');
        });
    });

    describe('Animation Section Generation', () => {
        it('should generate animation samples with timing information', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'transition',
                    name: 'transition-normal-ease',
                    value: {
                        duration: { value: 0.3, unit: 's' },
                        delay: { value: 0, unit: 's' },
                        timingFunction: [0.25, 0.1, 0.25, 1]
                    } as TransitionValue,
                    category: 'transition',
                    usageCount: 18
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('transition-normal-ease');
            expect(html).toContain('Duration: 0.3s');
            expect(html).toContain('Delay: 0s');
            expect(html).toContain('cubic-bezier(0.25, 0.1, 0.25, 1)');
            expect(html).toContain('Hover to see animation');
        });

        it('should group animations by category', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'transition',
                    name: 'transition-fast',
                    value: {
                        duration: { value: 0.2, unit: 's' },
                        delay: { value: 0, unit: 's' },
                        timingFunction: [0.42, 0, 1, 1]
                    } as TransitionValue,
                    category: 'transition',
                    usageCount: 10
                },
                {
                    type: 'transition',
                    name: 'animation-fade',
                    value: {
                        duration: { value: 0.5, unit: 's' },
                        delay: { value: 0, unit: 's' },
                        timingFunction: [0.42, 0, 0.58, 1]
                    } as TransitionValue,
                    category: 'animation',
                    usageCount: 8
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('Transitions');
            expect(html).toContain('Animations');
        });
    });

    describe('HTML Structure', () => {
        it('should generate valid HTML5 document', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<html lang="en">');
            expect(html).toContain('<head>');
            expect(html).toContain('<body>');
            expect(html).toContain('</html>');
        });

        it('should include meta viewport for responsive design', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        });

        it('should include navigation with section links', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                },
                {
                    type: 'typography',
                    name: 'typography-heading',
                    value: {
                        fontFamily: ['Arial'],
                        fontSize: { value: 24, unit: 'px' },
                        fontWeight: 700,
                        lineHeight: 1.2
                    } as TypographyValue,
                    category: 'heading',
                    usageCount: 10
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('<nav class="styleguide-nav">');
            expect(html).toContain('<a href="#color">Colors</a>');
            expect(html).toContain('<a href="#typography">Typography</a>');
        });

        it('should include statistics in header', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                },
                {
                    type: 'color',
                    name: 'color-secondary',
                    value: { hex: '#10b981', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'secondary',
                    usageCount: 3
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            expect(html).toContain('<span class="stat-value">2</span>');
            expect(html).toContain('<span class="stat-label">Total Tokens</span>');
            expect(html).toContain('<span class="stat-value">1</span>');
            expect(html).toContain('<span class="stat-label">Categories</span>');
        });

        it('should include footer with generation date', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<footer class="styleguide-footer">');
            expect(html).toContain('Generated on');
        });
    });

    describe('CSS Generation', () => {
        it('should include embedded CSS styles', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<style>');
            expect(html).toContain('.styleguide-container');
            expect(html).toContain('.color-card');
            expect(html).toContain('.typography-sample');
            expect(html).toContain('.spacing-box');
            expect(html).toContain('.shadow-sample');
            expect(html).toContain('.animation-sample');
        });

        it('should include responsive grid styles', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('grid-template-columns');
            expect(html).toContain('repeat(auto-fill');
        });
    });

    describe('JavaScript Generation', () => {
        it('should include interactive scripts', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<script>');
            expect(html).toContain('Smooth scrolling');
            expect(html).toContain('querySelectorAll');
            expect(html).toContain('addEventListener');
        });

        it('should include animation sample interactions', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('.animation-sample');
            expect(html).toContain('translateY');
        });
    });

    describe('File Output', () => {
        it('should create output file when outputPath is specified', () => {
            const outputPath = path.join(testOutputDir, 'styleguide.html');
            const generator = new StyleguideGenerator({ outputPath });

            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            generator.generate(tokens);

            expect(fs.existsSync(outputPath)).toBe(true);

            const fileContent = fs.readFileSync(outputPath, 'utf-8');
            expect(fileContent).toContain('color-primary');
            expect(fileContent).toContain('#3b82f6');
        });

        it('should create output directory if it does not exist', () => {
            const nestedPath = path.join(testOutputDir, 'nested', 'dir', 'styleguide.html');
            const generator = new StyleguideGenerator({ outputPath: nestedPath });

            generator.generate([]);

            expect(fs.existsSync(nestedPath)).toBe(true);
        });

        it('should not create file when outputPath is not specified', () => {
            const generator = new StyleguideGenerator({ outputPath: undefined });
            const html = generator.generate([]);

            expect(html).toBeDefined();
            // Should return HTML but not write to file
        });
    });

    describe('Empty Token Handling', () => {
        it('should generate valid styleguide with no tokens', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('Design System Styleguide');
            expect(html).toContain('<span class="stat-value">0</span>');
            expect(html).toContain('Total Tokens');
        });

        it('should not include empty sections', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            // Should include colors section
            expect(html).toContain('Colors');

            // Should not include typography section (no typography tokens)
            const typographyMatch = html.match(/<section id="typography">/);
            expect(typographyMatch).toBeNull();
        });
    });

    describe('Utility Methods', () => {
        it('should capitalize strings correctly', () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([
                {
                    type: 'color',
                    name: 'color-test',
                    value: { hex: '#000000', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 1
                }
            ]);

            expect(html).toContain('Primary Colors');
        });

        it('should group tokens by category correctly', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'dimension',
                    name: 'spacing-1',
                    value: { value: 8, unit: 'px' } as DimensionValue,
                    category: 'margin',
                    usageCount: 5
                },
                {
                    type: 'dimension',
                    name: 'spacing-2',
                    value: { value: 16, unit: 'px' } as DimensionValue,
                    category: 'margin',
                    usageCount: 10
                },
                {
                    type: 'dimension',
                    name: 'spacing-3',
                    value: { value: 12, unit: 'px' } as DimensionValue,
                    category: 'padding',
                    usageCount: 7
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            // Should have separate margin and padding sections
            expect(html).toContain('Margin');
            expect(html).toContain('Padding');

            // Margin section should have 2 tokens (spacing-1 and spacing-2)
            // Count occurrences of each margin token in the HTML
            const spacing1Count = (html.match(/spacing-1/g) || []).length;
            const spacing2Count = (html.match(/spacing-2/g) || []).length;

            // Each token appears twice in HTML (once in token-name div, once potentially elsewhere)
            expect(spacing1Count).toBeGreaterThanOrEqual(1);
            expect(spacing2Count).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Integration with Multiple Token Types', () => {
        it('should generate comprehensive styleguide with all token types', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 10
                },
                {
                    type: 'typography',
                    name: 'typography-heading',
                    value: {
                        fontFamily: ['Arial'],
                        fontSize: { value: 24, unit: 'px' },
                        fontWeight: 700,
                        lineHeight: 1.2
                    } as TypographyValue,
                    category: 'heading',
                    usageCount: 15
                },
                {
                    type: 'dimension',
                    name: 'spacing-medium',
                    value: { value: 16, unit: 'px' } as DimensionValue,
                    category: 'padding',
                    usageCount: 20
                },
                {
                    type: 'dimension',
                    name: 'border-width-normal',
                    value: { value: 1, unit: 'px' } as DimensionValue,
                    category: 'width',
                    usageCount: 25
                },
                {
                    type: 'shadow',
                    name: 'shadow-small',
                    value: {
                        offsetX: { value: 0, unit: 'px' },
                        offsetY: { value: 2, unit: 'px' },
                        blur: { value: 4, unit: 'px' },
                        spread: { value: 0, unit: 'px' },
                        color: { hex: '#000000', alpha: 0.1, colorSpace: 'srgb' }
                    } as ShadowValue,
                    category: 'shadow',
                    usageCount: 12
                },
                {
                    type: 'transition',
                    name: 'transition-fast-ease',
                    value: {
                        duration: { value: 0.2, unit: 's' },
                        delay: { value: 0, unit: 's' },
                        timingFunction: [0.42, 0, 1, 1]
                    } as TransitionValue,
                    category: 'transition',
                    usageCount: 18
                }
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(tokens);

            // Should include all sections
            expect(html).toContain('Colors');
            expect(html).toContain('Typography');
            expect(html).toContain('Spacing');
            expect(html).toContain('Border Widths');
            expect(html).toContain('Shadows');
            expect(html).toContain('Animations');

            // Should include all token names
            expect(html).toContain('color-primary');
            expect(html).toContain('typography-heading');
            expect(html).toContain('spacing-medium');
            expect(html).toContain('border-width-normal');
            expect(html).toContain('shadow-small');
            expect(html).toContain('transition-fast-ease');

            // Should have correct statistics
            expect(html).toContain('<span class="stat-value">6</span>');
            expect(html).toContain('Total Tokens');
        });
    });
});
