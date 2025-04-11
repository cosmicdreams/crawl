// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants for file paths
const CONFIG_FOLDER = path.join(process.cwd(), 'config');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_FOLDER, 'config.json');
const DEFAULT_PATHS_PATH = path.join(CONFIG_FOLDER, 'paths.json');
const TEMPLATE_CONFIG_PATH = path.join(__dirname, '../../src/templates/config/config.json.template');

// Export constants for use by other modules
export { DEFAULT_PATHS_PATH, DEFAULT_CONFIG_PATH, CONFIG_FOLDER };

/**
 * @typedef {Object} Config
 * @property {string} baseUrl
 * @property {string} inputFile
 * @property {string} outputFile
 * @property {string} outputDir
 * @property {string[]} cssProperties
 * @property {string[]} elements
 * @property {number} maxPages
 * @property {string} screenshotsDir
 * @property {boolean} writeToFile
 * @property {boolean} generateVisualizations
 * @property {string[]} ignoreExtensions
 * @property {string[]} ignorePatterns
 * @property {boolean} respectRobotsTxt
 * @property {Object} telemetry
 */

/**
 * @typedef {Object} TelemetryConfig
 * @property {boolean} enabled
 * @property {string} outputDir
 * @property {boolean} logToConsole
 * @property {boolean} writeToFile
 * @property {number} minDuration
 * @property {boolean} includeTimestamps
 * @property {boolean} includeMemoryUsage
 */

/**
 * Default configuration for the application
 * @type {Config}
 */
const defaultConfig = {
  // Base URL of the site - we require a valid URL to be set
  baseUrl: process.env.SITE_DOMAIN || null,

  // Main output directory
  outputDir: path.join(process.cwd(), 'results'),

  // Input file with crawl results
  inputFile: path.join(process.cwd(), 'results/raw/crawl-results.json'),

  // Output file for the analysis
  outputFile: path.join(process.cwd(), 'results/raw/analysis.json'),

  // CSS properties to extract
  cssProperties: [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'box-shadow',
    'text-shadow',
    'fill',
    'stroke'
  ],

  // Elements to analyze
  elements: [
    // Container elements
    'body', 'header', 'footer', 'main', 'section', 'article',
    'aside', 'nav', 'div', 'form', 'table',

    // Text elements
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span', 'li', 'blockquote',
    'label', 'input', 'textarea', 'select', 'button',

    // Common UI elements
    '.btn', '.button', '.card', '.alert', '.notification',
    '.modal', '.dropdown', '.tooltip', '.popover',
    '.navbar', '.nav', '.menu', '.sidebar',
    '.header', '.footer', '.hero', '.banner',

    // Specific site elements
    '.coh-style-', '.coh-ce-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,
  
  // Timeout setting in milliseconds
  timeout: 30000,

  // Screenshots settings
  screenshotsDir: path.join(process.cwd(), 'results/screenshots'),
  screenshotsEnabled: true,

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Patterns and extensions to ignore
  ignoreExtensions: [
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg",
    ".css", ".js", ".zip", ".tar", ".gz"
  ],
  
  ignorePatterns: [
    "\\?", "/admin/", "/user/", "/cart/", "/checkout/", "/search/"
  ],
  
  // Whether to respect robots.txt
  respectRobotsTxt: true,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(process.cwd(), 'results/telemetry'),

    // Whether to log telemetry data to console
    logToConsole: true,

    // Whether to write telemetry data to file
    writeToFile: true,

    // Minimum duration (in ms) to log for operations
    minDuration: 5,

    // Whether to include timestamps in telemetry data
    includeTimestamps: true,

    // Whether to include memory usage in telemetry data
    includeMemoryUsage: true
  }
};

/**
 * Get the default configuration
 * @returns {Config} The default configuration
 */
export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(defaultConfig));
}

/**
 * Check if a configuration file exists
 * @param {string} configPath - Path to the configuration file
 * @returns {boolean} Whether the configuration file exists
 */
export function configExists(configPath) {
  return fs.existsSync(configPath);
}

/**
 * Read configuration from a file
 * @param {string} [configPath] - Path to the configuration file
 * @returns {Config} The configuration
 */
export function readConfig(configPath = DEFAULT_CONFIG_PATH) {
  console.log('Reading config from:', configPath);
  
  // Check for environment variable first - highest priority
  if (process.env.SITE_DOMAIN) {
    console.log('Found SITE_DOMAIN environment variable:', process.env.SITE_DOMAIN);
  }
  
  if (!configPath || !configExists(configPath)) {
    console.warn(`Configuration file not found: ${configPath}`);
    console.warn('Using default configuration');
    const defaultConfig = getDefaultConfig();
    
    // Validate and potentially fail if no baseUrl is provided
    try {
      return validateConfig(defaultConfig);
    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      throw error; // Re-throw to stop execution
    }
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Successfully loaded config with baseUrl:', config.baseUrl);
    
    const mergedConfig = {
      ...getDefaultConfig(),
      ...config
    };
    
    console.log('Merged config with default, final baseUrl:', mergedConfig.baseUrl);
    
    // Validate and potentially fail if no baseUrl is provided
    try {
      return validateConfig(mergedConfig);
    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      throw error; // Re-throw to stop execution
    }
  } catch (error) {
    console.warn(`Error reading configuration file: ${error.message}`);
    console.warn('Using default configuration');
    const defaultConfig = getDefaultConfig();
    
    // Validate and potentially fail if no baseUrl is provided
    try {
      return validateConfig(defaultConfig);
    } catch (validationError) {
      console.error(`ERROR: ${validationError.message}`);
      throw validationError; // Re-throw to stop execution
    }
  }
}

/**
 * Save configuration to a file
 * @param {string} configPath - Path to the configuration file
 * @param {Config} config - Configuration to save
 */
export function saveConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Prompt for configuration values
 * @param {Config} currentConfig - Current configuration
 * @returns {Promise<Config>} Updated configuration
 */
export async function promptForConfig(currentConfig) {
  // TODO: Implement interactive configuration prompt
  return currentConfig;
}

/**
 * Initialize configuration
 * @param {string} [configPath] - Path to the configuration file
 * @returns {Promise<Config>} The configuration
 */
export async function initConfig(configPath = DEFAULT_CONFIG_PATH) {
  // Create the config folder if it doesn't exist
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    console.log('Config folder does not exist. Creating it at:', configDir);
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (configExists(configPath)) {
    console.log('Using configuration from:', configPath);
    return readConfig(configPath);
  }

  console.log('Configuration file does not exist. Creating default config at:', configPath);
  
  // Check if we have a template config file to use
  let config;
  
  // Use example config if available (most likely path)
  const exampleConfigPath = path.join(__dirname, '../../src/templates/example.config.json');
  
  if (fs.existsSync(exampleConfigPath)) {
    console.log('Using example configuration from:', exampleConfigPath);
    try {
      const exampleConfig = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
      // Merge example with default config to ensure all fields are present
      config = {
        ...getDefaultConfig(),
        ...exampleConfig
      };
    } catch (error) {
      console.warn(`Error reading example config: ${error.message}`);
      config = getDefaultConfig();
    }
  } 
  // Fall back to template config if available
  else if (fs.existsSync(TEMPLATE_CONFIG_PATH)) {
    console.log('Using template configuration from:', TEMPLATE_CONFIG_PATH);
    try {
      const templateConfig = JSON.parse(fs.readFileSync(TEMPLATE_CONFIG_PATH, 'utf8'));
      // Merge template with default config to ensure all fields are present
      config = {
        ...getDefaultConfig(),
        ...templateConfig
      };
    } catch (error) {
      console.warn(`Error reading template config: ${error.message}`);
      config = getDefaultConfig();
    }
  } else {
    config = getDefaultConfig();
  }
  
  await promptForConfig(config);
  
  // Ensure the directory exists before saving (in case configPath has a different directory)
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  saveConfig(configPath, config);
  return config;
}

/**
 * Merge configuration with command line options
 * @param {Config} config - Base configuration
 * @param {Object} options - Command line options
 * @returns {Config} Merged configuration
 */
/**
 * Validate configuration to ensure required fields are set
 * @param {Config} config - Configuration to validate
 * @throws {Error} If validation fails
 * @returns {Config} - Validated configuration
 */
export function validateConfig(config) {
  // Check baseUrl - this is a required field
  if (!config.baseUrl) {
    throw new Error(
      'No baseUrl specified. Please set SITE_DOMAIN environment variable, provide a URL in config.json, or use the --url command line option.'
    );
  }
  
  // Check if baseUrl is a valid URL
  try {
    new URL(config.baseUrl);
  } catch (error) {
    throw new Error(`Invalid baseUrl: ${config.baseUrl}. Please provide a valid URL.`);
  }
  
  return config;
}

export function mergeWithOptions(config, options) {
  // Create the merged config
  const merged = { ...config };
  
  // Apply baseUrl from options (might be from options.url mapped to options.baseUrl)
  if (options.baseUrl) {
    merged.baseUrl = options.baseUrl;
  }
  
  // Handle other options
  if (options.maxPages) merged.maxPages = options.maxPages;
  if (options.output) merged.outputDir = options.output;
  if (options.format) merged.format = options.format;
  
  // Validate the configuration
  return validateConfig(merged);
}

// Export default as an object containing all functions
/**
 * Check if the paths file exists
 * @param {string} [pathsPath] - Path to the paths file
 * @returns {boolean} - Whether the paths file exists
 */
export function pathsFileExists(pathsPath = DEFAULT_PATHS_PATH) {
  return fs.existsSync(pathsPath);
}

/**
 * Read paths from a file
 * @param {string} [pathsPath] - Path to the paths file
 * @returns {Object|null} - The paths data or null if the file doesn't exist
 */
export function readPaths(pathsPath = DEFAULT_PATHS_PATH) {
  if (!pathsFileExists(pathsPath)) {
    console.log(`Paths file not found: ${pathsPath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(pathsPath, 'utf8'));
  } catch (error) {
    console.warn(`Error reading paths file: ${error.message}`);
    return null;
  }
}

/**
 * Save paths to a file
 * @param {Object} pathsData - Paths data to save
 * @param {string} [pathsPath] - Path to the paths file
 */
export function savePaths(pathsData, pathsPath = DEFAULT_PATHS_PATH) {
  // Ensure the directory exists
  const pathsDir = path.dirname(pathsPath);
  if (!fs.existsSync(pathsDir)) {
    fs.mkdirSync(pathsDir, { recursive: true });
  }

  fs.writeFileSync(pathsPath, JSON.stringify(pathsData, null, 2));
}

/**
 * Prompt the user to decide whether to use existing paths or regenerate
 * @returns {Promise<boolean>} - True if the user wants to regenerate paths
 */
export async function promptForPathsRegeneration() {
  // Create a readline interface using the imported readline module
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(
      'Paths file found. Do you want to regenerate it? (y/N): ',
      answer => {
        rl.close();
        // If the answer starts with 'y' or 'Y', regenerate paths
        resolve(answer.trim().toLowerCase().startsWith('y'));
      }
    );
  });
}

export default {
  getDefaultConfig,
  configExists,
  readConfig,
  saveConfig,
  promptForConfig,
  initConfig,
  mergeWithOptions,
  validateConfig,
  pathsFileExists,
  readPaths,
  savePaths,
  promptForPathsRegeneration,
  DEFAULT_PATHS_PATH  // Export the path constant
};
