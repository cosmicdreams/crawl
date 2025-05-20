// src/core/stages/typography-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult, DesignToken } from '../types.js';

interface TypographyExtractorOptions {
  includeHeadings?: boolean;
  includeBodyText?: boolean;
  includeSpecialText?: boolean;
  includeFontFamilies?: boolean;
  includeFontSizes?: boolean;
  includeFontWeights?: boolean;
  minOccurrences?: number;
  outputDir?: string;
}

interface TypographyExtractionResult {
  tokens: DesignToken[];
  stats: {
    totalTypographyTokens: number;
    uniqueTypographyTokens: number;
    fontFamilies: number;
    fontSizes: number;
    fontWeights: number;
  };
}

export class TypographyExtractorStage implements PipelineStage<CrawlResult, TypographyExtractionResult> {
  name = 'typography-extractor';

  constructor(private options: TypographyExtractorOptions) {
    this.options.minOccurrences = this.options.minOccurrences ?? 1; // Default to 1 if undefined
  }

  async process(input: CrawlResult): Promise<TypographyExtractionResult> {
    // Mock implementation for now
    const mockTypographyTokens = [
      { name: 'font-primary', value: 'Inter, sans-serif', type: 'typography', category: 'font-family', usageCount: 120 },
      { name: 'font-size-base', value: '16px', type: 'typography', category: 'font-size', usageCount: 85 },
      { name: 'font-weight-bold', value: '700', type: 'typography', category: 'font-weight', usageCount: 42 },
    ] as DesignToken[];

    // Filter based on options
    const filteredTokens = mockTypographyTokens.filter(token => {
      if (token.usageCount! < (this.options.minOccurrences || 1)) {
        return false;
      }

      if (token.category === 'font-family' && !this.options.includeFontFamilies) {
        return false;
      }

      if (token.category === 'font-size' && !this.options.includeFontSizes) {
        return false;
      }

      if (token.category === 'font-weight' && !this.options.includeFontWeights) {
        return false;
      }

      return true;
    });

    return {
      tokens: filteredTokens,
      stats: {
        totalTypographyTokens: mockTypographyTokens.length,
        uniqueTypographyTokens: mockTypographyTokens.length,
        fontFamilies: mockTypographyTokens.filter(t => t.category === 'font-family').length,
        fontSizes: mockTypographyTokens.filter(t => t.category === 'font-size').length,
        fontWeights: mockTypographyTokens.filter(t => t.category === 'font-weight').length,
      },
    };
  }
}
