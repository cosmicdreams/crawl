/**
 * Performance monitoring utilities for test suite optimization
 * Provides memory tracking, timeout management, and resource cleanup
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: number;
  };
  testName: string;
  status: 'passed' | 'failed' | 'timeout';
}

export class TestPerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static activeTests = new Map<string, { startTime: number; startMemory: NodeJS.MemoryUsage }>();
  private static memoryThreshold = 100 * 1024 * 1024; // 100MB threshold
  private static timeoutWarning = 5000; // 5s warning threshold

  /**
   * Start monitoring a test for performance metrics
   */
  static startTest(testName: string): void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    this.activeTests.set(testName, { startTime, startMemory });
    
    // Set up memory monitoring
    this.setupMemoryMonitoring(testName);
    
    // Set up timeout warning
    this.setupTimeoutWarning(testName);
  }

  /**
   * End monitoring and record metrics
   */
  static endTest(testName: string, status: 'passed' | 'failed' = 'passed'): PerformanceMetrics | null {
    const testData = this.activeTests.get(testName);
    if (!testData) return null;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - testData.startTime;

    const metrics: PerformanceMetrics = {
      startTime: testData.startTime,
      endTime,
      duration,
      memoryUsage: {
        before: testData.startMemory,
        after: endMemory,
        peak: endMemory.heapUsed
      },
      testName,
      status
    };

    this.metrics.push(metrics);
    this.activeTests.delete(testName);

    // Log performance warnings
    this.checkPerformanceWarnings(metrics);

    return metrics;
  }

  /**
   * Force cleanup of hanging tests and resources
   */
  static forceCleanup(): void {
    // Clean up hanging tests
    for (const [testName, testData] of this.activeTests.entries()) {
      const duration = performance.now() - testData.startTime;
      if (duration > 30000) { // 30s timeout
        this.endTest(testName, 'timeout');
        console.warn(`⚠️  Force cleaned up hanging test: ${testName} (${Math.round(duration)}ms)`);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear test metrics if memory is high
    const currentMemory = process.memoryUsage();
    if (currentMemory.heapUsed > this.memoryThreshold * 2) {
      this.clearMetrics();
    }
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    totalTests: number;
    averageDuration: number;
    slowestTests: Array<{ name: string; duration: number }>;
    memoryHungryTests: Array<{ name: string; memory: number }>;
    timeouts: number;
  } {
    const slowestTests = this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(m => ({ name: m.testName, duration: Math.round(m.duration) }));

    const memoryHungryTests = this.metrics
      .sort((a, b) => b.memoryUsage.after.heapUsed - a.memoryUsage.after.heapUsed)
      .slice(0, 5)
      .map(m => ({ 
        name: m.testName, 
        memory: Math.round(m.memoryUsage.after.heapUsed / 1024 / 1024) 
      }));

    const timeouts = this.metrics.filter(m => m.status === 'timeout').length;
    const averageDuration = this.metrics.length > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length 
      : 0;

    return {
      totalTests: this.metrics.length,
      averageDuration: Math.round(averageDuration),
      slowestTests,
      memoryHungryTests,
      timeouts
    };
  }

  /**
   * Clear metrics to free memory
   */
  static clearMetrics(): void {
    this.metrics.length = 0;
    this.activeTests.clear();
  }

  /**
   * Setup memory monitoring for a test
   */
  private static setupMemoryMonitoring(testName: string): void {
    const interval = setInterval(() => {
      const currentMemory = process.memoryUsage();
      if (currentMemory.heapUsed > this.memoryThreshold) {
        console.warn(`⚠️  High memory usage in test: ${testName} (${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB)`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 2000); // Check every 2 seconds

    // Clear interval when test ends
    setTimeout(() => clearInterval(interval), 30000); // Max 30s monitoring
  }

  /**
   * Setup timeout warning for a test
   */
  private static setupTimeoutWarning(testName: string): void {
    setTimeout(() => {
      if (this.activeTests.has(testName)) {
        console.warn(`⚠️  Slow test detected: ${testName} (>${this.timeoutWarning}ms)`);
      }
    }, this.timeoutWarning);
  }

  /**
   * Check for performance warnings
   */
  private static checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    // Duration warning
    if (metrics.duration > this.timeoutWarning) {
      console.warn(`⚠️  Slow test: ${metrics.testName} took ${Math.round(metrics.duration)}ms`);
    }

    // Memory warning  
    const memoryDelta = metrics.memoryUsage.after.heapUsed - metrics.memoryUsage.before.heapUsed;
    if (memoryDelta > this.memoryThreshold / 4) { // 25MB increase
      console.warn(`⚠️  Memory-intensive test: ${metrics.testName} used ${Math.round(memoryDelta / 1024 / 1024)}MB`);
    }
  }
}

/**
 * Global test hooks for automatic performance monitoring
 */
export const setupPerformanceMonitoring = (): void => {
  // Auto-start monitoring for each test
  if (typeof beforeEach !== 'undefined') {
    beforeEach(function() {
      const testName = this?.currentTest?.title || this?.test?.name || 'unknown-test';
      TestPerformanceMonitor.startTest(testName);
    });

    afterEach(function() {
      const testName = this?.currentTest?.title || this?.test?.name || 'unknown-test';
      const status = this?.currentTest?.state === 'failed' ? 'failed' : 'passed';
      TestPerformanceMonitor.endTest(testName, status);
    });
  }

  // Global cleanup on process exit
  process.on('exit', () => {
    TestPerformanceMonitor.forceCleanup();
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', () => {
    TestPerformanceMonitor.forceCleanup();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', () => {
    TestPerformanceMonitor.forceCleanup();
  });
};

/**
 * Memory cleanup utilities
 */
export const cleanupTestResources = (): void => {
  // Clear all timers
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }

  // Clear immediate tasks
  if (typeof setImmediate !== 'undefined') {
    const highestImmediateId = setImmediate(() => {});
    for (let i = 0; i < highestImmediateId; i++) {
      clearImmediate(i);
    }
  }

  // Force garbage collection
  if (global.gc) {
    global.gc();
  }

  // Clear performance monitoring
  TestPerformanceMonitor.forceCleanup();
};

/**
 * Test resource limits
 */
export const enforceResourceLimits = (options: {
  maxMemory?: number;
  maxDuration?: number;
  maxConcurrency?: number;
} = {}): void => {
  const {
    maxMemory = 200 * 1024 * 1024, // 200MB
    maxDuration = 10000, // 10s
    maxConcurrency = 4
  } = options;

  // Memory limit enforcement
  const memoryCheck = setInterval(() => {
    const currentMemory = process.memoryUsage();
    if (currentMemory.heapUsed > maxMemory) {
      console.error(`💥 Memory limit exceeded: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB > ${Math.round(maxMemory / 1024 / 1024)}MB`);
      cleanupTestResources();
    }
  }, 1000);

  // Clean up interval on exit
  setTimeout(() => clearInterval(memoryCheck), maxDuration + 5000);
};