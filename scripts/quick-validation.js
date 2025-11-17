#!/usr/bin/env node
/**
 * Quick Validation Test
 * 
 * Fast validation test that checks optimization effectiveness on 3 different scenarios:
 * 1. Small site (low concurrency benefit expected)
 * 2. Medium site (moderate concurrency benefit)
 * 3. Real-world site (practical validation)
 * 
 * Designed to run in ~5 minutes for quick validation feedback
 */

import chalk from 'chalk';
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
import { OptimizedPipeline } from '../src/utils/optimized-pipeline.js';
import { generateTestSite } from '../tests/console/utils/test-site-generator.js';
import { startMockServer } from '../tests/console/utils/server.js';
import { StrategyLogger, LoggingStrategyFactory } from '../src/utils/logging-strategies.js';
import { logger as baseLogger } from '../dist/utils/logger.js';
import fs from 'fs/promises';

// Quick test configurations
const QUICK_TESTS = [
  {
    name: 'small-test',
    description: 'Small site: 5 pages',
    config: {
      pages: 5,
      depth: 2,
      imagesPerPage: 1,
      complexity: 'simple',
      navigation: 'linear'
    },
    expectedRange: '5-15s',
    type: 'generated'
  },
  {
    name: 'medium-test',
    description: 'Medium site: 15 pages',
    config: {
      pages: 15,
      depth: 3,
      imagesPerPage: 2,
      complexity: 'moderate',
      navigation: 'hierarchical'
    },
    expectedRange: '15-35s',
    type: 'generated'
  },
  {
    name: 'real-world',
    description: 'Real site: vitest.dev',
    url: 'https://vitest.dev',
    expectedRange: '20-60s',
    type: 'real',
    timeout: 120
  }
];

const BENCHMARKS = {
  baseline_original: 108,
  pncb_optimized: 32.15,
  target_improvement: 50,
  known_improvement: 70
};

let testServers = new Map();

async function main() {
  console.log(chalk.bold.blue('⚡ QUICK OPTIMIZATION VALIDATION'));
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Reference: ${chalk.green(BENCHMARKS.pncb_optimized)}s vs ${chalk.yellow(BENCHMARKS.baseline_original)}s baseline (${chalk.bold(BENCHMARKS.known_improvement)}% improvement)`);
  console.log(`Target: ${chalk.cyan('>' + BENCHMARKS.target_improvement + '%')} improvement minimum`);
  console.log('🚀 Quick validation across 3 test scenarios\n');

  try {
    // Setup quiet logging
    const quietStrategy = LoggingStrategyFactory.create('quiet', baseLogger);
    const quietLogger = new StrategyLogger(quietStrategy);
    OptimizedPipeline.setLogger(quietLogger);

    // Generate test sites
    await generateQuickTestSites();
    
    const results = [];
    
    // Run quick tests
    for (const test of QUICK_TESTS) {
      console.log(`\n🧪 ${chalk.bold(test.name)}: ${test.description}`);
      
      try {
        const result = await runQuickTest(test);
        results.push(result);
        
        console.log(`  ⚡ Optimized: ${chalk.green(result.optimized_duration.toFixed(2))}s`);
        console.log(`  📊 Sequential: ${chalk.yellow(result.sequential_duration.toFixed(2))}s`);
        console.log(`  📈 Improvement: ${result.improvement > 0 ? chalk.green('+') : chalk.red('')}${result.improvement.toFixed(1)}%`);
        console.log(`  🎯 Expected: ${test.expectedRange}`);
        console.log(`  ✅ Status: ${result.improvement >= BENCHMARKS.target_improvement ? chalk.green('MEETS TARGET') : result.improvement > 0 ? chalk.yellow('BELOW TARGET') : chalk.red('NEGATIVE')}`);
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        results.push({
          test_name: test.name,
          success: false,
          error: error.message,
          improvement: -1
        });
      }
    }
    
    // Quick analysis
    const successfulResults = results.filter(r => r.success);
    const averageImprovement = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.improvement, 0) / successfulResults.length
      : 0;
    
    console.log(chalk.bold('\n📊 QUICK VALIDATION SUMMARY'));
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${chalk.bold('Tests Completed:')} ${successfulResults.length}/${results.length}`);
    console.log(`${chalk.bold('Average Improvement:')} ${chalk.green(averageImprovement.toFixed(1))}%`);
    console.log(`${chalk.bold('Target Achievement:')} ${averageImprovement >= BENCHMARKS.target_improvement ? chalk.green('✅ PASSED') : chalk.yellow('⚠️  BELOW TARGET')}`);
    
    // Individual test summary
    console.log('\n📋 Test Results:');
    results.forEach(result => {
      if (result.success) {
        const status = result.improvement >= BENCHMARKS.target_improvement ? '✅' : 
                      result.improvement > 0 ? '⚠️' : '❌';
        console.log(`  ${status} ${result.test_name}: ${result.improvement.toFixed(1)}% improvement`);
      } else {
        console.log(`  ❌ ${result.test_name}: FAILED`);
      }
    });
    
    // Final recommendation
    if (averageImprovement >= BENCHMARKS.target_improvement && successfulResults.length === results.length) {
      console.log(chalk.bold.green('\n🎉 QUICK VALIDATION PASSED'));
      console.log('✅ Optimizations show consistent improvement across test scenarios');
      console.log('💚 Ready for comprehensive validation and deployment');
    } else if (averageImprovement > 0) {
      console.log(chalk.bold.yellow('\n⚠️  QUICK VALIDATION PARTIAL'));
      console.log('📊 Some improvement detected but below target or inconsistent');
      console.log('🔍 Recommend comprehensive validation to identify issues');
    } else {
      console.log(chalk.bold.red('\n❌ QUICK VALIDATION FAILED'));
      console.log('🚨 Optimizations not providing expected benefits');
      console.log('🔧 Investigate optimization implementation issues');
    }
    
    // Save quick results
    await saveQuickResults(results, averageImprovement);
    
    // Cleanup
    await cleanup();
    
    process.exit(averageImprovement >= BENCHMARKS.target_improvement ? 0 : 1);
    
  } catch (error) {
    console.error(chalk.red('\n💥 Quick validation failed:'), error.message);
    await cleanup();
    process.exit(1);
  }
}

async function generateQuickTestSites() {
  const testSitesDir = './quick-validation-sites';
  await fs.mkdir(testSitesDir, { recursive: true });
  
  console.log('🏗️  Generating quick test sites...');
  
  for (const test of QUICK_TESTS) {
    if (test.type === 'generated') {
      const siteDir = `${testSitesDir}/${test.name}`;
      console.log(`  📄 ${test.description}...`);
      
      await generateTestSite(siteDir, test.config);
      
      // Start server
      const server = await startMockServer(siteDir);
      const address = server.address();
      const port = typeof address === 'string' 
        ? parseInt(address.split(':').pop(), 10) 
        : address.port;
      
      testServers.set(test.name, server);
      test.url = `http://localhost:${port}`;
      
      console.log(`  ✅ ${test.name} ready at port ${port}`);
    }
  }
  
  console.log('🚀 Quick test sites ready');
}

async function runQuickTest(test) {
  const url = test.url;
  const testName = test.name;
  
  console.log(`  🔍 Testing ${url}...`);
  
  // Test optimized pipeline
  const optimizedStart = Date.now();
  const optimizedResult = await Promise.race([
    OptimizedPipeline.runOptimizedPipeline(url, {
      depth: test.type === 'real' ? 2 : 3,
      output: `./quick-test-output/${testName}-optimized`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Optimized pipeline timeout')), (test.timeout || 180) * 1000)
    )
  ]);
  const optimizedDuration = (Date.now() - optimizedStart) / 1000;
  
  console.log(`    ⚡ Optimized completed: ${optimizedDuration.toFixed(2)}s`);
  
  // Test sequential pipeline
  const sequentialStart = Date.now();
  const sequentialResult = await Promise.race([
    OptimizedPipeline.runSequentialPipeline(url, {
      depth: test.type === 'real' ? 2 : 3,
      output: `./quick-test-output/${testName}-sequential`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sequential pipeline timeout')), (test.timeout || 180) * 1000)
    )
  ]);
  const sequentialDuration = (Date.now() - sequentialStart) / 1000;
  
  console.log(`    📊 Sequential completed: ${sequentialDuration.toFixed(2)}s`);
  
  // Calculate improvement
  const improvement = ((sequentialDuration - optimizedDuration) / sequentialDuration) * 100;
  const absoluteImprovement = sequentialDuration - optimizedDuration;
  
  return {
    test_name: testName,
    test_description: test.description,
    optimized_duration: optimizedDuration,
    sequential_duration: sequentialDuration,
    improvement,
    absolute_improvement: absoluteImprovement,
    success: optimizedResult.success && sequentialResult.success,
    expected_range: test.expectedRange,
    meets_target: improvement >= BENCHMARKS.target_improvement
  };
}

async function saveQuickResults(results, averageImprovement) {
  const resultsDir = './quick-validation-results';
  await fs.mkdir(resultsDir, { recursive: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    validation_type: 'quick',
    reference_performance: {
      pncb_site: `${BENCHMARKS.pncb_optimized}s (${BENCHMARKS.known_improvement}% improvement)`,
      target: `${BENCHMARKS.target_improvement}% minimum improvement`
    },
    summary: {
      tests_run: results.length,
      successful_tests: results.filter(r => r.success).length,
      average_improvement: `${averageImprovement.toFixed(1)}%`,
      target_met: averageImprovement >= BENCHMARKS.target_improvement
    },
    detailed_results: results,
    conclusion: averageImprovement >= BENCHMARKS.target_improvement 
      ? 'Quick validation shows optimizations are working effectively'
      : 'Quick validation indicates potential issues requiring investigation'
  };
  
  await fs.writeFile(`${resultsDir}/quick-validation-${Date.now()}.json`, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Quick results saved to: ${resultsDir}/`);
}

async function cleanup() {
  // Close test servers
  for (const [name, server] of testServers) {
    server.close();
  }
  testServers.clear();
  
  // Clean up browser resources
  try {
    const { OptimizedBrowserManager } = await import('../src/utils/optimized-browser-manager.js');
    await OptimizedBrowserManager.cleanup();
  } catch (error) {
    // Browser manager cleanup failed, but that's okay for quick test
  }
  
  console.log('🧹 Cleanup complete');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Quick validation interrupted');
  await cleanup();
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runQuickValidation };