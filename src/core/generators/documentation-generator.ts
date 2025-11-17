// src/core/generators/documentation-generator.ts
/**
 * Documentation Generator
 * Generates comprehensive markdown documentation from extracted design tokens
 * Includes token reference, API documentation, and framework integration guides
 */

import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';
import {
    ColorValue,
    DimensionValue,
    CubicBezierValue
} from '../tokens/types/primitives.js';
import {
    TypographyValue,
    TransitionValue
} from '../tokens/types/composites.js';
import fs from 'node:fs';
import path from 'node:path';

interface DocumentationGeneratorOptions {
    title?: string;
    description?: string;
    outputDir?: string;
    includeApiDocs?: boolean;
    includeIntegrationGuides?: boolean;
    frameworks?: ('react' | 'vue' | 'css-variables' | 'sass' | 'tailwind')[];
}


export class DocumentationGenerator {
    private options: Required<DocumentationGeneratorOptions>;

    constructor(options: DocumentationGeneratorOptions = {}) {
        this.options = {
            title: options.title || 'Design System Documentation',
            description: options.description || 'Comprehensive design token documentation',
            outputDir: options.outputDir || './docs',
            includeApiDocs: options.includeApiDocs ?? true,
            includeIntegrationGuides: options.includeIntegrationGuides ?? true,
            frameworks: options.frameworks || ['react', 'vue', 'css-variables']
        };
    }

    /**
     * Generate complete documentation from design tokens
     */
    generate(tokens: ExtractedTokenData[]): void {
        // Ensure output directory exists
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }

        // Generate main README
        const readme = this.generateReadme(tokens);
        fs.writeFileSync(
            path.join(this.options.outputDir, 'README.md'),
            readme
        );

        // Generate token reference by category
        const tokensByCategory = this.groupTokensByCategory(tokens);

        for (const [category, categoryTokens] of Object.entries(tokensByCategory)) {
            const categoryDoc = this.generateCategoryDocumentation(category, categoryTokens);
            const filename = `${category.toLowerCase()}-tokens.md`;
            fs.writeFileSync(
                path.join(this.options.outputDir, filename),
                categoryDoc
            );
        }

        // Generate API documentation
        if (this.options.includeApiDocs) {
            const apiDoc = this.generateApiDocumentation(tokens);
            fs.writeFileSync(
                path.join(this.options.outputDir, 'api-reference.md'),
                apiDoc
            );
        }

        // Generate integration guides
        if (this.options.includeIntegrationGuides) {
            for (const framework of this.options.frameworks) {
                const guide = this.generateIntegrationGuide(framework, tokens);
                fs.writeFileSync(
                    path.join(this.options.outputDir, `integration-${framework}.md`),
                    guide
                );
            }
        }

        console.log(`Documentation generated successfully in ${this.options.outputDir}`);
    }

    /**
     * Generate main README.md
     */
    private generateReadme(tokens: ExtractedTokenData[]): string {
        const stats = this.calculateStats(tokens);
        const categories = Object.keys(this.groupTokensByCategory(tokens));

        return `# ${this.options.title}

${this.options.description}

## Overview

This design system provides ${stats.totalTokens} design tokens across ${stats.categories} categories, ensuring consistency and maintainability across your application.

## Token Categories

${categories.map(cat => `- [${this.capitalizeFirst(cat)} Tokens](${cat.toLowerCase()}-tokens.md)`).join('\n')}

## Quick Start

### Installation

\`\`\`bash
# Install design tokens
npm install @your-org/design-tokens
\`\`\`

### Usage

Choose your preferred integration method:

${this.options.frameworks.map(framework =>
    `- [${this.capitalizeFirst(framework)}](integration-${framework}.md)`
).join('\n')}

## Documentation

- [API Reference](api-reference.md) - Complete token API documentation
${categories.map(cat => `- [${this.capitalizeFirst(cat)} Tokens](${cat.toLowerCase()}-tokens.md) - ${this.capitalizeFirst(cat)} token reference`).join('\n')}

## Statistics

- **Total Tokens**: ${stats.totalTokens}
- **Categories**: ${stats.categories}
- **Color Tokens**: ${stats.byType.color || 0}
- **Typography Tokens**: ${stats.byType.typography || 0}
- **Spacing Tokens**: ${stats.byType.spacing || 0}
- **Animation Tokens**: ${stats.byType.animation || 0}

## Contributing

When adding new tokens, please follow the [Design Token Specification](https://design-tokens.github.io/community-group/format/).

---

*Generated on ${new Date().toLocaleDateString()}*
`;
    }

    /**
     * Generate category-specific documentation
     */
    private generateCategoryDocumentation(category: string, tokens: ExtractedTokenData[]): string {
        const categoryTitle = this.capitalizeFirst(category);

        let doc = `# ${categoryTitle} Tokens

Complete reference for all ${category} tokens in the design system.

## Token List

| Token Name | Value | Description | Usage Count |
|------------|-------|-------------|-------------|
`;

        for (const token of tokens) {
            const valueStr = this.formatTokenValue(token);
            const description = token.description || '-';
            const usage = token.usageCount || 0;

            doc += `| \`${token.name}\` | ${valueStr} | ${description} | ${usage} |\n`;
        }

        doc += `\n## Examples\n\n`;
        doc += this.generateCategoryExamples(category, tokens);

        return doc;
    }

    /**
     * Generate API documentation
     */
    private generateApiDocumentation(_tokens: ExtractedTokenData[]): string {
        return `# API Reference

## Token Access Methods

### CSS Variables

\`\`\`css
.element {
  /* Color tokens */
  color: var(--color-primary);

  /* Typography tokens */
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);

  /* Spacing tokens */
  margin: var(--spacing-md);

  /* Animation tokens */
  transition: var(--transition-normal-ease);
}
\`\`\`

### JavaScript/TypeScript

\`\`\`typescript
import { tokens } from '@your-org/design-tokens';

// Access tokens
const primaryColor = tokens.color.primary;
const bodyFont = tokens.typography.body;
const normalSpacing = tokens.spacing.md;
const fadeTransition = tokens.animation.fadeNormalEase;
\`\`\`

### Sass/SCSS

\`\`\`scss
@import '@your-org/design-tokens/scss';

.element {
  color: $color-primary;
  font-size: $font-size-body;
  margin: $spacing-md;
  transition: $transition-normal-ease;
}
\`\`\`

## Token Structure

All tokens follow the [Design Tokens Community Group specification](https://design-tokens.github.io/community-group/format/).

### Token Format

\`\`\`json
{
  "tokenName": {
    "$type": "color",
    "$value": "#3b82f6",
    "$description": "Primary brand color"
  }
}
\`\`\`

## Available Token Types

${this.generateTokenTypeReference()}
`;
    }

    /**
     * Generate framework-specific integration guide
     */
    private generateIntegrationGuide(framework: string, _tokens: ExtractedTokenData[]): string {
        const guides: Record<string, string> = {
            'react': this.generateReactGuide(_tokens),
            'vue': this.generateVueGuide(_tokens),
            'css-variables': this.generateCSSVariablesGuide(_tokens),
            'sass': this.generateSassGuide(_tokens),
            'tailwind': this.generateTailwindGuide(_tokens)
        };

        return guides[framework] || '';
    }

    private generateReactGuide(_tokens: ExtractedTokenData[]): string {
        return `# React Integration Guide

## Installation

\`\`\`bash
npm install @your-org/design-tokens
\`\`\`

## Setup

### 1. Import Tokens

\`\`\`typescript
import { tokens } from '@your-org/design-tokens';
\`\`\`

### 2. Use in Components

\`\`\`tsx
import React from 'react';
import { tokens } from '@your-org/design-tokens';

export const Button: React.FC = ({ children }) => {
  return (
    <button
      style={{
        backgroundColor: tokens.color.primary,
        color: tokens.color.textOnPrimary,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        transition: tokens.animation.fadeNormalEase
      }}
    >
      {children}
    </button>
  );
};
\`\`\`

### 3. Create a Theme Provider (Optional)

\`\`\`tsx
import React, { createContext, useContext } from 'react';
import { tokens } from '@your-org/design-tokens';

const ThemeContext = createContext(tokens);

export const ThemeProvider: React.FC = ({ children }) => {
  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTokens = () => useContext(ThemeContext);
\`\`\`

### 4. Usage with Theme Provider

\`\`\`tsx
import { useTokens } from './ThemeProvider';

export const Card: React.FC = ({ children }) => {
  const tokens = useTokens();

  return (
    <div
      style={{
        backgroundColor: tokens.color.surface,
        padding: tokens.spacing.lg,
        boxShadow: tokens.shadow.md
      }}
    >
      {children}
    </div>
  );
};
\`\`\`

## TypeScript Support

Full TypeScript support with autocomplete:

\`\`\`typescript
import { DesignTokens } from '@your-org/design-tokens';

const myColor: string = tokens.color.primary; // Type-safe
\`\`\`

## Examples

See the [examples directory](./examples/react) for complete working examples.
`;
    }

    private generateVueGuide(_tokens: ExtractedTokenData[]): string {
        return `# Vue Integration Guide

## Installation

\`\`\`bash
npm install @your-org/design-tokens
\`\`\`

## Setup

### 1. Import Tokens

\`\`\`typescript
import { tokens } from '@your-org/design-tokens';
\`\`\`

### 2. Use in Components

\`\`\`vue
<template>
  <button :style="buttonStyles">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { tokens } from '@your-org/design-tokens';
import { computed } from 'vue';

const buttonStyles = computed(() => ({
  backgroundColor: tokens.color.primary,
  color: tokens.color.textOnPrimary,
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.md,
  transition: tokens.animation.fadeNormalEase
}));
</script>
\`\`\`

### 3. Create a Plugin (Optional)

\`\`\`typescript
// plugins/design-tokens.ts
import { tokens } from '@your-org/design-tokens';
import type { App } from 'vue';

export default {
  install(app: App) {
    app.config.globalProperties.$tokens = tokens;
    app.provide('tokens', tokens);
  }
};
\`\`\`

\`\`\`typescript
// main.ts
import { createApp } from 'vue';
import designTokensPlugin from './plugins/design-tokens';
import App from './App.vue';

const app = createApp(App);
app.use(designTokensPlugin);
app.mount('#app');
\`\`\`

### 4. Usage with Plugin

\`\`\`vue
<script setup lang="ts">
import { inject } from 'vue';

const tokens = inject('tokens');
</script>
\`\`\`

## Composition API

\`\`\`typescript
import { ref, computed } from 'vue';
import { tokens } from '@your-org/design-tokens';

export const useTheme = () => {
  return {
    tokens,
    colors: computed(() => tokens.color),
    spacing: computed(() => tokens.spacing)
  };
};
\`\`\`

## Examples

See the [examples directory](./examples/vue) for complete working examples.
`;
    }

    private generateCSSVariablesGuide(tokens: ExtractedTokenData[]): string {
        const colorTokens = tokens.filter(t => t.type === 'color');
        const spacingTokens = tokens.filter(t => t.type === 'dimension' && t.category === 'spacing');

        return `# CSS Variables Integration Guide

## Installation

\`\`\`bash
npm install @your-org/design-tokens
\`\`\`

## Setup

### 1. Import CSS

\`\`\`css
@import '@your-org/design-tokens/css/tokens.css';
\`\`\`

Or import in your JavaScript/TypeScript:

\`\`\`typescript
import '@your-org/design-tokens/css/tokens.css';
\`\`\`

### 2. Use CSS Variables

\`\`\`css
.button {
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: var(--transition-fade-normal-ease);
}

.button:hover {
  background-color: var(--color-primary-hover);
}
\`\`\`

## Available Variables

### Colors

${colorTokens.slice(0, 5).map(t => `- \`--${this.tokenNameToCSS(t.name)}\``).join('\n')}
${colorTokens.length > 5 ? `- ... and ${colorTokens.length - 5} more` : ''}

### Spacing

${spacingTokens.slice(0, 5).map(t => `- \`--${this.tokenNameToCSS(t.name)}\``).join('\n')}
${spacingTokens.length > 5 ? `- ... and ${spacingTokens.length - 5} more` : ''}

See the [complete token reference](./README.md) for all available variables.

## Custom Properties

You can also access tokens programmatically:

\`\`\`javascript
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary');
\`\`\`

## Dark Mode Support

\`\`\`css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-text: var(--color-gray-100);
  }
}
\`\`\`
`;
    }

    private generateSassGuide(_tokens: ExtractedTokenData[]): string {
        return `# Sass/SCSS Integration Guide

## Installation

\`\`\`bash
npm install @your-org/design-tokens
\`\`\`

## Setup

### 1. Import Sass Variables

\`\`\`scss
@import '@your-org/design-tokens/scss/tokens';
\`\`\`

### 2. Use Sass Variables

\`\`\`scss
.button {
  background-color: $color-primary;
  color: $color-text-on-primary;
  padding: $spacing-md;
  border-radius: $radius-md;
  transition: $transition-fade-normal-ease;

  &:hover {
    background-color: darken($color-primary, 10%);
  }
}
\`\`\`

## Sass Functions

\`\`\`scss
// Get token with fallback
.element {
  color: token-get('color.primary', #3b82f6);
}

// Convert to rem
.element {
  font-size: to-rem($font-size-body);
}
\`\`\`

## Mixins

\`\`\`scss
@mixin apply-elevation($level) {
  @if $level == 'low' {
    box-shadow: $shadow-sm;
  } @else if $level == 'medium' {
    box-shadow: $shadow-md;
  } @else {
    box-shadow: $shadow-lg;
  }
}

.card {
  @include apply-elevation('medium');
}
\`\`\`
`;
    }

    private generateTailwindGuide(_tokens: ExtractedTokenData[]): string {
        return `# Tailwind CSS Integration Guide

## Installation

\`\`\`bash
npm install @your-org/design-tokens
\`\`\`

## Setup

### 1. Configure Tailwind

\`\`\`javascript
// tailwind.config.js
const { tokens } = require('@your-org/design-tokens');

module.exports = {
  theme: {
    extend: {
      colors: tokens.color,
      spacing: tokens.spacing,
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSize,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
      transitionDuration: tokens.duration,
      transitionTimingFunction: tokens.easing
    }
  }
};
\`\`\`

### 2. Use in Components

\`\`\`jsx
export const Button = ({ children }) => {
  return (
    <button className="bg-primary text-text-on-primary px-spacing-md py-spacing-sm rounded-md transition-fade-normal-ease hover:bg-primary-hover">
      {children}
    </button>
  );
};
\`\`\`

## Custom Utilities

\`\`\`javascript
// tailwind.config.js
module.exports = {
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.elevation-low': {
          boxShadow: tokens.shadow.sm
        },
        '.elevation-medium': {
          boxShadow: tokens.shadow.md
        },
        '.elevation-high': {
          boxShadow: tokens.shadow.lg
        }
      });
    }
  ]
};
\`\`\`
`;
    }

    /**
     * Helper methods
     */

    private groupTokensByCategory(tokens: ExtractedTokenData[]): Record<string, ExtractedTokenData[]> {
        const grouped: Record<string, ExtractedTokenData[]> = {};

        for (const token of tokens) {
            const category = this.getCategoryFromType(token.type);
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(token);
        }

        return grouped;
    }

    private getCategoryFromType(type: string): string {
        const typeMap: Record<string, string> = {
            'color': 'color',
            'typography': 'typography',
            'dimension': 'spacing',
            'transition': 'animation',
            'shadow': 'shadow',
            'border': 'border',
            'strokeStyle': 'border',
            'radius': 'radius'
        };

        return typeMap[type] || type;
    }

    private calculateStats(tokens: ExtractedTokenData[]) {
        const byType: Record<string, number> = {};

        for (const token of tokens) {
            const category = this.getCategoryFromType(token.type);
            byType[category] = (byType[category] || 0) + 1;
        }

        return {
            totalTokens: tokens.length,
            categories: Object.keys(byType).length,
            byType
        };
    }

    private formatTokenValue(token: ExtractedTokenData): string {
        if (token.type === 'color') {
            const colorValue = token.value as ColorValue;
            return colorValue.hex || `rgba(${colorValue.r}, ${colorValue.g}, ${colorValue.b}, ${colorValue.alpha})`;
        }

        if (token.type === 'typography') {
            const typValue = token.value as TypographyValue;
            return `${typValue.fontFamily[0]}, ${typValue.fontSize.value}${typValue.fontSize.unit}`;
        }

        if (token.type === 'dimension') {
            const dimValue = token.value as DimensionValue;
            return `${dimValue.value}${dimValue.unit}`;
        }

        if (token.type === 'transition') {
            const transValue = token.value as TransitionValue;
            return `${transValue.duration.value}${transValue.duration.unit} ${this.formatCubicBezier(transValue.timingFunction)}`;
        }

        return JSON.stringify(token.value);
    }

    private formatCubicBezier(cubicBezier: CubicBezierValue): string {
        return `cubic-bezier(${cubicBezier.join(', ')})`;
    }

    private generateCategoryExamples(category: string, _tokens: ExtractedTokenData[]): string {
        const exampleToken = _tokens[0];
        if (!exampleToken) return '';

        if (category === 'color') {
            return `### Using Color Tokens

\`\`\`css
.element {
  color: var(--${this.tokenNameToCSS(exampleToken.name)});
}
\`\`\`

\`\`\`jsx
<div style={{ color: tokens.color.${exampleToken.name} }}>
  Colored text
</div>
\`\`\`
`;
        }

        if (category === 'spacing') {
            return `### Using Spacing Tokens

\`\`\`css
.element {
  margin: var(--${this.tokenNameToCSS(exampleToken.name)});
}
\`\`\`

\`\`\`jsx
<div style={{ margin: tokens.spacing.${exampleToken.name} }}>
  Spaced element
</div>
\`\`\`
`;
        }

        return '';
    }

    private generateTokenTypeReference(): string {
        return `- **Color**: RGB/Hex color values
- **Typography**: Font properties (family, size, weight, line-height)
- **Dimension**: Size values with units (px, rem, em)
- **Transition**: Animation timing and easing
- **Shadow**: Box shadow values
- **Border**: Border styles and widths
- **Radius**: Border radius values`;
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private tokenNameToCSS(name: string): string {
        // Convert camelCase or PascalCase to kebab-case
        return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}
