#!/usr/bin/env node
/**
 * Micro-benchmarking scripts to isolate performance bottlenecks
 * Run individual tests to measure overhead of each "optimization"
 */

import { performance } from 'perf_hooks';
import { chromium } from 'playwright';
import fs from 'fs';
import { promises as fsAsync } from 'fs';
import { BrowserManager } from '../src/utils/browser-manager.js';
import { AsyncFileManager } from '../src/utils/async-file-ops.js';
import { StrategyLogger, LoggingStrategyFactory } from '../src/utils/logging-strategies.js';
import { logger as baseLogger } from '../dist/utils/logger.js';

const ITERATIONS = 5;
const TEST_URL = 'https://pncb.ddev.site';
const SAMPLE_DATA = { test: 'data', items: Array(100).fill().map((_, i) => ({ id: i, value: `item-${i}` })) };

/**
 * Benchmark browser pooling vs direct browser creation
 */
async function benchmarkBrowserApproaches() {
  console.log('\n📊 Browser Management Benchmark');
  console.log('=====================================');

  // Test 1: Browser Pool Approach (current)
  console.log('\n🔄 Testing Browser Pool Approach...');
  const poolTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    // Simulate phase workflow with browser pool
    const page = await BrowserManager.getPage();
    await page.goto(TEST_URL, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await BrowserManager.releasePage(page);
    
    const duration = performance.now() - start;
    poolTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }
  
  await BrowserManager.cleanup();
  
  // Test 2: Direct Browser Creation (original approach)
  console.log('\n🎯 Testing Direct Browser Creation...');
  const directTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    // Simulate original approach: browser per operation
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true
    });
    const page = await browser.newPage();
    await page.goto(TEST_URL, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await browser.close();
    
    const duration = performance.now() - start;
    directTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }

  // Analysis
  const poolAvg = poolTimes.reduce((a, b) => a + b) / poolTimes.length;
  const directAvg = directTimes.reduce((a, b) => a + b) / directTimes.length;
  const overhead = poolAvg - directAvg;
  
  console.log('\n📈 Browser Benchmark Results:');
  console.log(`  Pool Average: ${Math.round(poolAvg)}ms`);
  console.log(`  Direct Average: ${Math.round(directAvg)}ms`);
  console.log(`  Pool Overhead: ${overhead > 0 ? '+' : ''}${Math.round(overhead)}ms (${Math.round((overhead/directAvg)*100)}%)`);
  
  return {
    pooling: { avg: poolAvg, times: poolTimes },
    direct: { avg: directAvg, times: directTimes },
    overhead: overhead
  };
}

/**
 * Benchmark file operations: async vs sync
 */
async function benchmarkFileOperations() {
  console.log('\n📁 File Operations Benchmark');
  console.log('==============================');

  const testFile = './performance-analysis/test-data.json';
  
  // Test 1: Async File Operations (current)
  console.log('\n⚡ Testing Async File Operations...');
  const asyncTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    await AsyncFileManager.writeJsonFile(testFile, SAMPLE_DATA);
    const data = await AsyncFileManager.readJsonFile(testFile);
    
    const duration = performance.now() - start;
    asyncTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }
  
  // Test 2: Sync File Operations (original approach)
  console.log('\n📝 Testing Sync File Operations...');
  const syncTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    fs.writeFileSync(testFile, JSON.stringify(SAMPLE_DATA, null, 2));
    const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    
    const duration = performance.now() - start;
    syncTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }

  // Cleanup
  try { fs.unlinkSync(testFile); } catch {}

  // Analysis
  const asyncAvg = asyncTimes.reduce((a, b) => a + b) / asyncTimes.length;
  const syncAvg = syncTimes.reduce((a, b) => a + b) / syncTimes.length;
  const overhead = asyncAvg - syncAvg;
  
  console.log('\n📈 File Operations Benchmark Results:');
  console.log(`  Async Average: ${Math.round(asyncAvg)}ms`);
  console.log(`  Sync Average: ${Math.round(syncAvg)}ms`);
  console.log(`  Async Overhead: ${overhead > 0 ? '+' : ''}${Math.round(overhead)}ms (${Math.round((overhead/syncAvg)*100)}%)`);
  
  return {
    async: { avg: asyncAvg, times: asyncTimes },
    sync: { avg: syncAvg, times: syncTimes },
    overhead: overhead
  };
}

/**
 * Benchmark logging strategies vs direct logging
 */
async function benchmarkLoggingStrategies() {
  console.log('\n📝 Logging Strategy Benchmark');
  console.log('==============================');

  const MESSAGE_COUNT = 1000; // Simulate heavy logging during crawl
  
  // Test 1: Strategy Pattern Logging (current)
  console.log('\n🎭 Testing Strategy Pattern Logging...');
  const strategyTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const strategy = LoggingStrategyFactory.create('quiet', baseLogger);
    const strategyLogger = new StrategyLogger(strategy);
    
    const start = performance.now();
    
    for (let j = 0; j < MESSAGE_COUNT; j++) {
      strategyLogger.info(`Test message ${j}`);
    }
    
    const duration = performance.now() - start;
    strategyTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }
  
  // Test 2: Direct Logging (original approach)
  console.log('\n📞 Testing Direct Logging...');
  const directTimes = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    
    for (let j = 0; j < MESSAGE_COUNT; j++) {
      // Direct logger calls - silent in quiet mode
      // baseLogger.info(`Test message ${j}`);
    }
    
    const duration = performance.now() - start;
    directTimes.push(duration);
    console.log(`  Iteration ${i + 1}: ${Math.round(duration)}ms`);
  }

  // Analysis
  const strategyAvg = strategyTimes.reduce((a, b) => a + b) / strategyTimes.length;
  const directAvg = directTimes.reduce((a, b) => a + b) / directTimes.length;
  const overhead = strategyAvg - directAvg;
  
  console.log('\n📈 Logging Benchmark Results:');
  console.log(`  Strategy Average: ${Math.round(strategyAvg)}ms`);
  console.log(`  Direct Average: ${Math.round(directAvg)}ms`);
  console.log(`  Strategy Overhead: ${overhead > 0 ? '+' : ''}${Math.round(overhead)}ms (${Math.round((overhead/directAvg)*100)}%)`);
  
  return {
    strategy: { avg: strategyAvg, times: strategyTimes },
    direct: { avg: directAvg, times: directTimes },
    overhead: overhead
  };
}

/**
 * Run comprehensive benchmarking suite
 */
async function runBenchmarks() {
  console.log('🚀 Performance Bottleneck Analysis');
  console.log('==================================');
  console.log(`Target URL: ${TEST_URL}`);
  console.log(`Iterations per test: ${ITERATIONS}`);
  
  const results = {};
  
  try {
    // Run individual benchmarks
    results.browser = await benchmarkBrowserApproaches();
    results.fileOps = await benchmarkFileOperations();
    results.logging = await benchmarkLoggingStrategies();
    
    // Calculate total estimated overhead
    const totalOverhead = results.browser.overhead + results.fileOps.overhead + results.logging.overhead;
    
    console.log('\n🎯 SUMMARY - Optimization Overhead Analysis');
    console.log('==========================================');
    console.log(`  Browser Pool Overhead: +${Math.round(results.browser.overhead)}ms per operation`);
    console.log(`  Async File Overhead: +${Math.round(results.fileOps.overhead)}ms per operation`);
    console.log(`  Strategy Logging Overhead: +${Math.round(results.logging.overhead)}ms per 1000 logs`);
    console.log(`  Estimated Total Impact: +${Math.round(totalOverhead)}ms per operation`);
    
    // Estimate impact on full pipeline (assuming ~50 operations total)
    const pipelineImpact = (totalOverhead * 50) / 1000; // Convert to seconds
    console.log(`  Pipeline Impact Estimate: +${Math.round(pipelineImpact)}s over baseline`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    if (results.browser.overhead > 500) {
      console.log('  🔥 HIGH IMPACT: Remove browser pooling, use direct browser instances');
    }
    if (results.fileOps.overhead > 100) {
      console.log('  📁 MEDIUM IMPACT: Revert small files to sync operations');
    }
    if (results.logging.overhead > 50) {
      console.log('  📝 LOW IMPACT: Simplify logging strategy pattern');
    }
    
    // Save detailed results
    fs.writeFileSync(
      './performance-analysis/benchmark-results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n📄 Detailed results saved to: ./performance-analysis/benchmark-results.json');
    
  } catch (error) {
    console.error('💥 Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Benchmark interrupted, cleaning up...');
  try {
    await BrowserManager.cleanup();
  } catch {}
  process.exit(0);
});

// Run benchmarks
runBenchmarks();