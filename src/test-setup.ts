// src/test-setup.ts
import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
// import { cleanup } from '@testing-library/react';
// import '@testing-library/jest-dom';
import { setupPerformanceMonitoring, cleanupTestResources, enforceResourceLimits } from './test-utils/performance-monitor';

// Performance monitoring setup
setupPerformanceMonitoring();
enforceResourceLimits({
  maxMemory: 150 * 1024 * 1024, // 150MB per test worker
  maxDuration: 8000, // 8s max per test
  maxConcurrency: 4
});

// Global test lifecycle hooks
beforeAll(() => {
  // Force garbage collection before test suite
  if (global.gc) {
    global.gc();
  }
});

afterAll(() => {
  // Comprehensive cleanup after all tests
  cleanupTestResources();
});

// Mock fetch for API calls with performance optimization
global.fetch = vi.fn().mockImplementation(async () => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  headers: new Headers(),
}));

// ESM-compatible Node.js module mocking helpers
export const createNodeFsMock = () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}'),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false, isFile: () => true }),
    unlinkSync: vi.fn(),
    rmSync: vi.fn(),
    copyFileSync: vi.fn(),
    renameSync: vi.fn()
  },
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('{}'),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ isDirectory: () => false, isFile: () => true }),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  copyFileSync: vi.fn(),
  renameSync: vi.fn()
});

export const createNodePathMock = () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
    basename: vi.fn(path => path.split('/').pop()),
    extname: vi.fn(path => {
      const parts = path.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    }),
    resolve: vi.fn((...args) => '/' + args.join('/')),
    relative: vi.fn((from, to) => to),
    isAbsolute: vi.fn(path => path.startsWith('/')),
    normalize: vi.fn(path => path),
    sep: '/',
    delimiter: ':',
    posix: {},
    win32: {}
  },
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn(path => path.split('/').pop()),
  extname: vi.fn(path => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }),
  resolve: vi.fn((...args) => '/' + args.join('/')),
  relative: vi.fn((from, to) => to),
  isAbsolute: vi.fn(path => path.startsWith('/')),
  normalize: vi.fn(path => path),
  sep: '/',
  delimiter: ':',
  posix: {},
  win32: {}
});

export const createNodeUrlMock = () => ({
  default: {
    fileURLToPath: vi.fn(url => url.replace('file://', '')),
    pathToFileURL: vi.fn(path => 'file://' + path),
    URL: global.URL,
    URLSearchParams: global.URLSearchParams
  },
  fileURLToPath: vi.fn(url => url.replace('file://', '')),
  pathToFileURL: vi.fn(path => 'file://' + path),
  URL: global.URL,
  URLSearchParams: global.URLSearchParams
});

export const createPlaywrightMock = () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockResolvedValue({}),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    })
  },
  firefox: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockResolvedValue({}),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    })
  }
});

// Network service mocks for eliminating external dependencies
export const mockNetworkServices = () => {
  // Mock HTTP server
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    headers: new Map(),
    clone: vi.fn()
  });

  // Mock localhost servers
  const mockServer = {
    listen: vi.fn(),
    close: vi.fn(),
    address: vi.fn().mockReturnValue({ port: 3333 })
  };

  // Mock express-like server
  if (typeof global.require !== 'undefined') {
    try {
      const express = global.require('express');
      if (express) {
        express.mockImplementation = vi.fn(() => mockServer);
      }
    } catch (e) {
      // Express not available, ignore
    }
  }
};

// Clean up after each test and mock DOM APIs only when a browser-like environment is available
if (typeof window !== 'undefined') {
  afterEach(() => {
    // cleanup(); // Commented out - not needed for backend tests

    // Additional performance-focused cleanup
    vi.clearAllMocks();

    // Clear any remaining timers
    vi.clearAllTimers();

    // Force garbage collection periodically
    if (Math.random() < 0.1 && global.gc) { // 10% chance
      global.gc();
    }
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Performance-optimized DOM APIs
  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: vi.fn().mockImplementation(cb => setTimeout(cb, 16))
  });

  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: vi.fn().mockImplementation(id => clearTimeout(id))
  });

  // Mock performance API for test consistency
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      now: vi.fn().mockReturnValue(Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn().mockReturnValue([]),
      getEntriesByType: vi.fn().mockReturnValue([]),
    }
  });
}

// Initialize network mocks
mockNetworkServices();