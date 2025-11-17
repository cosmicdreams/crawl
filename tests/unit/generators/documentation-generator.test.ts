// tests/unit/generators/documentation-generator.test.ts
/**
 * Unit tests for Documentation Generator
 * Tests markdown documentation generation, file structure, and framework integrations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentationGenerator } from '../../../src/core/generators/documentation-generator.js';
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

describe('DocumentationGenerator', () => {
    let testOutputDir: string;

    beforeEach(() => {
        testOutputDir = path.join(process.cwd(), 'test-output-docs');
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
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });
            const tokens: ExtractedTokenData[] = [];

            generator.generate(tokens);

            const readmePath = path.join(testOutputDir, 'README.md');
            expect(fs.existsSync(readmePath)).toBe(true);

            const content = fs.readFileSync(readmePath, 'utf-8');
            expect(content).toContain('Design System Documentation');
        });

        it('should accept custom title option', () => {
            const generator = new DocumentationGenerator({
                title: 'My Custom Design System',
                outputDir: testOutputDir
            });

            generator.generate([]);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('My Custom Design System');
        });

        it('should accept custom description option', () => {
            const generator = new DocumentationGenerator({
                description: 'A custom design system for testing',
                outputDir: testOutputDir
            });

            generator.generate([]);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('A custom design system for testing');
        });

        it('should accept custom output directory', () => {
            const customDir = path.join(testOutputDir, 'custom-docs');
            const generator = new DocumentationGenerator({
                outputDir: customDir
            });

            generator.generate([]);

            expect(fs.existsSync(customDir)).toBe(true);
            expect(fs.existsSync(path.join(customDir, 'README.md'))).toBe(true);
        });

        it('should respect includeApiDocs option', () => {
            const generatorWithApi = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true
            });

            generatorWithApi.generate([]);
            expect(fs.existsSync(path.join(testOutputDir, 'api-reference.md'))).toBe(true);

            // Clean up for second test
            fs.rmSync(testOutputDir, { recursive: true, force: true });
            fs.mkdirSync(testOutputDir, { recursive: true });

            const generatorWithoutApi = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: false
            });

            generatorWithoutApi.generate([]);
            expect(fs.existsSync(path.join(testOutputDir, 'api-reference.md'))).toBe(false);
        });

        it('should respect includeIntegrationGuides option', () => {
            const generatorWithGuides = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['react']
            });

            generatorWithGuides.generate([]);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-react.md'))).toBe(true);

            // Clean up for second test
            fs.rmSync(testOutputDir, { recursive: true, force: true });
            fs.mkdirSync(testOutputDir, { recursive: true });

            const generatorWithoutGuides = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: false
            });

            generatorWithoutGuides.generate([]);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-react.md'))).toBe(false);
        });

        it('should generate multiple framework guides when specified', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['react', 'vue', 'css-variables']
            });

            generator.generate([]);

            expect(fs.existsSync(path.join(testOutputDir, 'integration-react.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-vue.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-css-variables.md'))).toBe(true);
        });
    });

    describe('README Generation', () => {
        it('should generate README with token statistics', () => {
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

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('**Total Tokens**: 2');
            expect(content).toContain('**Color Tokens**: 2');
        });

        it('should include overview section in README', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate([]);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('## Overview');
            expect(content).toContain('design tokens');
        });

        it('should include getting started section in README', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate([]);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('## Quick Start');
        });

        it('should include links to category documentation', () => {
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

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const readmePath = path.join(testOutputDir, 'README.md');
            const content = fs.readFileSync(readmePath, 'utf-8');

            expect(content).toContain('color-tokens.md');
            expect(content).toContain('typography-tokens.md');
        });
    });

    describe('Category Documentation', () => {
        it('should generate color tokens documentation', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary-blue',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 10
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const colorDocPath = path.join(testOutputDir, 'color-tokens.md');
            expect(fs.existsSync(colorDocPath)).toBe(true);

            const content = fs.readFileSync(colorDocPath, 'utf-8');
            expect(content).toContain('# Color Tokens');
            expect(content).toContain('color-primary-blue');
            expect(content).toContain('#3b82f6');
        });

        it('should generate typography tokens documentation', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'typography',
                    name: 'typography-heading-large',
                    value: {
                        fontFamily: ['Georgia', 'serif'],
                        fontSize: { value: 32, unit: 'px' },
                        fontWeight: 700,
                        lineHeight: 1.2
                    } as TypographyValue,
                    category: 'heading',
                    usageCount: 15
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const typoDocPath = path.join(testOutputDir, 'typography-tokens.md');
            expect(fs.existsSync(typoDocPath)).toBe(true);

            const content = fs.readFileSync(typoDocPath, 'utf-8');
            expect(content).toContain('# Typography Tokens');
            expect(content).toContain('typography-heading-large');
            expect(content).toContain('32px');
        });

        it('should create markdown tables with token details', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 20
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const colorDocPath = path.join(testOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            expect(content).toContain('| Token Name |');
            expect(content).toContain('|------------|');
            expect(content).toContain('color-primary');
        });

        it('should group tokens by category within type', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 15
                },
                {
                    type: 'color',
                    name: 'color-secondary',
                    value: { hex: '#10b981', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'secondary',
                    usageCount: 20
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const colorDocPath = path.join(testOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            expect(content).toContain('color-primary');
            expect(content).toContain('color-secondary');
        });
    });

    describe('API Documentation', () => {
        it('should generate API reference when enabled', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true
            });

            generator.generate([]);

            const apiDocPath = path.join(testOutputDir, 'api-reference.md');
            expect(fs.existsSync(apiDocPath)).toBe(true);

            const content = fs.readFileSync(apiDocPath, 'utf-8');
            expect(content).toContain('# API Reference');
        });

        it('should include token format documentation', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true
            });

            generator.generate([]);

            const apiDocPath = path.join(testOutputDir, 'api-reference.md');
            const content = fs.readFileSync(apiDocPath, 'utf-8');

            expect(content).toContain('Token Access');
            expect(content).toContain('Methods');
        });

        it('should include examples of token usage', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true
            });

            generator.generate([]);

            const apiDocPath = path.join(testOutputDir, 'api-reference.md');
            const content = fs.readFileSync(apiDocPath, 'utf-8');

            expect(content).toContain('```');
        });
    });

    describe('Framework Integration Guides', () => {
        it('should generate React integration guide', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['react']
            });

            generator.generate([]);

            const reactGuidePath = path.join(testOutputDir, 'integration-react.md');
            expect(fs.existsSync(reactGuidePath)).toBe(true);

            const content = fs.readFileSync(reactGuidePath, 'utf-8');
            expect(content).toContain('# React Integration');
            expect(content).toContain('import');
            expect(content).toContain('React');
        });

        it('should generate Vue integration guide', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['vue']
            });

            generator.generate([]);

            const vueGuidePath = path.join(testOutputDir, 'integration-vue.md');
            expect(fs.existsSync(vueGuidePath)).toBe(true);

            const content = fs.readFileSync(vueGuidePath, 'utf-8');
            expect(content).toContain('# Vue Integration');
            expect(content).toContain('Vue');
        });

        it('should generate CSS Variables guide', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['css-variables']
            });

            generator.generate([]);

            const cssGuidePath = path.join(testOutputDir, 'integration-css-variables.md');
            expect(fs.existsSync(cssGuidePath)).toBe(true);

            const content = fs.readFileSync(cssGuidePath, 'utf-8');
            expect(content).toContain('# CSS Variables Integration');
            expect(content).toContain('--');
        });

        it('should generate Sass integration guide', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['sass']
            });

            generator.generate([]);

            const sassGuidePath = path.join(testOutputDir, 'integration-sass.md');
            expect(fs.existsSync(sassGuidePath)).toBe(true);

            const content = fs.readFileSync(sassGuidePath, 'utf-8');
            expect(content).toContain('# Sass/SCSS Integration');
            expect(content).toContain('$');
        });

        it('should generate Tailwind integration guide', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['tailwind']
            });

            generator.generate([]);

            const tailwindGuidePath = path.join(testOutputDir, 'integration-tailwind.md');
            expect(fs.existsSync(tailwindGuidePath)).toBe(true);

            const content = fs.readFileSync(tailwindGuidePath, 'utf-8');
            expect(content).toContain('# Tailwind CSS Integration');
            expect(content).toContain('tailwind.config');
        });

        it('should include token examples in framework guides', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'colorPrimary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['react']
            });

            generator.generate(tokens);

            const reactGuidePath = path.join(testOutputDir, 'integration-react.md');
            const content = fs.readFileSync(reactGuidePath, 'utf-8');

            expect(content).toContain('React');
        });
    });

    describe('Helper Methods', () => {
        it('should correctly format color values', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const colorDocPath = path.join(testOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            expect(content).toContain('#3b82f6');
        });

        it('should correctly format dimension values', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 20
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const colorDocPath = path.join(testOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            expect(content).toContain('#3b82f6');
        });

        it('should correctly format typography values', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'typography',
                    name: 'typography-body',
                    value: {
                        fontFamily: ['Arial', 'sans-serif'],
                        fontSize: { value: 16, unit: 'px' },
                        fontWeight: 400,
                        lineHeight: 1.5
                    } as TypographyValue,
                    category: 'body',
                    usageCount: 30
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            const typoDocPath = path.join(testOutputDir, 'typography-tokens.md');
            const content = fs.readFileSync(typoDocPath, 'utf-8');

            expect(content).toContain('typography-body');
        });

        it('should convert camelCase to kebab-case for CSS', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'colorPrimaryBlue',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeIntegrationGuides: true,
                frameworks: ['css-variables']
            });

            generator.generate(tokens);

            const cssGuidePath = path.join(testOutputDir, 'integration-css-variables.md');
            const content = fs.readFileSync(cssGuidePath, 'utf-8');

            expect(content).toContain('--color-primary-blue');
        });
    });

    describe('Empty Token Handling', () => {
        it('should generate valid documentation with no tokens', () => {
            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate([]);

            const readmePath = path.join(testOutputDir, 'README.md');
            expect(fs.existsSync(readmePath)).toBe(true);

            const content = fs.readFileSync(readmePath, 'utf-8');
            expect(content).toContain('**Total Tokens**: 0');
        });

        it('should not create category files for empty categories', () => {
            const tokens: ExtractedTokenData[] = [
                {
                    type: 'color',
                    name: 'color-primary',
                    value: { hex: '#3b82f6', alpha: 1, colorSpace: 'srgb' } as ColorValue,
                    category: 'primary',
                    usageCount: 5
                }
            ];

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir
            });

            generator.generate(tokens);

            // Should have color tokens file
            expect(fs.existsSync(path.join(testOutputDir, 'color-tokens.md'))).toBe(true);

            // Should not have typography tokens file (no typography tokens)
            expect(fs.existsSync(path.join(testOutputDir, 'typography-tokens.md'))).toBe(false);
        });
    });

    describe('File Output', () => {
        it('should create output directory if it does not exist', () => {
            const nestedDir = path.join(testOutputDir, 'nested', 'docs');
            const generator = new DocumentationGenerator({
                outputDir: nestedDir
            });

            generator.generate([]);

            expect(fs.existsSync(nestedDir)).toBe(true);
            expect(fs.existsSync(path.join(nestedDir, 'README.md'))).toBe(true);
        });

        it('should write all files successfully', () => {
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

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true,
                includeIntegrationGuides: true,
                frameworks: ['react', 'vue']
            });

            generator.generate(tokens);

            // Check all expected files exist
            expect(fs.existsSync(path.join(testOutputDir, 'README.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'color-tokens.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'typography-tokens.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'api-reference.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-react.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'integration-vue.md'))).toBe(true);
        });
    });

    describe('Integration with Multiple Token Types', () => {
        it('should generate comprehensive documentation for all token types', () => {
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

            const generator = new DocumentationGenerator({
                outputDir: testOutputDir,
                includeApiDocs: true,
                includeIntegrationGuides: true,
                frameworks: ['react', 'css-variables']
            });

            generator.generate(tokens);

            // Check README includes all types
            const readmePath = path.join(testOutputDir, 'README.md');
            const readmeContent = fs.readFileSync(readmePath, 'utf-8');
            expect(readmeContent).toContain('**Color Tokens**: 1');
            expect(readmeContent).toContain('**Typography Tokens**: 1');

            // Check main category files exist
            expect(fs.existsSync(path.join(testOutputDir, 'color-tokens.md'))).toBe(true);
            expect(fs.existsSync(path.join(testOutputDir, 'typography-tokens.md'))).toBe(true);
        });
    });
});
