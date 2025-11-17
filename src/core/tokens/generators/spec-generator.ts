// src/core/tokens/generators/spec-generator.ts
/**
 * Design Tokens Specification 2025.10 - Compliant Token Generator
 *
 * Generates .tokens.json files that conform to the Design Tokens specification.
 * This format is compatible with Figma, Style Dictionary, and other design tools.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    TokenDocument,
    TokenGroup,
    Token,
    validateTokenName,
    CRAWLER_EXTENSION_NAMESPACE,
    createCrawlerExtensions,
    CrawlerMetadata
} from '../types/base.js';
import {
    ColorValue,
    DimensionValue,
    FontFamilyValue,
    FontWeightValue,
    DurationValue,
    CubicBezierValue
} from '../types/primitives.js';
import {
    BorderValue,
    ShadowValue,
    TypographyValue
} from '../types/composites.js';

/**
 * Input token data from extractors (before conversion to spec format).
 */
export interface ExtractedTokenData {
    type: 'color' | 'spacing' | 'typography' | 'border' | 'animation';
    name: string;
    value: any; // Value in spec format (already converted)
    category?: string;
    usageCount?: number;
    source?: string;
    sourceUrls?: string[];
    description?: string;
}

/**
 * Configuration for token generation.
 */
export interface TokenGeneratorConfig {
    /** Output directory for .tokens.json file */
    outputDir: string;

    /** Optional prefix for token file name (default: 'design') */
    filePrefix?: string;

    /** Whether to organize tokens into semantic groups */
    useGroups?: boolean;

    /** Whether to generate readable (formatted) JSON */
    prettyPrint?: boolean;

    /** Custom vendor namespace for extensions (default: com.designtokencrawler) */
    vendorNamespace?: string;
}

/**
 * Generate spec-compliant design tokens file.
 */
export class SpecCompliantTokenGenerator {
    private config: Required<TokenGeneratorConfig>;

    constructor(config: TokenGeneratorConfig) {
        this.config = {
            filePrefix: 'design',
            useGroups: true,
            prettyPrint: true,
            vendorNamespace: CRAWLER_EXTENSION_NAMESPACE,
            ...config
        };
    }

    /**
     * Generate .tokens.json file from extracted token data.
     *
     * @param tokens Array of extracted tokens
     * @returns Path to generated file
     */
    async generate(tokens: ExtractedTokenData[]): Promise<string> {
        console.log(`Generating spec-compliant tokens from ${tokens.length} extracted tokens`);

        // Ensure output directory exists
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }

        // Build token document
        const document = this.config.useGroups
            ? this.buildGroupedDocument(tokens)
            : this.buildFlatDocument(tokens);

        // Validate token names
        this.validateDocument(document);

        // Write to file
        const outputPath = path.join(
            this.config.outputDir,
            `${this.config.filePrefix}.tokens.json`
        );

        const jsonContent = this.config.prettyPrint
            ? JSON.stringify(document, null, 2)
            : JSON.stringify(document);

        fs.writeFileSync(outputPath, jsonContent, 'utf-8');

        console.log(`✅ Spec-compliant tokens generated: ${outputPath}`);
        console.log(`   MIME type: application/design-tokens+json`);
        console.log(`   Compatible with: Figma, Style Dictionary, design tools`);

        return outputPath;
    }

    /**
     * Build document with semantic grouping (recommended).
     */
    private buildGroupedDocument(tokens: ExtractedTokenData[]): TokenDocument {
        const document: TokenDocument = {};

        // Group by type
        const byType = this.groupByType(tokens);

        // Create color group
        if (byType.color && byType.color.length > 0) {
            document.colors = this.buildColorGroup(byType.color);
        }

        // Create spacing group
        if (byType.spacing && byType.spacing.length > 0) {
            document.spacing = this.buildSpacingGroup(byType.spacing);
        }

        // Create typography group
        if (byType.typography && byType.typography.length > 0) {
            document.typography = this.buildTypographyGroup(byType.typography);
        }

        // Create border group
        if (byType.border && byType.border.length > 0) {
            document.borders = this.buildBorderGroup(byType.border);
        }

        // Create animation group
        if (byType.animation && byType.animation.length > 0) {
            document.animations = this.buildAnimationGroup(byType.animation);
        }

        return document;
    }

    /**
     * Build document without grouping (flat structure).
     */
    private buildFlatDocument(tokens: ExtractedTokenData[]): TokenDocument {
        const document: TokenDocument = {};

        for (const token of tokens) {
            const tokenName = this.sanitizeTokenName(token.name);
            document[tokenName] = this.buildToken(token);
        }

        return document;
    }

    /**
     * Build color group with type inheritance.
     */
    private buildColorGroup(tokens: ExtractedTokenData[]): TokenGroup {
        const group: TokenGroup = {
            $type: 'color',
            $description: 'Color tokens extracted from website'
        };

        // Optionally organize by category
        const byCategory = this.groupByCategory(tokens);

        for (const [category, categoryTokens] of Object.entries(byCategory)) {
            if (category && category !== 'uncategorized') {
                // Create nested group for category
                const categoryGroup: TokenGroup = {
                    $description: `${category} colors`
                };

                for (const token of categoryTokens) {
                    const tokenName = this.sanitizeTokenName(token.name);
                    categoryGroup[tokenName] = this.buildToken(token, true); // Skip $type (inherited)
                }

                group[category] = categoryGroup;
            } else {
                // Add directly to color group
                for (const token of categoryTokens) {
                    const tokenName = this.sanitizeTokenName(token.name);
                    group[tokenName] = this.buildToken(token, true); // Skip $type (inherited)
                }
            }
        }

        return group;
    }

    /**
     * Build spacing group (dimensions).
     */
    private buildSpacingGroup(tokens: ExtractedTokenData[]): TokenGroup {
        const group: TokenGroup = {
            $type: 'dimension',
            $description: 'Spacing and sizing tokens extracted from website'
        };

        for (const token of tokens) {
            const tokenName = this.sanitizeTokenName(token.name);
            group[tokenName] = this.buildToken(token, true);
        }

        return group;
    }

    /**
     * Build typography group (composite).
     */
    private buildTypographyGroup(tokens: ExtractedTokenData[]): TokenGroup {
        const group: TokenGroup = {
            $type: 'typography',
            $description: 'Typography tokens extracted from website'
        };

        const byCategory = this.groupByCategory(tokens);

        for (const [category, categoryTokens] of Object.entries(byCategory)) {
            if (category && category !== 'uncategorized') {
                const categoryGroup: TokenGroup = {
                    $description: `${category} typography styles`
                };

                for (const token of categoryTokens) {
                    const tokenName = this.sanitizeTokenName(token.name);
                    categoryGroup[tokenName] = this.buildToken(token, true);
                }

                group[category] = categoryGroup;
            } else {
                for (const token of categoryTokens) {
                    const tokenName = this.sanitizeTokenName(token.name);
                    group[tokenName] = this.buildToken(token, true);
                }
            }
        }

        return group;
    }

    /**
     * Build border group (composite).
     */
    private buildBorderGroup(tokens: ExtractedTokenData[]): TokenGroup {
        const group: TokenGroup = {
            $type: 'border',
            $description: 'Border tokens extracted from website'
        };

        for (const token of tokens) {
            const tokenName = this.sanitizeTokenName(token.name);
            group[tokenName] = this.buildToken(token, true);
        }

        return group;
    }

    /**
     * Build animation group (duration + cubic-bezier).
     */
    private buildAnimationGroup(tokens: ExtractedTokenData[]): TokenGroup {
        const group: TokenGroup = {
            $description: 'Animation tokens extracted from website'
        };

        // Animations typically have both duration and timing-function
        // Group them together
        for (const token of tokens) {
            const tokenName = this.sanitizeTokenName(token.name);
            group[tokenName] = this.buildToken(token, false);
        }

        return group;
    }

    /**
     * Build individual token object.
     */
    private buildToken(data: ExtractedTokenData, skipType: boolean = false): Token {
        const token: Token = {
            $value: data.value
        };

        // Add $type if not inherited from group
        if (!skipType) {
            token.$type = this.mapTypeToSpec(data.type);
        }

        // Add description if available
        if (data.description) {
            token.$description = data.description;
        }

        // Add crawler metadata in extensions
        const metadata: CrawlerMetadata = {};

        if (data.usageCount !== undefined) {
            metadata.usageCount = data.usageCount;
        }

        if (data.source) {
            metadata.source = data.source;
        }

        if (data.category && data.category !== 'uncategorized') {
            metadata.category = data.category;
        }

        if (data.sourceUrls && data.sourceUrls.length > 0) {
            metadata.sourceUrls = data.sourceUrls;
        }

        if (Object.keys(metadata).length > 0) {
            token.$extensions = {
                [this.config.vendorNamespace]: metadata
            };
        }

        return token;
    }

    /**
     * Map internal type names to spec type names.
     */
    private mapTypeToSpec(type: string): string {
        const typeMap: Record<string, string> = {
            color: 'color',
            spacing: 'dimension',
            typography: 'typography',
            border: 'border',
            animation: 'duration' // Default for animations
        };

        return typeMap[type] || type;
    }

    /**
     * Group tokens by type.
     */
    private groupByType(tokens: ExtractedTokenData[]): Record<string, ExtractedTokenData[]> {
        const groups: Record<string, ExtractedTokenData[]> = {};

        for (const token of tokens) {
            if (!groups[token.type]) {
                groups[token.type] = [];
            }
            groups[token.type].push(token);
        }

        return groups;
    }

    /**
     * Group tokens by category.
     */
    private groupByCategory(tokens: ExtractedTokenData[]): Record<string, ExtractedTokenData[]> {
        const groups: Record<string, ExtractedTokenData[]> = {};

        for (const token of tokens) {
            const category = token.category || 'uncategorized';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(token);
        }

        return groups;
    }

    /**
     * Sanitize token name to meet spec requirements.
     */
    private sanitizeTokenName(name: string): string {
        return name
            .replace(/[{}.]/g, '-') // Replace forbidden characters
            .replace(/^\$/, '') // Remove leading $
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase();
    }

    /**
     * Validate token document against spec requirements.
     */
    private validateDocument(document: TokenDocument): void {
        const errors: string[] = [];

        const validateObject = (obj: any, path: string = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;

                // Validate name
                const nameValidation = validateTokenName(key);
                if (!nameValidation.valid) {
                    errors.push(`${currentPath}: ${nameValidation.error}`);
                }

                // Recursively validate nested objects
                if (value && typeof value === 'object') {
                    validateObject(value, currentPath);
                }
            }
        };

        validateObject(document);

        if (errors.length > 0) {
            console.warn('⚠️  Token validation warnings:');
            errors.forEach((error) => console.warn(`   - ${error}`));
        }
    }
}
