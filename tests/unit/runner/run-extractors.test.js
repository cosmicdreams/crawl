/**
 * Tests for the runner/run-extractors.js module
 *
 * These tests verify that the extractor runner works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/utils/ui-utils.js');
vi.mock('../../../src/utils/telemetry-manager.js');
vi.mock('../../../src/utils/cache-manager.js');
vi.mock('path');
vi.mock('../../../src/runner/extractor-exports.js');

// Import the module under test
import runExtractors from '../../../src/runner/run-extractors.js';

// Import mocked dependencies
import { ui } from '../../../src/utils/ui-utils.js';
import * as telemetryManager from '../../../src/utils/telemetry-manager.js';
import cacheManager from '../../../src/utils/cache-manager.js';
import { extractors } from '../../../src/runner/extractor-exports.js';

describe('Run Extractors', () => {
  // Setup mock spinner
  const mockSpinner = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup UI mocks
    ui.header = vi.fn();
    ui.info = vi.fn();
    ui.warning = vi.fn();
    ui.error = vi.fn();
    ui.createSpinner = vi.fn().mockReturnValue(mockSpinner);
    
    // Setup telemetry mock
    telemetryManager.withTelemetry = vi.fn((fn) => fn());
    
    // Setup cache manager mock
    cacheManager.updateCacheForStep = vi.fn();
    
    // Setup extractors mock
    extractors.typography = {
      name: 'typography',
      description: 'Typography extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { fontFamilies: ['Arial'] } })
    };
    
    extractors.colors = {
      name: 'colors',
      description: 'Colors extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { colors: ['#ff0000'] } })
    };
    
    extractors.spacing = {
      name: 'spacing',
      description: 'Spacing extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { spacing: ['8px'] } })
    };
  });
  
  test('runExtractors should skip extractors not in stepsToRun', async () => {
    // Setup
    const config = {
      extractorsToRun: ['typography', 'colors', 'spacing']
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      typography: false,
      colors: false,
      spacing: false
    };
    const runAll = false;
    
    // Execute
    await runExtractors(config, telemetry, stepsToRun, runAll);
    
    // Verify
    expect(ui.header).toHaveBeenCalledWith('Step 2: Running extractors');
    expect(ui.info).toHaveBeenCalledTimes(3);
    expect(ui.info).toHaveBeenCalledWith('Skipping typography extractor (using cached results)');
    expect(ui.info).toHaveBeenCalledWith('Skipping colors extractor (using cached results)');
    expect(ui.info).toHaveBeenCalledWith('Skipping spacing extractor (using cached results)');
  });
  
  test('runExtractors should handle unknown extractors', async () => {
    // Setup
    const config = {
      extractorsToRun: ['typography', 'unknown', 'spacing']
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      typography: true,
      spacing: true
    };
    const runAll = false;
    
    // Execute
    await runExtractors(config, telemetry, stepsToRun, runAll);
    
    // Verify
    expect(ui.warning).toHaveBeenCalledWith('Extractor "unknown" not found. Skipping.');
  });
  
  test('runExtractors should handle extractor errors', async () => {
    // Setup
    const config = {
      extractorsToRun: ['typography']
    };
    const telemetry = null;
    const stepsToRun = {
      typography: true
    };
    const runAll = false;
    
    // Mock the extractor to throw an error
    const error = new Error('Test error');
    extractors.typography.run.mockRejectedValueOnce(error);
    
    // Execute
    await runExtractors(config, telemetry, stepsToRun, runAll);
    
    // Verify
    expect(ui.createSpinner).toHaveBeenCalledWith('Running typography extractor...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.fail).toHaveBeenCalledWith('Error running typography extractor: Test error');
    expect(ui.error).toHaveBeenCalledWith(error.stack);
    expect(cacheManager.updateCacheForStep).not.toHaveBeenCalled();
  });
});
