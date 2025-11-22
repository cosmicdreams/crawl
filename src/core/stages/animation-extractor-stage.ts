// src/core/stages/animation-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { chromium, Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {
    convertCSSTimeToDuration,
    convertCSSTimingFunctionToCubicBezier
} from '../tokens/converters/value-converters.js';
import { CubicBezierValue, DurationValue, isDurationValue } from '../tokens/types/primitives.js';
import { TransitionValue } from '../tokens/types/composites.js';
import { ExtractedTokenData } from '../tokens/generators/spec-generator.js';

interface AnimationExtractorOptions {
    includeTransitions: boolean;
    includeAnimations: boolean;
    outputDir?: string;
    minimumOccurrences?: number;
}

interface AnimationExtractionResult {
    tokens: ExtractedTokenData[];
    stats: {
        totalAnimations: number;
        uniqueAnimations: number;
        transitions: number;
        keyframeAnimations: number;
    };
}

interface ExtractedAnimation {
    cssValue: string;
    specValue: TransitionValue;
    property: string;
    element: string;
    usageCount: number;
    category: 'transition' | 'animation';
    sourceUrls: string[];
}

interface RawAnimationData {
    duration: string;
    delay?: string;
    timingFunction: string;
    property?: string;
    name?: string;
    element: string;
    usageCount: number;
}

export class AnimationExtractorStage implements PipelineStage<CrawlResult, AnimationExtractionResult> {
    name = 'animation-extractor';

    constructor(private options: AnimationExtractorOptions = {
        includeTransitions: true,
        includeAnimations: true,
        outputDir: './results',
        minimumOccurrences: 2
    }) {}

    async process(input: CrawlResult): Promise<AnimationExtractionResult> {
        logger.info('Extracting animations', { pageCount: input.crawledPages?.length || 0 });

        const outputDir = this.options.outputDir || './results';
        const rawOutputDir = path.join(outputDir, 'raw');

        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const animationMap = new Map<string, ExtractedAnimation>();

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            for (const pageInfo of input.crawledPages || []) {
                console.log(`Extracting animations from ${pageInfo.url}`);

                try {
                    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

                    // Extract transition values
                    if (this.options.includeTransitions) {
                        const transitions = await this.extractTransitions(page);
                        this.addToAnimationMap(animationMap, transitions, 'transition', pageInfo.url);
                    }

                    // Extract animation values
                    if (this.options.includeAnimations) {
                        const animations = await this.extractAnimations(page);
                        this.addToAnimationMap(animationMap, animations, 'animation', pageInfo.url);
                    }

                } catch (error) {
                    logger.error(`Error extracting animations from ${pageInfo.url}`, { error });
                }
            }
        } finally {
            await browser.close();
        }

        // Convert the animation map to spec-compliant design tokens
        const animationTokens: ExtractedTokenData[] = [];

        for (const animationInfo of animationMap.values()) {
            if (animationInfo.usageCount >= (this.options.minimumOccurrences || 2)) {
                // Generate a name for the animation
                const name = this.generateAnimationName(animationInfo);

                animationTokens.push({
                    type: 'transition',
                    name,
                    value: animationInfo.specValue,
                    category: animationInfo.category,
                    description: `${animationInfo.category} extracted from ${animationInfo.sourceUrls.length} page(s)`,
                    usageCount: animationInfo.usageCount,
                    source: animationInfo.property,
                    sourceUrls: animationInfo.sourceUrls
                });
            }
        }

        // Sort by usage count (descending)
        animationTokens.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Save the results
        const outputFile = path.join(rawOutputDir, 'animation-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(animationTokens, null, 2));
        console.log(`Animation extraction completed. Found ${animationTokens.length} animations. Results saved to ${outputFile}`);

        return {
            tokens: animationTokens,
            stats: {
                totalAnimations: animationMap.size,
                uniqueAnimations: animationTokens.length,
                transitions: animationTokens.filter(t => t.category === 'transition').length,
                keyframeAnimations: animationTokens.filter(t => t.category === 'animation').length
            }
        };
    }

    private async extractTransitions(page: Page): Promise<Record<string, unknown>> {
        return await page.evaluate(() => {
            const transitions = new Map<string, unknown>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract transition properties
                const transitionProperty = style.getPropertyValue('transition-property');
                const transitionDuration = style.getPropertyValue('transition-duration');
                const transitionTimingFunction = style.getPropertyValue('transition-timing-function');
                const transitionDelay = style.getPropertyValue('transition-delay');

                if (transitionDuration && transitionDuration !== '0s' && transitionProperty !== 'none') {
                    // Create a composite key from all transition properties
                    const key = `${transitionDuration}|${transitionTimingFunction}|${transitionDelay}`;

                    if (!transitions.has(key)) {
                        transitions.set(key, {
                            duration: transitionDuration,
                            timingFunction: transitionTimingFunction,
                            delay: transitionDelay || '0s',
                            property: transitionProperty,
                            element: el.tagName.toLowerCase(),
                            usageCount: 1
                        });
                    } else {
                        const existing = transitions.get(key) as { usageCount: number } | undefined;
                        if (existing) existing.usageCount += 1;
                    }
                }
            });

            return Object.fromEntries(transitions);
        });
    }

    private async extractAnimations(page: Page): Promise<Record<string, unknown>> {
        return await page.evaluate(() => {
            const animations = new Map<string, unknown>();
            const elements = document.querySelectorAll('*');

            elements.forEach(el => {
                const style = window.getComputedStyle(el);

                // Extract animation properties
                const animationName = style.getPropertyValue('animation-name');
                const animationDuration = style.getPropertyValue('animation-duration');
                const animationTimingFunction = style.getPropertyValue('animation-timing-function');
                const animationDelay = style.getPropertyValue('animation-delay');

                if (animationDuration && animationDuration !== '0s' && animationName !== 'none') {
                    // Create a composite key from all animation properties
                    const key = `${animationName}|${animationDuration}|${animationTimingFunction}|${animationDelay}`;

                    if (!animations.has(key)) {
                        animations.set(key, {
                            name: animationName,
                            duration: animationDuration,
                            timingFunction: animationTimingFunction,
                            delay: animationDelay || '0s',
                            element: el.tagName.toLowerCase(),
                            usageCount: 1
                        });
                    } else {
                        const existing = animations.get(key) as { usageCount: number } | undefined;
                        if (existing) existing.usageCount += 1;
                    }
                }
            });

            return Object.fromEntries(animations);
        });
    }

    private addToAnimationMap(
        animationMap: Map<string, ExtractedAnimation>,
        animations: Record<string, unknown>,
        category: 'transition' | 'animation',
        sourceUrl: string
    ): void {
        for (const [cssKey, rawInfo] of Object.entries(animations)) {
            try {
                // Type assertion - data comes from browser evaluation
                const animationInfo = rawInfo as RawAnimationData;

                // Convert CSS values to spec-compliant format
                const duration = convertCSSTimeToDuration(animationInfo.duration);
                const delay = convertCSSTimeToDuration(animationInfo.delay || '0s');
                const timingFunction = convertCSSTimingFunctionToCubicBezier(animationInfo.timingFunction);

                const specValue: TransitionValue = {
                    duration,
                    delay,
                    timingFunction
                };

                // Use the CSS composite key for deduplication
                const mapKey = cssKey;

                if (animationMap.has(mapKey)) {
                    const existing = animationMap.get(mapKey)!;
                    existing.usageCount += animationInfo.usageCount;
                    // Add source URL if not already tracked
                    if (!existing.sourceUrls.includes(sourceUrl)) {
                        existing.sourceUrls.push(sourceUrl);
                    }
                } else {
                    animationMap.set(mapKey, {
                        cssValue: cssKey,
                        specValue,
                        property: animationInfo.property || animationInfo.name || 'all',
                        element: animationInfo.element,
                        usageCount: animationInfo.usageCount,
                        category,
                        sourceUrls: [sourceUrl]
                    });
                }
            } catch (error) {
                // Skip animation values that can't be converted
                logger.warn(`Failed to convert animation value: ${cssKey}`, { error });
            }
        }
    }

    private generateAnimationName(animation: ExtractedAnimation): string {
        const { duration, timingFunction } = animation.specValue;

        // Generate semantic names based on duration
        let speedName = 'default';
        // Type guard: duration can be DurationValue, TokenReference, or JSONPointerReference
        if (isDurationValue(duration)) {
            if (duration.unit === 's') {
                if (duration.value <= 0.2) speedName = 'instant';
                else if (duration.value <= 0.3) speedName = 'fast';
                else if (duration.value <= 0.5) speedName = 'normal';
                else if (duration.value <= 1.0) speedName = 'slow';
                else speedName = 'very-slow';
            } else if (duration.unit === 'ms') {
                const seconds = duration.value / 1000;
                if (seconds <= 0.2) speedName = 'instant';
                else if (seconds <= 0.3) speedName = 'fast';
                else if (seconds <= 0.5) speedName = 'normal';
                else if (seconds <= 1.0) speedName = 'slow';
                else speedName = 'very-slow';
            }
        }

        // Generate semantic names based on timing function
        let easingName = 'custom';
        const tf = timingFunction as CubicBezierValue;

        // Check for common easing functions
        if (tf[0] === 0.25 && tf[1] === 0.1 && tf[2] === 0.25 && tf[3] === 1) {
            easingName = 'ease';
        } else if (tf[0] === 0.42 && tf[1] === 0 && tf[2] === 1 && tf[3] === 1) {
            easingName = 'ease-in';
        } else if (tf[0] === 0 && tf[1] === 0 && tf[2] === 0.58 && tf[3] === 1) {
            easingName = 'ease-out';
        } else if (tf[0] === 0.42 && tf[1] === 0 && tf[2] === 0.58 && tf[3] === 1) {
            easingName = 'ease-in-out';
        } else if (tf[0] === 0 && tf[1] === 0 && tf[2] === 1 && tf[3] === 1) {
            easingName = 'linear';
        }

        return `${animation.category}-${speedName}-${easingName}`;
    }
}
