// src/core/stages/token-generator.ts
import { CrawlConfig, DesignToken } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class TokenGenerator {
    async process(tokens: DesignToken[], config: CrawlConfig): Promise<any> {
        console.log(`Generating tokens from ${tokens.length} design tokens`);

        const outputDir = config.outputDir || './results';
        const tokensDir = path.join(outputDir, 'tokens');

        if (!fs.existsSync(tokensDir)) {
            fs.mkdirSync(tokensDir, { recursive: true });
        }

        // Determine which formats to generate
        const formats = config.tokens?.outputFormats || ['css', 'json', 'figma'];
        const prefix = config.tokens?.prefix || 'dt';

        // Group tokens by type
        const tokensByType = this.groupTokensByType(tokens);

        // Generate tokens in each format
        for (const format of formats) {
            if (format === 'css') {
                await this.generateCssTokens(tokensByType, tokensDir, prefix);
            } else if (format === 'json') {
                await this.generateJsonTokens(tokensByType, tokensDir, prefix);
            } else if (format === 'figma') {
                await this.generateFigmaTokens(tokensByType, tokensDir, prefix);
            }
        }

        return {
            formats,
            tokenCount: tokens.length,
            outputDir: tokensDir
        };
    }

    private groupTokensByType(tokens: DesignToken[]): Record<string, DesignToken[]> {
        const result: Record<string, DesignToken[]> = {};

        for (const token of tokens) {
            if (!result[token.type]) {
                result[token.type] = [];
            }
            result[token.type].push(token);
        }

        return result;
    }

    private async generateCssTokens(
        tokensByType: Record<string, DesignToken[]>,
        outputDir: string,
        prefix: string
    ): Promise<void> {
        let cssContent = `:root {\n`;

        // Add color tokens
        if (tokensByType.color) {
            cssContent += `  /* Colors */\n`;
            for (const token of tokensByType.color) {
                cssContent += `  --${prefix}-${token.name}: ${token.value};\n`;
            }
            cssContent += `\n`;
        }

        // Add typography tokens
        if (tokensByType.typography) {
            cssContent += `  /* Typography */\n`;
            for (const token of tokensByType.typography) {
                cssContent += `  --${prefix}-${token.name}: ${token.value};\n`;
            }
            cssContent += `\n`;
        }

        // Add spacing tokens
        if (tokensByType.spacing) {
            cssContent += `  /* Spacing */\n`;
            for (const token of tokensByType.spacing) {
                cssContent += `  --${prefix}-${token.name}: ${token.value};\n`;
            }
            cssContent += `\n`;
        }

        // Add border tokens
        if (tokensByType.border) {
            cssContent += `  /* Borders */\n`;
            for (const token of tokensByType.border) {
                cssContent += `  --${prefix}-${token.name}: ${token.value};\n`;
            }
            cssContent += `\n`;
        }

        // Add animation tokens
        if (tokensByType.animation) {
            cssContent += `  /* Animations */\n`;
            for (const token of tokensByType.animation) {
                cssContent += `  --${prefix}-${token.name}: ${token.value};\n`;
            }
        }

        cssContent += `}\n`;

        // Write to file
        fs.writeFileSync(path.join(outputDir, 'tokens.css'), cssContent);
        console.log(`CSS tokens generated at ${path.join(outputDir, 'tokens.css')}`);
    }

    private async generateJsonTokens(
        tokensByType: Record<string, DesignToken[]>,
        outputDir: string,
        prefix: string
    ): Promise<void> {
        const jsonTokens: Record<string, any> = {};

        // Add tokens by type
        for (const type in tokensByType) {
            jsonTokens[type] = {};
            for (const token of tokensByType[type]) {
                jsonTokens[type][token.name] = {
                    value: token.value,
                    category: token.category,
                    description: token.description
                };
            }
        }

        // Write to file
        fs.writeFileSync(
            path.join(outputDir, 'tokens.json'),
            JSON.stringify(jsonTokens, null, 2)
        );
        console.log(`JSON tokens generated at ${path.join(outputDir, 'tokens.json')}`);
    }

    private async generateFigmaTokens(
        tokensByType: Record<string, DesignToken[]>,
        outputDir: string,
        prefix: string
    ): Promise<void> {
        const figmaTokens: Record<string, any> = {};

        // Add color tokens
        if (tokensByType.color) {
            figmaTokens.color = {};
            for (const token of tokensByType.color) {
                figmaTokens.color[token.name] = {
                    value: token.value,
                    type: 'color'
                };
            }
        }

        // Add typography tokens
        if (tokensByType.typography) {
            figmaTokens.typography = {};
            for (const token of tokensByType.typography) {
                // Parse the typography value
                const fontProps = this.parseFontValue(token.value);
                figmaTokens.typography[token.name] = {
                    value: fontProps,
                    type: 'typography'
                };
            }
        }

        // Add spacing tokens
        if (tokensByType.spacing) {
            figmaTokens.spacing = {};
            for (const token of tokensByType.spacing) {
                figmaTokens.spacing[token.name] = {
                    value: token.value,
                    type: 'spacing'
                };
            }
        }

        // Add border tokens
        if (tokensByType.border) {
            figmaTokens.border = {};
            for (const token of tokensByType.border) {
                figmaTokens.border[token.name] = {
                    value: token.value,
                    type: 'border'
                };
            }
        }

        // Write to file
        fs.writeFileSync(
            path.join(outputDir, 'figma-tokens.json'),
            JSON.stringify(figmaTokens, null, 2)
        );
        console.log(`Figma tokens generated at ${path.join(outputDir, 'figma-tokens.json')}`);
    }

    private parseFontValue(value: string): Record<string, string> {
        // Example value: "font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.5;"
        const result: Record<string, string> = {};
        
        // Extract font properties
        const fontFamilyMatch = value.match(/font-family:\s*([^;]+);/);
        if (fontFamilyMatch) {
            result.fontFamily = fontFamilyMatch[1].trim();
        }
        
        const fontSizeMatch = value.match(/font-size:\s*([^;]+);/);
        if (fontSizeMatch) {
            result.fontSize = fontSizeMatch[1].trim();
        }
        
        const fontWeightMatch = value.match(/font-weight:\s*([^;]+);/);
        if (fontWeightMatch) {
            result.fontWeight = fontWeightMatch[1].trim();
        }
        
        const lineHeightMatch = value.match(/line-height:\s*([^;]+);/);
        if (lineHeightMatch) {
            result.lineHeight = lineHeightMatch[1].trim();
        }
        
        const letterSpacingMatch = value.match(/letter-spacing:\s*([^;]+);/);
        if (letterSpacingMatch) {
            result.letterSpacing = letterSpacingMatch[1].trim();
        }
        
        return result;
    }
}
