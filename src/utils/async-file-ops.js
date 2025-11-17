/**
 * Async File Operations Utility
 * 
 * Replaces synchronous file operations with performant async alternatives
 * to eliminate I/O blocking that adds 500ms-2s per phase.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger as defaultLogger } from '../../dist/utils/logger.js';

/**
 * High-performance async file operations manager
 */
export class AsyncFileManager {
  static logger = defaultLogger;
  
  /**
   * Set logger instance (used by CLI to provide strategy logger)
   */
  static setLogger(logger) {
    this.logger = logger;
  }
  
  /**
   * Read and parse JSON file asynchronously
   */
  static async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (error.name === 'SyntaxError') {
        throw new Error(`Invalid JSON in file: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON data to file asynchronously with atomic operations
   */
  static async writeJsonFile(filePath, data, options = {}) {
    const { spaces = 2, atomic = true } = options;
    
    try {
      // Ensure directory exists
      await this.ensureDir(path.dirname(filePath));
      
      const jsonData = JSON.stringify(data, null, spaces);
      
      if (atomic) {
        // Atomic write using temporary file
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, jsonData, 'utf8');
        await fs.rename(tempPath, filePath);
      } else {
        // Direct write (faster but not atomic)
        await fs.writeFile(filePath, jsonData, 'utf8');
      }
      
      this.logger.info(`JSON file written: ${path.basename(filePath)} (${jsonData.length} bytes)`);
    } catch (error) {
      this.logger.error(`Failed to write JSON file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Ensure directory exists, create if necessary
   */
  static async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Check if file exists asynchronously
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats asynchronously
   */
  static async getFileStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read multiple JSON files concurrently
   */
  static async readJsonFiles(filePaths) {
    try {
      const results = await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const data = await this.readJsonFile(filePath);
            return { filePath, data, error: null };
          } catch (error) {
            return { filePath, data: null, error: error.message };
          }
        })
      );
      
      return results;
    } catch (error) {
      this.logger.error('Error reading multiple JSON files:', error.message);
      throw error;
    }
  }

  /**
   * Write multiple JSON files concurrently
   */
  static async writeJsonFiles(fileDataPairs, options = {}) {
    try {
      const results = await Promise.all(
        fileDataPairs.map(async ({ filePath, data }) => {
          try {
            await this.writeJsonFile(filePath, data, options);
            return { filePath, success: true, error: null };
          } catch (error) {
            return { filePath, success: false, error: error.message };
          }
        })
      );
      
      return results;
    } catch (error) {
      this.logger.error('Error writing multiple JSON files:', error.message);
      throw error;
    }
  }

  /**
   * Backup file before modification
   */
  static async backupFile(filePath) {
    if (await this.fileExists(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    }
    return null;
  }

  /**
   * Copy file asynchronously
   */
  static async copyFile(srcPath, destPath) {
    try {
      await this.ensureDir(path.dirname(destPath));
      await fs.copyFile(srcPath, destPath);
      this.logger.info(`File copied: ${path.basename(srcPath)} → ${path.basename(destPath)}`);
    } catch (error) {
      this.logger.error(`Failed to copy file ${srcPath} to ${destPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Move file asynchronously
   */
  static async moveFile(srcPath, destPath) {
    try {
      await this.ensureDir(path.dirname(destPath));
      await fs.rename(srcPath, destPath);
      this.logger.info(`File moved: ${path.basename(srcPath)} → ${path.basename(destPath)}`);
    } catch (error) {
      this.logger.error(`Failed to move file ${srcPath} to ${destPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete file with error handling
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      this.logger.info(`File deleted: ${path.basename(filePath)}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete file ${filePath}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFiles(directory, pattern = /\.tmp$/) {
    try {
      const files = await fs.readdir(directory);
      const tempFiles = files.filter(file => pattern.test(file));
      
      if (tempFiles.length > 0) {
        await Promise.all(
          tempFiles.map(file => 
            this.deleteFile(path.join(directory, file)).catch(() => {})
          )
        );
        this.logger.info(`Cleaned up ${tempFiles.length} temporary files`);
      }
    } catch (error) {
      this.logger.warn('Error during temp file cleanup:', error.message);
    }
  }

  /**
   * Stream large JSON files for memory efficiency
   */
  static async streamJsonFile(filePath, processor) {
    const { createReadStream } = await import('fs');
    const { Transform } = await import('stream');
    const { pipeline } = await import('stream/promises');

    let buffer = '';
    let depth = 0;
    let inString = false;
    let escape = false;

    const jsonStream = new Transform({
      transform(chunk, encoding, callback) {
        buffer += chunk.toString();
        
        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (inString) continue;
          
          if (char === '{' || char === '[') {
            depth++;
          } else if (char === '}' || char === ']') {
            depth--;
            
            if (depth === 0) {
              const jsonChunk = buffer.substring(0, i + 1);
              try {
                const parsed = JSON.parse(jsonChunk);
                processor(parsed);
              } catch (error) {
                this.logger.warn('Error parsing JSON chunk:', error.message);
              }
              buffer = buffer.substring(i + 1);
              i = -1;
            }
          }
        }
        
        callback();
      }
    });

    try {
      await pipeline(
        createReadStream(filePath, { encoding: 'utf8' }),
        jsonStream
      );
    } catch (error) {
      this.logger.error(`Error streaming JSON file ${filePath}:`, error.message);
      throw error;
    }
  }
}

/**
 * Legacy compatibility layer for drop-in replacement
 */
export const AsyncFileOps = {
  // Drop-in replacements for common sync operations
  readJSON: AsyncFileManager.readJsonFile,
  writeJSON: AsyncFileManager.writeJsonFile,
  exists: AsyncFileManager.fileExists,
  ensureDir: AsyncFileManager.ensureDir,
  copy: AsyncFileManager.copyFile,
  move: AsyncFileManager.moveFile,
  delete: AsyncFileManager.deleteFile,
  
  // Batch operations
  readMultiple: AsyncFileManager.readJsonFiles,
  writeMultiple: AsyncFileManager.writeJsonFiles,
  
  // Utility operations
  backup: AsyncFileManager.backupFile,
  cleanup: AsyncFileManager.cleanupTempFiles,
  stream: AsyncFileManager.streamJsonFile
};