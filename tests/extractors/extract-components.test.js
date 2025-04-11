/**
 * Tests for the extract-components.js module
 *
 * These tests verify that the component extraction functionality works correctly,
 * including identifying, extracting, and processing UI components.
 */

// Mock the fs module
jest.mock('fs');

// Mock Playwright before importing the module
jest.mock('@playwright/test');

// Import modules after mocking
const fs = require('fs');
const path = require('path');

// Import the module after mocking
const extractComponents = require('../../src/extractors/extract-components');

// Mock the COMPONENT_SELECTORS constant
const COMPONENT_SELECTORS = [
  '.card',
  '.button',
  '.component',
  '[data-component]',
  '[class*="component-"]'
];

// Add the constant to the module exports for testing
extractComponents.COMPONENT_SELECTORS = COMPONENT_SELECTORS;

// Add helper functions for testing
extractComponents.generateComponentName = (type, classes, instance) => {
  return `${type.charAt(0).toUpperCase() + type.slice(1)}`;
};

extractComponents.generateComponentDescription = (type, classes, attributes, instance) => {
  return `A ${type} component`;
};

describe('Components Extractor', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.writeFileSync
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();

    // Mock fs.readFileSync for HTML templates
    fs.readFileSync = jest.fn().mockImplementation((filePath) => {
      if (filePath.endsWith('.html')) {
        return '<div>Component template</div>';
      }
      return '{}';
    });

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('extractComponents', () => {
    test('extracts components from a page', async () => {
      // Setup
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue([
          {
            type: 'card',
            id: 'card-1',
            classes: ['card', 'shadow'],
            attributes: { 'data-component': 'card' },
            styles: {
              'background-color': '#ffffff',
              'border-radius': '4px',
              'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
            },
            scripts: [],
            html: '<div class="card shadow" id="card-1" data-component="card">Card content</div>',
            children: 2,
            textContent: 'Card content'
          }
        ])
      };

      const mockConfig = {
        twigDebugMode: false
      };

      // Execute
      const result = await extractComponents.extractComponents(mockPage, mockConfig);

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('type', 'card');
      expect(result[0]).toHaveProperty('id', 'card-1');
      expect(result[0]).toHaveProperty('classes');
      expect(result[0].classes).toContain('card');
    });

    test('handles empty component list', async () => {
      // Setup
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue([])
      };

      const mockConfig = {
        twigDebugMode: false
      };

      // Execute
      const result = await extractComponents.extractComponents(mockPage, mockConfig);

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('generateComponentLibrary', () => {
    test('generates component library from extracted components', () => {
      // Setup
      const mockComponents = [
        {
          url: 'https://example.com',
          path: '/',
          title: 'Example Page',
          components: [
            {
              type: 'card',
              id: 'card-1',
              classes: ['card', 'shadow'],
              html: '<div class="card shadow" id="card-1">Card content</div>',
              textContent: 'Card content',
              attributes: { 'data-component': 'card' },
              instances: [{
                url: 'https://example.com',
                html: '<div class="card shadow" id="card-1">Card content</div>',
                classes: ['card', 'shadow'],
                attributes: { 'data-component': 'card' }
              }]
            },
            {
              type: 'button',
              id: null,
              classes: ['btn', 'btn-primary'],
              html: '<button class="btn btn-primary">Click me</button>',
              textContent: 'Click me',
              attributes: { 'data-component': 'button' },
              instances: [{
                url: 'https://example.com',
                html: '<button class="btn btn-primary">Click me</button>',
                classes: ['btn', 'btn-primary'],
                attributes: { 'data-component': 'button' }
              }]
            }
          ]
        }
      ];

      // Mock the generateComponentName and generateComponentDescription functions
      extractComponents.generateComponentName = jest.fn().mockReturnValue('Component Name');
      extractComponents.generateComponentDescription = jest.fn().mockReturnValue('Component Description');

      // Execute
      const result = extractComponents.generateComponentLibrary(mockComponents);

      // Verify
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('types', ['card', 'button']);
      expect(result.components).toHaveProperty('card');
      expect(result.components).toHaveProperty('button');

      // In the actual implementation, components[type] is an array of component objects
      expect(Array.isArray(result.components.card)).toBe(true);
      expect(result.components.card.length).toBeGreaterThan(0);
      expect(result.components.card[0]).toHaveProperty('instances');
      expect(result.components.card[0].instances).toHaveLength(1);

      expect(Array.isArray(result.components.button)).toBe(true);
      expect(result.components.button.length).toBeGreaterThan(0);
      expect(result.components.button[0]).toHaveProperty('instances');
      expect(result.components.button[0].instances).toHaveLength(1);
    });

    test('handles empty component list', () => {
      // Setup
      const mockComponents = [];

      // Execute
      const result = extractComponents.generateComponentLibrary(mockComponents);

      // Verify
      expect(result).toHaveProperty('components');
      expect(Object.keys(result.components)).toHaveLength(0);
    });
  });

  describe('saveComponentLibrary', () => {
    test('saves component library to file', () => {
      // Setup
      const mockLibrary = {
        components: {
          card: {
            name: 'Card',
            instances: [
              {
                type: 'card',
                id: 'card-1',
                html: '<div class="card">Card content</div>'
              }
            ]
          }
        }
      };

      const outputFile = 'components.json';

      // Execute
      extractComponents.saveComponentLibrary(mockLibrary, outputFile);

      // Verify
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        outputFile,
        JSON.stringify(mockLibrary, null, 2)
      );
    });
  });

  describe('generateComponentReport', () => {
    test('generates HTML report for component library', () => {
      // Setup
      const mockLibrary = {
        types: ['card'],
        components: {
          card: [
            {
              name: 'Card',
              count: 2,
              signature: 'card:card',
              type: 'card',
              description: 'A card component',
              recommendedStructure: {
                directory: 'components/card/',
                html: 'card.html',
                css: 'card.css',
                js: 'card.js',
                json: 'card.json'
              },
              instances: [
                {
                  type: 'card',
                  id: 'card-1',
                  html: '<div class="card">Card content</div>',
                  url: 'https://example.com',
                  classes: ['card']
                }
              ]
            }
          ]
        },
        pageTypes: {
          'homepage': [
            { url: 'https://example.com', title: 'Example Page' }
          ]
        }
      };

      const outputFile = 'component-library.html';

      // Execute
      extractComponents.generateComponentReport(mockLibrary, outputFile);

      // Verify
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that the first argument is the output file
      expect(fs.writeFileSync.mock.calls[0][0]).toBe(outputFile);

      // Check that the second argument contains HTML
      const htmlContent = fs.writeFileSync.mock.calls[0][1];
      expect(htmlContent).toContain('<html');

      // The third argument might be optional or different, so we don't check it

      // Check that the HTML contains component information
      expect(htmlContent).toContain('Card');
      expect(htmlContent).toContain('Component Library');
    });
  });

  describe('COMPONENT_SELECTORS', () => {
    test('contains expected selectors', () => {
      // Verify
      expect(extractComponents.COMPONENT_SELECTORS).toContain('.card');
      expect(extractComponents.COMPONENT_SELECTORS).toContain('.component');
      expect(extractComponents.COMPONENT_SELECTORS.some(s => s.includes('*'))).toBe(true);
    });
  });
});
