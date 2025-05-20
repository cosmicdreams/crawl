// src/core/templates/index.ts
import { CrawlConfig } from '../types.js';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  config: CrawlConfig;
}

// Basic template for crawling a site and extracting all design tokens
export const basicTemplate: PipelineTemplate = {
  id: 'basic',
  name: 'Basic Extraction',
  description: 'Crawl a website and extract all design tokens',
  config: {
    baseUrl: 'https://example.com',
    maxPages: 10,
    timeout: 30000,
    ignorePatterns: [
      '\\?',
      '/admin/',
      '/user/',
      '/cart/',
      '/checkout/',
      '/search/'
    ],
    ignoreExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.css',
      '.js',
      '.zip',
      '.tar',
      '.gz'
    ],
    screenshots: true,
    outputDir: './results',
    extractors: {
      colors: {
        includeTextColors: true,
        includeBackgroundColors: true,
        includeBorderColors: true,
        minimumOccurrences: 2
      },
      typography: {
        includeHeadings: true,
        includeBodyText: true,
        includeSpecialText: true,
        minOccurrences: 2
      },
      spacing: {
        includeMargins: true,
        includePadding: true,
        includeGap: true,
        minOccurrences: 2
      },
      borders: {
        includeBorderWidth: true,
        includeBorderStyle: true,
        includeBorderRadius: true,
        includeShadows: true,
        minOccurrences: 2
      }
    },
    tokens: {
      outputFormats: ['css', 'json', 'figma'],
      prefix: 'dt'
    }
  }
};

// Color-focused template for extracting only colors
export const colorTemplate: PipelineTemplate = {
  id: 'color-only',
  name: 'Color Extraction',
  description: 'Extract only color tokens from a website',
  config: {
    baseUrl: 'https://example.com',
    maxPages: 5,
    timeout: 30000,
    ignorePatterns: [
      '\\?',
      '/admin/',
      '/user/',
      '/cart/',
      '/checkout/',
      '/search/'
    ],
    ignoreExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.css',
      '.js',
      '.zip',
      '.tar',
      '.gz'
    ],
    screenshots: true,
    outputDir: './results',
    extractors: {
      colors: {
        includeTextColors: true,
        includeBackgroundColors: true,
        includeBorderColors: true,
        minimumOccurrences: 1
      }
    },
    tokens: {
      outputFormats: ['css', 'json'],
      prefix: 'color'
    }
  }
};

// Typography-focused template for extracting only typography
export const typographyTemplate: PipelineTemplate = {
  id: 'typography-only',
  name: 'Typography Extraction',
  description: 'Extract only typography tokens from a website',
  config: {
    baseUrl: 'https://example.com',
    maxPages: 5,
    timeout: 30000,
    ignorePatterns: [
      '\\?',
      '/admin/',
      '/user/',
      '/cart/',
      '/checkout/',
      '/search/'
    ],
    ignoreExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.css',
      '.js',
      '.zip',
      '.tar',
      '.gz'
    ],
    screenshots: true,
    outputDir: './results',
    extractors: {
      typography: {
        includeHeadings: true,
        includeBodyText: true,
        includeSpecialText: true,
        minOccurrences: 1
      }
    },
    tokens: {
      outputFormats: ['css', 'json'],
      prefix: 'type'
    }
  }
};

// Performance template for quick extraction with minimal pages
export const performanceTemplate: PipelineTemplate = {
  id: 'performance',
  name: 'Performance Extraction',
  description: 'Quick extraction with minimal pages for performance testing',
  config: {
    baseUrl: 'https://example.com',
    maxPages: 3,
    timeout: 15000,
    ignorePatterns: [
      '\\?',
      '/admin/',
      '/user/',
      '/cart/',
      '/checkout/',
      '/search/'
    ],
    ignoreExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.css',
      '.js',
      '.zip',
      '.tar',
      '.gz'
    ],
    screenshots: false,
    outputDir: './results',
    extractors: {
      colors: {
        includeTextColors: true,
        includeBackgroundColors: true,
        includeBorderColors: false,
        minimumOccurrences: 3
      },
      typography: {
        includeHeadings: true,
        includeBodyText: true,
        includeSpecialText: false,
        minOccurrences: 3
      },
      spacing: {
        includeMargins: true,
        includePadding: true,
        includeGap: false,
        minOccurrences: 3
      },
      borders: {
        includeBorderWidth: false,
        includeBorderStyle: false,
        includeBorderRadius: true,
        includeShadows: false,
        minOccurrences: 3
      }
    },
    tokens: {
      outputFormats: ['json'],
      prefix: 'perf'
    }
  }
};

// Collection of all available templates
export const templates: PipelineTemplate[] = [
  basicTemplate,
  colorTemplate,
  typographyTemplate,
  performanceTemplate
];

// Function to get a template by ID
export function getTemplateById(id: string): PipelineTemplate | undefined {
  return templates.find(template => template.id === id);
}

// Function to create a new profile from a template
export function createProfileFromTemplate(
  templateId: string,
  profileName: string,
  baseUrl: string
): CrawlConfig {
  const template = getTemplateById(templateId);
  
  if (!template) {
    throw new Error(`Template with ID ${templateId} not found`);
  }
  
  // Clone the template config
  const config: CrawlConfig = JSON.parse(JSON.stringify(template.config));
  
  // Update the baseUrl
  config.baseUrl = baseUrl;
  
  // Update the output directory
  config.outputDir = `./results/${profileName}`;
  
  return config;
}
