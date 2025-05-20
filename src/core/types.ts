// src/core/types.ts
// Using ESM syntax
export interface CrawlConfig {
    baseUrl: string;
    maxPages: number;
    timeout: number;
    ignorePatterns: string[];
    ignoreExtensions: string[];
    screenshots: boolean;
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
    };
    tokens?: {
        outputFormats?: ('css' | 'json' | 'figma')[];
        prefix?: string;
    };
}

export interface ExtractorConfig<T> {
    inputFile: string;
    outputFile: string;
    writeToFile: boolean;
    telemetry: TelemetryOptions;
    options: T;
}

export interface TelemetryOptions {
    enabled: boolean;
    outputDir: string;
    logToConsole: boolean;
    writeToFile: boolean;
    minDuration: number;
}

export interface CrawlResult {
    baseUrl: string;
    crawledPages: PageInfo[];
    timestamp: string;
}

export interface PageInfo {
    url: string;
    title: string;
    status: number;
    contentType: string;
    screenshot?: string;
}

export interface DesignToken {
    name: string;
    value: string;
    type: 'color' | 'typography' | 'spacing' | 'border' | 'animation';
    category?: string;
    description?: string;
    usageCount?: number;
    source?: string;
    properties?: Record<string, any>; // For additional type-specific properties
}