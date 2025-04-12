/**
 * End-to-end tests for the Design Token Crawler
 *
 * These tests verify that the entire application works correctly.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Define test constants
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-results');
const TEST_URL = 'https://example.com';

describe('Basic Workflow', () => {
  beforeEach(() => {
    // Create test output directory if it doesn't exist
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  test('CLI help command should work', async () => {
    // Execute the CLI help command
    const { stdout, stderr } = await execAsync('node run.js --help');

    // Verify the output
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Options:');
    expect(stderr).toBe('');
  });

  test('CLI version command should work', async () => {
    // Execute the CLI version command
    const { stdout, stderr } = await execAsync('node run.js --version');

    // Verify the output
    expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Should contain a version number
    expect(stderr).toBe('');
  });

  test('CLI list command should work', async () => {
    // Execute the CLI list command
    const { stdout, stderr } = await execAsync('node run.js --list');

    // Verify the output
    expect(stdout).toContain('Available Extractors:');
    expect(stdout).toContain('typography');
    expect(stdout).toContain('colors');
    expect(stdout).toContain('spacing');
    expect(stderr).toBe('');
  });

  // This test is skipped by default because it would make actual network requests
  test.skip('Full workflow with real URL', async () => {
    // Run the crawler against a real URL
    const command = `node run.js --url ${TEST_URL} --output ${TEST_OUTPUT_DIR} --max-pages 1 --yes`;

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

      // Verify that the command executed successfully
      expect(stdout).toContain('Crawling');

      // Verify that output files were created
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'raw'))).toBe(true);

      // Verify that tokens were generated
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'tokens'))).toBe(true);

      // Verify that CSS variables were generated
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'css'))).toBe(true);

      // Verify that reports were generated
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'reports'))).toBe(true);

    } catch (error) {
      // If the command fails, the test should fail
      console.error('Command failed:', error);
      throw error;
    }
  }, 60000); // Increase timeout to 60 seconds
});
