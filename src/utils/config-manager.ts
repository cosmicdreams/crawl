// src/utils/config-manager.ts
// Using ESM syntax
import fs from 'node:fs';
import path from 'node:path';
import { CrawlConfig } from '../core/types.js';
import { logger } from './logger.js';

// Default configuration
const DEFAULT_CONFIG: CrawlConfig = {
  baseUrl: 'https://example.com',
  maxPages: 10,
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
  screenshots: true,
  outputDir: './results'
};

/**
 * Validates the configuration object for security and correctness
 */
function validateConfig(config: any): config is CrawlConfig {
  const errors: string[] = [];

  // Validate baseUrl
  if (typeof config.baseUrl !== 'string') {
    errors.push('baseUrl must be a string');
  } else {
    try {
      const url = new URL(config.baseUrl);
      // Check for dangerous protocols
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(url.protocol)) {
        errors.push(`baseUrl protocol '${url.protocol}' is not allowed. Only HTTP and HTTPS are permitted`);
      }
    } catch {
      errors.push('baseUrl must be a valid URL');
    }
  }

  // Validate maxPages
  if (typeof config.maxPages !== 'number' || config.maxPages < 1 || config.maxPages > 1000) {
    errors.push('maxPages must be a number between 1 and 1000');
  }

  // Validate timeout
  if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 120000) {
    errors.push('timeout must be a number between 1000ms and 120000ms');
  }

  // Validate arrays
  if (!Array.isArray(config.ignorePatterns)) {
    errors.push('ignorePatterns must be an array');
  }

  if (!Array.isArray(config.ignoreExtensions)) {
    errors.push('ignoreExtensions must be an array');
  }

  // Validate boolean
  if (typeof config.screenshots !== 'boolean') {
    errors.push('screenshots must be a boolean');
  }

  // Validate outputDir
  if (config.outputDir && typeof config.outputDir !== 'string') {
    errors.push('outputDir must be a string');
  }

  if (errors.length > 0) {
    logger.error('Configuration validation failed', { errors });
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Manages configuration loading, validation, and merging for the crawler application.
 * Ensures all configuration values are validated for security and correctness.
 * 
 * @example
 * ```typescript
 * const configManager = new ConfigManager('./config/my-config.json');
 * const config = configManager.getConfig();
 * ```
 */
export class ConfigManager {
  private config: CrawlConfig;

  /**
   * Creates a new ConfigManager instance with optional configuration file.
   * 
   * @param configPath - Optional path to configuration file. If not provided, defaults to 'config/default.json'
   * @throws {Error} When configuration validation fails
   */
  constructor(configPath?: string) {
    this.config = { ...DEFAULT_CONFIG };

    // Try to load from default config location if no path provided
    if (!configPath) {
      const defaultConfigPath = path.join(process.cwd(), 'config', 'default.json');
      if (fs.existsSync(defaultConfigPath)) {
        this.loadConfigFromFile(defaultConfigPath);
      }
    } else {
      this.loadConfigFromFile(configPath);
    }

    // Validate the final configuration
    validateConfig(this.config);
  }

  /**
   * Load configuration from a JSON file with validation.
   * 
   * @private
   * @param configPath - Path to the JSON configuration file
   * @throws {Error} When file cannot be read or configuration is invalid
   */
  private loadConfigFromFile(configPath: string): void {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configFile);
      
      // Validate file config before merging
      validateConfig({ ...this.config, ...fileConfig });
      
      this.config = { ...this.config, ...fileConfig };
      logger.info(`Loaded configuration from ${configPath}`);
    } catch (error) {
      logger.error(`Error loading config file: ${configPath}`, { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Merge command line options into the configuration
   */
  /**
   * Merge command line options into the current configuration.
   * All options are validated before merging.
   * 
   * @param options - Partial configuration object to merge
   * @throws {Error} When merged configuration fails validation
   */
  public mergeCommandLineOptions(options: Partial<CrawlConfig>): void {
    const mergedConfig = { ...this.config, ...options };
    validateConfig(mergedConfig);
    this.config = mergedConfig;
  }

  /**
   * Get the current validated configuration.
   * 
   * @returns The complete, validated configuration object
   */
  public getConfig(): CrawlConfig {
    return this.config;
  }

  /**
   * Save the current configuration to a file
   */
  /**
   * Save the current configuration to a JSON file.
   * 
   * @param outputPath - Path where the configuration file should be saved
   * @throws {Error} When file cannot be written
   */
  public saveConfig(outputPath: string): void {
    try {
      const dirPath = path.dirname(outputPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(this.config, null, 2));
      logger.info(`Configuration saved to ${outputPath}`);
    } catch (error) {
      logger.error(`Error saving config file: ${outputPath}`, { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }
}
