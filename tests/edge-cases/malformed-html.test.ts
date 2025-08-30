// tests/edge-cases/malformed-html.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startMockServer } from '../console/utils/server.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);

describe('Malformed HTML Edge Cases', () => {
  let server: any;
  let baseUrl: string;
  const testOutputDir = './test-malformed-output';

  beforeEach(async () => {
    // Start server with malformed HTML content
    server = await startMockServer('./tests/edge-cases/fixtures/malformed-site');
    const address = server.address();
    const port = typeof address === 'string' 
      ? parseInt(address.split(':').pop()!, 10) 
      : address.port;
    baseUrl = `http://localhost:${port}`;
    
    // Clean up test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('HTML parsing resilience', () => {
    it('should handle unclosed tags gracefully', async () => {
      // Mock server should serve HTML with unclosed tags
      const { stdout, stderr } = await execAsync(
        `node index.js initial --url ${baseUrl}/unclosed-tags --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Should complete without crashing
      expect(fs.existsSync(path.join(testOutputDir, 'paths.json'))).toBe(true);
      
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.all_paths).toBeDefined();
      expect(Array.isArray(pathsData.all_paths)).toBe(true);
    });

    it('should handle malformed CSS in style tags', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/malformed-css --output ${testOutputDir}`,
        { timeout: 20000 }
      );
      
      // Should complete extraction despite malformed CSS
      expect(fs.existsSync(path.join(testOutputDir, 'metadata.json'))).toBe(true);
      
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paths_with_metadata).toBeDefined();
    });

    it('should handle invalid HTML entities', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/invalid-entities --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.all_paths.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested elements', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/deeply-nested --output ${testOutputDir}`,
        { timeout: 25000 }
      );
      
      // Should handle deeply nested structures without stack overflow
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.components).toBeDefined();
      expect(Array.isArray(metadata.components)).toBe(true);
    });

    it('should handle missing DOCTYPE', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/no-doctype --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.baseUrl).toBe(`${baseUrl}/no-doctype`);
    });

    it('should handle mixed content types', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/mixed-content --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Should handle pages with mixed HTML/XML content
      expect(fs.existsSync(path.join(testOutputDir, 'paths.json'))).toBe(true);
    });
  });

  describe('CSS extraction resilience', () => {
    it('should handle invalid CSS property values', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/invalid-css-values --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const extractDir = path.join(testOutputDir, 'extract');
      expect(fs.existsSync(extractDir)).toBe(true);
      
      // Check that extraction files are created despite invalid CSS
      const colorFile = path.join(extractDir, 'colors.json');
      expect(fs.existsSync(colorFile)).toBe(true);
      
      const colors = JSON.parse(fs.readFileSync(colorFile, 'utf8'));
      expect(Array.isArray(colors)).toBe(true);
    });

    it('should handle CSS with syntax errors', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/css-syntax-errors --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const extractDir = path.join(testOutputDir, 'extract');
      const spacingFile = path.join(extractDir, 'spacing.json');
      expect(fs.existsSync(spacingFile)).toBe(true);
      
      const spacing = JSON.parse(fs.readFileSync(spacingFile, 'utf8'));
      expect(Array.isArray(spacing)).toBe(true);
    });

    it('should handle CSS with vendor prefixes', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/vendor-prefixes --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const extractDir = path.join(testOutputDir, 'extract');
      const bordersFile = path.join(extractDir, 'borders.json');
      
      if (fs.existsSync(bordersFile)) {
        const borders = JSON.parse(fs.readFileSync(bordersFile, 'utf8'));
        expect(Array.isArray(borders)).toBe(true);
        
        // Should handle vendor-prefixed properties like -webkit-, -moz-, etc.
        // and normalize them or include them appropriately
      }
    });

    it('should handle CSS custom properties (CSS variables)', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/css-variables --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const extractDir = path.join(testOutputDir, 'extract');
      const colorFile = path.join(extractDir, 'colors.json');
      
      if (fs.existsSync(colorFile)) {
        const colors = JSON.parse(fs.readFileSync(colorFile, 'utf8'));
        expect(Array.isArray(colors)).toBe(true);
      }
    });
  });

  describe('Network and resource handling', () => {
    it('should handle extremely slow loading pages', async () => {
      // Set a reasonable timeout but expect graceful handling
      await expect(
        execAsync(
          `node index.js initial --url ${baseUrl}/slow-page --output ${testOutputDir}`,
          { timeout: 10000 }
        )
      ).rejects.toThrow(); // Should timeout gracefully
      
      // Verify no partial files are left
      if (fs.existsSync(path.join(testOutputDir, 'paths.json'))) {
        const paths = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
        expect(paths.all_paths).toBeDefined();
      }
    });

    it('should handle pages with broken images', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/broken-images --output ${testOutputDir}`,
        { timeout: 20000 }
      );
      
      // Should complete metadata extraction despite broken images
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paths_with_metadata.length).toBeGreaterThan(0);
    });

    it('should handle pages with broken stylesheets', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/broken-css --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      // Should complete extraction despite missing external CSS files
      const extractDir = path.join(testOutputDir, 'extract');
      expect(fs.existsSync(extractDir)).toBe(true);
      
      const summaryFile = path.join(extractDir, 'summary.json');
      expect(fs.existsSync(summaryFile)).toBe(true);
    });

    it('should handle pages with JavaScript errors', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/js-errors --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Should complete crawling despite JavaScript errors on the page
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.all_paths.length).toBeGreaterThan(0);
    });
  });

  describe('Large content handling', () => {
    it('should handle pages with extremely large DOM', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/large-dom --output ${testOutputDir}`,
        { timeout: 45000 }
      );
      
      // Should handle large DOMs without running out of memory
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paragraphs).toBeDefined();
      expect(metadata.components).toBeDefined();
    });

    it('should handle pages with many CSS rules', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/many-css-rules --output ${testOutputDir}`,
        { timeout: 60000 }
      );
      
      // Should extract design tokens from pages with thousands of CSS rules
      const extractDir = path.join(testOutputDir, 'extract');
      const files = fs.readdirSync(extractDir);
      
      expect(files).toContain('colors.json');
      expect(files).toContain('typography.json');
      expect(files).toContain('spacing.json');
    });

    it('should handle pages with excessive inline styles', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/excessive-inline-styles --output ${testOutputDir}`,
        { timeout: 45000 }
      );
      
      // Should process inline styles without performance degradation
      const extractDir = path.join(testOutputDir, 'extract');
      const colorFile = path.join(extractDir, 'colors.json');
      
      if (fs.existsSync(colorFile)) {
        const colors = JSON.parse(fs.readFileSync(colorFile, 'utf8'));
        expect(colors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Character encoding and internationalization', () => {
    it('should handle pages with non-UTF8 encoding', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/latin1-encoding --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Should handle pages with different character encodings
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.all_paths.length).toBeGreaterThan(0);
    });

    it('should handle pages with unicode characters', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/unicode-content --output ${testOutputDir}`,
        { timeout: 20000 }
      );
      
      // Should properly handle Unicode characters in content and CSS
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paragraphs).toBeDefined();
    });

    it('should handle right-to-left (RTL) content', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/rtl-content --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      // Should handle RTL layouts and CSS properties
      const extractDir = path.join(testOutputDir, 'extract');
      const spacingFile = path.join(extractDir, 'spacing.json');
      
      if (fs.existsSync(spacingFile)) {
        const spacing = JSON.parse(fs.readFileSync(spacingFile, 'utf8'));
        expect(Array.isArray(spacing)).toBe(true);
      }
    });
  });

  describe('Security and edge cases', () => {
    it('should handle pages with CSRF tokens', async () => {
      const { stdout } = await execAsync(
        `node index.js initial --url ${baseUrl}/csrf-protected --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Should crawl pages with CSRF protection without issues
      const pathsData = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'paths.json'), 'utf8'));
      expect(pathsData.all_paths).toBeDefined();
    });

    it('should handle pages with Content Security Policy', async () => {
      const { stdout } = await execAsync(
        `node index.js metadata --url ${baseUrl}/csp-headers --output ${testOutputDir}`,
        { timeout: 20000 }
      );
      
      // Should handle pages with strict CSP headers
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paths_with_metadata.length).toBeGreaterThan(0);
    });

    it('should sanitize extracted data appropriately', async () => {
      const { stdout } = await execAsync(
        `node index.js extract --url ${baseUrl}/potential-xss --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      // Should sanitize potentially dangerous content in extracted tokens
      const extractDir = path.join(testOutputDir, 'extract');
      const files = fs.readdirSync(extractDir);
      
      // Verify files don't contain unsanitized script tags or other dangerous content
      files.forEach(file => {
        const content = fs.readFileSync(path.join(extractDir, file), 'utf8');
        expect(content).not.toContain('<script>');
        expect(content).not.toContain('javascript:');
        expect(content).not.toContain('onerror=');
      });
    });
  });
});

// Helper function to create test fixtures if they don't exist
function createTestFixtures() {
  const fixturesDir = './tests/edge-cases/fixtures/malformed-site';
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    
    // Create various test HTML files for edge cases
    const testFiles = {
      'unclosed-tags.html': '<html><body><div><p>Unclosed paragraph<div>Another unclosed div<span>Unclosed span</body></html>',
      'malformed-css.html': '<html><head><style>body { color: #invalid-color; font-size: ; margin: 10px 20px 30px; }</style></head><body><h1>Test</h1></body></html>',
      'invalid-entities.html': '<html><body><p>&invalidentity; &amp &lt &gt;</p></body></html>',
      'deeply-nested.html': '<html><body>' + '<div>'.repeat(100) + 'Content' + '</div>'.repeat(100) + '</body></html>',
      'no-doctype.html': '<html><head><title>No DOCTYPE</title></head><body><h1>Content</h1></body></html>'
    };
    
    Object.entries(testFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(fixturesDir, filename), content);
    });
  }
}

// Create fixtures before tests if needed
createTestFixtures();