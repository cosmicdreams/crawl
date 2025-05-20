// src/api/run-crawler.ts
import { spawn } from 'child_process';
import path from 'node:path';
import { RunOptions } from '../ui/api/client.js';

/**
 * Run the crawler as a child process
 */
export function runCrawler(profile: string, options?: RunOptions): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    // Build the command arguments
    const args = ['dist/cli/run.js', 'crawl', '-p', profile];
    
    // Add options
    if (options?.url) {
      args.push('--url', options.url);
    }
    
    if (options?.maxPages) {
      args.push('--max-pages', options.maxPages.toString());
    }
    
    if (options?.extractors && options.extractors.length > 0) {
      args.push('--extractors', options.extractors.join(','));
    }
    
    if (options?.generateTokens) {
      args.push('--generate-tokens');
    }
    
    // Spawn the process
    const crawlerProcess = spawn('node', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    
    // Collect output
    crawlerProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    crawlerProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Handle process completion
    crawlerProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: `Crawler completed successfully. Output: ${output}`
        });
      } else {
        reject({
          success: false,
          message: `Crawler failed with code ${code}. Output: ${output}`
        });
      }
    });
    
    crawlerProcess.on('error', (err) => {
      reject({
        success: false,
        message: `Failed to start crawler: ${err.message}`
      });
    });
  });
}
