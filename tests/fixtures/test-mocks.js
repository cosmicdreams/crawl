/**
 * Test Mocks
 *
 * This file provides mock data and mocking utilities for tests.
 * It consolidates mock-data.js and vitest-mocking.js into a single file.
 */

import { vi } from 'vitest';

// ============================================================================
// MOCK UTILITIES
// ============================================================================

/**
 * Creates a mock for the fs module with common methods
 * @param {object} vi - Vitest vi object
 * @returns {object} Mocked fs module
 */
export function mockFs(vi) {
  return {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
    unlinkSync: vi.fn(),
    rmdirSync: vi.fn()
  };
}

/**
 * Creates a mock for the path module with common methods
 * @param {object} vi - Vitest vi object
 * @returns {object} Mocked path module
 */
export function mockPath(vi) {
  return {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    dirname: vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/')),
    basename: vi.fn().mockImplementation((p) => p.split('/').pop()),
    extname: vi.fn().mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    }),
    resolve: vi.fn().mockImplementation((...args) => args.join('/'))
  };
}

/**
 * Mocks console methods to prevent output during tests
 */
export function mockConsole() {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
}

/**
 * Creates a mock for the Playwright browser, context, and page
 * @param {object} vi - Vitest vi object
 * @returns {object} Mocked Playwright objects
 */
export function mockPlaywright(vi) {
  // Mock page
  const mockPage = {
    goto: vi.fn().mockResolvedValue({ status: () => 200 }),
    title: vi.fn().mockResolvedValue('Test Page'),
    evaluate: vi.fn().mockResolvedValue({}),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image')),
    close: vi.fn()
  };

  // Mock context
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn()
  };

  // Mock browser
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn()
  };

  // Mock chromium
  const chromium = {
    launch: vi.fn().mockResolvedValue(mockBrowser)
  };

  return {
    mockPage,
    mockContext,
    mockBrowser,
    chromium
  };
}

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Creates mock typography data for testing
 * @returns {object} Mock typography data
 */
export function createMockTypographyData() {
  return {
    fontFamilies: ['Arial', 'Helvetica', 'sans-serif'],
    allFontFamilies: ['Arial', 'Helvetica', 'sans-serif'],
    fontSizes: ['16px', '18px', '24px', '32px'],
    allFontSizes: ['16px', '18px', '24px', '32px'],
    fontWeights: ['400', '700'],
    allFontWeights: ['400', '700'],
    lineHeights: ['1.2', '1.5'],
    allLineHeights: ['1.2', '1.5'],
    letterSpacings: ['normal', '0.05em'],
    allLetterSpacings: ['normal', '0.05em'],
    textTransforms: ['none', 'uppercase', 'lowercase'],
    allTextTransforms: ['none', 'uppercase', 'lowercase'],
    headings: {
      h1: { fontSize: '32px', fontWeight: 'bold', lineHeight: '1.2' },
      h2: { fontSize: '24px', fontWeight: 'bold', lineHeight: '1.2' },
      h3: { fontSize: '18px', fontWeight: 'bold', lineHeight: '1.2' }
    },
    body: {
      fontSize: '16px',
      fontWeight: 'normal',
      lineHeight: '1.5'
    },
    elementStyles: {
      'body': [{ styles: { fontFamily: 'Arial', fontSize: '16px', lineHeight: '1.5' } }],
      'h1': [{ styles: { fontFamily: 'Helvetica', fontSize: '32px', fontWeight: '700' } }],
      'p': [{ styles: { fontFamily: 'Arial', fontSize: '16px' } }]
    },
    cssVars: {
      '--font-family-primary': 'Arial',
      '--font-family-secondary': 'Helvetica',
      '--font-size-base': '16px',
      '--font-size-lg': '18px',
      '--font-size-xl': '24px',
      '--font-size-xxl': '32px'
    }
  };
}

/**
 * Creates mock color data for testing
 * @returns {object} Mock color data
 */
export function createMockColorData() {
  return {
    allColorValues: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
    groupedColors: {
      hex: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
      rgb: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
      rgba: ['rgba(0, 0, 0, 0.5)', 'rgba(255, 255, 255, 0.5)'],
      other: []
    },
    elementStyles: {
      'body': [{ styles: { color: '#000000', backgroundColor: '#ffffff' } }],
      'h1': [{ styles: { color: '#ff0000' } }],
      'p': [{ styles: { color: '#000000' } }]
    },
    cssVars: {
      '--primary-color': '#ff0000',
      '--secondary-color': '#00ff00',
      '--text-color': '#000000',
      '--background-color': '#ffffff'
    }
  };
}

/**
 * Creates mock spacing data for testing
 * @returns {object} Mock spacing data
 */
export function createMockSpacingData() {
  return {
    spacingValues: ['0px', '4px', '8px', '16px', '24px', '32px'],
    marginValues: ['0px', '8px', '16px', '24px'],
    paddingValues: ['0px', '8px', '16px', '24px'],
    gapValues: ['0px', '8px', '16px'],
    elementStyles: {
      'div': [{ styles: { margin: '16px', padding: '8px' } }],
      'p': [{ styles: { margin: '8px 0' } }],
      'section': [{ styles: { padding: '24px' } }]
    },
    cssVars: {
      '--spacing-xs': '4px',
      '--spacing-sm': '8px',
      '--spacing-md': '16px',
      '--spacing-lg': '24px',
      '--spacing-xl': '32px'
    }
  };
}

/**
 * Creates mock border data for testing
 * @returns {object} Mock border data
 */
export function createMockBorderData() {
  return {
    borderWidths: ['1px', '2px', '3px'],
    borderStyles: ['solid', 'dashed', 'dotted'],
    borderRadii: ['0px', '4px', '8px', '50%'],
    boxShadows: ['none', '0 1px 3px rgba(0, 0, 0, 0.1)', '0 4px 6px rgba(0, 0, 0, 0.1)'],
    elementStyles: {
      'button': [{ styles: { border: '1px solid #000000', borderRadius: '4px' } }],
      '.card': [{ styles: { borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' } }]
    },
    cssVars: {
      '--border-width-sm': '1px',
      '--border-width-md': '2px',
      '--border-width-lg': '3px',
      '--border-radius-sm': '4px',
      '--border-radius-md': '8px',
      '--border-radius-lg': '50%'
    }
  };
}

/**
 * Creates mock animation data for testing
 * @returns {object} Mock animation data
 */
export function createMockAnimationData() {
  return {
    transitionProperties: ['all', 'opacity', 'transform'],
    transitionDurations: ['0.2s', '0.3s', '0.5s'],
    transitionTimingFunctions: ['ease', 'ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)'],
    animationNames: ['fade', 'slide', 'bounce'],
    animationDurations: ['1s', '2s'],
    elementStyles: {
      'button': [{ styles: { transition: 'all 0.3s ease' } }],
      '.card': [{ styles: { transition: 'transform 0.5s ease-in-out' } }]
    },
    cssVars: {
      '--transition-fast': '0.2s',
      '--transition-medium': '0.3s',
      '--transition-slow': '0.5s',
      '--ease-default': 'ease',
      '--ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  };
}

/**
 * Creates mock crawl results for testing
 * @returns {object} Mock crawl results
 */
export function createMockCrawlResults() {
  return {
    baseUrl: 'https://example.com',
    crawledPages: [
      {
        url: 'https://example.com',
        title: 'Example Page',
        status: 200,
        contentType: 'text/html',
        bodyClasses: ['home', 'page']
      },
      {
        url: 'https://example.com/about',
        title: 'About Page',
        status: 200,
        contentType: 'text/html',
        bodyClasses: ['about', 'page']
      }
    ],
    errors: []
  };
}

/**
 * Creates mock token results for testing
 * @returns {object} Mock token results
 */
export function createMockTokenResults() {
  return {
    success: true,
    files: [
      'results/tokens/variables.css',
      'results/tokens/colors.css',
      'results/tokens/typography.css',
      'results/tokens/spacing.css',
      'results/tokens/borders.css',
      'results/tokens/animations.css'
    ],
    data: {
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        text: '#000000',
        background: '#ffffff'
      },
      typography: {
        fontFamilies: {
          primary: 'Arial',
          secondary: 'Helvetica'
        },
        fontSizes: {
          base: '16px',
          lg: '18px',
          xl: '24px',
          xxl: '32px'
        }
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      borders: {
        width: {
          sm: '1px',
          md: '2px',
          lg: '3px'
        },
        radius: {
          sm: '4px',
          md: '8px',
          lg: '50%'
        }
      },
      animations: {
        duration: {
          fast: '0.2s',
          medium: '0.3s',
          slow: '0.5s'
        },
        easing: {
          default: 'ease',
          smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      }
    }
  };
}

/**
 * Creates mock report results for testing
 * @returns {object} Mock report results
 */
export function createMockReportResults() {
  return {
    success: true,
    files: [
      'results/reports/design-system-report.html',
      'results/reports/crawl-report.html'
    ]
  };
}
