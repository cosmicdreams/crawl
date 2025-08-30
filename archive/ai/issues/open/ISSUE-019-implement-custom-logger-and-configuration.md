---
id: ISSUE-019
title: Implement Custom Logger and Configuration for Console UI
created: 2024-05-15
status: open
severity: medium
category: enhancement
related_components: utils, run
related_pages: run.js, all extractors
---

# Implement Custom Logger and Configuration for Console UI

## Description
The current console UI uses direct console.log statements throughout the codebase, leading to inconsistent formatting and making it difficult to control the verbosity of the output. Implementing a custom logger with different log levels and configuration options would improve consistency and give users more control over the console output.

## Impact
- Inconsistent formatting of log messages
- No way to control verbosity of output
- Difficult to maintain and update logging behavior
- No consideration for different terminal capabilities

## Reproduction Steps
1. Examine the codebase and note the direct console.log statements
2. Run the application and observe inconsistent formatting of log messages
3. Note the lack of options to control verbosity

## Expected Behavior
The application should:
1. Use a consistent logging system throughout the codebase
2. Support different log levels (debug, info, warn, error)
3. Allow users to configure logging behavior
4. Adapt to different terminal capabilities

## Actual Behavior
The application uses direct console.log statements with inconsistent formatting and no way to control verbosity.

## Screenshots/Evidence
N/A

## Suggested Solution
Implement a custom logger and configuration system:

1. Create a custom logger class:
   ```javascript
   // logger.js
   const chalk = require('chalk');
   
   class Logger {
     constructor(options = {}) {
       this.options = {
         colors: true,
         verbose: false,
         ...options
       };
     }
   
     debug(message) {
       if (this.options.verbose) {
         this._log('debug', message, chalk.gray);
       }
     }
   
     info(message) {
       this._log('info', message);
     }
   
     success(message) {
       this._log('success', message, chalk.green, '✓');
     }
   
     warn(message) {
       this._log('warn', message, chalk.yellow, '⚠');
     }
   
     error(message) {
       this._log('error', message, chalk.red, '✗');
     }
   
     header(message) {
       console.log('\n' + (this.options.colors ? chalk.bold.blue(`=== ${message} ===`) : `=== ${message} ===`));
     }
   
     _log(level, message, colorFn, symbol) {
       let output = message;
       
       if (symbol) {
         output = `${symbol} ${output}`;
       }
       
       if (this.options.colors && colorFn) {
         output = colorFn(output);
       }
       
       console.log(output);
     }
   }
   
   module.exports = Logger;
   ```

2. Add configuration options for the logger:
   ```javascript
   // config-manager.js
   
   // Add logger configuration to default config
   const defaultConfig = {
     // ... existing config options ...
     logger: {
       colors: true,
       verbose: false,
       logLevel: 'info' // 'debug', 'info', 'warn', 'error'
     }
   };
   ```

3. Add command-line options for logger configuration:
   ```javascript
   // run.js
   
   program
     .option('--verbose', 'Enable verbose logging')
     .option('--no-colors', 'Disable colored output')
     .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info');
   ```

4. Initialize the logger with configuration:
   ```javascript
   // run.js
   
   const Logger = require('./src/utils/logger');
   
   // Initialize logger with config
   const logger = new Logger({
     colors: config.logger.colors && program.colors,
     verbose: config.logger.verbose || program.verbose,
     logLevel: program.logLevel || config.logger.logLevel
   });
   ```

5. Replace all console.log statements with logger calls:
   ```javascript
   // Before
   console.log('Starting crawl...');
   console.error('Error during crawl:', error.message);
   
   // After
   logger.info('Starting crawl...');
   logger.error(`Error during crawl: ${error.message}`);
   ```

6. Add detection for terminal capabilities:
   ```javascript
   // logger.js
   
   const supportsColor = require('supports-color');
   
   class Logger {
     constructor(options = {}) {
       this.options = {
         colors: supportsColor.stdout && options.colors !== false,
         // ... other options
       };
     }
     
     // ... logger methods
   }
   ```

7. Update all extractors and utilities to use the new logger instead of console.log

## Related Issues
- ISSUE-016: Implement Basic Styling and Progress Indicators for Console UI
- ISSUE-017: Implement Structured Data and Interactive Elements for Console UI
- ISSUE-018: Implement Dashboard and Branding for Console UI

## History
- 2024-05-15: Issue created
