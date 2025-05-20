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
    environment: 'jsdom',
    globals: true,

    // Include patterns for test files
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'results',
      'backup',
      '**/*.stories.{js,jsx,ts,tsx}',
      '**/*.story.{js,jsx,ts,tsx}',
      '**/*.storybook/**',
      '.storybook/**'
    ],

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
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/templates/**',
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/test-setup.ts'
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50
      },
      // Allow customizing the output directory via environment variable
      // This enables separate coverage reports for unit, integration, and e2e tests
      ...(process.env.COVERAGE_DIR && {
        reportsDirectory: `./coverage/${process.env.COVERAGE_DIR}`
      }),
      all: true, // Include all files in the project directory
      clean: true, // Clean coverage directory before running
      cleanOnRerun: true, // Clean coverage directory before each rerun
      skipFull: false, // Don't skip files with 100% coverage
      perFile: true, // Report coverage per file
    },

    // Global setup and teardown
    globalSetup: [],
    setupFiles: ['./src/test-setup.ts'],

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
