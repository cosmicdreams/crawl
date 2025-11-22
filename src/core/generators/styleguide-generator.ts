// src/core/generators/styleguide-generator.ts
/**
 * Styleguide Generator
 * Generates human-readable HTML styleguide from extracted design tokens
 * Organized by category with visual representations
 */

import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';
import {
    ColorValue,
    DimensionValue,
    DurationValue,
    CubicBezierValue,
    isDurationValue,
    isCubicBezierValue,
    getDimensionValue
} from '../tokens/types/primitives.js';
import {
    TypographyValue,
    ShadowValue,
    TransitionValue,
    BorderStyleValue
} from '../tokens/types/composites.js';
import fs from 'node:fs';
import path from 'node:path';

export interface StyleguideOptions {
    title?: string;
    outputPath?: string;
    includeMetadata?: boolean;
    includeUsageStats?: boolean;
    groupByCategory?: boolean;
}

export interface StyleguideSection {
    title: string;
    category: string;
    tokens: ExtractedTokenData[];
    htmlContent: string;
}

export class StyleguideGenerator {
    private options: StyleguideOptions;

    constructor(options: StyleguideOptions = {}) {
        this.options = {
            title: 'Design System Styleguide',
            outputPath: './styleguide.html',
            includeMetadata: true,
            includeUsageStats: true,
            groupByCategory: true,
            ...options
        };
    }

    /**
     * Generate complete styleguide from all extracted tokens
     */
    generate(allTokens: ExtractedTokenData[]): string {
        // Group tokens by category
        const groupedTokens = this.groupTokensByCategory(allTokens);

        // Generate sections
        const sections: StyleguideSection[] = [];

        // Color section
        if (groupedTokens.color.length > 0) {
            sections.push(this.generateColorSection(groupedTokens.color));
        }

        // Typography section
        if (groupedTokens.typography.length > 0) {
            sections.push(this.generateTypographySection(groupedTokens.typography));
        }

        // Spacing section
        if (groupedTokens.spacing.length > 0) {
            sections.push(this.generateSpacingSection(groupedTokens.spacing));
        }

        // Border sections
        if (groupedTokens.borderWidth.length > 0) {
            sections.push(this.generateBorderWidthSection(groupedTokens.borderWidth));
        }

        if (groupedTokens.borderStyle.length > 0) {
            sections.push(this.generateBorderStyleSection(groupedTokens.borderStyle));
        }

        if (groupedTokens.borderRadius.length > 0) {
            sections.push(this.generateBorderRadiusSection(groupedTokens.borderRadius));
        }

        // Shadow section
        if (groupedTokens.shadow.length > 0) {
            sections.push(this.generateShadowSection(groupedTokens.shadow));
        }

        // Animation section
        if (groupedTokens.animation.length > 0) {
            sections.push(this.generateAnimationSection(groupedTokens.animation));
        }

        // Generate complete HTML
        const html = this.generateHTML(sections, allTokens);

        // Write to file if output path specified
        if (this.options.outputPath) {
            const dir = path.dirname(this.options.outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.options.outputPath, html);
        }

        return html;
    }

    /**
     * Group tokens by their category
     */
    private groupTokensByCategory(tokens: ExtractedTokenData[]): Record<string, ExtractedTokenData[]> {
        const groups: Record<string, ExtractedTokenData[]> = {
            color: [],
            typography: [],
            spacing: [],
            borderWidth: [],
            borderStyle: [],
            borderRadius: [],
            shadow: [],
            animation: []
        };

        tokens.forEach(token => {
            if (token.type === 'color') {
                groups.color.push(token);
            } else if (token.type === 'typography') {
                groups.typography.push(token);
            } else if (token.type === 'dimension' && token.category) {
                if (['margin', 'padding', 'gap'].includes(token.category)) {
                    groups.spacing.push(token);
                } else if (token.category === 'width') {
                    groups.borderWidth.push(token);
                } else if (token.category === 'radius') {
                    groups.borderRadius.push(token);
                }
            } else if (token.type === 'strokeStyle') {
                groups.borderStyle.push(token);
            } else if (token.type === 'shadow') {
                groups.shadow.push(token);
            } else if (token.type === 'transition') {
                groups.animation.push(token);
            }
        });

        return groups;
    }

    /**
     * Generate color section with visual swatches
     */
    private generateColorSection(tokens: ExtractedTokenData[]): StyleguideSection {
        const colorsByCategory = this.groupBy(tokens, 'category');

        let html = '<div class="token-section color-section">';

        Object.entries(colorsByCategory).forEach(([category, categoryTokens]) => {
            html += `<h3>${this.capitalize(category)} Colors</h3>`;
            html += '<div class="color-grid">';

            categoryTokens.forEach(token => {
                const colorValue = token.value as ColorValue;
                const hex = colorValue.hex;
                const alpha = colorValue.alpha;

                const alphaValue = alpha ?? 1;
                html += `
                    <div class="color-card">
                        <div class="color-swatch" style="background-color: ${hex}; opacity: ${alphaValue};"></div>
                        <div class="color-info">
                            <div class="token-name">${token.name}</div>
                            <div class="token-value">${hex}</div>
                            ${alphaValue < 1 ? `<div class="token-alpha">Alpha: ${(alphaValue * 100).toFixed(0)}%</div>` : ''}
                            <div class="token-colorspace">${colorValue.colorSpace}</div>
                            ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';

        return {
            title: 'Colors',
            category: 'color',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate typography section with font samples
     */
    private generateTypographySection(tokens: ExtractedTokenData[]): StyleguideSection {
        let html = '<div class="token-section typography-section">';
        html += '<div class="typography-list">';

        tokens.forEach(token => {
            const typographyValue = token.value as TypographyValue;
            const fontFamily = Array.isArray(typographyValue.fontFamily)
                ? typographyValue.fontFamily.join(', ')
                : typographyValue.fontFamily;

            // Safely extract dimension values
            const fontSize = getDimensionValue(typographyValue.fontSize, { value: 16, unit: 'px' });
            const letterSpacing = typographyValue.letterSpacing
                ? getDimensionValue(typographyValue.letterSpacing, { value: 0, unit: 'px' })
                : null;

            html += `
                <div class="typography-card">
                    <div class="typography-sample" style="
                        font-family: ${fontFamily};
                        font-size: ${fontSize.value}${fontSize.unit};
                        font-weight: ${typographyValue.fontWeight};
                        line-height: ${typographyValue.lineHeight};
                        ${letterSpacing ? `letter-spacing: ${letterSpacing.value}${letterSpacing.unit};` : ''}
                    ">
                        The quick brown fox jumps over the lazy dog
                    </div>
                    <div class="typography-info">
                        <div class="token-name">${token.name}</div>
                        <div class="typography-details">
                            <div>Font: ${fontFamily}</div>
                            <div>Size: ${fontSize.value}${fontSize.unit}</div>
                            <div>Weight: ${typographyValue.fontWeight}</div>
                            <div>Line Height: ${typographyValue.lineHeight}</div>
                            ${letterSpacing ? `<div>Letter Spacing: ${letterSpacing.value}${letterSpacing.unit}</div>` : ''}
                        </div>
                        ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        return {
            title: 'Typography',
            category: 'typography',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate spacing section with visual scale
     */
    private generateSpacingSection(tokens: ExtractedTokenData[]): StyleguideSection {
        const spacingByCategory = this.groupBy(tokens, 'category');

        let html = '<div class="token-section spacing-section">';

        Object.entries(spacingByCategory).forEach(([category, categoryTokens]) => {
            html += `<h3>${this.capitalize(category)}</h3>`;
            html += '<div class="spacing-list">';

            categoryTokens.forEach(token => {
                const dimensionValue = token.value as DimensionValue;
                const sizeInPx = dimensionValue.unit === 'rem'
                    ? dimensionValue.value * 16
                    : dimensionValue.value;

                html += `
                    <div class="spacing-card">
                        <div class="spacing-visual">
                            <div class="spacing-box" style="width: ${sizeInPx}px; height: 32px;"></div>
                        </div>
                        <div class="spacing-info">
                            <div class="token-name">${token.name}</div>
                            <div class="token-value">${dimensionValue.value}${dimensionValue.unit}</div>
                            ${dimensionValue.unit === 'rem' ? `<div class="token-px-value">${sizeInPx}px</div>` : ''}
                            ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';

        return {
            title: 'Spacing',
            category: 'spacing',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate border width section
     */
    private generateBorderWidthSection(tokens: ExtractedTokenData[]): StyleguideSection {
        let html = '<div class="token-section border-width-section">';
        html += '<h3>Border Widths</h3>';
        html += '<div class="border-width-list">';

        tokens.forEach(token => {
            const dimensionValue = token.value as DimensionValue;

            html += `
                <div class="border-width-card">
                    <div class="border-width-visual">
                        <div class="border-sample" style="border: ${dimensionValue.value}${dimensionValue.unit} solid #3b82f6;"></div>
                    </div>
                    <div class="border-width-info">
                        <div class="token-name">${token.name}</div>
                        <div class="token-value">${dimensionValue.value}${dimensionValue.unit}</div>
                        ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        return {
            title: 'Border Widths',
            category: 'borderWidth',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate border style section
     */
    private generateBorderStyleSection(tokens: ExtractedTokenData[]): StyleguideSection {
        let html = '<div class="token-section border-style-section">';
        html += '<h3>Border Styles</h3>';
        html += '<div class="border-style-list">';

        tokens.forEach(token => {
            const styleValue = token.value as BorderStyleValue;

            html += `
                <div class="border-style-card">
                    <div class="border-style-visual">
                        <div class="border-sample" style="border: 2px ${styleValue} #3b82f6;"></div>
                    </div>
                    <div class="border-style-info">
                        <div class="token-name">${token.name}</div>
                        <div class="token-value">${styleValue}</div>
                        ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        return {
            title: 'Border Styles',
            category: 'borderStyle',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate border radius section
     */
    private generateBorderRadiusSection(tokens: ExtractedTokenData[]): StyleguideSection {
        let html = '<div class="token-section border-radius-section">';
        html += '<h3>Border Radius</h3>';
        html += '<div class="border-radius-list">';

        tokens.forEach(token => {
            const dimensionValue = token.value as DimensionValue;

            html += `
                <div class="border-radius-card">
                    <div class="border-radius-visual">
                        <div class="radius-sample" style="border-radius: ${dimensionValue.value}${dimensionValue.unit};"></div>
                    </div>
                    <div class="border-radius-info">
                        <div class="token-name">${token.name}</div>
                        <div class="token-value">${dimensionValue.value}${dimensionValue.unit}</div>
                        ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        return {
            title: 'Border Radius',
            category: 'borderRadius',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate shadow section
     */
    private generateShadowSection(tokens: ExtractedTokenData[]): StyleguideSection {
        let html = '<div class="token-section shadow-section">';
        html += '<div class="shadow-list">';

        tokens.forEach(token => {
            const shadowValue = token.value as ShadowValue;

            // Safely extract dimension values
            const offsetX = getDimensionValue(shadowValue.offsetX, { value: 0, unit: 'px' });
            const offsetY = getDimensionValue(shadowValue.offsetY, { value: 0, unit: 'px' });
            const blur = getDimensionValue(shadowValue.blur, { value: 0, unit: 'px' });
            const spread = getDimensionValue(shadowValue.spread, { value: 0, unit: 'px' });
            const colorHex = typeof shadowValue.color === 'object' && 'hex' in shadowValue.color
                ? shadowValue.color.hex || '#000000'
                : '#000000';

            const boxShadow = `${offsetX.value}${offsetX.unit} ${offsetY.value}${offsetY.unit} ${blur.value}${blur.unit} ${spread.value}${spread.unit} ${colorHex}`;

            html += `
                <div class="shadow-card">
                    <div class="shadow-visual">
                        <div class="shadow-sample" style="box-shadow: ${boxShadow};"></div>
                    </div>
                    <div class="shadow-info">
                        <div class="token-name">${token.name}</div>
                        <div class="shadow-details">
                            <div>Offset: ${offsetX.value}${offsetX.unit}, ${offsetY.value}${offsetY.unit}</div>
                            <div>Blur: ${blur.value}${blur.unit}</div>
                            <div>Spread: ${spread.value}${spread.unit}</div>
                            <div>Color: ${colorHex}</div>
                        </div>
                        ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        return {
            title: 'Shadows',
            category: 'shadow',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate animation section with examples
     */
    private generateAnimationSection(tokens: ExtractedTokenData[]): StyleguideSection {
        const animationsByCategory = this.groupBy(tokens, 'category');

        let html = '<div class="token-section animation-section">';

        Object.entries(animationsByCategory).forEach(([category, categoryTokens]) => {
            html += `<h3>${this.capitalize(category)}s</h3>`;
            html += '<div class="animation-list">';

            categoryTokens.forEach(token => {
                const transitionValue = token.value as TransitionValue;

                // Safely extract duration values with type guards
                const duration = isDurationValue(transitionValue.duration)
                    ? transitionValue.duration
                    : { value: 0, unit: 'ms' as const };
                const delay = isDurationValue(transitionValue.delay)
                    ? transitionValue.delay
                    : { value: 0, unit: 'ms' as const };
                const timingFn = isCubicBezierValue(transitionValue.timingFunction)
                    ? transitionValue.timingFunction
                    : [0, 0, 1, 1] as CubicBezierValue;

                const timingFunction = `cubic-bezier(${timingFn.join(', ')})`;

                html += `
                    <div class="animation-card">
                        <div class="animation-visual">
                            <div class="animation-sample"
                                 data-duration="${duration.value}${duration.unit}"
                                 data-timing="${timingFunction}"
                                 style="transition: transform ${duration.value}${duration.unit} ${timingFunction};">
                                Hover to see animation
                            </div>
                        </div>
                        <div class="animation-info">
                            <div class="token-name">${token.name}</div>
                            <div class="animation-details">
                                <div>Duration: ${duration.value}${duration.unit}</div>
                                <div>Delay: ${delay.value}${delay.unit}</div>
                                <div>Timing: ${timingFunction}</div>
                            </div>
                            ${this.options.includeUsageStats ? `<div class="token-usage">Used ${token.usageCount} times</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';

        return {
            title: 'Animations',
            category: 'animation',
            tokens,
            htmlContent: html
        };
    }

    /**
     * Generate complete HTML document
     */
    private generateHTML(sections: StyleguideSection[], allTokens: ExtractedTokenData[]): string {
        const css = this.generateCSS();
        const scripts = this.generateScripts();

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.options.title}</title>
    <style>${css}</style>
</head>
<body>
    <div class="styleguide-container">
        <header class="styleguide-header">
            <h1>${this.options.title}</h1>
            <div class="styleguide-stats">
                <div class="stat">
                    <span class="stat-value">${allTokens.length}</span>
                    <span class="stat-label">Total Tokens</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${sections.length}</span>
                    <span class="stat-label">Categories</span>
                </div>
            </div>
        </header>

        <nav class="styleguide-nav">
            <ul>
                ${sections.map(section => `<li><a href="#${section.category}">${section.title}</a></li>`).join('\n')}
            </ul>
        </nav>

        <main class="styleguide-content">
            ${sections.map(section => `
                <section id="${section.category}">
                    <h2>${section.title}</h2>
                    ${section.htmlContent}
                </section>
            `).join('\n')}
        </main>

        <footer class="styleguide-footer">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </footer>
    </div>

    <script>${scripts}</script>
</body>
</html>
        `;

        return html;
    }

    /**
     * Generate CSS styles for the styleguide
     */
    private generateCSS(): string {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background-color: #f9fafb;
            }

            .styleguide-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 0 24px;
            }

            .styleguide-header {
                padding: 48px 0 32px;
                border-bottom: 1px solid #e5e7eb;
                margin-bottom: 32px;
            }

            .styleguide-header h1 {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 16px;
                color: #111827;
            }

            .styleguide-stats {
                display: flex;
                gap: 32px;
            }

            .stat {
                display: flex;
                flex-direction: column;
            }

            .stat-value {
                font-size: 32px;
                font-weight: 700;
                color: #3b82f6;
            }

            .stat-label {
                font-size: 14px;
                color: #6b7280;
            }

            .styleguide-nav {
                position: sticky;
                top: 0;
                background-color: #ffffff;
                padding: 16px 0;
                margin-bottom: 32px;
                border-bottom: 1px solid #e5e7eb;
                z-index: 10;
            }

            .styleguide-nav ul {
                list-style: none;
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
            }

            .styleguide-nav a {
                color: #4b5563;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s;
            }

            .styleguide-nav a:hover {
                color: #3b82f6;
            }

            .styleguide-content section {
                background-color: #ffffff;
                border-radius: 8px;
                padding: 32px;
                margin-bottom: 32px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .styleguide-content h2 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 24px;
                color: #111827;
            }

            .styleguide-content h3 {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 16px;
                margin-top: 24px;
                color: #374151;
            }

            /* Color Styles */
            .color-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .color-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }

            .color-swatch {
                width: 100%;
                height: 120px;
            }

            .color-info {
                padding: 12px;
            }

            /* Typography Styles */
            .typography-list {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .typography-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 24px;
            }

            .typography-sample {
                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .typography-details {
                font-size: 14px;
                color: #6b7280;
            }

            /* Spacing Styles */
            .spacing-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 24px;
            }

            .spacing-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 12px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }

            .spacing-box {
                background-color: #3b82f6;
            }

            /* Border Styles */
            .border-width-list,
            .border-style-list,
            .border-radius-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
            }

            .border-width-card,
            .border-style-card,
            .border-radius-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
            }

            .border-sample {
                width: 100%;
                height: 60px;
                margin-bottom: 12px;
            }

            .radius-sample {
                width: 100%;
                height: 80px;
                background-color: #3b82f6;
            }

            /* Shadow Styles */
            .shadow-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 24px;
            }

            .shadow-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 24px;
            }

            .shadow-sample {
                width: 100%;
                height: 100px;
                background-color: #ffffff;
                margin-bottom: 16px;
            }

            .shadow-details {
                font-size: 14px;
                color: #6b7280;
            }

            /* Animation Styles */
            .animation-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 24px;
            }

            .animation-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 24px;
            }

            .animation-sample {
                width: 100%;
                height: 80px;
                background-color: #3b82f6;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 16px;
            }

            .animation-sample:hover {
                transform: translateY(-8px);
            }

            .animation-details {
                font-size: 14px;
                color: #6b7280;
            }

            /* Common Token Styles */
            .token-name {
                font-weight: 600;
                color: #111827;
                margin-bottom: 4px;
            }

            .token-value {
                font-family: 'Courier New', monospace;
                color: #6b7280;
                margin-bottom: 4px;
            }

            .token-usage {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 8px;
            }

            .token-colorspace,
            .token-alpha,
            .token-px-value {
                font-size: 12px;
                color: #9ca3af;
            }

            /* Footer */
            .styleguide-footer {
                text-align: center;
                padding: 32px 0;
                color: #6b7280;
                font-size: 14px;
            }
        `;
    }

    /**
     * Generate JavaScript for interactive features
     */
    private generateScripts(): string {
        return `
            // Smooth scrolling for navigation
            document.querySelectorAll('.styleguide-nav a').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // Animation sample interactions
            document.querySelectorAll('.animation-sample').forEach(sample => {
                sample.addEventListener('click', function() {
                    this.style.transform = this.style.transform === 'translateY(-8px)'
                        ? 'translateY(0)'
                        : 'translateY(-8px)';
                });
            });
        `;
    }

    /**
     * Utility: Group array by property
     */
    private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
        return array.reduce((result, item) => {
            const groupKey = String(item[key]);
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {} as Record<string, T[]>);
    }

    /**
     * Utility: Capitalize first letter
     */
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
