// src/utils/config-manager.ts
// Using ESM syntax
import fs from 'node:fs';
import path from 'node:path';
import { CrawlConfig } from '../core/types.js';

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

export class ConfigManager {
  private config: CrawlConfig;

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
  }

  /**
   * Load configuration from a JSON file
   */
  private loadConfigFromFile(configPath: string): void {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configFile);
      this.config = { ...this.config, ...fileConfig };
      console.log(`Loaded configuration from ${configPath}`);
    } catch (error) {
      console.error(`Error loading config file: ${configPath}`, error);
    }
  }

  /**
   * Merge command line options into the configuration
   */
  public mergeCommandLineOptions(options: Partial<CrawlConfig>): void {
    this.config = { ...this.config, ...options };
  }

  /**
   * Get the current configuration
   */
  public getConfig(): CrawlConfig {
    return this.config;
  }

  /**
   * Save the current configuration to a file
   */
  public saveConfig(outputPath: string): void {
    try {
      const dirPath = path.dirname(outputPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(this.config, null, 2));
      console.log(`Configuration saved to ${outputPath}`);
    } catch (error) {
      console.error(`Error saving config file: ${outputPath}`, error);
    }
  }
}
