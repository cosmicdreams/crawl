// @ts-check
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

// Path to example config template
const EXAMPLE_CONFIG_PATH = path.join(__dirname, '../templates/example.config.json');

/**
 * Get default configuration
 * @returns {Object} Default configuration object
 */
function getDefaultConfig() {
  // If example config exists, use it as template
  if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
    try {
      const exampleConfig = JSON.parse(fs.readFileSync(EXAMPLE_CONFIG_PATH, 'utf8'));
      return exampleConfig;
    } catch (error) {
      console.warn(`Error reading example config: ${error.message}`);
    }
  }

  // Fallback default configuration
  return {
    baseUrl: 'http://localhost:8080',
    maxPages: 100,
    timeout: 30000,
    ignorePatterns: [
      '\\?',
      '/admin/',
      '/user/',
      '/cart/',
      '/checkout/',
      '/search/'
    ],
    ignoreExtensions: [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg',
      '.css', '.js', '.zip', '.tar', '.gz'
    ],
    outputDir: './results',
    screenshotsEnabled: false,
    respectRobotsTxt: true
  };
};

/**
 * Check if config file exists
 * @returns {boolean}
 */
function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Read configuration from file
 * @returns {Object} Configuration object
 */
function readConfig() {
  if (!configExists()) {
    return getDefaultConfig();
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    // Ensure all default properties exist (for backward compatibility)
    const defaultConfig = getDefaultConfig();
    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn(`Error reading config file: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration object to save
 */
function saveConfig(config) {
  // Ensure directory exists
  const configDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Add warning comment at the top of the file
  const configWithComment = {
    _warning: "WARNING: This tool is designed for use on locally running websites only. Do not use on production sites without permission.",
    ...config
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configWithComment, null, 2));
}

/**
 * Prompt user for configuration values
 * @returns {Promise<Object>} User configuration
 */
async function promptForConfig() {
  console.log('\n=== Welcome to Frontend Crawler ===');
  console.log('This appears to be your first time running the tool.');
  console.log('Let\'s set up a basic configuration.\n');
  console.log('\x1b[33mWARNING: This tool is designed for use on locally running websites only.\x1b[0m');
  console.log('\x1b[33mDo not use on production sites without permission.\x1b[0m\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const baseUrl = await new Promise(resolve => {
    rl.question('What is the base URL of your site? (e.g., https://example.com): ', answer => {
      // Ensure URL has protocol and no trailing slash
      let url = answer.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      resolve(url);
    });
  });

  rl.close();

  // Create config with defaults + user input
  const config = {
    ...DEFAULT_CONFIG,
    baseUrl
  };

  console.log('\nConfiguration created successfully!');
  console.log(`Base URL set to: ${config.baseUrl}`);
  console.log('You can edit more settings in the config.json file.\n');

  return config;
}

/**
 * Initialize configuration
 * Creates config file if it doesn't exist
 * @returns {Promise<Object>} Configuration object
 */
async function initConfig() {
  if (configExists()) {
    return readConfig();
  }

  const config = await promptForConfig();
  saveConfig(config);
  return config;
}

/**
 * Merge command line options with config
 * @param {Object} config - Configuration from file
 * @param {Object} options - Command line options
 * @returns {Object} Merged configuration
 */
function mergeWithOptions(config, options) {
  const merged = { ...config };

  // Override with command line options if provided
  if (options.url) merged.baseUrl = options.url;
  if (options.maxPages) merged.maxPages = parseInt(options.maxPages);
  if (options.output) merged.outputDir = options.output;

  return merged;
}

module.exports = {
  configExists,
  readConfig,
  saveConfig,
  initConfig,
  mergeWithOptions,
  promptForConfig,
  getDefaultConfig,
  CONFIG_FILE
};
