import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Cache manager for the crawl process
 * Handles caching, change detection, and interactive user prompts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache file path
const CACHE_FILE = path.join(__dirname, '../../.crawl-cache.json');

/**
 * Calculate hash of a file
 * @param {string} filePath - Path to the file
 * @returns {string} - Hash of the file content
 */
function calculateFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(fileContent).digest('hex');
}

/**
 * Get file stats
 * @param {string} filePath - Path to the file
 * @returns {object | null} - File stats or null if file doesn't exist
 */
function getFileStats(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    mtime: stats.mtime.toISOString(),
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Get cache data
 * @returns {object} - Cache data
 */
function getCacheData() {
  if (!fs.existsSync(CACHE_FILE)) {
    return {
      lastRun: null,
      targetUrl: null,
      maxPages: null,
      inputHashes: {},
      outputTimestamps: {},
      fileStats: {},
    };
  }

  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (error) {
    console.warn(`Error reading cache file: ${error.message}`);
    return {
      lastRun: null,
      targetUrl: null,
      maxPages: null,
      inputHashes: {},
      outputTimestamps: {},
      fileStats: {},
    };
  }
}

/**
 * Save cache data
 * @param {object} cacheData - Cache data to save
 */
function saveCacheData(cacheData) {
  // Ensure directory exists
  const cacheDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
}

/**
 * Update cache after a step completes
 * @param {string} step - Step name
 * @param {object} config - Configuration
 */
function updateCacheForStep(step, config) {
  const cache = getCacheData();

  // Update general info
  cache.lastRun = new Date().toISOString();
  cache.targetUrl = config.baseUrl;
  cache.maxPages = config.maxPages;

  // Update output timestamp for this step
  cache.outputTimestamps[step] = new Date().toISOString();

  // Update file stats based on the step
  if (step === 'crawl') {
    const pathsFile = path.join(process.cwd(), 'config/paths.json');
    const crawlResultsFile = path.join(process.cwd(), 'results/raw/crawl-results.json');
    console.log('Updating cache for paths file at:', pathsFile);

    cache.inputHashes['paths.json'] = calculateFileHash(pathsFile);
    cache.fileStats['paths.json'] = getFileStats(pathsFile);
    cache.fileStats['crawl-results.json'] = getFileStats(crawlResultsFile);

    // If paths.json exists, analyze it
    if (fs.existsSync(pathsFile)) {
      try {
        const pathsData = JSON.parse(fs.readFileSync(pathsFile, 'utf8'));
        if (pathsData.paths && Array.isArray(pathsData.paths)) {
          cache.fileStats['paths.json'].pathCount = pathsData.paths.length;

          // Group paths by their first segment
          const segments = {};
          pathsData.paths.forEach(p => {
            const firstSegment = p === '/' ? '/' : p.split('/').filter(s => s)[0] || 'other';
            segments[firstSegment] = (segments[firstSegment] || 0) + 1;
          });

          cache.fileStats['paths.json'].segments = segments;
        }
      } catch (e) {
        console.warn(`Error analyzing paths.json: ${e.message}`);
      }
    }
  } else if (['typography', 'colors', 'spacing', 'borders', 'animations'].includes(step)) {
    const analysisFile = path.join(__dirname, `../../results/raw/${step}-analysis.json`);
    cache.fileStats[`${step}-analysis.json`] = getFileStats(analysisFile);
    cache.inputHashes[`${step}-analysis.json`] = calculateFileHash(analysisFile);
  } else if (step === 'tokens') {
    const tokensFile = path.join(__dirname, '../../results/tokens/tokens.json');
    cache.fileStats['tokens.json'] = getFileStats(tokensFile);
    cache.inputHashes['tokens.json'] = calculateFileHash(tokensFile);
  } else if (step === 'reports') {
    const reportFile = path.join(__dirname, '../../results/reports/design-system-report.html');
    cache.fileStats['design-system-report.html'] = getFileStats(reportFile);
    cache.inputHashes['design-system-report.html'] = calculateFileHash(reportFile);
  }

  saveCacheData(cache);
}

/**
 * Check if a step needs to be run
 * @param {string} step - Step name
 * @param {object} config - Configuration
 * @returns {object} - Object with needsRun and reason properties
 */
function checkIfStepNeedsRun(step, config) {
  const cache = getCacheData();

  // If cache is empty or target URL changed, run everything
  if (!cache.lastRun || cache.targetUrl !== config.baseUrl) {
    return {
      needsRun: true,
      reason: !cache.lastRun ? 'First run' : 'Target URL changed',
    };
  }

  // Check based on step
  if (step === 'crawl') {
    // Use the DEFAULT_PATHS_PATH constant from config-manager.js
    const pathsFile = path.join(process.cwd(), 'config/paths.json');
    console.log('Checking for paths file at:', pathsFile);

    // If paths.json doesn't exist, need to run
    if (!fs.existsSync(pathsFile)) {
      console.log('Paths file not found at:', pathsFile);
      return {
        needsRun: true,
        reason: 'paths.json does not exist',
      };
    }
    console.log('Paths file found at:', pathsFile);

    // If paths.json hash changed, need to run
    const currentHash = calculateFileHash(pathsFile);
    if (currentHash !== cache.inputHashes['paths.json']) {
      // Analyze what changed
      let changeDetails = 'paths.json has been modified';

      try {
        const currentPaths = JSON.parse(fs.readFileSync(pathsFile, 'utf8'));
        if (currentPaths.paths && Array.isArray(currentPaths.paths)) {
          const currentCount = currentPaths.paths.length;
          const previousCount = cache.fileStats['paths.json']?.pathCount || 0;

          if (currentCount > previousCount) {
            changeDetails = `paths.json has been modified (${currentCount - previousCount} paths added)`;
          } else if (currentCount < previousCount) {
            changeDetails = `paths.json has been modified (${previousCount - currentCount} paths removed)`;
          } else {
            changeDetails = 'paths.json has been modified (same number of paths but content changed)';
          }
        }
      } catch (e) {
        // If we can't analyze, just use the generic message
      }

      return {
        needsRun: true,
        reason: changeDetails,
      };
    }

    // If max pages changed, need to run
    if (cache.maxPages !== config.maxPages) {
      return {
        needsRun: true,
        reason: `Max pages changed from ${cache.maxPages} to ${config.maxPages}`,
      };
    }

    // If crawl results don't exist, need to run
    const crawlResultsFile = path.join(__dirname, '../../results/raw/crawl-results.json');
    if (!fs.existsSync(crawlResultsFile)) {
      return {
        needsRun: true,
        reason: 'Crawl results do not exist',
      };
    }

    // Otherwise, don't need to run
    return {
      needsRun: false,
      reason: 'No changes detected in paths.json or configuration',
    };
  } else if (['typography', 'colors', 'spacing', 'borders', 'animations'].includes(step)) {
    // If crawl results don't exist, need to run crawl first
    const crawlResultsFile = path.join(__dirname, '../../results/raw/crawl-results.json');
    if (!fs.existsSync(crawlResultsFile)) {
      return {
        needsRun: true,
        reason: 'Crawl results do not exist',
      };
    }

    // If crawl is newer than this analysis, need to run
    const crawlTimestamp = cache.outputTimestamps.crawl;
    const analysisTimestamp = cache.outputTimestamps[step];

    if (!analysisTimestamp || (crawlTimestamp && new Date(crawlTimestamp) > new Date(analysisTimestamp))) {
      return {
        needsRun: true,
        reason: 'Crawl results are newer than analysis',
      };
    }

    // If analysis file doesn't exist, need to run
    const analysisFile = path.join(__dirname, `../../results/raw/${step}-analysis.json`);
    if (!fs.existsSync(analysisFile)) {
      return {
        needsRun: true,
        reason: `${step} analysis file does not exist`,
      };
    }

    // Check if analysis file has been modified using hash comparison
    const currentHash = calculateFileHash(analysisFile);
    const cachedHash = cache.inputHashes[`${step}-analysis.json`];

    if (cachedHash && currentHash !== cachedHash) {
      return {
        needsRun: true,
        reason: `${step} analysis file has been modified (content changed)`,
      };
    }

    // Otherwise, don't need to run
    return {
      needsRun: false,
      reason: `No changes detected in ${step} analysis dependencies`,
    };
  } else if (step === 'tokens') {
    // Check if any analysis files are newer than tokens
    const tokensTimestamp = cache.outputTimestamps.tokens;

    for (const analysisStep of ['typography', 'colors', 'spacing', 'borders', 'animations']) {
      const analysisTimestamp = cache.outputTimestamps[analysisStep];

      if (analysisTimestamp && (!tokensTimestamp || new Date(analysisTimestamp) > new Date(tokensTimestamp))) {
        return {
          needsRun: true,
          reason: `${analysisStep} analysis is newer than tokens`,
        };
      }
    }

    // If tokens file doesn't exist, need to run
    const tokensFile = path.join(__dirname, '../../results/tokens/tokens.json');
    if (!fs.existsSync(tokensFile)) {
      return {
        needsRun: true,
        reason: 'Tokens file does not exist',
      };
    }

    // Check if tokens file has been modified using hash comparison
    const currentHash = calculateFileHash(tokensFile);
    const cachedHash = cache.inputHashes['tokens.json'];

    if (cachedHash && currentHash !== cachedHash) {
      return {
        needsRun: true,
        reason: 'Tokens file has been modified (content changed)',
      };
    }

    // Otherwise, don't need to run
    return {
      needsRun: false,
      reason: 'No changes detected in token dependencies',
    };
  } else if (step === 'reports') {
    // Check if tokens are newer than reports
    const tokensTimestamp = cache.outputTimestamps.tokens;
    const reportsTimestamp = cache.outputTimestamps.reports;

    if (tokensTimestamp && (!reportsTimestamp || new Date(tokensTimestamp) > new Date(reportsTimestamp))) {
      return {
        needsRun: true,
        reason: 'Tokens are newer than reports',
      };
    }

    // If report file doesn't exist, need to run
    const reportFile = path.join(__dirname, '../../results/reports/design-system-report.html');
    if (!fs.existsSync(reportFile)) {
      return {
        needsRun: true,
        reason: 'Report file does not exist',
      };
    }

    // Check if report file has been modified using hash comparison
    const currentHash = calculateFileHash(reportFile);
    const cachedHash = cache.inputHashes['design-system-report.html'];

    if (cachedHash && currentHash !== cachedHash) {
      return {
        needsRun: true,
        reason: 'Report file has been modified (content changed)',
      };
    }

    // Otherwise, don't need to run
    return {
      needsRun: false,
      reason: 'No changes detected in report dependencies',
    };
  }

  // Default: run the step
  return {
    needsRun: true,
    reason: 'Unknown step or no cache information available',
  };
}

/**
 * Check all steps and determine what needs to be run
 * @param {object} config - Configuration
 * @returns {object} - Object with steps that need to be run and reasons
 */
function analyzeStepsToRun(config) {
  const steps = ['crawl', 'typography', 'colors', 'spacing', 'borders', 'animations', 'tokens', 'reports'];
  const results = {};

  // Check if this is the first run (no cache file exists)
  if (!fs.existsSync(CACHE_FILE)) {
    // If it's the first run, all steps need to run
    steps.forEach(step => {
      results[step] = {
        needsRun: true,
        reason: 'First run - no cache file exists',
      };
    });
    return results;
  }

  // If not the first run, do detailed analysis
  steps.forEach(step => {
    results[step] = checkIfStepNeedsRun(step, config);
  });

  return results;
}

/**
 * Create an interactive prompt for the user
 * @param {object} stepAnalysis - Analysis of steps to run
 * @param {object} config - Configuration
 * @returns {Promise<object>} - Object with steps to run
 */
async function promptUser(stepAnalysis, config) {
  const cache = getCacheData();

  console.log('\n=== Cache Status ===');
  console.log(`Last run: ${cache.lastRun ? new Date(cache.lastRun).toLocaleString() : 'Never'}`);
  console.log(`Target URL: ${config.baseUrl}`);
  console.log(`Max pages: ${config.maxPages}`);

  // Count steps that need to run
  const stepsToRun = Object.entries(stepAnalysis)
    .filter(([_, analysis]) => analysis.needsRun)
    .map(([step, analysis]) => ({ step, reason: analysis.reason }));

  if (stepsToRun.length === 0) {
    console.log('\nAll outputs are up to date. No steps need to be run.');
    console.log('Use --force to run all steps anyway.');

    return { runAll: false, steps: {} };
  }

  console.log('\nThe following changes were detected:');
  stepsToRun.forEach(({ step, reason }) => {
    console.log(`- ${reason}`);
  });

  console.log('\nBased on these changes, the following steps would normally run:');
  stepsToRun.forEach(({ step }, index) => {
    let stepName = step.toUpperCase();
    let description = '';

    switch (step) {
      case 'crawl':
        description = 'Site crawling';
        break;
      case 'typography':
      case 'colors':
      case 'spacing':
      case 'borders':
      case 'animations':
        description = `${step.charAt(0).toUpperCase() + step.slice(1)} extraction`;
        break;
      case 'tokens':
        description = 'Design tokens generation';
        break;
      case 'reports':
        description = 'HTML reports generation';
        break;
    }

    console.log(`* [${stepName}] ${description}`);
  });

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Prompt for how to proceed
  const answer = await new Promise(resolve => {
    rl.question('\nHow would you like to proceed?\n' +
      '1. Run all necessary steps (recommended)\n' +
      '2. Run selected steps only\n' +
      '3. Skip all steps and use existing results\n' +
      '4. Force run everything (ignore cache)\n\n' +
      'Enter your choice (1-4): ', resolve);
  });

  const choice = parseInt(answer.trim());

  if (choice === 1) {
    // Run all necessary steps
    rl.close();
    return {
      runAll: false,
      steps: Object.fromEntries(stepsToRun.map(({ step }) => [step, true])),
    };
  } else if (choice === 2) {
    // Run selected steps
    const stepsAnswer = await new Promise(resolve => {
      rl.question('\nSelect which steps to run:\n' +
        stepsToRun.map(({ step, reason }, index) => {
          let stepName = step.toUpperCase();
          let description = '';

          switch (step) {
            case 'crawl':
              description = 'Site crawling';
              break;
            case 'typography':
            case 'colors':
            case 'spacing':
            case 'borders':
            case 'animations':
              description = `${step.charAt(0).toUpperCase() + step.slice(1)} extraction`;
              break;
            case 'tokens':
              description = 'Design tokens generation';
              break;
            case 'reports':
              description = 'HTML reports generation';
              break;
          }

          return `${index + 1}. [${stepName}] ${description}`;
        }).join('\n') +
        '\n\nEnter numbers separated by commas (e.g., "1,3"): ', resolve);
    });

    rl.close();

    // Parse selected steps
    const selectedIndices = stepsAnswer.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= stepsToRun.length)
      .map(n => n - 1);

    return {
      runAll: false,
      steps: Object.fromEntries(
        stepsToRun
          .filter((_, index) => selectedIndices.includes(index))
          .map(({ step }) => [step, true]),
      ),
    };
  } else if (choice === 3) {
    // Skip all steps
    rl.close();
    return { runAll: false, steps: {} };
  } else if (choice === 4) {
    // Force run everything
    rl.close();
    return { runAll: true, steps: {} };
  } else {
    // Invalid choice, default to running all necessary steps
    console.log('Invalid choice. Running all necessary steps.');
    rl.close();
    return {
      runAll: false,
      steps: Object.fromEntries(stepsToRun.map(({ step }) => [step, true])),
    };
  }
}

// Export all functions as default export
export default {
  calculateFileHash,
  getFileStats,
  getCacheData,
  saveCacheData,
  updateCacheForStep,
  checkIfStepNeedsRun,
  analyzeStepsToRun,
  promptUser,
};
