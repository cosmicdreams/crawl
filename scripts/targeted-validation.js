#!/usr/bin/env node
/**
 * Targeted Validation Test
 * 
 * Tests optimization effectiveness on sites similar in scale to our successful
 * pncb.ddev.site example (32.15s vs 108s baseline = 70% improvement).
 * 
 * Focuses on the "sweet spot" for our optimizations:
 * - Medium to large sites (20-100 pages)
 * - Real-world complexity
 * - Sites that benefit from concurrency
 */

import chalk from 'chalk';
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
import { OptimizedPipeline } from '../src/utils/optimized-pipeline.js';
import { StrategyLogger, LoggingStrategyFactory } from '../src/utils/logging-strategies.js';
import { logger as baseLogger } from '../dist/utils/logger.js';
import fs from 'fs/promises';

// Test sites in the "sweet spot" range
const TARGET_SITES = [
  {
    name: 'vuejs-docs',
    url: 'https://vuejs.org',
    description: 'Vue.js documentation - structured, large',
    expectedPages: '30-60',
    timeout: 180,
    expectedImprovement: 50
  },
  {
    name: 'react-docs', 
    url: 'https://react.dev',
    description: 'React documentation - complex, many pages',
    expectedPages: '40-80',
    timeout: 240,
    expectedImprovement: 60
  },
  {
    name: 'tailwind-docs',
    url: 'https://tailwindcss.com',
    description: 'Tailwind CSS docs - content-heavy, structured',
    expectedPages: '50-100',
    timeout: 300,
    expectedImprovement: 65
  }
];

const BENCHMARKS = {
  baseline_original: 108,
  pncb_success: 32.15,
  target_improvement: 50,
  known_improvement: 70
};

async function main() {
  console.log(chalk.bold.blue('🎯 TARGETED OPTIMIZATION VALIDATION'));
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing sites in the optimal scale range for our optimizations');
  console.log(`Reference: ${chalk.green(BENCHMARKS.pncb_success)}s vs ${chalk.yellow(BENCHMARKS.baseline_original)}s baseline (${chalk.bold(BENCHMARKS.known_improvement)}% improvement)`);
  console.log(`Testing sites expected to show ${chalk.cyan('50-70%')} improvement\n`);

  // Setup quiet logging
  const quietStrategy = LoggingStrategyFactory.create('quiet', baseLogger);
  const quietLogger = new StrategyLogger(quietStrategy);
  OptimizedPipeline.setLogger(quietLogger);

  const results = [];
  
  try {
    for (const site of TARGET_SITES) {
      console.log(`\n🌐 ${chalk.bold(site.name)}: ${site.description}`);
      console.log(`📍 URL: ${chalk.cyan(site.url)}`);
      console.log(`📄 Expected: ${site.expectedPages} pages`);
      console.log(`🎯 Target: ${site.expectedImprovement}% improvement`);
      
      try {
        const result = await testTargetSite(site);
        results.push(result);
        
        // Display results
        console.log(`  ⚡ Optimized: ${chalk.green(result.optimized_duration.toFixed(2))}s`);
        console.log(`  📊 Sequential: ${chalk.yellow(result.sequential_duration.toFixed(2))}s`);
        console.log(`  📈 Improvement: ${result.improvement > 0 ? chalk.green('+') : chalk.red('')}${result.improvement.toFixed(1)}%`);
        
        // Performance assessment
        if (result.improvement >= site.expectedImprovement) {
          console.log(`  🎯 ${chalk.green('✅ EXCEEDS TARGET')} (${site.expectedImprovement}%)`);
        } else if (result.improvement >= BENCHMARKS.target_improvement) {
          console.log(`  🎯 ${chalk.yellow('⚡ MEETS MINIMUM')} (50%)`);
        } else if (result.improvement > 0) {
          console.log(`  🎯 ${chalk.yellow('⚠️  BELOW TARGET')} but positive`);
        } else {
          console.log(`  🎯 ${chalk.red('❌ NEGATIVE')} improvement`);
        }
        
        // Compare to reference success
        const vsReference = Math.abs(result.improvement - BENCHMARKS.known_improvement);
        if (vsReference <= 10) {
          console.log(`  📊 ${chalk.green('Consistent')} with reference performance (±10%)`);
        } else {
          console.log(`  📊 ${chalk.yellow('Different')} from reference: ${vsReference.toFixed(1)}% variance`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${chalk.red('FAILED')}: ${error.message}`);
        results.push({
          site_name: site.name,
          success: false,
          error: error.message,
          improvement: -1
        });
      }
    }
    
    // Analysis
    await generateTargetedAnalysis(results);
    
  } catch (error) {
    console.error(chalk.red('\n💥 Targeted validation failed:'), error.message);
    process.exit(1);
  }
}

async function testTargetSite(site) {
  const monitor = new PerformanceMonitor(`targeted-${site.name}`);
  
  // Test optimized pipeline
  monitor.startSession();
  monitor.startPhase('optimized', { 
    siteType: site.name,
    expectedPages: site.expectedPages
  });
  
  const optimizedStart = Date.now();
  const optimizedResult = await Promise.race([
    OptimizedPipeline.runOptimizedPipeline(site.url, {
      depth: 2, // Reasonable depth for real-world testing
      output: `./targeted-validation-output/${site.name}-optimized`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Optimized timeout')), site.timeout * 1000)
    )
  ]);
  const optimizedDuration = (Date.now() - optimizedStart) / 1000;
  
  monitor.endPhase('optimized', {
    urlCount: 1,
    successCount: optimizedResult.success ? 1 : 0,
    errorCount: optimizedResult.success ? 0 : 1
  });
  
  console.log(`    ⚡ Optimized completed: ${optimizedDuration.toFixed(2)}s`);
  
  // Test sequential pipeline
  monitor.startPhase('sequential', { 
    mode: 'baseline',
    siteType: site.name
  });
  
  const sequentialStart = Date.now();
  const sequentialResult = await Promise.race([
    OptimizedPipeline.runSequentialPipeline(site.url, {
      depth: 2,
      output: `./targeted-validation-output/${site.name}-sequential`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sequential timeout')), site.timeout * 1000)
    )
  ]);
  const sequentialDuration = (Date.now() - sequentialStart) / 1000;
  
  monitor.endPhase('sequential', {
    urlCount: 1,
    successCount: sequentialResult.success ? 1 : 0,
    errorCount: sequentialResult.success ? 0 : 1
  });
  
  console.log(`    📊 Sequential completed: ${sequentialDuration.toFixed(2)}s`);
  
  await monitor.endSession('./targeted-validation-results');
  
  // Calculate improvement
  const improvement = ((sequentialDuration - optimizedDuration) / sequentialDuration) * 100;
  const absoluteImprovement = sequentialDuration - optimizedDuration;
  
  return {
    site_name: site.name,
    site_description: site.description,
    optimized_duration: optimizedDuration,
    sequential_duration: sequentialDuration,
    improvement,
    absolute_improvement: absoluteImprovement,
    success: optimizedResult.success && sequentialResult.success,
    meets_target: improvement >= site.expectedImprovement,
    meets_minimum: improvement >= BENCHMARKS.target_improvement,
    vs_reference_variance: Math.abs(improvement - BENCHMARKS.known_improvement)
  };
}

async function generateTargetedAnalysis(results) {
  const successfulResults = results.filter(r => r.success);
  
  console.log(chalk.bold('\n📊 TARGETED VALIDATION ANALYSIS'));
  console.log('═══════════════════════════════════════════════════════');
  
  if (successfulResults.length === 0) {
    console.log(chalk.red('❌ No successful tests - validation failed'));
    return;
  }
  
  const averageImprovement = successfulResults.reduce((sum, r) => sum + r.improvement, 0) / successfulResults.length;
  const meetsTargetCount = successfulResults.filter(r => r.meets_target).length;
  const meetsMinimumCount = successfulResults.filter(r => r.meets_minimum).length;
  
  console.log(`${chalk.bold('Tests Completed:')} ${successfulResults.length}/${results.length}`);
  console.log(`${chalk.bold('Average Improvement:')} ${chalk.green(averageImprovement.toFixed(1))}%`);
  console.log(`${chalk.bold('Meet Site Targets:')} ${meetsTargetCount}/${successfulResults.length}`);
  console.log(`${chalk.bold('Meet Minimum (50%):')} ${meetsMinimumCount}/${successfulResults.length}`);
  
  // Consistency with reference
  const referenceVariances = successfulResults.map(r => r.vs_reference_variance);
  const avgVariance = referenceVariances.reduce((sum, v) => sum + v, 0) / referenceVariances.length;
  console.log(`${chalk.bold('Reference Consistency:')} ±${avgVariance.toFixed(1)}% variance from 70% baseline`);
  
  // Individual results
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    if (result.success) {
      const status = result.meets_target ? '🎯' : result.meets_minimum ? '⚡' : '⚠️';
      console.log(`  ${status} ${result.site_name}: ${result.improvement.toFixed(1)}% improvement (${result.optimized_duration.toFixed(2)}s vs ${result.sequential_duration.toFixed(2)}s)`);
    } else {
      console.log(`  ❌ ${result.site_name}: FAILED - ${result.error}`);
    }
  });
  
  // Final assessment
  const validationPassed = (
    averageImprovement >= BENCHMARKS.target_improvement &&
    meetsMinimumCount >= successfulResults.length * 0.8 &&
    successfulResults.length >= results.length * 0.8
  );
  
  console.log(chalk.bold('\n🎯 TARGETED VALIDATION CONCLUSION'));
  console.log('═══════════════════════════════════════════════════════');
  
  if (validationPassed) {
    console.log(chalk.bold.green('✅ VALIDATION PASSED'));
    console.log('🚀 Optimizations work effectively on appropriately-sized sites');
    console.log('📊 Performance matches reference success on large/complex sites');
    console.log('💚 Ready for production deployment with adaptive strategy');
  } else if (averageImprovement > 0) {
    console.log(chalk.bold.yellow('⚠️  VALIDATION PARTIAL'));
    console.log('📊 Some improvement detected but below targets or inconsistent');
    console.log('🔍 May need site-specific tuning or adaptive optimization');
  } else {
    console.log(chalk.bold.red('❌ VALIDATION FAILED'));
    console.log('🚨 Optimizations not providing expected benefits on target sites');
    console.log('🔧 Investigate fundamental optimization issues');
  }
  
  // Save results
  await saveTargetedResults(results, averageImprovement, validationPassed);
  
  console.log(`\n📄 Results saved to: ./targeted-validation-results/`);
  
  return validationPassed;
}

async function saveTargetedResults(results, averageImprovement, validationPassed) {
  const resultsDir = './targeted-validation-results';
  await fs.mkdir(resultsDir, { recursive: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    validation_type: 'targeted',
    purpose: 'Test optimization effectiveness on appropriately-sized sites',
    reference_performance: {
      pncb_site: `${BENCHMARKS.pncb_success}s (${BENCHMARKS.known_improvement}% improvement)`,
      baseline: `${BENCHMARKS.baseline_original}s (original)`
    },
    summary: {
      tests_run: results.length,
      successful_tests: results.filter(r => r.success).length,
      average_improvement: `${averageImprovement.toFixed(1)}%`,
      validation_passed: validationPassed,
      meets_reference_consistency: Math.abs(averageImprovement - BENCHMARKS.known_improvement) <= 15
    },
    detailed_results: results,
    assessment: {
      optimization_effectiveness: averageImprovement >= BENCHMARKS.target_improvement ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      consistency_with_reference: Math.abs(averageImprovement - BENCHMARKS.known_improvement) <= 15 ? 'CONSISTENT' : 'VARIABLE',
      ready_for_production: validationPassed
    },
    recommendations: generateTargetedRecommendations(results, averageImprovement, validationPassed)
  };
  
  await fs.writeFile(`${resultsDir}/targeted-validation-${Date.now()}.json`, JSON.stringify(report, null, 2));
  
  // Generate summary markdown
  const summaryContent = `# Targeted Validation Results

## Summary
- **Average Improvement**: ${report.summary.average_improvement}
- **Validation Status**: ${validationPassed ? '✅ PASSED' : '❌ FAILED'}
- **Tests Successful**: ${report.summary.successful_tests}/${report.summary.tests_run}
- **Reference Consistency**: ${report.assessment.consistency_with_reference}

## Individual Results
${results.map(result => {
  if (result.success) {
    return `- **${result.site_name}**: ${result.improvement.toFixed(1)}% improvement (${result.optimized_duration.toFixed(2)}s vs ${result.sequential_duration.toFixed(2)}s)`;
  } else {
    return `- **${result.site_name}**: FAILED - ${result.error}`;
  }
}).join('\n')}

## Assessment
${report.recommendations.map(rec => `- **${rec.category}**: ${rec.message}`).join('\n')}

Generated: ${report.timestamp}
`;
  
  await fs.writeFile(`${resultsDir}/targeted-summary.md`, summaryContent);
}

function generateTargetedRecommendations(results, averageImprovement, validationPassed) {
  const recommendations = [];
  
  if (validationPassed) {
    recommendations.push({
      category: 'Success',
      message: 'Optimizations work effectively on target-scale sites'
    });
  } else if (averageImprovement >= 30) {
    recommendations.push({
      category: 'Partial Success',
      message: 'Optimizations show benefit but below expected performance'
    });
  } else {
    recommendations.push({
      category: 'Investigation Needed',
      message: 'Optimizations not effective on target sites'
    });
  }
  
  // Network/timeout issues
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    recommendations.push({
      category: 'Network Issues',
      message: `${failedTests.length} tests failed - may be network/timeout related`
    });
  }
  
  return recommendations;
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Targeted validation interrupted');
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(validationPassed => {
      process.exit(validationPassed ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('💥 Targeted validation failed:'), error);
      process.exit(1);
    });
}

export { main as runTargetedValidation };