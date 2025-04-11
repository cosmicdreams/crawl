# Utility Modules

This directory contains utility modules used throughout the application.

## Console Manager

The `console-manager.js` utility provides a configurable wrapper around Node.js's standard console. 
It allows you to control log verbosity, filtering, formatting, and more based on application configuration.

### Integration Guide

To integrate the console manager in an existing module:

1. **Basic import and usage**:

```javascript
import logger from '../utils/console-manager.js';

// Use like the standard console
logger.log('Starting process...');
logger.info('Processing items');
logger.debug('Detailed debugging information');
logger.warn('Warning: something unexpected happened');
logger.error('Error processing item');
logger.success('Process completed successfully');
```

2. **Using spinners for long-running tasks**:

```javascript
import logger from '../utils/console-manager.js';

// Create a spinner for expensive operations
const spinner = logger.spinner('Analyzing data...');

try {
  // Perform the operation
  const results = await someExpensiveOperation();
  
  // Update spinner message
  spinner.text = `Processing ${results.length} items...`;
  
  // More operations...
  
  // Complete with success
  spinner.succeed(`Processed ${results.length} items successfully`);
  
  return results;
} catch (error) {
  // Show error in spinner
  spinner.fail(`Failed to process data: ${error.message}`);
  throw error;
}
```

2. **Replace existing console parameters**:

```javascript
// Before:
function myFunction(config, logger = console) {
  logger.log('Message');
}

// After:
function myFunction(config, logger = null) {
  // If logger is not provided, get a configured logger from config
  if (!logger) {
    const { getLogger } = await import('../utils/console-manager.js');
    logger = getLogger(config, 'module-name');
  }
  
  logger.log('Message');
}
```

3. **Configure from application config**:

Add to your config file:

```json
{
  "logging": {
    "debug": true,        // Enable debug mode globally
    "logLevel": "INFO",   // Global log level
    "colors": true,       // Use colors in output
    "timestamps": true,   // Include timestamps in logs
    "prefix": "app"       // Global prefix for all logs
  }
}
```

See [full documentation](/docs/utils/console-manager.md) for more details.

## Other Utilities

- **cache-manager.js**: Handles caching and change detection
- **config-manager.js**: Manages application configuration
- **colors.js**: Terminal color utilities
- **extractor-cache.js**: Specialized caching for extractors
- **parallel-processor.js**: Handles parallel execution
- **telemetry-manager.js**: Performance monitoring and metrics
- **ui-utils.js**: User interface components for terminal