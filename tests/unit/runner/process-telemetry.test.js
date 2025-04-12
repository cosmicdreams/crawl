/**
 * Tests for the runner/process-telemetry.js module
 *
 * These tests verify that the telemetry processing works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock console methods
console.log = vi.fn();
console.error = vi.fn();

// Import the module under test
import processTelemetry from '../../../src/runner/process-telemetry.js';

describe('Process Telemetry', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
  });

  test('processTelemetry should return early if telemetry is null', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = null;

    // Execute
    await processTelemetry(config, telemetry);

    // Verify
    expect(console.log).not.toHaveBeenCalled();
  });
});
