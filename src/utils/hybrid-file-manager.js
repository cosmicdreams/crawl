/**
 * Hybrid File Manager - Optimized I/O Strategy
 * 
 * Uses sync for small files (<100KB), async for large files
 * Most crawler data is small JSON files that benefit from sync I/O
 */

import fs from 'fs';
import path from 'path';
import { AsyncFileManager } from './async-file-ops.js';

export class HybridFileManager {
  static SYNC_THRESHOLD = 100000; // 100KB
  static logger = console; // Default logger

  /**
   * Set logger instance
   */
  static setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Write JSON file with hybrid strategy
   */
  static async writeJsonFile(filePath, data) {
    const jsonString = JSON.stringify(data, null, 2);
    
    if (jsonString.length < this.SYNC_THRESHOLD) {
      // Sync for small files (most crawler data)
      try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, jsonString);
        this.logger.info(`JSON file written (sync): ${path.basename(filePath)}`);
      } catch (error) {
        this.logger.error(`Sync write failed for ${filePath}: ${error.message}`);
        throw error;
      }
    } else {
      // Async for large files  
      await AsyncFileManager.writeJsonFile(filePath, data);
      this.logger.info(`JSON file written (async): ${path.basename(filePath)}`);
    }
  }

  /**
   * Read JSON file with hybrid strategy
   */
  static async readJsonFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.size < this.SYNC_THRESHOLD) {
        // Sync read for small files
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      } else {
        // Async read for large files
        return await AsyncFileManager.readJsonFile(filePath);
      }
    } catch (error) {
      this.logger.error(`Hybrid read failed for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists (always sync - it's fast)
   */
  static fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Ensure directory exists (always sync)
   */
  static ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.info(`Directory created: ${dirPath}`);
    }
  }

  /**
   * Write text file with hybrid strategy
   */
  static async writeTextFile(filePath, content) {
    if (content.length < this.SYNC_THRESHOLD) {
      // Sync for small files
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        this.logger.info(`Text file written (sync): ${path.basename(filePath)}`);
      } catch (error) {
        this.logger.error(`Sync text write failed for ${filePath}: ${error.message}`);
        throw error;
      }
    } else {
      // Async for large files
      await AsyncFileManager.writeTextFile(filePath, content);
      this.logger.info(`Text file written (async): ${path.basename(filePath)}`);
    }
  }

  /**
   * Get file statistics
   */
  static getStats(filePath) {
    return {
      path: filePath,
      exists: fs.existsSync(filePath),
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      strategy: fs.existsSync(filePath) ? 
        (fs.statSync(filePath).size < this.SYNC_THRESHOLD ? 'sync' : 'async') : 
        'unknown'
    };
  }
}