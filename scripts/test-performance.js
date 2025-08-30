#!/usr/bin/env node
/**
 * Performance testing script for validating test suite improvements
 * Runs tests with different configurations to measure performance gains
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { performance } from 'perf_hooks';

const RESULTS_DIR = './test-results/performance';
const ITERATIONS = 3; // Number of test runs for averaging

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Run test configuration and measure performance
 */
async function runTestConfiguration(name, command, options = {}) {
  const results = [];
  
  console.log(`🧪 Running ${name} (${ITERATIONS} iterations)...`);
  
  for (let i = 0; i < ITERATIONS; i++) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      // Clean up before each run
      execSync('pkill -f "vitest" || true', { stdio: 'ignore' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run the test
      const result = execSync(command, {
        stdio: 'pipe',
        timeout: 120000, // 2 minute timeout
        encoding: 'utf8',
        ...options
      });
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      // Parse test results
      const testResults = parseTestOutput(result);
      
      results.push({
        iteration: i + 1,
        duration: Math.round(duration),
        memory: {
          peak: Math.round(endMemory.heapUsed / 1024 / 1024), // MB
          delta: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024) // MB
        },
        tests: testResults
      });
      
      console.log(`  ✓ Iteration ${i + 1}: ${Math.round(duration)}ms, ${Math.round(endMemory.heapUsed / 1024 / 1024)}MB peak`);
      
    } catch (error) {
      console.error(`  ✗ Iteration ${i + 1} failed:`, error.message);
      results.push({
        iteration: i + 1,
        duration: -1,
        memory: { peak: -1, delta: -1 },
        tests: { total: 0, passed: 0, failed: 0, error: error.message }
      });
    }
    
    // Cleanup between iterations
    execSync('pkill -f "vitest" || true', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

/**
 * Parse test output to extract metrics
 */
function parseTestOutput(output) {
  try {
    // Extract test counts using regex
    const testMatch = output.match(/Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed(?:\s*\|\s*(\d+)\s+skipped)?/);
    const fileMatch = output.match(/Test Files\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed/);
    const durationMatch = output.match(/Duration\s+([\d.]+)s/);
    
    return {
      total: testMatch ? parseInt(testMatch[1]) + parseInt(testMatch[2]) + (parseInt(testMatch[3]) || 0) : 0,
      passed: testMatch ? parseInt(testMatch[2]) : 0,
      failed: testMatch ? parseInt(testMatch[1]) : 0,
      skipped: testMatch ? parseInt(testMatch[3]) || 0 : 0,
      files: {\n        total: fileMatch ? parseInt(fileMatch[1]) + parseInt(fileMatch[2]) : 0,\n        passed: fileMatch ? parseInt(fileMatch[2]) : 0,\n        failed: fileMatch ? parseInt(fileMatch[1]) : 0\n      },
      duration: durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0\n    };\n  } catch (error) {\n    return { total: 0, passed: 0, failed: 0, skipped: 0, files: { total: 0, passed: 0, failed: 0 }, duration: 0, parseError: error.message };\n  }\n}\n\n/**\n * Calculate performance statistics\n */\nfunction calculateStats(results) {\n  const validResults = results.filter(r => r.duration > 0);\n  if (validResults.length === 0) return null;\n  \n  const durations = validResults.map(r => r.duration);\n  const memoryPeaks = validResults.map(r => r.memory.peak);\n  \n  return {\n    count: validResults.length,\n    duration: {\n      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),\n      min: Math.min(...durations),\n      max: Math.max(...durations),\n      std: Math.round(Math.sqrt(durations.reduce((sq, n) => sq + Math.pow(n - durations.reduce((a, b) => a + b, 0) / durations.length, 2), 0) / durations.length))\n    },\n    memory: {\n      avg: Math.round(memoryPeaks.reduce((a, b) => a + b, 0) / memoryPeaks.length),\n      min: Math.min(...memoryPeaks),\n      max: Math.max(...memoryPeaks)\n    },\n    tests: validResults[0].tests // Assume consistent test results\n  };\n}\n\n/**\n * Main performance testing workflow\n */\nasync function main() {\n  console.log('🚀 Starting Test Performance Analysis\\n');\n  \n  const configurations = [\n    {\n      name: 'Baseline (Original Config)',\n      command: 'pnpm test --run --reporter=basic',\n      description: 'Original configuration without optimizations'\n    },\n    {\n      name: 'Performance Optimized',\n      command: 'pnpm test --run --reporter=basic --threads=2',\n      description: 'New performance-optimized configuration'\n    },\n    {\n      name: 'Single Thread',\n      command: 'pnpm test --run --reporter=basic --pool-options.threads.singleThread=true',\n      description: 'Single-threaded execution for comparison'\n    },\n    {\n      name: 'Unit Tests Only', \n      command: 'pnpm test --run --reporter=basic src/**/*.test.ts',\n      description: 'Unit tests only (excluding integration)'\n    }\n  ];\n  \n  const performanceResults = {};\n  \n  for (const config of configurations) {\n    console.log(`\\n📊 Testing: ${config.name}`);\n    console.log(`   ${config.description}`);\n    \n    const results = await runTestConfiguration(config.name, config.command);\n    const stats = calculateStats(results);\n    \n    performanceResults[config.name] = {\n      ...config,\n      results,\n      stats\n    };\n    \n    if (stats) {\n      console.log(`   📈 Average Duration: ${stats.duration.avg}ms (±${stats.duration.std}ms)`);\n      console.log(`   💾 Average Memory: ${stats.memory.avg}MB`);\n      console.log(`   ✅ Test Success: ${stats.tests.passed}/${stats.tests.total}`);\n    } else {\n      console.log('   ❌ All iterations failed');\n    }\n  }\n  \n  // Generate comparison report\n  generateComparisonReport(performanceResults);\n  \n  console.log(`\\n📊 Performance analysis complete!`);\n  console.log(`📄 Detailed results saved to: ${RESULTS_DIR}/`);\n}\n\n/**\n * Generate detailed comparison report\n */\nfunction generateComparisonReport(results) {\n  const report = {\n    timestamp: new Date().toISOString(),\n    summary: {},\n    detailed: results\n  };\n  \n  // Create performance comparison\n  const baseline = results['Baseline (Original Config)'];\n  const optimized = results['Performance Optimized'];\n  \n  if (baseline && optimized && baseline.stats && optimized.stats) {\n    const durationImprovement = ((baseline.stats.duration.avg - optimized.stats.duration.avg) / baseline.stats.duration.avg * 100);\n    const memoryImprovement = ((baseline.stats.memory.avg - optimized.stats.memory.avg) / baseline.stats.memory.avg * 100);\n    \n    report.summary = {\n      durationImprovement: `${durationImprovement > 0 ? '+' : ''}${Math.round(durationImprovement)}%`,\n      memoryImprovement: `${memoryImprovement > 0 ? '+' : ''}${Math.round(memoryImprovement)}%`,\n      baseline: {\n        duration: `${baseline.stats.duration.avg}ms`,\n        memory: `${baseline.stats.memory.avg}MB`,\n        tests: `${baseline.stats.tests.passed}/${baseline.stats.tests.total}`\n      },\n      optimized: {\n        duration: `${optimized.stats.duration.avg}ms`,\n        memory: `${optimized.stats.memory.avg}MB`,\n        tests: `${optimized.stats.tests.passed}/${optimized.stats.tests.total}`\n      }\n    };\n    \n    console.log(`\\n📊 Performance Improvement Summary:`);\n    console.log(`   ⚡ Duration: ${report.summary.durationImprovement}`);\n    console.log(`   💾 Memory: ${report.summary.memoryImprovement}`);\n  }\n  \n  // Save detailed report\n  writeFileSync(\n    `${RESULTS_DIR}/performance-report-${Date.now()}.json`,\n    JSON.stringify(report, null, 2)\n  );\n  \n  // Save human-readable summary\n  const summaryText = `# Test Performance Analysis Report\n\nGenerated: ${report.timestamp}\n\n## Summary\n${Object.entries(report.summary).map(([key, value]) => `- ${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`).join('\\n')}\n\n## Detailed Results\n${Object.entries(results).map(([name, config]) => {\n    if (!config.stats) return `### ${name}\\n- Status: Failed\\n`;\n    return `### ${name}\\n- Duration: ${config.stats.duration.avg}ms (±${config.stats.duration.std}ms)\\n- Memory: ${config.stats.memory.avg}MB\\n- Tests: ${config.stats.tests.passed}/${config.stats.tests.total} passed\\n`;\n  }).join('\\n')}\n`;\n  \n  writeFileSync(\n    `${RESULTS_DIR}/performance-summary.md`,\n    summaryText\n  );\n}\n\n// Handle cleanup on exit\nprocess.on('exit', () => {\n  execSync('pkill -f \"vitest\" || true', { stdio: 'ignore' });\n});\n\nprocess.on('SIGINT', () => {\n  console.log('\\n🛑 Performance testing interrupted');\n  execSync('pkill -f \"vitest\" || true', { stdio: 'ignore' });\n  process.exit(0);\n});\n\n// Run the performance analysis\nmain().catch(error => {\n  console.error('💥 Performance testing failed:', error);\n  execSync('pkill -f \"vitest\" || true', { stdio: 'ignore' });\n  process.exit(1);\n});