// @ts-check
const fs = require('fs');
const path = require('path');
const generateTokens = require('../../src/generators/generate-tokens');

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

describe('Token Generator', () => {
  // Mock data
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
    },
    spacingGroups: {
      xs: ['4px'],
      sm: ['8px'],
      md: ['16px'],
      lg: ['24px'],
      xl: ['32px']
    }
  };

  const mockBordersData = {
    borderWidths: ['1px', '2px', '4px'],
    borderStyles: ['solid', 'dashed', 'dotted'],
    borderRadii: ['2px', '4px', '8px', '16px'],
    shadows: ['0 1px 2px rgba(0,0,0,0.1)', '0 2px 4px rgba(0,0,0,0.2)'],
    cssVars: {
      '--border-width-sm': '1px',
      '--border-width-md': '2px',
      '--border-width-lg': '4px',
      '--border-radius-sm': '2px',
      '--border-radius-md': '4px',
      '--border-radius-lg': '8px',
      '--border-radius-xl': '16px',
      '--shadow-sm': '0 1px 2px rgba(0,0,0,0.1)',
      '--shadow-md': '0 2px 4px rgba(0,0,0,0.2)'
    }
  };

  const mockAnimationsData = {
    durations: ['100ms', '200ms', '300ms', '500ms'],
    timingFunctions: ['ease', 'ease-in', 'ease-out', 'linear'],
    delays: ['0ms', '100ms', '200ms'],
    keyframes: {
      'fade-in': '@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
      'slide-in': '@keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }'
    },
    cssVars: {
      '--duration-fast': '100ms',
      '--duration-medium': '300ms',
      '--duration-slow': '500ms',
      '--timing-default': 'ease',
      '--timing-in': 'ease-in',
      '--timing-out': 'ease-out'
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock file system
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('typography')) {
        return JSON.stringify({ data: mockTypographyData });
      } else if (filePath.includes('color')) {
        return JSON.stringify({ data: mockColorData });
      } else if (filePath.includes('spacing')) {
        return JSON.stringify({ data: mockSpacingData });
      } else if (filePath.includes('borders')) {
        return JSON.stringify({ data: mockBordersData });
      } else if (filePath.includes('animations')) {
        return JSON.stringify({ data: mockAnimationsData });
      }
      return '{}';
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should generate tokens from extracted data', async () => {
    // Call the generator
    const result = await generateTokens();

    // Verify the result structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    expect(result).toHaveProperty('spacing');
    expect(result).toHaveProperty('borders');
    expect(result).toHaveProperty('animations');

    // Verify typography tokens
    expect(result.typography).toHaveProperty('fontFamilies');
    expect(result.typography).toHaveProperty('fontSizes');
    expect(result.typography).toHaveProperty('fontWeights');
    expect(result.typography).toHaveProperty('lineHeights');
    expect(result.typography).toHaveProperty('letterSpacings');

    // Verify color tokens
    expect(result.colors).toHaveProperty('values');
    expect(result.colors).toHaveProperty('groups');

    // Verify spacing tokens
    expect(result.spacing).toHaveProperty('values');
    expect(result.spacing).toHaveProperty('groups');

    // Verify border tokens
    expect(result.borders).toHaveProperty('widths');
    expect(result.borders).toHaveProperty('styles');
    expect(result.borders).toHaveProperty('radii');
    expect(result.borders).toHaveProperty('shadows');

    // Verify animation tokens
    expect(result.animations).toHaveProperty('durations');
    expect(result.animations).toHaveProperty('timingFunctions');
    expect(result.animations).toHaveProperty('delays');
    expect(result.animations).toHaveProperty('keyframes');
  });

  test('should generate CSS variables', async () => {
    // Call the generator
    await generateTokens();

    // Verify CSS variables were written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('variables.css'),
      expect.stringContaining(':root {')
    );

    // Check for typography variables
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('typography.css'),
      expect.stringContaining('--font-family-')
    );

    // Check for color variables
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('colors.css'),
      expect.stringContaining('--primary-color')
    );

    // Check for spacing variables
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('spacing.css'),
      expect.stringContaining('--spacing-')
    );

    // Check for border variables
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('borders.css'),
      expect.stringContaining('--border-')
    );

    // Check for animation variables
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('animations.css'),
      expect.stringContaining('--duration-')
    );
  });

  test('should generate JSON tokens', async () => {
    // Call the generator
    await generateTokens();

    // Verify JSON tokens were written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('tokens.json'),
      expect.any(String)
    );

    // Verify Figma tokens were written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('figma-tokens.json'),
      expect.any(String)
    );
  });

  test('should handle missing input files', async () => {
    // Mock missing files
    fs.existsSync.mockReturnValue(false);

    // Call the generator
    const result = await generateTokens();

    // Verify the result still has the expected structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    expect(result).toHaveProperty('spacing');
    expect(result).toHaveProperty('borders');
    expect(result).toHaveProperty('animations');

    // Verify empty objects are returned
    expect(Object.keys(result.typography)).toHaveLength(0);
    expect(Object.keys(result.colors)).toHaveLength(0);
    expect(Object.keys(result.spacing)).toHaveLength(0);
    expect(Object.keys(result.borders)).toHaveLength(0);
    expect(Object.keys(result.animations)).toHaveLength(0);
  });

  test('should handle malformed input files', async () => {
    // Mock malformed JSON
    fs.readFileSync.mockImplementation(() => {
      return 'not valid json';
    });

    // Call the generator
    const result = await generateTokens();

    // Verify the result still has the expected structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    expect(result).toHaveProperty('spacing');
    expect(result).toHaveProperty('borders');
    expect(result).toHaveProperty('animations');

    // Verify empty objects are returned
    expect(Object.keys(result.typography)).toHaveLength(0);
    expect(Object.keys(result.colors)).toHaveLength(0);
    expect(Object.keys(result.spacing)).toHaveLength(0);
    expect(Object.keys(result.borders)).toHaveLength(0);
    expect(Object.keys(result.animations)).toHaveLength(0);
  });

  test('should create output directories if they do not exist', async () => {
    // Mock directories not existing
    fs.existsSync.mockImplementation((path) => {
      if (path.includes('css') || path.includes('tokens')) {
        return false;
      }
      return true;
    });

    // Call the generator
    await generateTokens();

    // Verify directories were created
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('css'),
      expect.objectContaining({ recursive: true })
    );

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('tokens'),
      expect.objectContaining({ recursive: true })
    );
  });

  test('should handle file write errors', async () => {
    // Mock file write error
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('Write error');
    });

    // Call the generator
    const result = await generateTokens();

    // Verify the result still has the expected structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    expect(result).toHaveProperty('spacing');
    expect(result).toHaveProperty('borders');
    expect(result).toHaveProperty('animations');
  });
});
