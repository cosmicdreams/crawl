// src/core/stages/token-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenGenerator } from './token-generator.js';
import { CrawlConfig, DesignToken } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs
vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
  };
});

// Mock path
vi.mock('node:path', () => {
  return {
    join: vi.fn((...args) => args.join('/')),
    relative: vi.fn((from, to) => to)
  };
});

describe('TokenGenerator', () => {
  let tokenGenerator: TokenGenerator;
  let config: CrawlConfig;
  let extractedTokens: DesignToken[];

  beforeEach(() => {
    tokenGenerator = new TokenGenerator();
    config = {
      baseUrl: 'https://example.com',
      maxPages: 2,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results',
      tokens: {
        prefix: 'dt',
        outputFormats: ['css', 'json', 'figma']
      }
    };

    extractedTokens = [
      // Colors
      {
        name: 'primary',
        value: '#0066cc',
        type: 'color',
        category: 'brand',
        description: 'Primary brand color',
        usageCount: 42
      },
      {
        name: 'secondary',
        value: '#ff9900',
        type: 'color',
        category: 'brand',
        description: 'Secondary brand color',
        usageCount: 28
      },
      {
        name: 'text-primary',
        value: '#212529',
        type: 'color',
        category: 'text',
        description: 'Primary text color',
        usageCount: 120
      },

      // Typography
      {
        name: 'heading-1',
        value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
        type: 'typography',
        category: 'heading',
        description: 'Main heading style',
        usageCount: 15
      },
      {
        name: 'body-regular',
        value: 'font-family: Inter; font-size: 1rem; font-weight: 400; line-height: 1.5;',
        type: 'typography',
        category: 'body',
        description: 'Regular body text',
        usageCount: 156
      },

      // Spacing
      {
        name: 'spacing-0',
        value: '0',
        type: 'spacing',
        category: 'base',
        description: 'Zero spacing',
        usageCount: 120
      },
      {
        name: 'spacing-4',
        value: '1rem',
        type: 'spacing',
        category: 'base',
        description: 'Base spacing unit',
        usageCount: 210
      },

      // Borders
      {
        name: 'border-width-1',
        value: '1px',
        type: 'border',
        category: 'width',
        description: 'Standard border width',
        usageCount: 156
      },
      {
        name: 'border-radius-sm',
        value: '0.25rem',
        type: 'border',
        category: 'radius',
        description: 'Small border radius',
        usageCount: 92
      }
    ];

    vi.clearAllMocks();
  });

  it('should create output directories if they don\'t exist', async () => {
    await tokenGenerator.process(extractedTokens, config);

    expect(fs.existsSync).toHaveBeenCalledWith('./test-results/tokens');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results/tokens', { recursive: true });
  });

  it('should save tokens to files in different formats', async () => {
    await tokenGenerator.process(extractedTokens, config);

    // Check that files are written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './test-results/tokens/tokens.css',
      expect.any(String)
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './test-results/tokens/tokens.json',
      expect.any(String)
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './test-results/tokens/figma-tokens.json',
      expect.any(String)
    );
  });

  it('should apply token prefix to generated tokens', async () => {
    if (!config.tokens) config.tokens = {};
    config.tokens.prefix = 'custom';
    await tokenGenerator.process(extractedTokens, config);

    // Check that CSS variables have the custom prefix
    const cssCallArgs = vi.mocked(fs.writeFileSync).mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('tokens.css')
    );

    if (cssCallArgs) {
      const cssContent = cssCallArgs[1] as string;
      expect(cssContent).toContain('--custom-');
      expect(cssContent).not.toContain('--dt-');
    }
  });

  it('should generate tokens for all extracted design elements', async () => {
    await tokenGenerator.process(extractedTokens, config);

    // Check that all token types are included in the CSS output
    const cssCallArgs = vi.mocked(fs.writeFileSync).mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('tokens.css')
    );

    if (cssCallArgs) {
      const cssContent = cssCallArgs[1] as string;

      // Check for color tokens
      expect(cssContent).toContain('--dt-primary');
      expect(cssContent).toContain('#0066cc');

      // Check for typography tokens
      expect(cssContent).toContain('--dt-heading-1');

      // Check for spacing tokens
      expect(cssContent).toContain('--dt-spacing-4');
      expect(cssContent).toContain('1rem');

      // Check for border tokens
      expect(cssContent).toContain('--dt-border-width-1');
      expect(cssContent).toContain('1px');
    }
  });

  it('should respect token format configuration', async () => {
    // Configure to only generate CSS format
    if (!config.tokens) config.tokens = {};
    config.tokens.outputFormats = ['css'];
    await tokenGenerator.process(extractedTokens, config);

    // Should generate CSS files
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './test-results/tokens/tokens.css',
      expect.any(String)
    );

    // Should not generate JSON or Figma files
    const jsonCallArgs = vi.mocked(fs.writeFileSync).mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('tokens.json')
    );

    const figmaCallArgs = vi.mocked(fs.writeFileSync).mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('figma-tokens.json')
    );

    expect(jsonCallArgs).toBeUndefined();
    expect(figmaCallArgs).toBeUndefined();
  });
});
