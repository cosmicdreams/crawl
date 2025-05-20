// src/core/stages/token-generator-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { DesignToken } from '../types.js';
import fs from 'node:fs';
import path from 'node:path';

interface TokenGeneratorOptions {
    outputFormats: ('css' | 'json' | 'figma')[];
    outputDir: string;
    prefix: string;
}

interface TokenGeneratorInput {
    tokens: DesignToken[];
}

interface TokenGeneratorOutput {
    tokens: DesignToken[];
    files: {
        format: string;
        path: string;
    }[];
}

export class TokenGeneratorStage implements PipelineStage<TokenGeneratorInput, TokenGeneratorOutput> {
    name = 'token-generator';

    constructor(private options: TokenGeneratorOptions) {}

    async process(input: TokenGeneratorInput): Promise<TokenGeneratorOutput> {
        const { tokens } = input;
        const files = [];

        // Ensure output directory exists
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }

        // Generate files in each requested format
        for (const format of this.options.outputFormats) {
            let filePath;

            switch (format) {
                case 'css':
                    filePath = path.join(this.options.outputDir, 'tokens.css');
                    this.generateCSSTokens(tokens, filePath);
                    break;

                case 'json':
                    filePath = path.join(this.options.outputDir, 'tokens.json');
                    this.generateJSONTokens(tokens, filePath);
                    break;

                case 'figma':
                    filePath = path.join(this.options.outputDir, 'figma-tokens.json');
                    this.generateFigmaTokens(tokens, filePath);
                    break;
            }

            if (filePath) {
                files.push({ format, path: filePath });
            }
        }

        return {
            tokens,
            files
        };
    }

    private generateCSSTokens(tokens: DesignToken[], filePath: string): void {
        let css = ':root {\n';

        for (const token of tokens) {
            css += `  --${this.options.prefix}-${token.name}: ${token.value};\n`;
        }

        css += '}\n';

        fs.writeFileSync(filePath, css);
    }

    private generateJSONTokens(tokens: DesignToken[], filePath: string): void {
        const json = {
            tokens: tokens.reduce((acc, token) => {
                acc[`${this.options.prefix}-${token.name}`] = {
                    value: token.value,
                    type: token.type,
                    category: token.category
                };
                return acc;
            }, {} as Record<string, any>)
        };

        fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    }

    private generateFigmaTokens(tokens: DesignToken[], filePath: string): void {
        // Simplified Figma tokens format
        const figmaTokens = tokens.reduce((acc, token) => {
            const category = token.category || 'global';

            if (!acc[category]) {
                acc[category] = {};
            }

            acc[category][token.name] = {
                value: token.value,
                type: token.type
            };

            return acc;
        }, {} as Record<string, any>);

        fs.writeFileSync(filePath, JSON.stringify(figmaTokens, null, 2));
    }
}