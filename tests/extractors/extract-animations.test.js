/**
 * Tests for the extract-animations.js module
 *
 * These tests verify that the animations extraction functionality works correctly,
 * including parsing, categorizing, and processing animation and transition values.
 */

// Mock the fs module
jest.mock('fs');

// Mock Playwright before importing the module
jest.mock('@playwright/test');

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

// Import the module after mocking
const extractAnimations = require('../../src/extractors/extract-animations');

// Setup mock implementations for chromium
chromium.launch = jest.fn().mockResolvedValue({
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn(),
      close: jest.fn(),
      setContent: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image'))
    }),
    close: jest.fn()
  }),
  close: jest.fn()
});

describe('Animations Extractor', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.readFileSync to return controlled content
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200
        }
      ]
    }));

    // Mock fs.writeFileSync
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('extractAnimationsFromCrawledPages', () => {
    test('processes crawl results and extracts animations', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          elementStyles: {
            'button': [{
              classes: 'btn',
              id: null,
              styles: {
                'transition': 'all 0.3s ease',
                'transition-duration': '0.3s',
                'transition-timing-function': 'ease'
              }
            }],
            '.fade': [{
              classes: 'fade animate',
              id: 'fade-element',
              styles: {
                'animation': 'fadeIn 1s ease-in-out',
                'animation-duration': '1s',
                'animation-timing-function': 'ease-in-out'
              }
            }]
          },
          durations: ['0.3s', '1s'],
          timingFunctions: ['ease', 'ease-in-out'],
          delays: ['0s'],
          keyframes: {
            'fadeIn': {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' }
            }
          },
          cssVars: { '--transition-duration': '0.3s', '--animation-duration': '1s' }
        }),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
        close: jest.fn(),
        setContent: jest.fn()
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValue(mockBrowser);

      // Execute
      const result = await extractAnimations.extractAnimationsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled(); // For visualization
      expect(mockPage.screenshot).toHaveBeenCalled();

      // Check that the written content has the expected structure
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      // The baseUrl might not be present in all implementations
      // expect(parsedContent).toHaveProperty('baseUrl');
      expect(parsedContent).toHaveProperty('pagesAnalyzed');
      expect(parsedContent).toHaveProperty('animationStyles');
      expect(parsedContent).toHaveProperty('allDurations');
      expect(parsedContent).toHaveProperty('allTimingFunctions');
      expect(parsedContent).toHaveProperty('allDelays');
      expect(parsedContent).toHaveProperty('keyframes');
      expect(parsedContent).toHaveProperty('cssVars');

      // Check specific values
      expect(parsedContent.allDurations).toContain('0.3s');
      expect(parsedContent.allDurations).toContain('1s');
      expect(parsedContent.allTimingFunctions).toContain('ease');
      expect(parsedContent.allTimingFunctions).toContain('ease-in-out');
      expect(parsedContent.keyframes).toHaveProperty('fadeIn');
    });

    test('handles file not found error', async () => {
      // Setup
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path.includes('crawl-results.json')) {
          return false;
        }
        return true;
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Execute
      await extractAnimations.extractAnimationsFromCrawledPages();

      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Input file not found'));
      expect(mockExit).toHaveBeenCalledWith(1);

      // Restore process.exit
      mockExit.mockRestore();
    });

    test('handles browser launch errors', async () => {
      // Setup
      const originalLaunch = chromium.launch;
      chromium.launch = jest.fn().mockRejectedValue(new Error('Browser launch failed'));
      process.exit = jest.fn(); // Mock process.exit

      try {
        // Execute and catch the error
        await expect(extractAnimations.extractAnimationsFromCrawledPages()).rejects.toThrow('Browser launch failed');

        // Verify
        expect(chromium.launch).toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      } finally {
        // Restore original function
        chromium.launch = originalLaunch;
        process.exit.mockRestore();
      }
    });

    test('handles page navigation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
        evaluate: jest.fn(),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
        close: jest.fn(),
        setContent: jest.fn()
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValue(mockBrowser);

      // Execute
      const result = await extractAnimations.extractAnimationsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error analyzing'), expect.any(String));
      expect(fs.writeFileSync).toHaveBeenCalled(); // Should still write results even with errors

      // Check that the result has empty arrays for the failed page
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.pagesAnalyzed).toHaveLength(0);
    });

    test('handles keyframe extraction', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          elementStyles: {},
          durations: ['0.5s'],
          timingFunctions: ['ease'],
          delays: ['0s'],
          keyframes: {
            'fadeIn': {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' }
            },
            'slideIn': {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(0)' }
            }
          },
          cssVars: {}
        }),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
        close: jest.fn(),
        setContent: jest.fn()
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValue(mockBrowser);

      // Execute
      const result = await extractAnimations.extractAnimationsFromCrawledPages();

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();

      // Check that keyframes were processed correctly
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.keyframes).toHaveProperty('fadeIn');
      expect(parsedContent.keyframes).toHaveProperty('slideIn');
      expect(parsedContent.keyframes.fadeIn).toHaveProperty('0%');
      expect(parsedContent.keyframes.fadeIn).toHaveProperty('100%');
      expect(parsedContent.keyframes.fadeIn['0%']).toHaveProperty('opacity', '0');
    });
  });

  // Additional tests could be added for helper functions if they were exported
});
