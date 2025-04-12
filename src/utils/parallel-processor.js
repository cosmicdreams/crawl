/**
 * Parallel Processor
 *
 * Provides functionality for processing tasks in parallel with controlled concurrency.
 */

import { chromium } from '@playwright/test';

/**
 * Default configuration
 */
const defaultConfig = {
  // Maximum number of concurrent tasks
  concurrency: 5,

  // Whether to show progress
  showProgress: true,

  // Delay between batches in milliseconds
  batchDelay: 1000,

  // Whether to continue on error
  continueOnError: true,

  // Maximum retries for failed tasks
  maxRetries: 2,

  // Delay before retrying in milliseconds
  retryDelay: 2000
};

/**
 * Process tasks in parallel with controlled concurrency
 * @param {Array<object>} tasks - Array of tasks to process
 * @param {Function} processTask - Function to process a single task
 * @param {object} config - Configuration object
 * @param {object} logger - Logger object
 * @returns {Promise<Array<object>>} - Array of results
 */
async function processInParallel(tasks, processTask, config = {}, logger = console) {
  // Merge configurations
  const mergedConfig = { ...defaultConfig, ...config };

  // Validate inputs
  if (!Array.isArray(tasks)) {
    throw new Error('Tasks must be an array');
  }

  if (typeof processTask !== 'function') {
    throw new Error('Process task must be a function');
  }

  // Create chunks of tasks based on concurrency
  const chunks = [];
  for (let i = 0; i < tasks.length; i += mergedConfig.concurrency) {
    chunks.push(tasks.slice(i, i + mergedConfig.concurrency));
  }

  // Results array
  const results = [];

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (mergedConfig.showProgress) {
      logger.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} tasks)...`);
    }

    // Process tasks in this chunk concurrently
    const chunkPromises = chunk.map(async (task, index) => {
      let attempts = 0;
      let lastError = null;

      // Retry loop
      while (attempts <= mergedConfig.maxRetries) {
        try {
          if (attempts > 0 && mergedConfig.showProgress) {
            logger.log(`Retrying task ${index} (attempt ${attempts}/${mergedConfig.maxRetries})...`);
          }

          // Process the task
          const result = await processTask(task, index);

          if (mergedConfig.showProgress) {
            logger.log(`Completed task ${index} in batch ${i + 1}`);
          }

          return {
            task,
            result,
            success: true
          };
        } catch (error) {
          lastError = error;
          attempts++;

          if (attempts <= mergedConfig.maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, mergedConfig.retryDelay));
          }
        }
      }

      // If we get here, all attempts failed
      if (mergedConfig.continueOnError) {
        logger.error(`Task ${index} failed after ${attempts} attempts: ${lastError.message}`);
        return {
          task,
          error: {
            message: lastError.message,
            stack: lastError.stack,
            type: lastError.name
          },
          success: false
        };
      } else {
        throw lastError;
      }
    });

    // Wait for all tasks in this chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Wait between batches if not the last batch
    if (i < chunks.length - 1 && mergedConfig.batchDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, mergedConfig.batchDelay));
    }
  }

  return results;
}

/**
 * Process pages in parallel with controlled concurrency
 * @param {Array<object>} pages - Array of pages to process
 * @param {Function} processPage - Function to process a single page
 * @param {object} config - Configuration object
 * @param {object} logger - Logger object
 * @returns {Promise<Array<object>>} - Array of results
 */
async function processPages(pages, processPage, config = {}, logger = console) {
  // Merge configurations
  const mergedConfig = { ...defaultConfig, ...config };

  // Create a browser instance for each concurrent task
  let browsers = [];

  try {
    // Process pages in parallel
    const results = await processInParallel(
      pages,
      async (page, index) => {
        // Launch a browser if needed
        if (!browsers[index % mergedConfig.concurrency]) {
          browsers[index % mergedConfig.concurrency] = await chromium.launch();
        }

        const browser = browsers[index % mergedConfig.concurrency];
        const context = await browser.newContext();
        const playwrightPage = await context.newPage();

        try {
          // Process the page
          return await processPage(playwrightPage, page);
        } finally {
          // Close the page and context
          await playwrightPage.close();
          await context.close();
        }
      },
      mergedConfig,
      logger
    );

    return results;
  } finally {
    // Close all browsers
    for (const browser of browsers) {
      if (browser) {
        await browser.close();
      }
    }
  }
}

/**
 * Process pages with a shared browser instance
 * @param {Array<object>} pages - Array of pages to process
 * @param {Function} processPage - Function to process a single page
 * @param {object} browser - Browser instance
 * @param {object} config - Configuration object
 * @param {object} logger - Logger object
 * @returns {Promise<Array<object>>} - Array of results
 */
async function processPagesWithSharedBrowser(pages, processPage, browser, config = {}, logger = console) {
  // Merge configurations
  const mergedConfig = { ...defaultConfig, ...config };

  // Process pages in parallel
  return await processInParallel(
    pages,
    async (page, index) => {
      const context = await browser.newContext();
      const playwrightPage = await context.newPage();

      try {
        // Process the page
        return await processPage(playwrightPage, page);
      } finally {
        // Close the page and context
        await playwrightPage.close();
        await context.close();
      }
    },
    mergedConfig,
    logger
  );
}

export {
  defaultConfig,
  processInParallel,
  processPages,
  processPagesWithSharedBrowser
};
