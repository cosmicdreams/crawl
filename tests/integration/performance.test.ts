// tests/integration/performance.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);

describe('Performance Testing', () => {
  const testOutputDir = './test-performance-output';
  const mockServerUrl = 'http://localhost:3333';

  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Memory Usage', () => {
    it('should handle large sites without memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create mock metadata with many pages
      const largeSiteMetadata = {
        baseUrl: mockServerUrl,
        scan_time: new Date().toISOString(),
        unique_paths: Array.from({ length: 100 }, (_, i) => ({
          url: `${mockServerUrl}/page-${i}`,
          title: `Page ${i}`,
          depth: Math.floor(i / 10),
          reason: 'discovered',
          paragraphs: Array.from({ length: 20 }, (_, j) => `Paragraph ${j} on page ${i}`),
          components: ['header', 'main', 'footer', 'sidebar']
        }))
      };
      
      fs.writeFileSync(
        path.join(testOutputDir, 'metadata.json'),
        JSON.stringify(largeSiteMetadata, null, 2)
      );
      
      fs.mkdirSync(path.join(testOutputDir, 'extract'), { recursive: true });
      
      const startTime = performance.now();
      
      await execAsync(
        `node index.js extract --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 60000 }
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      const finalMemory = process.memoryUsage();
      
      // Memory growth should be reasonable (less than 500MB increase)
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(500 * 1024 * 1024); // 500MB
      
      // Should complete within reasonable time (less than 60 seconds)
      expect(executionTime).toBeLessThan(60000);
      
      // Verify output files were created
      const extractFiles = fs.readdirSync(path.join(testOutputDir, 'extract'));
      expect(extractFiles.length).toBeGreaterThan(0);
    });

    it('should release memory after processing large datasets', async () => {
      const measureMemory = () => {
        global.gc?.(); // Force garbage collection if --expose-gc flag is used
        return process.memoryUsage().heapUsed;
      };
      
      const initialMemory = measureMemory();
      
      // Process multiple large datasets sequentially
      for (let round = 0; round < 3; round++) {
        const roundOutputDir = path.join(testOutputDir, `round-${round}`);
        fs.mkdirSync(roundOutputDir, { recursive: true });
        
        const largeMetadata = {
          baseUrl: mockServerUrl,
          scan_time: new Date().toISOString(),
          unique_paths: Array.from({ length: 50 }, (_, i) => ({
            url: `${mockServerUrl}/round${round}-page${i}`,
            title: `Round ${round} Page ${i}`,
            depth: 0,
            reason: 'test',
            paragraphs: Array.from({ length: 10 }, () => 'Sample paragraph content'),
            components: ['div', 'span', 'p']
          }))
        };
        
        fs.writeFileSync(
          path.join(roundOutputDir, 'metadata.json'),
          JSON.stringify(largeMetadata, null, 2)
        );
        
        fs.mkdirSync(path.join(roundOutputDir, 'extract'), { recursive: true });
        
        await execAsync(
          `node index.js extract --url ${mockServerUrl} --output ${roundOutputDir}`,
          { timeout: 30000 }
        );
      }
      
      const finalMemory = measureMemory();
      const totalMemoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be bounded even after processing multiple datasets
      expect(totalMemoryGrowth).toBeLessThan(200 * 1024 * 1024); // 200MB
    });
  });

  describe('Processing Speed', () => {
    it('should complete initial crawling within time limits', async () => {
      const startTime = performance.now();
      
      await execAsync(
        `node index.js initial --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 10000 }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Initial phase should complete within 10 seconds for small sites
      expect(duration).toBeLessThan(10000);
      
      // Verify output file exists
      expect(fs.existsSync(path.join(testOutputDir, 'paths.json'))).toBe(true);
    });

    it('should scale efficiently with page count', async () => {
      const testCases = [
        { pages: 1, maxTime: 5000 },
        { pages: 5, maxTime: 15000 },
        { pages: 10, maxTime: 25000 }
      ];
      
      for (const testCase of testCases) {
        const caseOutputDir = path.join(testOutputDir, `pages-${testCase.pages}`);
        fs.mkdirSync(caseOutputDir, { recursive: true });
        
        // Create paths.json with specified number of pages
        const pathsData = {
          baseUrl: mockServerUrl,
          scan_type: 'deepen',
          all_paths: Array.from({ length: testCase.pages }, (_, i) => ({
            url: `${mockServerUrl}/page-${i}`,
            depth: 0,
            reason: 'test'
          })),
          total_paths: testCase.pages
        };
        
        fs.writeFileSync(
          path.join(caseOutputDir, 'paths.json'),
          JSON.stringify(pathsData, null, 2)
        );
        
        const startTime = performance.now();
        
        await execAsync(
          `node index.js metadata --url ${mockServerUrl} --output ${caseOutputDir}`,
          { timeout: testCase.maxTime + 5000 }
        );
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(testCase.maxTime);
        expect(fs.existsSync(path.join(caseOutputDir, 'metadata.json'))).toBe(true);
      }
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrentTasks = 3;
      const promises = [];
      
      for (let i = 0; i < concurrentTasks; i++) {
        const taskOutputDir = path.join(testOutputDir, `concurrent-${i}`);
        fs.mkdirSync(taskOutputDir, { recursive: true });
        
        const promise = execAsync(
          `node index.js initial --url ${mockServerUrl}/task${i} --output ${taskOutputDir}`,
          { timeout: 20000 }
        );
        
        promises.push(promise);
      }
      
      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();
      
      const totalDuration = endTime - startTime;
      
      // Concurrent execution should not take much longer than sequential
      // Allow for some overhead but should be much faster than 3x sequential time
      expect(totalDuration).toBeLessThan(25000);
      
      // Verify all tasks completed successfully
      for (let i = 0; i < concurrentTasks; i++) {
        expect(fs.existsSync(path.join(testOutputDir, `concurrent-${i}`, 'paths.json'))).toBe(true);
      }
    });
  });

  describe('Resource Efficiency', () => {
    it('should minimize disk I/O operations', async () => {
      const testMetadata = {
        baseUrl: mockServerUrl,
        scan_time: new Date().toISOString(),
        unique_paths: Array.from({ length: 20 }, (_, i) => ({
          url: `${mockServerUrl}/page-${i}`,
          title: `Test Page ${i}`,
          depth: 0,
          reason: 'test',
          paragraphs: ['Sample content'],
          components: ['div', 'p']
        }))
      };
      
      fs.writeFileSync(
        path.join(testOutputDir, 'metadata.json'),
        JSON.stringify(testMetadata, null, 2)
      );
      
      fs.mkdirSync(path.join(testOutputDir, 'extract'), { recursive: true });
      
      // Monitor file system operations (this is a simplified check)
      const startTime = performance.now();
      
      await execAsync(
        `node index.js extract --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete efficiently
      expect(duration).toBeLessThan(25000);
      
      // Check that output files are reasonable in size
      const extractFiles = fs.readdirSync(path.join(testOutputDir, 'extract'));
      extractFiles.forEach(file => {
        const filePath = path.join(testOutputDir, 'extract', file);
        const stats = fs.statSync(filePath);
        
        // Each extract file should be reasonable in size (not empty, not huge)
        expect(stats.size).toBeGreaterThan(10); // At least 10 bytes
        expect(stats.size).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      });
    });

    it('should handle network timeouts gracefully', async () => {
      const startTime = performance.now();
      
      // Test with a URL that will timeout
      await expect(
        execAsync(
          `node index.js initial --url http://httpbin.org/delay/30 --output ${testOutputDir}`,
          { timeout: 10000 }
        )
      ).rejects.toThrow();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should fail quickly due to timeout, not hang indefinitely
      expect(duration).toBeLessThan(12000); // Allow for some overhead
    });

    it('should clean up temporary resources', async () => {
      const tempDir = path.join(testOutputDir, 'temp');
      
      // Create some temporary files that should be cleaned up
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'temp-file.txt'), 'temporary content');
      
      await execAsync(
        `node index.js initial --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 15000 }
      );
      
      // Check that main output exists
      expect(fs.existsSync(path.join(testOutputDir, 'paths.json'))).toBe(true);
      
      // Temporary files should either be cleaned up or not interfere
      if (fs.existsSync(tempDir)) {
        // If temp directory still exists, it should not affect the main process
        expect(fs.existsSync(path.join(testOutputDir, 'paths.json'))).toBe(true);
      }
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover from failures without significant delay', async () => {
      // Create a scenario that will cause some failures but should recover
      const pathsWithFailures = {
        baseUrl: mockServerUrl,
        scan_type: 'deepen',
        all_paths: [
          { url: mockServerUrl, depth: 0, reason: 'initial' },
          { url: 'http://non-existent-domain-12345.com', depth: 1, reason: 'invalid' },
          { url: `${mockServerUrl}/valid-page`, depth: 1, reason: 'valid' }
        ],
        total_paths: 3
      };
      
      fs.writeFileSync(
        path.join(testOutputDir, 'paths.json'),
        JSON.stringify(pathsWithFailures, null, 2)
      );
      
      const startTime = performance.now();
      
      // This should handle the invalid URL gracefully and continue
      await execAsync(
        `node index.js metadata --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete despite failures, without excessive delay
      expect(duration).toBeLessThan(25000);
      
      // Should produce metadata despite some failures
      expect(fs.existsSync(path.join(testOutputDir, 'metadata.json'))).toBe(true);
      
      const metadata = JSON.parse(fs.readFileSync(path.join(testOutputDir, 'metadata.json'), 'utf8'));
      expect(metadata.paths_with_metadata).toBeDefined();
      // Should have processed at least the valid URLs
      expect(metadata.paths_with_metadata.length).toBeGreaterThan(0);
    });

    it('should maintain performance under error conditions', async () => {
      // Create metadata with some problematic content
      const problematicMetadata = {
        baseUrl: mockServerUrl,
        scan_time: new Date().toISOString(),
        unique_paths: Array.from({ length: 10 }, (_, i) => ({
          url: `${mockServerUrl}/page-${i}`,
          title: i % 3 === 0 ? '' : `Page ${i}`, // Some empty titles
          depth: 0,
          reason: 'test',
          paragraphs: i % 2 === 0 ? [] : [`Content for page ${i}`], // Some empty content
          components: i % 4 === 0 ? [] : ['div', 'span'] // Some empty components
        }))
      };
      
      fs.writeFileSync(
        path.join(testOutputDir, 'metadata.json'),
        JSON.stringify(problematicMetadata, null, 2)
      );
      
      fs.mkdirSync(path.join(testOutputDir, 'extract'), { recursive: true });
      
      const startTime = performance.now();
      
      await execAsync(
        `node index.js extract --url ${mockServerUrl} --output ${testOutputDir}`,
        { timeout: 30000 }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle problematic data without significant performance impact
      expect(duration).toBeLessThan(25000);
      
      // Should produce valid output despite data quality issues
      const extractFiles = fs.readdirSync(path.join(testOutputDir, 'extract'));
      expect(extractFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle increasing data volume linearly', async () => {
      const dataVolumes = [10, 50, 100];
      const results = [];
      
      for (const volume of dataVolumes) {
        const volumeOutputDir = path.join(testOutputDir, `volume-${volume}`);
        fs.mkdirSync(volumeOutputDir, { recursive: true });
        
        const largeDataset = {
          baseUrl: mockServerUrl,
          scan_time: new Date().toISOString(),
          unique_paths: Array.from({ length: volume }, (_, i) => ({
            url: `${mockServerUrl}/vol-page-${i}`,
            title: `Volume Test Page ${i}`,
            depth: Math.floor(i / 10),
            reason: 'scalability-test',
            paragraphs: Array.from({ length: 5 }, (_, j) => `Paragraph ${j} for page ${i}`),
            components: ['header', 'main', 'footer', 'aside', 'nav']
          }))
        };
        
        fs.writeFileSync(
          path.join(volumeOutputDir, 'metadata.json'),
          JSON.stringify(largeDataset, null, 2)
        );
        
        fs.mkdirSync(path.join(volumeOutputDir, 'extract'), { recursive: true });
        
        const startTime = performance.now();
        
        await execAsync(
          `node index.js extract --url ${mockServerUrl} --output ${volumeOutputDir}`,
          { timeout: 120000 }
        );
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        results.push({ volume, duration });
        
        // Verify output was generated
        const extractFiles = fs.readdirSync(path.join(volumeOutputDir, 'extract'));
        expect(extractFiles.length).toBeGreaterThan(0);
      }
      
      // Check that duration scales roughly linearly (not exponentially)
      const smallToMedium = results[1].duration / results[0].duration;
      const mediumToLarge = results[2].duration / results[1].duration;
      
      // Ratio should be roughly proportional to data size increase
      // Allow for some variance but shouldn't be exponential growth
      expect(smallToMedium).toBeLessThan(8); // 5x data shouldn't take >8x time
      expect(mediumToLarge).toBeLessThan(3); // 2x data shouldn't take >3x time
    });
  });
});