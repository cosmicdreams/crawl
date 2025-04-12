/**
 * Vitest configuration for Design Token Crawler
 *
 * This configuration sets up Vitest for testing the crawler application,
 * including code coverage reporting and test matching patterns.
 */

/* eslint-disable node/no-missing-import */
/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    globals: true,

    // Include patterns for test files
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],

    // Exclude patterns
    exclude: ['node_modules', 'results', 'backup'],

    // Browser testing configuration
    browser: {
      enabled: false, // Disabled by default, enable with --browser flag
      name: 'chromium',
      provider: 'playwright',
      headless: true
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['src/templates/**'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50
      }
    },

    // Global setup and teardown
    globalSetup: [],

    // Test timeout in milliseconds
    testTimeout: 10000,

    // Watch mode configuration
    watchExclude: ['**/node_modules/**', '**/results/**', '**/coverage/**'],

    // Parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
