/**
 * Configuration utilities for the site crawler
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads the configuration from config.json
 * @returns {Object} - Configuration object
 */
function loadConfig() {
  const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

  try {
    // Ensure the config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Read and parse config file
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } else {
      // Create default config if it doesn't exist
      const defaultConfig = {
        base_url: 'https://example.com',
        name: 'Website Analysis',
        crawl_settings: {
          max_depth: 3,
          batch_size: 20,
          max_retries: 2,
          timeout: 45000,
        },
      };

      // Save default config
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
  } catch (error) {
    console.error(`Error loading configuration: ${error.message}`);

    // Return default config as fallback
    return {
      base_url: 'https://example.com',
      name: 'Website Analysis',
      crawl_settings: {
        max_depth: 3,
        batch_size: 20,
        max_retries: 2,
        timeout: 45000,
      },
    };
  }
}

// Export the configuration
const CONFIG = loadConfig();

export {
  CONFIG,
  loadConfig,
};