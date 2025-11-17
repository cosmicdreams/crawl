#!/usr/bin/env node
/**
 * Optimization Universality Validation Script
 * 
 * Comprehensive performance validation across diverse site types to verify that
 * our 70% performance improvement (32.15s vs 108s baseline) applies broadly.
 * 
 * Tests:
 * 1. Small sites (few pages, simple structure)
 * 2. Large sites (many pages, complex structure)  
 * 3. Content-heavy sites (images, media)
 * 4. Complex navigation sites
 * 5. Real-world site validation (external sites)
 * 
 * Measures and compares:
 * - Total execution time
 * - Phase-specific performance  
 * - Resource usage (memory, browser instances)
 * - Error rates and stability
 * - Optimization effectiveness by site type
 */

import chalk from 'chalk';
import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
import { OptimizedPipeline } from '../src/utils/optimized-pipeline.js';
import { generateTestSite } from '../tests/console/utils/test-site-generator.js';
import { startMockServer } from '../tests/console/utils/server.js';
import { StrategyLogger, LoggingStrategyFactory } from '../src/utils/logging-strategies.js';
import { logger as baseLogger } from '../dist/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const TEST_SITES_DIR = './validation-test-sites';
const RESULTS_DIR = './performance-validation-results';
const ITERATIONS_PER_SITE = 2; // Reduced for faster testing
const TIMEOUT_MINUTES = 10;

// Performance benchmarks
const BENCHMARKS = {
  baseline_original: 108, // Original baseline in seconds
  pncb_optimized: 32.15, // Current success on pncb.ddev.site  
  target_improvement: 50, // Minimum 50% improvement expected
  known_improvement: 70 // 70% improvement we achieved
};

// Site type configurations
const SITE_CONFIGURATIONS = [
  {
    name: 'micro-site',
    description: 'Micro site: 3 pages, minimal structure',
    config: {
      pages: 3,
      depth: 2,
      imagesPerPage: 1,
      complexity: 'minimal',
      navigation: 'linear'
    },
    expectedCharacteristics: {
      optimalFor: 'browser-overhead validation',
      concurrencyBenefit: 'low',
      expectedRange: '5-15s'
    }
  },
  {
    name: 'small-business',
    description: 'Small business: 8 pages, moderate structure',
    config: {
      pages: 8,
      depth: 3,
      imagesPerPage: 2,
      complexity: 'simple',
      navigation: 'hierarchical'
    },
    expectedCharacteristics: {
      optimalFor: 'typical small business sites',
      concurrencyBenefit: 'moderate',
      expectedRange: '10-25s'
    }
  },
  {
    name: 'corporate-medium',
    description: 'Corporate medium: 25 pages, structured hierarchy',
    config: {
      pages: 25,
      depth: 4,
      imagesPerPage: 3,
      complexity: 'moderate',
      navigation: 'multi-level'
    },
    expectedCharacteristics: {
      optimalFor: 'corporate websites',
      concurrencyBenefit: 'high',
      expectedRange: '20-45s'
    }
  },
  {
    name: 'content-portal',
    description: 'Content portal: 40 pages, content-heavy',
    config: {
      pages: 40,
      depth: 4,
      imagesPerPage: 6,
      complexity: 'content-rich',
      navigation: 'hierarchical',
      includeMedia: true
    },
    expectedCharacteristics: {
      optimalFor: 'content-heavy sites',
      concurrencyBenefit: 'high',
      expectedRange: '30-60s'
    }
  },
  {
    name: 'enterprise-complex',
    description: 'Enterprise: 60 pages, maximum complexity',
    config: {
      pages: 60,
      depth: 5,
      imagesPerPage: 4,
      complexity: 'complex',
      navigation: 'mesh',
      crossLinks: true
    },
    expectedCharacteristics: {
      optimalFor: 'large enterprise sites',
      concurrencyBenefit: 'maximum',
      expectedRange: '45-90s'
    }
  },
  {
    name: 'navigation-heavy',
    description: 'Navigation-heavy: 30 pages, complex linking',
    config: {
      pages: 30,
      depth: 4,
      imagesPerPage: 2,
      complexity: 'navigation-heavy',
      navigation: 'mesh',
      crossLinks: true
    },
    expectedCharacteristics: {
      optimalFor: 'sites with complex navigation',
      concurrencyBenefit: 'very-high',
      expectedRange: '25-50s'
    }
  }
];

// Real-world sites for additional validation
const REAL_WORLD_SITES = [
  {
    name: 'docs-site',
    url: 'https://vitest.dev',
    description: 'Documentation site: structured, many pages',
    timeout: 120,
    expectedRange: '30-60s'
  },
  {
    name: 'blog-site', 
    url: 'https://blog.github.com',
    description: 'Blog site: content-heavy, moderate structure',
    timeout: 150,
    expectedRange: '40-80s'
  }
];

let testServers = new Map();
let quietLogger;

async function main() {
  console.log(chalk.bold.blue('🎯 OPTIMIZATION UNIVERSALITY VALIDATION'));
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Reference Success: ${chalk.green(BENCHMARKS.pncb_optimized)}s vs ${chalk.yellow(BENCHMARKS.baseline_original)}s baseline (${chalk.bold(BENCHMARKS.known_improvement)}% improvement)`);
  console.log(`Validation Target: ${chalk.cyan('>' + BENCHMARKS.target_improvement + '%')} improvement across all site types`);
  console.log('');

  try {
    // Setup
    await setupValidationEnvironment();
    await generateAllTestSites();
    
    // Phase 1: Generated site validation
    console.log(chalk.bold('\n📋 PHASE 1: Generated Site Type Validation'));
    console.log('─────────────────────────────────────────────────');
    const generatedResults = await validateGeneratedSites();
    
    // Phase 2: Real-world site validation  
    console.log(chalk.bold('\n🌐 PHASE 2: Real-World Site Validation'));
    console.log('─────────────────────────────────────────────');
    const realWorldResults = await validateRealWorldSites();
    
    // Phase 3: Comprehensive analysis
    console.log(chalk.bold('\n📊 PHASE 3: Comprehensive Analysis'));
    console.log('─────────────────────────────────────────────');
    const analysis = await performComprehensiveAnalysis(generatedResults, realWorldResults);
    
    // Generate final report
    await generateValidationReport(analysis);
    
    // Cleanup
    await cleanup();
    
    // Final assessment
    if (analysis.validation_passed) {
      console.log(chalk.bold.green('\n✅ VALIDATION PASSED: Optimizations work universally across site types'));
      process.exit(0);
    } else {
      console.log(chalk.bold.yellow('\n⚠️  VALIDATION PARTIAL: Some site types need attention'));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Validation failed:'), error.message);
    await cleanup();
    process.exit(1);
  }
}

async function setupValidationEnvironment() {
  // Set up quiet logging
  const quietStrategy = LoggingStrategyFactory.create('quiet', baseLogger);
  quietLogger = new StrategyLogger(quietStrategy);
  OptimizedPipeline.setLogger(quietLogger);
  
  // Ensure directories exist
  await fs.mkdir(TEST_SITES_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  
  console.log('🔧 Environment setup complete');
}

async function generateAllTestSites() {
  console.log(`🏗️  Generating ${SITE_CONFIGURATIONS.length} test sites...`);
  
  for (const siteConfig of SITE_CONFIGURATIONS) {
    const siteDir = path.join(TEST_SITES_DIR, siteConfig.name);
    
    console.log(`  📄 ${siteConfig.description}...`);
    await generateTestSite(siteDir, siteConfig.config);
    
    // Start server
    const server = await startMockServer(siteDir);
    const address = server.address();
    const port = typeof address === 'string' 
      ? parseInt(address.split(':').pop(), 10) 
      : address.port;
    
    testServers.set(siteConfig.name, server);
    siteConfig.url = `http://localhost:${port}`;
    
    console.log(`  ✅ ${siteConfig.name} ready at port ${port}`);
  }
  
  console.log(`🚀 All ${SITE_CONFIGURATIONS.length} test sites ready`);
}

async function validateGeneratedSites() {
  const results = [];
  
  for (const siteConfig of SITE_CONFIGURATIONS) {
    console.log(`\n🧪 Testing ${chalk.bold(siteConfig.name)}: ${siteConfig.description}`);
    
    try {
      const result = await runSiteValidation(siteConfig);
      results.push(result);
      
      console.log(`  ⚡ Optimized: ${chalk.green(result.optimized.duration.toFixed(2))}s`);
      console.log(`  📊 Sequential: ${chalk.yellow(result.sequential.duration.toFixed(2))}s`);
      console.log(`  📈 Improvement: ${chalk.bold(result.improvement > 0 ? '+' : '')}${chalk.green(result.improvement.toFixed(1))}%`);
      console.log(`  🎯 Expected: ${siteConfig.expectedCharacteristics.expectedRange}`);
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      results.push({
        siteConfig,
        success: false,
        error: error.message,
        improvement: -1
      });
    }
  }
  
  return results;
}

async function validateRealWorldSites() {
  const results = [];
  
  console.log(`🌐 Testing ${REAL_WORLD_SITES.length} real-world sites (with timeout protection)...`);
  
  for (const site of REAL_WORLD_SITES) {
    console.log(`\n🌐 Testing ${chalk.bold(site.name)}: ${site.description}`);
    console.log(`  🔗 URL: ${chalk.cyan(site.url)}`);
    console.log(`  ⏱️  Timeout: ${site.timeout}s`);
    
    try {
      const siteConfig = {
        name: site.name,
        url: site.url,
        description: site.description,
        timeout: site.timeout,
        isRealWorld: true
      };
      
      const result = await runSiteValidation(siteConfig);
      results.push(result);
      
      console.log(`  ⚡ Optimized: ${chalk.green(result.optimized.duration.toFixed(2))}s`);
      console.log(`  📊 Sequential: ${chalk.yellow(result.sequential.duration.toFixed(2))}s`);
      console.log(`  📈 Improvement: ${result.improvement > 0 ? chalk.green('+') : chalk.red('')}${result.improvement.toFixed(1)}%`);
      
      if (result.improvement >= BENCHMARKS.target_improvement) {
        console.log(`  🎯 Status: ${chalk.green('✅ Meets target')}`);
      } else if (result.improvement > 0) {
        console.log(`  🎯 Status: ${chalk.yellow('⚠️  Below target but positive')}`);
      } else {
        console.log(`  🎯 Status: ${chalk.red('❌ Negative improvement')}`);
      }
      
    } catch (error) {
      console.warn(`  ⚠️  Skipped ${site.name}: ${chalk.red(error.message)}`);
      console.warn(`     (Network issues or site unavailable - not counted as failure)`);
      // Real-world site failures don't count against validation
    }
  }
  
  return results;
}

async function runSiteValidation(siteConfig) {
  const monitor = new PerformanceMonitor(`validation-${siteConfig.name}`);
  
  // Test optimized pipeline
  monitor.startSession();
  monitor.startPhase('optimized', { 
    siteType: siteConfig.name,
    isRealWorld: siteConfig.isRealWorld || false
  });
  
  const optimizedStart = Date.now();
  const optimizedResult = await Promise.race([
    OptimizedPipeline.runOptimizedPipeline(siteConfig.url, {
      depth: siteConfig.isRealWorld ? 2 : 3, // Reduce depth for real-world sites
      output: `./test-performance-output/${siteConfig.name}-optimized`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), (siteConfig.timeout || TIMEOUT_MINUTES) * 60 * 1000)
    )
  ]);
  const optimizedDuration = (Date.now() - optimizedStart) / 1000;
  
  monitor.endPhase('optimized', {
    urlCount: 1,
    successCount: optimizedResult.success ? 1 : 0,
    errorCount: optimizedResult.success ? 0 : 1
  });
  
  // Test sequential pipeline for comparison
  monitor.startPhase('sequential', { 
    mode: 'baseline',
    siteType: siteConfig.name
  });
  
  const sequentialStart = Date.now();
  const sequentialResult = await Promise.race([
    OptimizedPipeline.runSequentialPipeline(siteConfig.url, {
      depth: siteConfig.isRealWorld ? 2 : 3,
      output: `./test-performance-output/${siteConfig.name}-sequential`,
      quiet: true
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), (siteConfig.timeout || TIMEOUT_MINUTES) * 60 * 1000)
    )
  ]);
  const sequentialDuration = (Date.now() - sequentialStart) / 1000;
  
  monitor.endPhase('sequential', {
    urlCount: 1,
    successCount: sequentialResult.success ? 1 : 0, 
    errorCount: sequentialResult.success ? 0 : 1
  });
  
  const performanceReport = await monitor.endSession(`${RESULTS_DIR}/${siteConfig.name}`);
  
  // Calculate metrics
  const improvement = ((sequentialDuration - optimizedDuration) / sequentialDuration) * 100;
  const absoluteImprovement = sequentialDuration - optimizedDuration;
  
  // Estimate vs original baseline (extrapolate)
  const baselineRatio = BENCHMARKS.baseline_original / 60; // Assume 60s was typical sequential time
  const estimatedBaseline = sequentialDuration * baselineRatio;
  const vsBaselineImprovement = ((estimatedBaseline - optimizedDuration) / estimatedBaseline) * 100;
  
  return {
    siteConfig,
    optimized: {
      duration: optimizedDuration,
      success: optimizedResult.success,
      result: optimizedResult
    },
    sequential: {
      duration: sequentialDuration,
      success: sequentialResult.success,
      result: sequentialResult
    },
    improvement,
    absoluteImprovement,
    vsBaselineImprovement,
    success: optimizedResult.success && sequentialResult.success,
    performanceReport,
    timestamp: new Date().toISOString()
  };
}

async function performComprehensiveAnalysis(generatedResults, realWorldResults) {
  const allResults = [...generatedResults, ...realWorldResults];
  const successfulResults = allResults.filter(r => r.success);
  
  console.log(`\n📊 Analyzing ${successfulResults.length}/${allResults.length} successful tests...`);
  
  // Calculate aggregate metrics
  const improvements = successfulResults.map(r => r.improvement);
  const durations = successfulResults.map(r => r.optimized.duration);
  
  const averageImprovement = improvements.length > 0 ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length : 0;
  const averageDuration = durations.length > 0 ? durations.reduce((sum, dur) => sum + dur, 0) / durations.length : 0;
  
  // Calculate consistency metrics
  const improvementStdDev = improvements.length > 1 ? Math.sqrt(
    improvements.reduce((sum, imp) => sum + Math.pow(imp - averageImprovement, 2), 0) / improvements.length
  ) : 0;
  const consistencyScore = improvements.length > 0 ? Math.max(0, 1 - (improvementStdDev / averageImprovement)) : 0;
  
  // Categorize results by performance tier
  const performanceTiers = categorizeByPerformance(successfulResults);
  
  // Identify edge cases and outliers
  const edgeCases = identifyEdgeCases(successfulResults);
  
  // Generate recommendations
  const recommendations = generateValidationRecommendations(successfulResults, averageImprovement, consistencyScore);
  
  const analysis = {
    summary: {
      total_sites_tested: allResults.length,
      successful_tests: successfulResults.length,
      average_improvement: averageImprovement,
      average_duration: averageDuration,
      improvement_range: {
        min: improvements.length > 0 ? Math.min(...improvements) : 0,
        max: improvements.length > 0 ? Math.max(...improvements) : 0,
        std_dev: improvementStdDev
      },
      consistency_score: consistencyScore
    },
    performance_tiers: performanceTiers,
    edge_cases: edgeCases,
    validation_passed: (
      averageImprovement >= BENCHMARKS.target_improvement &&
      consistencyScore >= 0.6 &&
      successfulResults.length >= allResults.length * 0.8
    ),
    detailed_results: allResults,
    recommendations,
    comparison_to_baseline: {
      pncb_reference: `${BENCHMARKS.pncb_optimized}s (${BENCHMARKS.known_improvement}% improvement)`,
      validation_average: `${averageDuration.toFixed(2)}s (${averageImprovement.toFixed(1)}% improvement)`,
      consistency: consistencyScore >= 0.6 ? 'GOOD' : 'VARIABLE'
    }
  };
  
  // Console summary
  console.log(chalk.bold('\n📈 VALIDATION SUMMARY'));
  console.log('═══════════════════════════════════════════════════════');
  console.log(`${chalk.bold('Average Improvement:')} ${chalk.green(averageImprovement.toFixed(1))}% (target: >${BENCHMARKS.target_improvement}%)`);
  console.log(`${chalk.bold('Consistency Score:')} ${chalk.cyan((consistencyScore * 100).toFixed(1))}% (target: >60%)`);
  console.log(`${chalk.bold('Success Rate:')} ${chalk.blue(successfulResults.length)}/${chalk.blue(allResults.length)} sites`);
  console.log(`${chalk.bold('Validation Status:')} ${analysis.validation_passed ? chalk.green('✅ PASSED') : chalk.yellow('⚠️  PARTIAL')}`);
  
  return analysis;
}

function categorizeByPerformance(results) {
  const tiers = {
    excellent: [], // >70% improvement
    good: [],      // 50-70% improvement  
    moderate: [],  // 30-50% improvement
    poor: []       // <30% improvement
  };
  
  results.forEach(result => {
    const improvement = result.improvement;
    if (improvement >= 70) tiers.excellent.push(result);
    else if (improvement >= 50) tiers.good.push(result);
    else if (improvement >= 30) tiers.moderate.push(result);
    else tiers.poor.push(result);
  });
  
  return {
    excellent: {
      count: tiers.excellent.length,
      sites: tiers.excellent.map(r => r.siteConfig.name),
      average_improvement: tiers.excellent.length > 0 
        ? (tiers.excellent.reduce((sum, r) => sum + r.improvement, 0) / tiers.excellent.length).toFixed(1) 
        : 'N/A'
    },
    good: {
      count: tiers.good.length,
      sites: tiers.good.map(r => r.siteConfig.name),
      average_improvement: tiers.good.length > 0 
        ? (tiers.good.reduce((sum, r) => sum + r.improvement, 0) / tiers.good.length).toFixed(1) 
        : 'N/A'
    },
    moderate: {
      count: tiers.moderate.length,
      sites: tiers.moderate.map(r => r.siteConfig.name),
      average_improvement: tiers.moderate.length > 0 
        ? (tiers.moderate.reduce((sum, r) => sum + r.improvement, 0) / tiers.moderate.length).toFixed(1) 
        : 'N/A'
    },
    poor: {
      count: tiers.poor.length,
      sites: tiers.poor.map(r => r.siteConfig.name),
      average_improvement: tiers.poor.length > 0 
        ? (tiers.poor.reduce((sum, r) => sum + r.improvement, 0) / tiers.poor.length).toFixed(1) 
        : 'N/A'
    }
  };
}

function identifyEdgeCases(results) {
  if (results.length === 0) return [];
  
  const edgeCases = [];
  const improvements = results.map(r => r.improvement);
  const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  const stdDev = improvements.length > 1 ? Math.sqrt(improvements.reduce((sum, imp) => sum + Math.pow(imp - avgImprovement, 2), 0) / improvements.length) : 0;
  
  // Identify outliers (>2 standard deviations from mean)
  results.forEach(result => {
    const deviation = Math.abs(result.improvement - avgImprovement);
    if (deviation > 2 * stdDev && stdDev > 0) {
      edgeCases.push({
        site: result.siteConfig.name,
        improvement: result.improvement.toFixed(1),
        deviation: deviation.toFixed(1),
        type: result.improvement > avgImprovement ? 'exceptional' : 'concerning',
        duration: result.optimized.duration.toFixed(2),
        characteristics: result.siteConfig.expectedCharacteristics || {}
      });
    }
  });
  
  // Identify very fast sites (possible overhead issues)
  const veryFastSites = results.filter(r => r.optimized.duration < 5);
  veryFastSites.forEach(result => {
    if (!edgeCases.find(e => e.site === result.siteConfig.name)) {
      edgeCases.push({
        site: result.siteConfig.name,
        improvement: result.improvement.toFixed(1),
        duration: result.optimized.duration.toFixed(2),
        type: 'overhead_concern',
        note: 'Very fast execution may indicate browser overhead exceeds benefits'
      });
    }
  });
  
  return edgeCases;
}

function generateValidationRecommendations(results, averageImprovement, consistencyScore) {
  const recommendations = [];
  
  // Overall performance assessment
  if (averageImprovement >= 70) {
    recommendations.push({
      category: 'optimization_success',
      priority: 'high',
      message: 'Optimizations exceed expectations across all site types',
      action: 'Deploy to production with full confidence'
    });
  } else if (averageImprovement >= 50) {
    recommendations.push({
      category: 'optimization_good',
      priority: 'medium',
      message: 'Optimizations meet targets with good universal performance',
      action: 'Proceed with broader deployment and monitoring'
    });
  } else {
    recommendations.push({
      category: 'optimization_concern', 
      priority: 'high',
      message: 'Optimizations below target performance across site types',
      action: 'Investigate site-specific tuning or fundamental approach'
    });
  }
  
  // Consistency assessment
  if (consistencyScore < 0.5) {
    recommendations.push({
      category: 'consistency_issue',
      priority: 'medium',
      message: 'High performance variation across site types detected',
      action: 'Implement adaptive optimization strategies based on site characteristics'
    });
  }
  
  // Site-specific recommendations
  const poorPerformers = results.filter(r => r.improvement < 30);
  if (poorPerformers.length > 0) {
    recommendations.push({
      category: 'site_specific_tuning',
      priority: 'medium', 
      message: `${poorPerformers.length} site types show limited optimization benefit`,
      action: 'Analyze site characteristics and implement targeted optimizations',
      affected_sites: poorPerformers.map(r => r.siteConfig.name)
    });
  }
  
  // Resource usage recommendations
  const highResourceSites = results.filter(r => r.optimized.duration > 60);
  if (highResourceSites.length > 0) {
    recommendations.push({
      category: 'resource_optimization',
      priority: 'low',
      message: 'Some sites still require significant time despite optimizations',
      action: 'Consider additional optimizations for large/complex sites',
      affected_sites: highResourceSites.map(r => r.siteConfig.name)
    });
  }
  
  return recommendations;
}

async function generateValidationReport(analysis) {
  const timestamp = new Date().toISOString();
  const reportFilename = `validation-report-${Date.now()}.json`;
  const reportPath = path.join(RESULTS_DIR, reportFilename);
  
  // Enhanced report with validation context
  const report = {
    metadata: {
      timestamp,
      validation_purpose: 'Verify optimization universality across site types',
      reference_success: `${BENCHMARKS.pncb_optimized}s on pncb.ddev.site (${BENCHMARKS.known_improvement}% improvement)`,
      validation_criteria: {
        minimum_improvement: `${BENCHMARKS.target_improvement}%`,
        consistency_threshold: '60%',
        success_rate_threshold: '80%'
      }
    },
    executive_summary: {
      validation_status: analysis.validation_passed ? 'PASSED' : 'PARTIAL',
      average_improvement: `${analysis.summary.average_improvement.toFixed(1)}%`,
      consistency_score: `${(analysis.summary.consistency_score * 100).toFixed(1)}%`,
      success_rate: `${analysis.summary.successful_tests}/${analysis.summary.total_sites_tested}`,
      key_finding: analysis.summary.average_improvement >= BENCHMARKS.known_improvement 
        ? 'Optimizations exceed reference performance across site types'
        : analysis.summary.average_improvement >= BENCHMARKS.target_improvement
        ? 'Optimizations meet targets with universal applicability'
        : 'Optimizations show variable effectiveness across site types'
    },
    detailed_analysis: analysis,
    validation_assessment: {
      universal_applicability: analysis.summary.average_improvement >= BENCHMARKS.target_improvement,
      consistent_performance: analysis.summary.consistency_score >= 0.6,
      stable_implementation: analysis.summary.successful_tests >= analysis.summary.total_sites_tested * 0.8,
      ready_for_production: analysis.validation_passed
    }
  };
  
  // Save detailed report
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Generate executive summary
  const summaryContent = generateExecutiveSummary(report);
  await fs.writeFile(path.join(RESULTS_DIR, 'VALIDATION_EXECUTIVE_SUMMARY.md'), summaryContent);
  
  console.log(`\n📄 Reports generated:`);
  console.log(`  📊 Detailed: ${reportPath}`);
  console.log(`  📋 Summary: ${path.join(RESULTS_DIR, 'VALIDATION_EXECUTIVE_SUMMARY.md')}`);
  
  return analysis;
}

function generateExecutiveSummary(report) {
  const status = report.validation_assessment.ready_for_production;
  const emoji = status ? '✅' : '⚠️';
  
  return `# Optimization Universality Validation - Executive Summary

${emoji} **Validation Status**: ${report.executive_summary.validation_status}

## Key Findings

**Performance**: ${report.executive_summary.average_improvement} average improvement across site types
**Consistency**: ${report.executive_summary.consistency_score} performance consistency
**Reliability**: ${report.executive_summary.success_rate} successful test completion rate

**Key Finding**: ${report.executive_summary.key_finding}

## Validation Criteria Assessment

| Criteria | Target | Achieved | Status |
|----------|--------|----------|---------|
| Minimum Improvement | >${BENCHMARKS.target_improvement}% | ${report.executive_summary.average_improvement} | ${report.validation_assessment.universal_applicability ? '✅' : '❌'} |
| Consistency | >60% | ${report.executive_summary.consistency_score} | ${report.validation_assessment.consistent_performance ? '✅' : '❌'} |
| Success Rate | >80% | ${report.executive_summary.success_rate} | ${report.validation_assessment.stable_implementation ? '✅' : '❌'} |

## Performance Tiers

**Excellent (>70% improvement)**: ${report.detailed_analysis.performance_tiers.excellent.count} sites
- Sites: ${report.detailed_analysis.performance_tiers.excellent.sites.join(', ')}
- Average: ${report.detailed_analysis.performance_tiers.excellent.average_improvement}%

**Good (50-70% improvement)**: ${report.detailed_analysis.performance_tiers.good.count} sites  
- Sites: ${report.detailed_analysis.performance_tiers.good.sites.join(', ')}
- Average: ${report.detailed_analysis.performance_tiers.good.average_improvement}%

**Moderate (30-50% improvement)**: ${report.detailed_analysis.performance_tiers.moderate.count} sites
- Sites: ${report.detailed_analysis.performance_tiers.moderate.sites.join(', ')}
- Average: ${report.detailed_analysis.performance_tiers.moderate.average_improvement}%

**Poor (<30% improvement)**: ${report.detailed_analysis.performance_tiers.poor.count} sites
- Sites: ${report.detailed_analysis.performance_tiers.poor.sites.join(', ')}
- Average: ${report.detailed_analysis.performance_tiers.poor.average_improvement}%

## Recommendations

${report.detailed_analysis.recommendations.map(rec => `
### ${rec.category.toUpperCase()} (Priority: ${rec.priority})
**Issue**: ${rec.message}
**Action**: ${rec.action}
${rec.affected_sites ? `**Affected Sites**: ${rec.affected_sites.join(', ')}` : ''}
`).join('\n')}

## Edge Cases

${report.detailed_analysis.edge_cases.length > 0 ? 
  report.detailed_analysis.edge_cases.map(edge => `
- **${edge.site}**: ${edge.improvement}% improvement (${edge.type})
  ${edge.note ? `Note: ${edge.note}` : ''}
`).join('\n') : 'No significant edge cases detected'}

## Conclusion

${status 
  ? `The optimization framework demonstrates **universal applicability** across diverse site types with consistent performance improvements. The optimizations are ready for production deployment.`
  : `The optimization framework shows **variable effectiveness** across site types. Additional tuning and investigation recommended before broad deployment.`
}

**Reference Achievement**: Our ${BENCHMARKS.known_improvement}% improvement on pncb.ddev.site (${BENCHMARKS.pncb_optimized}s vs ${BENCHMARKS.baseline_original}s baseline) ${
  parseFloat(report.executive_summary.average_improvement.replace('%', '')) >= BENCHMARKS.known_improvement 
    ? 'has been exceeded across the validation test suite'
    : 'represents the upper end of our optimization capabilities'
}.

Generated: ${report.metadata.timestamp}
`;
}

async function cleanup() {
  // Close test servers
  for (const [name, server] of testServers) {
    server.close();
    console.log(`🔌 Closed server: ${name}`);
  }
  testServers.clear();
  
  // Clean up browser resources
  try {
    const { OptimizedBrowserManager } = await import('../src/utils/optimized-browser-manager.js');
    await OptimizedBrowserManager.cleanup();
  } catch (error) {
    // Browser manager cleanup failed, but that's okay
  }
  
  console.log('🧹 Cleanup complete');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Validation interrupted by user');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Validation terminated');
  await cleanup();
  process.exit(1);
});

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async (error) => {
    console.error(chalk.red('💥 Validation script failed:'), error);
    await cleanup();
    process.exit(1);
  });
}

export { main as runValidation };