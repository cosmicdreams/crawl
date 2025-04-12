/**
 * Nuke Script
 *
 * This script performs a complete cleanup of the crawler environment:
 * 1. Deletes the "results" folder
 * 2. Sets config back to default values
 * 3. Deletes .crawl-cache.json
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Default configuration
const DEFAULT_CONFIG = {
  'baseUrl': null, // Force user to provide a valid URL
  'outputDir': './results',
  'maxPages': 20,
  'timeout': 30000,
  'screenshotsEnabled': true,
  'ignoreExtensions': [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.css',
    '.js',
    '.zip',
    '.tar',
    '.gz'
  ],
  'ignorePatterns': [
    '\\?',
    '/admin/',
    '/user/',
    '/cart/',
    '/checkout/',
    '/search/'
  ],
  'respectRobotsTxt': true,
  'telemetry': {
    'enabled': true,
    'outputDir': './results/telemetry',
    'logToConsole': true,
    'writeToFile': true,
    'minDuration': 5,
    'includeTimestamps': true,
    'includeMemoryUsage': true
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Delete a directory recursively
 * @param {string} dirPath - Path to directory
 */
function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);

      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteDirectory(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });

    // Remove the directory
    fs.rmdirSync(dirPath);
  }
}

/**
 * Reset config.json to default values
 */
function resetConfig() {
  // Path to the config folder and files
  const configFolder = path.join(process.cwd(), 'config');
  const configFile = path.join(configFolder, 'config.json');
  const pathsFile = path.join(configFolder, 'paths.json');

  // Create the config folder if it doesn't exist
  if (!fs.existsSync(configFolder)) {
    fs.mkdirSync(configFolder, { recursive: true });
    console.log('✅ Created config folder');
  }

  // Write the default config
  fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('✅ Configuration reset to default values');

  // Delete paths.json if it exists
  if (fs.existsSync(pathsFile)) {
    fs.unlinkSync(pathsFile);
    console.log('✅ Deleted paths.json');
  }
}

/**
 * Delete cache files
 */
function deleteCache() {
  const cacheFiles = [
    '.crawl-cache.json',
    '.extractor-cache.json',
    '.token-cache.json'
  ];

  let deletedCount = 0;

  cacheFiles.forEach(cacheFile => {
    const cachePath = path.join(process.cwd(), cacheFile);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      console.log(`✅ Cache file deleted: ${cacheFile}`);
      deletedCount++;
    }
  });

  if (deletedCount === 0) {
    console.log('ℹ️ No cache files found');
  } else {
    console.log(`✅ ${deletedCount} cache files deleted`);
  }
}

/**
 * Perform the actual nuke operation
 */
function performNuke() {
  console.log('\nExecuting nuke process...');

  // 1. Delete results folder
  const resultsPath = path.join(process.cwd(), 'results');
  try {
    deleteDirectory(resultsPath);
    console.log('✅ Results folder deleted');
  } catch (error) {
    console.error(`❌ Error deleting results folder: ${error.message}`);
  }

  // 2. Reset config
  try {
    resetConfig();
  } catch (error) {
    console.error(`❌ Error resetting configuration: ${error.message}`);
  }

  // 3. Delete cache
  try {
    deleteCache();
  } catch (error) {
    console.error(`❌ Error deleting cache: ${error.message}`);
  }

  console.log('\n🧹 Nuke process completed successfully!');
  console.log('The crawler environment has been reset to its default state.');
  console.log('You can now start fresh with a new crawl.');
}

/**
 * Main nuke function
 * @param {boolean} [force] - Whether to force nuke without confirmation
 */
function nuke(force = false) {
  console.log('🧨 NUKE PROCESS STARTED 🧨');
  console.log('This will delete all results, reset configuration, and clear the cache.');

  if (force) {
    performNuke();
    return;
  }

  rl.question('Are you sure you want to proceed? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      performNuke();
    } else {
      console.log('Nuke process cancelled.');
    }

    rl.close();
  });
}

// Run the nuke function if this script is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  nuke();
}

// Export default as an object containing all functions
export default {
  nuke,
  deleteDirectory,
  resetConfig,
  deleteCache,
  performNuke
};

// Export functions for direct import
export { nuke, deleteDirectory, resetConfig, deleteCache, performNuke };
