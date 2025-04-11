# Console Manager

The Console Manager provides an enhanced logging and progress tracking experience with Ora spinners integration. It offers full control over log verbosity, spinner behavior, and formatting based on application configuration.

## Features

- Enable/disable logging based on debug mode
- Filter logs by severity level (error, warn, info, debug, verbose)
- Interactive spinners for tasks and processes
- Custom formatting with timestamps and prefixes
- Create child loggers with prefixes for different modules
- Progress tracking with task objects
- Full compatibility with standard console API
- Intelligent handling of terminal vs non-terminal environments

## Usage

### Basic Usage

```javascript
import logger from '../utils/console-manager.js';

// Use like the standard console
logger.log('Hello world');
logger.info('This is an informational message');
logger.warn('This is a warning');
logger.error('This is an error');
logger.success('Operation completed successfully');

// Debug messages - only shown when debug mode is on
logger.debug('Debug message');

// Verbose messages - only shown at highest verbosity
logger.verbose('Verbose details');
```

### Using Spinners

```javascript
import logger from '../utils/console-manager.js';

// Create a spinner for a long-running process
const spinner = logger.spinner('Processing data...');

// Later, update the spinner message
spinner.text = 'Still working...';

// Complete the spinner with success
spinner.succeed('Data processed successfully!');

// Or show an error
spinner.fail('Failed to process data');

// Warnings are also available
spinner.warn('Processing completed with warnings');
```

### Task Progress

```javascript
import logger from '../utils/console-manager.js';

// Create a task with a spinner
const task = logger.task('Downloading files');

// Update task progress
task.update('Downloaded 50%');

// Complete the task
task.complete('All files downloaded');

// Or mark as failed
// task.fail('Download failed');
```

### Configuration

```javascript
import { defaultLogger } from '../utils/console-manager.js';

// Configure the logger
defaultLogger.configure({
  debug: true,          // Enable debug mode
  logLevel: 'INFO',     // Set log level
  colors: true,         // Enable colored output
  timestamps: true,     // Include timestamps in logs
  prefix: 'app'         // Add a prefix to all messages
});

// Set debug mode on/off
defaultLogger.setDebug(false);

// Set log level
defaultLogger.setLogLevel('WARN');
```

### Getting a Configured Logger from Application Config

```javascript
import { getLogger } from '../utils/console-manager.js';

// Get a logger from application config
const logger = getLogger(config);

// Get a logger for a specific module
const moduleLogger = getLogger(config, 'module-name');
```

### Creating Prefixed Loggers

```javascript
import logger from '../utils/console-manager.js';

// Create a logger for a specific module
const authLogger = logger.createPrefixedLogger('auth');
authLogger.info('User logged in'); // Outputs: [auth] User logged in

// Create a sub-module logger
const authDbLogger = authLogger.createPrefixedLogger('db');
authDbLogger.info('Query executed'); // Outputs: [auth:db] Query executed
```

## Configuration Options

Add these settings to your application configuration to control logging:

```json
{
  "logging": {
    "debug": true,        // Enable/disable debug mode
    "logLevel": "INFO",   // Log level (SILENT, ERROR, WARN, INFO, DEBUG, VERBOSE)
    "colors": true,       // Enable/disable colored output
    "timestamps": true,   // Include timestamps in logs
    "prefix": "app",      // Global prefix for all log messages
    "useSpinners": true   // Enable/disable interactive spinners
  }
}
```

### Behavior in Debug vs. Production Mode

In debug mode (`debug: true`):
- All log messages are displayed according to the log level setting
- Spinners temporarily pause and persist information messages before continuing
- Full progress information is shown

In production mode (`debug: false`):
- Only errors and warnings are displayed (regardless of log level)
- Other logs are suppressed for clean output
- Spinners display with minimal interruption
- Final status (success/error) is always shown

## Log Levels

The following log levels are available, in order of increasing verbosity:

- `SILENT` (0): No output
- `ERROR` (1): Only errors
- `WARN` (2): Errors and warnings
- `INFO` (3): Standard information (default)
- `DEBUG` (4): Detailed debugging information
- `VERBOSE` (5): All possible output

## Integration with Existing Code

To replace the standard console in existing code:

```javascript
import { getLogger } from '../utils/console-manager.js';

function existingFunction(config, console = global.console) {
  // Replace with configured logger
  const logger = getLogger(config, 'module-name');
  
  logger.log('This used to go to console.log');
  logger.error('This used to go to console.error');
}
```