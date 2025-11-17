/**
 * Vitest configuration for Design Token Crawler
 *
 * This configuration sets up Vitest for testing the crawler application,
 * including code coverage reporting and test matching patterns.
 */

/* eslint-disable node/no-missing-import */
/* eslint-disable import/no-unresolved */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Configure projects for different test types
  projects: [
    // Main project configuration
    {
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

    // Performance-optimized timeout configuration
    testTimeout: 8000, // Reduced from 10s for faster feedback
    hookTimeout: 5000, // Prevent hanging setup/teardown

    // Watch mode configuration with performance optimizations
    watchExclude: [
      '**/node_modules/**', 
      '**/results/**', 
      '**/coverage/**',
      '**/dist/**',
      '**/.git/**',
      '**/backup/**'
    ],

    // Optimized parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: Math.min(4, Math.max(1, Math.floor(cpus().length / 2))), // Smart CPU usage
        useAtomics: true, // Enable atomic operations for better performance
      },
      // Memory management
      isolate: false, // Share context between threads for performance
    },

    // Enhanced ESM and hoisting configuration
    hoistMocks: {
      vi: ['vitest'],
      external: ['playwright', 'jsdom'] // Hoist heavy dependencies
    },
    
    // Optimized server configuration for better ESM handling
    server: {
      deps: {
        inline: [
          // Inline dependencies that have issues with ESM
          'playwright',
          '@testing-library/react',
          '@testing-library/jest-dom'
        ],
        // Performance optimization: external heavy deps
        external: ['react', 'react-dom']
      },
      // Preload commonly used modules
      preTransformRequests: false, // Disable for faster startup
    },

    // Performance and memory optimizations
    experimentalVmThreads: true,
    maxConcurrency: 8, // Limit concurrent tests to prevent memory issues
    
    // Optimize test environment for performance
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously', // Faster script execution
        pretendToBeVisual: false, // Skip visual rendering for performance
      }
    },

    // Memory management configuration
    memoryLimit: '512M', // Prevent memory leaks
    
    // Fast test discovery
    cache: {
      dir: './node_modules/.cache/vitest', // Cache test files
    },
    
    // Optimized reporter for CI/CD
    reporter: process.env.CI ? ['json', 'github-actions'] : ['default'],
    
    // Performance monitoring
    benchmark: {
      outputFile: './test-results/benchmark.json',
      reporters: ['default', 'json']
    }
    }
  },
  // Storybook test project
  {
      plugins: [
        storybookTest({ configDir: path.join(dirname, '.storybook') }),
      ],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{ browser: 'chromium' }]
        },
        setupFiles: ['.storybook/vitest.setup.ts'],
      },
    },
  ],
});