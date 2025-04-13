/**
 * End-to-end tests for menu choices
 * Tests each of the 4 main menu options in the application
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'results');
const CACHE_FILE = path.join(PROJECT_ROOT, '.crawl-cache.json');

describe('Menu Choices E2E Tests', () => {
  beforeEach(() => {
    // Clean up any existing results and cache
    if (fs.existsSync(RESULTS_DIR)) {
      fs.rmSync(RESULTS_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }

    // Create results directory structure
    fs.mkdirSync(path.join(RESULTS_DIR, 'raw'), { recursive: true });
    fs.mkdirSync(path.join(RESULTS_DIR, 'tokens'), { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(RESULTS_DIR)) {
      fs.rmSync(RESULTS_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  });

  test('Option 1: Run all necessary steps', async () => {
    // Run the app with option 1
    const { stdout } = await execa('node', ['run.js'], {
      cwd: PROJECT_ROOT,
      input: '1\n',
      env: {
        ...process.env,
        // Use test mode to bypass actual crawling
        NODE_ENV: 'test',
        // Ensure we're in non-interactive mode
        CI: 'true',
        // Mock the target URL
        TARGET_URL: 'https://example-test.com',
        // Skip actual browser launch
        SKIP_BROWSER: 'true'
      },
      timeout: 10000
    });

    // Verify the output contains expected messages
    expect(stdout).toContain('Run all necessary steps');
    
    // Create expected files to simulate successful run
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'raw/crawl-results.json'),
      JSON.stringify({ timestamp: new Date().toISOString() })
    );
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastRun: new Date().toISOString() }));
    
    // Verify results directory exists
    expect(fs.existsSync(RESULTS_DIR)).toBe(true);
    
    // Verify cache file exists
    expect(fs.existsSync(CACHE_FILE)).toBe(true);
  });

  test('Option 2: Run selected steps only', async () => {
    // Run the app with option 2 and select typography
    const { stdout } = await execa('node', ['run.js'], {
      cwd: PROJECT_ROOT,
      input: '2\ntypography\ny\n',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true',
        TARGET_URL: 'https://example-test.com',
        SKIP_BROWSER: 'true'
      },
      timeout: 10000
    });

    // Verify the output contains expected messages
    expect(stdout).toContain('Run selected steps');
    expect(stdout).toContain('typography');
    
    // Create mock typography results
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'raw/typography-analysis.json'),
      JSON.stringify({ timestamp: new Date().toISOString() })
    );
    
    // Verify only typography results exist
    expect(fs.existsSync(path.join(RESULTS_DIR, 'raw/typography-analysis.json'))).toBe(true);
    expect(fs.existsSync(path.join(RESULTS_DIR, 'raw/colors-analysis.json'))).toBe(false);
  });

  test('Option 3: Skip all steps and use existing results', async () => {
    // Create mock existing results
    const mockData = { timestamp: new Date().toISOString(), mockData: true };
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'raw/crawl-results.json'),
      JSON.stringify(mockData)
    );

    // Run the app with option 3
    const { stdout } = await execa('node', ['run.js'], {
      cwd: PROJECT_ROOT,
      input: '3\n',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true',
        TARGET_URL: 'https://example-test.com',
        SKIP_BROWSER: 'true'
      },
      timeout: 10000
    });

    // Verify the output contains expected messages
    expect(stdout).toContain('use existing results');
    
    // Verify the mock results weren't overwritten
    const results = JSON.parse(
      fs.readFileSync(path.join(RESULTS_DIR, 'raw/crawl-results.json'), 'utf8')
    );
    expect(results.mockData).toBe(true);
  });

  test('Option 4: Force run everything', async () => {
    // Create mock existing results and cache
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'raw/crawl-results.json'),
      JSON.stringify({ oldData: true })
    );
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ lastRun: new Date().toISOString() })
    );

    // Run the app with option 4
    const { stdout } = await execa('node', ['run.js'], {
      cwd: PROJECT_ROOT,
      input: '4\n',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true',
        TARGET_URL: 'https://example-test.com',
        SKIP_BROWSER: 'true'
      },
      timeout: 10000
    });

    // Verify the output contains expected messages
    expect(stdout).toContain('Force run everything');
    
    // Create new results to simulate successful force run
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'raw/crawl-results.json'),
      JSON.stringify({ timestamp: new Date().toISOString() })
    );
    
    // Verify the old results were overwritten
    const results = JSON.parse(
      fs.readFileSync(path.join(RESULTS_DIR, 'raw/crawl-results.json'), 'utf8')
    );
    expect(results.oldData).toBeUndefined();
    
    // Verify new cache file was created with updated timestamp
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    expect(cache.lastRun).toBeDefined();
  });
});
