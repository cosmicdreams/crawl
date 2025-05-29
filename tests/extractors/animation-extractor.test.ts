import { AnimationExtractor } from '../../src/core/stages/animation-extractor';
import { CrawlConfig, DesignToken } from '../../src/core/types';

describe('AnimationExtractor', () => {
    let animationExtractor: AnimationExtractor;
    let mockCrawlResults: any;
    let mockConfig: CrawlConfig;

    beforeEach(() => {
        animationExtractor = new AnimationExtractor();

        mockCrawlResults = {
            crawledPages: [
                {
                    url: 'https://example.com',
                    animations: [
                        { name: 'fade-in', value: 'opacity 0.3s ease-in', count: 5 },
                        { name: 'slide-up', value: 'transform 0.5s ease-out', count: 3 }
                    ]
                },
                {
                    url: 'https://example.com/about',
                    animations: [
                        { name: 'fade-in', value: 'opacity 0.3s ease-in', count: 2 },
                        { name: 'bounce', value: 'transform 1s infinite', count: 1 }
                    ]
                }
            ]
        };

        mockConfig = {
            outputDir: './results',
            extractors: {
                animations: {
                    minOccurrences: 1
                }
            }
        } as CrawlConfig;
    });

    it('should extract animations from crawl results', async () => {
        const tokens: DesignToken[] = await animationExtractor.process(mockCrawlResults, mockConfig);

        expect(tokens).toHaveLength(3);
        expect(tokens).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'fade-in', value: 'opacity 0.3s ease-in', usageCount: 7 }),
                expect.objectContaining({ name: 'slide-up', value: 'transform 0.5s ease-out', usageCount: 3 }),
                expect.objectContaining({ name: 'bounce', value: 'transform 1s infinite', usageCount: 1 })
            ])
        );
    });

    it('should handle empty crawl results gracefully', async () => {
        mockCrawlResults.crawledPages = [];

        const tokens: DesignToken[] = await animationExtractor.process(mockCrawlResults, mockConfig);

        expect(tokens).toHaveLength(3); // Mock data should be used
        expect(tokens).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'fade-in', value: 'opacity 0.3s ease-in' }),
                expect.objectContaining({ name: 'slide-up', value: 'transform 0.5s ease-out' }),
                expect.objectContaining({ name: 'bounce', value: 'transform 1s infinite' })
            ])
        );
    });

    it('should respect the minimum occurrences configuration', async () => {
        mockConfig.extractors!.animations!.minOccurrences = 5;

        const tokens: DesignToken[] = await animationExtractor.process(mockCrawlResults, mockConfig);

        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toEqual(
            expect.objectContaining({ name: 'fade-in', value: 'opacity 0.3s ease-in', usageCount: 7 })
        );
    });
});