/**
 * Performance Monitor - Real-time performance tracking and analysis
 * 
 * Provides detailed performance monitoring for concurrency optimization validation
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class PerformanceMonitor {
  constructor(sessionName = 'default') {
    this.sessionName = sessionName;
    this.startTime = null;
    this.phases = new Map();
    this.currentPhase = null;
    this.metrics = {
      concurrency: {},
      browserPools: {},
      memory: {},
      errors: []
    };
  }

  /**
   * Start monitoring session
   */
  startSession() {
    this.startTime = process.hrtime.bigint();
    this.recordMemorySnapshot('session_start');
    console.log(`📊 Performance monitoring started for session: ${this.sessionName}`);
  }

  /**
   * Start monitoring a phase
   */
  startPhase(phaseName, config = {}) {
    const phaseStart = process.hrtime.bigint();
    this.currentPhase = phaseName;
    
    this.phases.set(phaseName, {
      name: phaseName,
      startTime: phaseStart,
      endTime: null,
      duration: null,
      config,
      urls: 0,
      successCount: 0,
      errorCount: 0,
      concurrency: config.concurrency || 'unknown',
      browserCount: config.browserCount || 1
    });

    this.recordMemorySnapshot(`${phaseName}_start`);
    console.log(`⏱️  Phase started: ${phaseName} (concurrency: ${config.concurrency}, browsers: ${config.browserCount})`);
  }

  /**
   * End monitoring a phase
   */
  endPhase(phaseName, results = {}) {
    const phase = this.phases.get(phaseName);
    if (!phase) {
      console.warn(`Warning: Phase ${phaseName} not found for ending`);
      return;
    }

    phase.endTime = process.hrtime.bigint();
    phase.duration = Number(phase.endTime - phase.startTime) / 1e9; // Convert to seconds
    phase.urls = results.urlCount || 0;
    phase.successCount = results.successCount || 0;
    phase.errorCount = results.errorCount || 0;

    this.recordMemorySnapshot(`${phaseName}_end`);
    
    const throughput = phase.urls > 0 ? (phase.urls / phase.duration).toFixed(2) : 'N/A';
    console.log(`✅ Phase completed: ${phaseName} (${phase.duration.toFixed(2)}s, ${throughput} URLs/s)`);
    
    this.currentPhase = null;
  }

  /**
   * Record concurrency metrics
   */
  recordConcurrency(phaseName, actualConcurrency, targetConcurrency) {
    this.metrics.concurrency[phaseName] = {
      actual: actualConcurrency,
      target: targetConcurrency,
      efficiency: (actualConcurrency / targetConcurrency * 100).toFixed(1),
      timestamp: Date.now()
    };
  }

  /**
   * Record browser pool metrics
   */
  recordBrowserPool(phaseName, poolSize, utilization) {
    this.metrics.browserPools[phaseName] = {
      poolSize,
      utilization: utilization.toFixed(1),
      timestamp: Date.now()
    };
  }

  /**
   * Record memory snapshot
   */
  recordMemorySnapshot(label) {
    const memory = process.memoryUsage();
    this.metrics.memory[label] = {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
      external: Math.round(memory.external / 1024 / 1024), // MB
      rss: Math.round(memory.rss / 1024 / 1024), // MB
      timestamp: Date.now()
    };
  }

  /**
   * Record error for analysis
   */
  recordError(phaseName, error, context = {}) {
    this.metrics.errors.push({
      phase: phaseName,
      message: error.message,
      type: error.name || 'Unknown',
      context,
      timestamp: Date.now()
    });
  }

  /**
   * End monitoring session and generate report
   */
  async endSession(outputDir = './performance-analysis') {
    if (!this.startTime) {
      console.warn('Warning: Session was not properly started');
      return null;
    }

    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - this.startTime) / 1e9;
    
    this.recordMemorySnapshot('session_end');

    const report = this.generateReport(totalDuration);
    
    // Save report to file
    try {
      await fs.mkdir(outputDir, { recursive: true });
      const reportPath = path.join(outputDir, `performance-report-${this.sessionName}-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Performance report saved: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save performance report:', error.message);
    }

    // Log summary
    this.logSummary(report);
    
    return report;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(totalDuration) {
    const phases = Array.from(this.phases.values());
    const totalUrls = phases.reduce((sum, phase) => sum + phase.urls, 0);
    const totalErrors = phases.reduce((sum, phase) => sum + phase.errorCount, 0);
    const successRate = totalUrls > 0 ? ((totalUrls - totalErrors) / totalUrls * 100).toFixed(1) : 'N/A';

    return {
      session: {
        name: this.sessionName,
        totalDuration: totalDuration.toFixed(2),
        startTime: this.startTime.toString(),
        timestamp: new Date().toISOString()
      },
      performance: {
        totalUrls,
        totalErrors,
        successRate: `${successRate}%`,
        averageThroughput: totalUrls > 0 ? (totalUrls / totalDuration).toFixed(2) : 'N/A'
      },
      phases: phases.map(phase => ({
        name: phase.name,
        duration: phase.duration?.toFixed(2) || 'incomplete',
        urls: phase.urls,
        successCount: phase.successCount,
        errorCount: phase.errorCount,
        successRate: phase.urls > 0 ? ((phase.successCount / phase.urls) * 100).toFixed(1) : 'N/A',
        throughput: phase.urls > 0 && phase.duration ? (phase.urls / phase.duration).toFixed(2) : 'N/A',
        concurrency: phase.concurrency,
        browserCount: phase.browserCount
      })),
      optimization_metrics: {
        concurrency: this.metrics.concurrency,
        browserPools: this.metrics.browserPools,
        memory: this.calculateMemoryMetrics(),
        errors: this.metrics.errors
      },
      assessment: this.assessPerformance(totalDuration, successRate)
    };
  }

  /**
   * Calculate memory usage metrics
   */
  calculateMemoryMetrics() {
    const snapshots = Object.values(this.metrics.memory);
    if (snapshots.length < 2) return { error: 'Insufficient memory snapshots' };

    const heapValues = snapshots.map(s => s.heapUsed);
    const rssValues = snapshots.map(s => s.rss);

    return {
      heapUsed: {
        min: Math.min(...heapValues),
        max: Math.max(...heapValues),
        avg: Math.round(heapValues.reduce((sum, val) => sum + val, 0) / heapValues.length)
      },
      rss: {
        min: Math.min(...rssValues),
        max: Math.max(...rssValues),
        avg: Math.round(rssValues.reduce((sum, val) => sum + val, 0) / rssValues.length)
      },
      snapshots: Object.keys(this.metrics.memory).length
    };
  }

  /**
   * Assess performance against targets
   */
  assessPerformance(totalDuration, successRate) {
    const targetDuration = { min: 80, max: 90 }; // Phase 2 target
    const targetSuccessRate = 95;
    const baselineDuration = 115.06; // From roadmap

    const durationScore = totalDuration >= targetDuration.min && totalDuration <= targetDuration.max;
    const successRateScore = parseFloat(successRate) >= targetSuccessRate;
    const improvementPercent = ((baselineDuration - totalDuration) / baselineDuration * 100).toFixed(1);

    return {
      targetMet: durationScore && successRateScore,
      duration: {
        actual: totalDuration.toFixed(2),
        target: `${targetDuration.min}-${targetDuration.max}s`,
        meets: durationScore,
        improvement: `${improvementPercent}%`
      },
      reliability: {
        actual: `${successRate}%`,
        target: `${targetSuccessRate}%`,
        meets: successRateScore
      },
      overall: durationScore && successRateScore ? 'PASS' : 'NEEDS_IMPROVEMENT'
    };
  }

  /**
   * Log performance summary to console
   */
  logSummary(report) {
    console.log('\n');
    console.log(chalk.bold.blue('📈 PERFORMANCE SUMMARY'));
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${chalk.bold('Session:')} ${report.session.name}`);
    console.log(`${chalk.bold('Total Duration:')} ${report.session.totalDuration}s`);
    console.log(`${chalk.bold('Success Rate:')} ${report.performance.successRate}`);
    console.log(`${chalk.bold('Throughput:')} ${report.performance.averageThroughput} URLs/s`);
    console.log('');

    // Phase breakdown
    console.log(chalk.bold('Phase Performance:'));
    report.phases.forEach(phase => {
      const duration = phase.duration !== 'incomplete' ? `${phase.duration}s` : 'incomplete';
      console.log(`  ${phase.name}: ${duration} (${phase.throughput} URLs/s, concurrency: ${phase.concurrency})`);
    });
    console.log('');

    // Assessment
    const assessment = report.assessment;
    console.log(chalk.bold('Target Assessment:'));
    console.log(`  Duration: ${assessment.duration.actual}s ${assessment.duration.meets ? chalk.green('✅') : chalk.red('❌')} (target: ${assessment.duration.target})`);
    console.log(`  Reliability: ${assessment.reliability.actual} ${assessment.reliability.meets ? chalk.green('✅') : chalk.red('❌')} (target: ${assessment.reliability.target})`);
    console.log(`  Improvement: ${assessment.duration.improvement} vs baseline`);
    console.log(`  Overall: ${assessment.overall === 'PASS' ? chalk.green('PASS') : chalk.yellow('NEEDS_IMPROVEMENT')}`);

    // Memory summary
    if (report.optimization_metrics.memory.heapUsed) {
      console.log('');
      console.log(chalk.bold('Memory Usage:'));
      console.log(`  Peak: ${report.optimization_metrics.memory.heapUsed.max}MB`);
      console.log(`  Average: ${report.optimization_metrics.memory.heapUsed.avg}MB`);
    }
  }

  /**
   * Static helper to create and manage a monitor for a pipeline run
   */
  static async monitorPipeline(sessionName, pipelineFunction, ...args) {
    const monitor = new PerformanceMonitor(sessionName);
    
    try {
      monitor.startSession();
      const result = await pipelineFunction(monitor, ...args);
      const report = await monitor.endSession();
      
      return {
        pipelineResult: result,
        performanceReport: report
      };
    } catch (error) {
      monitor.recordError('pipeline', error);
      await monitor.endSession();
      throw error;
    }
  }
}