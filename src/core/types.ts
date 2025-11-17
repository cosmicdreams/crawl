// src/core/types.ts
// Using ESM syntax

/**
 * Main configuration interface for the web crawler.
 * Defines all settings needed for crawling websites and extracting design tokens.
 */
export interface CrawlConfig {
    /** Base URL to start crawling from */
    baseUrl: string;
    /** Maximum number of pages to crawl (1-1000) */
    maxPages: number;
    /** Request timeout in milliseconds (1000-120000) */
    timeout: number;
    /** URL patterns to ignore during crawling */
    ignorePatterns: string[];
    /** File extensions to skip */
    ignoreExtensions: string[];
    /** Whether to capture screenshots of pages */
    screenshots: boolean;
    /** Output directory for results */
    outputDir?: string;
    extractors?: {
        colors?: {
            includeTextColors?: boolean;
            includeBackgroundColors?: boolean;
            includeBorderColors?: boolean;
            minimumOccurrences?: number;
        };
        typography?: {
            includeHeadings?: boolean;
            includeBodyText?: boolean;
            includeSpecialText?: boolean;
            minOccurrences?: number;
        };
        spacing?: {
            includeMargins?: boolean;
            includePadding?: boolean;
            includeGap?: boolean;
            minOccurrences?: number;
        };
        borders?: {
            includeBorderWidth?: boolean;
            includeBorderStyle?: boolean;
            includeBorderRadius?: boolean;
            includeShadows?: boolean;
            minOccurrences?: number;
        };
        animations?: {
            minOccurrences?: number;
        };
    };
    tokens?: {
        outputFormats?: ('css' | 'json' | 'figma')[];
        prefix?: string;
    };
}

/**
 * Configuration for individual extractors.
 * 
 * @template T - Type of extractor-specific options
 */
export interface ExtractorConfig<T> {
    /** Path to input file containing crawled data */
    inputFile: string;
    /** Path where extracted tokens should be written */
    outputFile: string;
    /** Whether to write results to file */
    writeToFile: boolean;
    /** Telemetry configuration */
    telemetry: TelemetryOptions;
    /** Extractor-specific options */
    options: T;
}

/**
 * Options for telemetry and performance monitoring.
 */
export interface TelemetryOptions {
    /** Whether telemetry is enabled */
    enabled: boolean;
    /** Directory for telemetry output */
    outputDir: string;
    /** Whether to log telemetry to console */
    logToConsole: boolean;
    /** Whether to write telemetry to file */
    writeToFile: boolean;
    /** Minimum duration (ms) to record */
    minDuration: number;
}

/**
 * Result of a web crawling operation.
 */
export interface CrawlResult {
    /** The base URL that was crawled */
    baseUrl: string;
    /** List of successfully crawled pages */
    crawledPages: PageInfo[];
    /** ISO timestamp of when crawl completed */
    timestamp: string;
}

/**
 * Information about a crawled page.
 */
export interface PageInfo {
    /** Full URL of the page */
    url: string;
    /** Page title */
    title: string;
    /** HTTP status code */
    status: number;
    /** Response content type */
    contentType: string;
    /** Path to screenshot file, if captured */
    screenshot?: string;
    /** Animation data extracted from the page */
    animations?: AnimationData[];
    /** Typography data extracted from the page */
    typography?: {
        headings?: TypographyData[];
        bodyText?: TypographyData[];
        specialText?: TypographyData[];
    };
}

/**
 * Represents a design token extracted from a website.
 */
export interface DesignToken {
    /** Unique name for the token */
    name: string;
    /** CSS value of the token */
    value: string;
    /** Type category of the design token */
    type: 'color' | 'typography' | 'spacing' | 'border' | 'animation';
    /** Sub-category within the type */
    category?: string;
    /** Human-readable description */
    description?: string;
    /** Number of times this token appears */
    usageCount?: number;
    /** Source information (CSS selectors, etc.) */
    source?: string;
    /** Additional type-specific properties */
    properties?: Record<string, any>;
}

/**
 * Animation data extracted from CSS styles
 */
export interface AnimationData {
    /** Animation name */
    name: string;
    /** Animation value/CSS */
    value?: string;
    /** Usage count */
    count?: number;
    /** Total usage count */
    usageCount?: number;
    /** Source URLs */
    sources?: string[];
    /** Animation duration */
    duration?: string;
    /** Timing function */
    timingFunction?: string;
    /** Animation delay */
    delay?: string;
    /** Iteration count */
    iterationCount?: string;
    /** Animation direction */
    direction?: string;
    /** Fill mode */
    fillMode?: string;
}

/**
 * Typography data extracted from computed styles
 */
export interface TypographyData {
    /** Font family */
    fontFamily: string;
    /** Font size */
    fontSize: string;
    /** Font weight */
    fontWeight: string;
    /** Line height */
    lineHeight?: string;
    /** Letter spacing */
    letterSpacing?: string;
    /** Text color */
    color?: string;
    /** Typography category */
    category?: string;
    /** HTML element */
    element?: string;
    /** Usage count */
    count?: number;
    /** Total usage count */
    usageCount?: number;
    /** Source URLs */
    sources?: string[];
}