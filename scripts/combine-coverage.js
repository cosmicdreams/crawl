#!/usr/bin/env node

/**
 * Combine Coverage Reports
 * 
 * This script combines coverage reports from unit, integration, and e2e tests
 * into a single report. It uses the istanbul-merge tool to merge the coverage
 * data and then generates a combined report.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Coverage directories
const coverageDir = path.join(rootDir, 'coverage');
const unitDir = path.join(coverageDir, 'unit');
const integrationDir = path.join(coverageDir, 'integration');
const e2eDir = path.join(coverageDir, 'e2e');
const combinedDir = path.join(coverageDir, 'combined');

// Create combined directory if it doesn't exist
if (!fs.existsSync(combinedDir)) {
  fs.mkdirSync(combinedDir, { recursive: true });
}

// Check if coverage files exist
const unitCoverage = path.join(unitDir, 'coverage-final.json');
const integrationCoverage = path.join(integrationDir, 'coverage-final.json');
const e2eCoverage = path.join(e2eDir, 'coverage-final.json');
const combinedCoverage = path.join(combinedDir, 'coverage-final.json');

// Array to store coverage files that exist
const coverageFiles = [];

if (fs.existsSync(unitCoverage)) {
  coverageFiles.push(unitCoverage);
  console.log('✓ Found unit test coverage');
} else {
  console.log('✗ No unit test coverage found');
}

if (fs.existsSync(integrationCoverage)) {
  coverageFiles.push(integrationCoverage);
  console.log('✓ Found integration test coverage');
} else {
  console.log('✗ No integration test coverage found');
}

if (fs.existsSync(e2eCoverage)) {
  coverageFiles.push(e2eCoverage);
  console.log('✓ Found e2e test coverage');
} else {
  console.log('✗ No e2e test coverage found');
}

if (coverageFiles.length === 0) {
  console.error('No coverage files found. Run the coverage tests first.');
  process.exit(1);
}

// Merge coverage files
console.log('\nMerging coverage reports...');

// Create a temporary JSON file with the list of coverage files
const tempFile = path.join(coverageDir, 'coverage-files.json');
fs.writeFileSync(tempFile, JSON.stringify(coverageFiles));

try {
  // Use c8 to merge coverage reports
  execSync(`npx c8 report --reporter=json --reporter=html --reporter=text --report-dir=${combinedDir}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      C8_COVERAGE: tempFile
    }
  });
  
  console.log(`\n✓ Combined coverage report generated at ${combinedDir}`);
} catch (error) {
  console.error('Error merging coverage reports:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
