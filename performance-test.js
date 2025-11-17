#!/usr/bin/env node

/**
 * Controlled Performance Test for Site Crawler
 * Tests the optimized browser architecture with detailed logging
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_URL = 'https://pncb.ddev.site';
const TIMEOUT = 300000; // 5 minutes
const LOG_FILE = 'performance.log';

async function runCrawlerTest() {
  console.log(`🚀 Starting performance test at ${new Date().toISOString()}`);
  console.log(`📊 Testing URL: ${TEST_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT/1000}s`);
  
  const startTime = Date.now();
  
  // Clear previous log
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
  
  return new Promise((resolve, reject) => {
    const crawler = spawn('node', ['src/cli/index.js', 'all', '--url', TEST_URL, '--quiet'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    crawler.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
      
      // Log to file
      fs.appendFileSync(LOG_FILE, `[STDOUT ${new Date().toISOString()}] ${output}`);
    });
    
    crawler.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
      
      // Log to file
      fs.appendFileSync(LOG_FILE, `[STDERR ${new Date().toISOString()}] ${output}`);
    });
    
    const timeoutHandle = setTimeout(() => {
      console.log('\n🚨 Test timeout reached, killing process...');
      crawler.kill('SIGTERM');
      
      setTimeout(() => {
        if (!crawler.killed) {
          console.log('🚨 Force killing process...');
          crawler.kill('SIGKILL');
        }
      }, 5000);
      
      reject(new Error('Test timeout'));
    }, TIMEOUT);
    
    crawler.on('close', (code) => {
      clearTimeout(timeoutHandle);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`\n📊 Test completed in ${duration.toFixed(2)}s`);
      console.log(`🔢 Exit code: ${code}`);
      
      // Final log entry
      fs.appendFileSync(LOG_FILE, `\n[RESULT] Duration: ${duration.toFixed(2)}s, Exit code: ${code}\n`);
      
      if (code === 0) {
        resolve({ duration, code, stdout, stderr });
      } else {
        reject(new Error(`Crawler failed with exit code ${code}`));
      }
    });
    
    crawler.on('error', (error) => {
      clearTimeout(timeoutHandle);
      console.error('🚨 Process error:', error);
      reject(error);
    });
  });
}

// Main execution
async function main() {
  try {
    const result = await runCrawlerTest();
    
    console.log('\n✅ Performance Test Results:');
    console.log(`   Duration: ${result.duration.toFixed(2)}s`);
    console.log(`   Exit Code: ${result.code}`);
    console.log(`   Log File: ${LOG_FILE}`);
    
    // Target analysis
    const target = 60; // Target from optimization plan
    const baseline = 108; // Original baseline
    const improvement = baseline - result.duration;
    
    console.log('\n📈 Performance Analysis:');
    console.log(`   Target: <${target}s`);
    console.log(`   Baseline: ${baseline}s`);
    console.log(`   Current: ${result.duration.toFixed(2)}s`);
    console.log(`   vs Baseline: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}s`);
    console.log(`   vs Target: ${result.duration <= target ? '✅ ACHIEVED' : '❌ MISSED'}`);
    
  } catch (error) {
    console.error('\n❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

main();