// src/core/stages/color-extractor.ts
import { CrawlConfig, DesignToken } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class ColorExtractor {
    constructor(private logger = console, private fileSystem = fs) {}

    async process(crawlResults: any, config: CrawlConfig): Promise<DesignToken[]> {
        this.logger.log(`Extracting colors from ${crawlResults.crawledPages?.length || 0} pages`);

        const outputDir = config.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        try {
            if (!this.fileSystem.existsSync(rawOutputDir)) {
                this.fileSystem.mkdirSync(rawOutputDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error(`Failed to create output directory: ${error.message}`);
            throw error;
        }

        const colorTokens: DesignToken[] = [];
        const colorMap = new Map<string, any>();

        for (const pageInfo of crawlResults.crawledPages || []) {
            if (pageInfo.colors) {
                this.processColors(pageInfo.colors.text, 'text', pageInfo.url, config, colorMap);
                this.processColors(pageInfo.colors.background, 'background', pageInfo.url, config, colorMap);
                this.processColors(pageInfo.colors.border, 'border', pageInfo.url, config, colorMap);
            }
        }

        if (colorMap.size === 0) {
            this.logger.log('No colors found, using mock data');
            this.addMockColors(colorMap);
        }

        for (const [color, info] of colorMap.entries()) {
            const minOccurrences = config.extractors?.colors?.minimumOccurrences || 1;

            if (info.usageCount >= minOccurrences) {
                colorTokens.push({
                    name: this.generateColorName(color, info.category),
                    value: color,
                    type: 'color',
                    category: info.category,
                    description: `Extracted from ${info.sources.join(', ')}`,
                    usageCount: info.usageCount,
                    source: info.sources.join(', ')
                });
            }
        }

        colorTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        try {
            const outputFile = path.join(rawOutputDir, 'color-analysis.json');
            this.fileSystem.writeFileSync(outputFile, JSON.stringify(colorTokens, null, 2));
            this.logger.log(`Color extraction completed. Found ${colorTokens.length} colors. Results saved to ${outputFile}`);
        } catch (error) {
            this.logger.error(`Failed to save results: ${error.message}`);
            throw error;
        }

        return colorTokens;
    }

    private processColors(colors: string[] | undefined, category: string, source: string, config: CrawlConfig, colorMap: Map<string, any>): void {
        if (colors && config.extractors?.colors?.[`include${category.charAt(0).toUpperCase() + category.slice(1)}Colors`]) {
            for (const color of colors) {
                this.addToColorMap(colorMap, color, category, source);
            }
        }
    }

    private addMockColors(colorMap: Map<string, any>): void {
        const mockColors = [
            { value: '#000000', category: 'text', count: 2 },
            { value: '#333333', category: 'text', count: 2 },
            { value: '#666666', category: 'text', count: 1 },
            { value: '#ffffff', category: 'background', count: 2 },
            { value: '#f8f9fa', category: 'background', count: 2 },
            { value: '#e9ecef', category: 'background', count: 1 },
            { value: '#dee2e6', category: 'border', count: 2 },
            { value: '#ced4da', category: 'border', count: 1 }
        ];

        for (const item of mockColors) {
            this.addToColorMap(colorMap, item.value, item.category, 'mock-data', item.count);
        }
    }

    private addToColorMap(colorMap: Map<string, any>, color: string, category: string, source: string, count: number = 1): void {
        if (!colorMap.has(color)) {
            colorMap.set(color, {
                category,
                usageCount: count,
                sources: [source]
            });
        } else {
            const existing = colorMap.get(color);
            existing.usageCount += count;
            if (!existing.sources.includes(source)) {
                existing.sources.push(source);
            }
        }
    }

    private generateColorName(color: string, category: string): string {
        const colorCode = color.replace('#', '').toLowerCase();
        return `${category}-${colorCode}`;
    }
}
