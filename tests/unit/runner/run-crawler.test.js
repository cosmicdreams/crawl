/**
 * Tests for the runner/run-crawler.js module
 *
 * These tests verify that the crawler runner works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('../../../src/utils/config-manager.js');
vi.mock('../../../src/crawler/site-crawler.js');
vi.mock('../../../src/utils/telemetry-manager.js');
vi.mock('../../../src/utils/cache-manager.js');
vi.mock('../../../src/utils/ui-utils.js');
vi.mock('../../../src/utils/colors.js');
vi.mock('../../../src/runner/prompt-utils.js');

// Import the module under test
import runCrawler from '../../../src/runner/run-crawler.js';

// Import mocked dependencies
import { ui } from '../../../src/utils/ui-utils.js';

describe('Run Crawler', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup UI mocks
    ui.header = vi.fn();
    ui.info = vi.fn();
  });
  
  test('runCrawler should skip if not in stepsToRun', async () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };
    const telemetry = null;
    const stepsToRun = {
      crawl: false
    };
    const runAll = false;
    const rawDir = './results/raw';
    
    // Execute
    const result = await runCrawler(config, telemetry, stepsToRun, runAll, rawDir);
    
    // Verify
    expect(result).toBeNull();
    expect(ui.info).toHaveBeenCalledWith('Skipping crawl step (using cached results)');
  });
});
