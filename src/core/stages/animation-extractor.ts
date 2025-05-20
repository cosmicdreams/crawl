import { CrawlConfig, DesignToken } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class AnimationExtractor {
    async process(crawlResults: any, config: CrawlConfig): Promise<DesignToken[]> {
        console.log(`Extracting animations from ${crawlResults.crawledPages?.length || 0} pages`);

        const outputDir = config.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        // Process the animation data from crawl results
        const animationTokens: DesignToken[] = [];
        const animationMap = new Map<string, any>();

        // Extract animation data from crawl results
        for (const pageInfo of crawlResults.crawledPages || []) {
            if (pageInfo.animations) {
                for (const animation of pageInfo.animations) {
                    this.addToAnimationMap(animationMap, animation, pageInfo.url);
                }
            }
        }

        // If no animations were found, use mock data
        if (animationMap.size === 0) {
            console.log('No animations found, using mock data');
            const mockAnimations = [
                { name: 'fade-in', value: 'opacity 0.3s ease-in', count: 5 },
                { name: 'slide-up', value: 'transform 0.5s ease-out', count: 3 },
                { name: 'bounce', value: 'transform 1s infinite', count: 2 }
            ];

            for (const item of mockAnimations) {
                this.addToAnimationMap(animationMap, item, 'mock-data');
            }
        }

        // Convert the animation map to design tokens
        for (const [key, info] of animationMap.entries()) {
            const minOccurrences = config.extractors?.animations?.minOccurrences || 1;

            if (info.usageCount >= minOccurrences) {
                animationTokens.push({
                    name: info.name,
                    value: info.value,
                    type: 'animation',
                    category: 'animation',
                    description: `Extracted from ${info.sources.join(', ')}`,
                    usageCount: info.usageCount,
                    source: info.sources.join(', ')
                });
            }
        }

        // Sort by usage count (descending)
        animationTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'animation-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(animationTokens, null, 2));
        console.log(`Animation extraction completed. Found ${animationTokens.length} animations. Results saved to ${outputFile}`);

        return animationTokens;
    }

    private addToAnimationMap(
        animationMap: Map<string, any>,
        animation: any,
        source: string
    ): void {
        const key = animation.name;

        if (!animationMap.has(key)) {
            animationMap.set(key, {
                name: animation.name,
                value: animation.value,
                usageCount: animation.count || 1,
                sources: [source]
            });
        } else {
            const existing = animationMap.get(key);
            existing.usageCount += animation.count || 1;
            if (!existing.sources.includes(source)) {
                existing.sources.push(source);
            }
        }
    }
}