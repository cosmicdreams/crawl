/**
 * Nuke Script
 *
 * This script performs a complete cleanup of the crawler environment:
 * 1. Deletes the "results" folder
 * 2. Sets config back to default values
 * 3. Deletes .crawl-cache.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Default configuration
const DEFAULT_CONFIG = {
  "baseUrl": "https://example.com",
  "maxPages": 50,
  "timeout": 30000,
  "screenshotsEnabled": false,
  "ignoreExtensions": [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".css",
    ".js",
    ".zip",
    ".tar",
    ".gz"
  ],
  "ignorePatterns": [
    "\\?",
    "/admin/",
    "/user/",
    "/cart/",
    "/checkout/",
    "/search/"
  ],
  "respectRobotsTxt": true
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
  fs.writeFileSync('config.json', JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('✅ Configuration reset to default values');
}

/**
 * Delete cache file
 */
function deleteCache() {
  const cachePath = path.join(process.cwd(), '.crawl-cache.json');
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log('✅ Cache file deleted');
  } else {
    console.log('ℹ️ No cache file found');
  }
}

/**
 * Main nuke function
 */
function nuke() {
  console.log('🧨 NUKE PROCESS STARTED 🧨');
  console.log('This will delete all results, reset configuration, and clear the cache.');

  rl.question('Are you sure you want to proceed? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
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
    } else {
      console.log('Nuke process cancelled.');
    }

    rl.close();
  });
}

// Run the nuke function if this script is executed directly
if (require.main === module) {
  nuke();
}

// Export the nuke function for use in other scripts
module.exports = { nuke };
