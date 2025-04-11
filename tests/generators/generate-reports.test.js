// @ts-check
const fs = require('fs');
const path = require('path');
const generateReports = require('../../src/generators/generate-reports');

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
}));

describe('Report Generator', () => {
  // Mock data
  const mockCrawlResults = {
    pages: [
      { url: 'https://example.com', title: 'Example Home', screenshot: 'example-home.png' },
      { url: 'https://example.com/about', title: 'About Us', screenshot: 'about-us.png' },
      { url: 'https://example.com/contact', title: 'Contact', screenshot: 'contact.png' }
    ],
    links: [
      { source: 'https://example.com', target: 'https://example.com/about', text: 'About' },
      { source: 'https://example.com', target: 'https://example.com/contact', text: 'Contact' },
      { source: 'https://example.com/about', target: 'https://example.com', text: 'Home' }
    ],
    errors: []
  };

  const mockTypographyData = {
    fontFamilies: ['Arial', 'Roboto'],
    fontSizes: ['12px', '16px', '24px'],
    fontWeights: ['400', '700'],
    lineHeights: ['1.2', '1.5'],
    letterSpacings: ['0.5px', '1px'],
    textStyles: [
      { name: 'heading-1', fontFamily: 'Roboto', fontSize: '24px', fontWeight: '700', lineHeight: '1.2' },
      { name: 'body', fontFamily: 'Arial', fontSize: '16px', fontWeight: '400', lineHeight: '1.5' }
    ]
  };

  const mockColorData = {
    colorValues: ['#FF0000', '#00FF00', '#0000FF'],
    cssVars: {
      '--primary-color': '#FF0000',
      '--secondary-color': '#00FF00',
      '--accent-color': '#0000FF'
    },
    colorGroups: {
      primary: ['#FF0000', '#FF3333'],
      secondary: ['#00FF00', '#33FF33'],
      accent: ['#0000FF', '#3333FF']
    }
  };

  const mockSpacingData = {
    spacingValues: ['4px', '8px', '16px', '24px', '32px'],
    cssVars: {
      '--spacing-xs': '4px',
      '--spacing-sm': '8px',
      '--spacing-md': '16px',
      '--spacing-lg': '24px',
      '--spacing-xl': '32px'
    }
  };

  const mockBordersData = {
    borderWidths: ['1px', '2px', '4px'],
    borderStyles: ['solid', 'dashed', 'dotted'],
    borderRadii: ['2px', '4px', '8px', '16px'],
    shadows: ['0 1px 2px rgba(0,0,0,0.1)', '0 2px 4px rgba(0,0,0,0.2)']
  };

  const mockAnimationsData = {
    durations: ['100ms', '200ms', '300ms', '500ms'],
    timingFunctions: ['ease', 'ease-in', 'ease-out', 'linear'],
    delays: ['0ms', '100ms', '200ms'],
    keyframes: {
      'fade-in': '@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
      'slide-in': '@keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }'
    }
  };

  const mockTokens = {
    typography: mockTypographyData,
    colors: mockColorData,
    spacing: mockSpacingData,
    borders: mockBordersData,
    animations: mockAnimationsData
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock file system
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('crawl-results')) {
        return JSON.stringify(mockCrawlResults);
      } else if (filePath.includes('typography')) {
        return JSON.stringify({ data: mockTypographyData });
      } else if (filePath.includes('color')) {
        return JSON.stringify({ data: mockColorData });
      } else if (filePath.includes('spacing')) {
        return JSON.stringify({ data: mockSpacingData });
      } else if (filePath.includes('borders')) {
        return JSON.stringify({ data: mockBordersData });
      } else if (filePath.includes('animations')) {
        return JSON.stringify({ data: mockAnimationsData });
      } else if (filePath.includes('tokens')) {
        return JSON.stringify(mockTokens);
      }
      return '{}';
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should generate crawl report', async () => {
    // Call the generator
    await generateReports();

    // Verify crawl report was written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('Crawl Report')
    );

    // Check for page information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('Example Home')
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('https://example.com')
    );
  });

  test('should generate design system report', async () => {
    // Call the generator
    await generateReports();

    // Verify design system report was written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Design System Report')
    );

    // Check for typography information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Typography')
    );

    // Check for color information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Colors')
    );

    // Check for spacing information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Spacing')
    );

    // Check for border information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Borders')
    );

    // Check for animation information in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Animations')
    );
  });

  test('should handle missing input files', async () => {
    // Mock missing files
    fs.existsSync.mockReturnValue(false);

    // Call the generator
    await generateReports();

    // Verify reports were still generated with default content
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('Crawl Report')
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Design System Report')
    );
  });

  test('should handle malformed input files', async () => {
    // Mock malformed JSON
    fs.readFileSync.mockImplementation(() => {
      return 'not valid json';
    });

    // Call the generator
    await generateReports();

    // Verify reports were still generated with default content
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('Crawl Report')
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.stringContaining('Design System Report')
    );
  });

  test('should create output directories if they do not exist', async () => {
    // Mock directories not existing
    fs.existsSync.mockImplementation((path) => {
      if (path.includes('reports')) {
        return false;
      }
      return true;
    });

    // Call the generator
    await generateReports();

    // Verify directories were created
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('reports'),
      expect.objectContaining({ recursive: true })
    );
  });

  test('should handle file write errors', async () => {
    // Mock file write error
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('Write error');
    });

    // Call the generator and expect it not to throw
    await expect(generateReports()).resolves.not.toThrow();
  });

  test('should generate markdown report', async () => {
    // Call the generator with markdown option
    await generateReports({ format: 'markdown' });

    // Verify markdown report was written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system.md'),
      expect.stringContaining('# Design System')
    );
  });

  test('should include screenshots in reports if available', async () => {
    // Call the generator
    await generateReports();

    // Verify screenshots are included in the report
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('example-home.png')
    );
  });
});
