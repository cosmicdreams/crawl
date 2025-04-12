# Vitest Testing Guide for Design Token Crawler

This guide provides best practices and examples for writing tests with Vitest in the Design Token Crawler project.

## Table of Contents

1. [Introduction to Vitest](#introduction-to-vitest)
2. [Project Setup](#project-setup)
3. [Test Structure](#test-structure)
4. [Writing Basic Tests](#writing-basic-tests)
5. [Mocking](#mocking)
6. [Testing Asynchronous Code](#testing-asynchronous-code)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Introduction to Vitest

Vitest is a modern testing framework designed for Vite and ES modules. It offers several advantages over Jest:

- **Native ES Module Support**: Works seamlessly with ES modules without complex configuration
- **Faster Performance**: Leverages Vite's dev server for faster test execution
- **Compatible API**: Similar API to Jest, making migration easier
- **Better HMR**: Improved hot module replacement for watch mode
- **Simpler Configuration**: Less configuration required for modern JavaScript projects

## Project Setup

The Design Token Crawler project is configured to use Vitest with the following setup:

- **Configuration File**: `vitest.config.js` in the project root
- **Test Directory**: `/tests` with a structure mirroring the source code
- **Test Files**: Named with `.test.js` extension
- **NPM Scripts**:
  - `npm test`: Run all tests
  - `npm run test:watch`: Run tests in watch mode
  - `npm run test:coverage`: Run tests with coverage
  - `npm run test:ui`: Run tests with UI

## Test Structure

Tests in Vitest follow a similar structure to Jest:

```javascript
import { describe, test, expect } from 'vitest';
import { functionToTest } from '../src/path/to/module.js';

describe('Module or Function Name', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'some input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

Key components:
- `describe`: Groups related tests
- `test` or `it`: Defines a single test case
- `expect`: Makes assertions about the code being tested

## Writing Basic Tests

### Testing Pure Functions

Pure functions are the easiest to test because they have no side effects and always return the same output for the same input:

```javascript
// src/utils/string-utils.js
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// tests/utils/string-utils.test.js
import { describe, test, expect } from 'vitest';
import { capitalize } from '../../src/utils/string-utils.js';

describe('String Utils', () => {
  test('capitalize should uppercase the first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });
  
  test('capitalize should handle empty strings', () => {
    expect(capitalize('')).toBe('');
  });
});
```

### Testing Configuration Functions

Many utility functions in the project handle configuration. Here's how to test them:

```javascript
// Example from tests/utils/config-validator.test.js
import { describe, test, expect } from 'vitest';
import { validateConfig } from '../../src/utils/config-manager.js';

describe('Config Validator', () => {
  test('validateConfig should accept valid config', () => {
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };
    
    expect(() => validateConfig(config)).not.toThrow();
    expect(validateConfig(config)).toEqual(config);
  });
  
  test('validateConfig should throw error for missing baseUrl', () => {
    const config = {
      maxPages: 10
    };
    
    expect(() => validateConfig(config)).toThrow(/No baseUrl specified/);
  });
});
```

## Mocking

Mocking is essential for testing code that interacts with external systems or has side effects.

### Mocking Functions

Use `vi.fn()` to create mock functions:

```javascript
import { describe, test, expect, vi } from 'vitest';

test('should call callback when condition is met', () => {
  // Create a mock function
  const mockCallback = vi.fn();
  
  // Use the mock function
  someFunction(true, mockCallback);
  
  // Assert that the mock was called
  expect(mockCallback).toHaveBeenCalled();
  expect(mockCallback).toHaveBeenCalledWith('expected argument');
});
```

### Mocking Modules

Vitest provides several ways to mock modules:

#### Basic Module Mocking

```javascript
import { describe, test, expect, vi } from 'vitest';

// Mock the entire module
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mocked content'),
  writeFileSync: vi.fn()
}));

// Import the mocked module
import fs from 'fs';

test('should read from file', () => {
  const content = fs.readFileSync('file.txt');
  expect(content).toBe('mocked content');
  expect(fs.readFileSync).toHaveBeenCalledWith('file.txt');
});
```

#### Partial Module Mocking with importOriginal

For more complex modules, you can use the `importOriginal` helper to preserve parts of the original module:

```javascript
import { describe, test, expect, vi } from 'vitest';

// Mock the module with importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue('mocked content'),
    writeFileSync: vi.fn()
  };
});

// Import the mocked module
import fs from 'fs';

test('should read from file', () => {
  const content = fs.readFileSync('file.txt');
  expect(content).toBe('mocked content');
});
```

### Mocking Time

For testing time-dependent code:

```javascript
import { describe, test, expect, vi } from 'vitest';

test('should handle timeouts', () => {
  // Mock timers
  vi.useFakeTimers();
  
  const callback = vi.fn();
  setTimeout(callback, 1000);
  
  // Fast-forward time
  vi.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalled();
  
  // Restore real timers
  vi.useRealTimers();
});
```

## Testing Asynchronous Code

### Promises

```javascript
import { describe, test, expect } from 'vitest';

test('should resolve with correct value', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe('expected value');
});

test('should reject with error', async () => {
  await expect(someFailingAsyncFunction()).rejects.toThrow('error message');
});
```

### Async/Await

```javascript
import { describe, test, expect, vi } from 'vitest';

test('should fetch data asynchronously', async () => {
  // Mock fetch
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ data: 'test' })
  });
  
  const result = await fetchData('https://example.com/api');
  
  expect(fetch).toHaveBeenCalledWith('https://example.com/api');
  expect(result).toEqual({ data: 'test' });
});
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it.

2. **Keep Tests Independent**: Each test should run independently of others.

3. **Use Descriptive Test Names**: Test names should clearly describe what is being tested.

4. **Follow the AAA Pattern**: Arrange, Act, Assert.

5. **Minimize Mocking**: Only mock what is necessary.

6. **Test Edge Cases**: Include tests for boundary conditions and error cases.

7. **Keep Tests Fast**: Slow tests discourage frequent testing.

8. **Use Setup and Teardown**: Use `beforeEach` and `afterEach` for common setup and cleanup.

9. **Test One Thing at a Time**: Each test should verify a single aspect of behavior.

10. **Avoid Test Interdependence**: Tests should not depend on the order of execution.

## Troubleshooting

### Common Issues and Solutions

1. **Module Import Errors**:
   - Ensure file paths are correct
   - Add `.js` extension to imports (required in ES modules)
   - Check that the module exports what you're trying to import

2. **Mocking Issues**:
   - Use `importOriginal` for partial mocking
   - Ensure mocks are defined before imports
   - Check that mock implementations match the expected interface

3. **Asynchronous Test Failures**:
   - Make sure to use `async/await` or return promises
   - Check for unhandled promise rejections
   - Verify that assertions are inside the async function

4. **Test Timeouts**:
   - Increase timeout in the test configuration
   - Check for infinite loops or hanging promises
   - Ensure all async operations complete

### Debugging Tests

1. **Use Console Logs**: Add `console.log` statements to debug test execution.

2. **Use the Vitest UI**: Run `npm run test:ui` to use the visual interface.

3. **Isolate Tests**: Run a single test file with `npx vitest run tests/path/to/file.test.js`.

4. **Check Test Environment**: Verify that the test environment matches your expectations.

## Examples from the Project

### Testing Utility Functions

```javascript
// tests/utils/config-merger.test.js
import { describe, test, expect } from 'vitest';
import { mergeWithOptions } from '../../src/utils/config-manager.js';

describe('Config Merger', () => {
  test('mergeWithOptions should merge config with options', () => {
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10,
      timeout: 30000
    };
    
    const options = {
      baseUrl: 'https://new-example.com',
      maxPages: 20
    };
    
    const result = mergeWithOptions(config, options);
    
    expect(result).toEqual({
      baseUrl: 'https://new-example.com',
      maxPages: 20,
      timeout: 30000
    });
  });
});
```

### Testing with Mocks

```javascript
// tests/utils/telemetry-simple.test.js
import { describe, test, expect, vi } from 'vitest';
import telemetryManager from '../../src/utils/telemetry-manager.js';

describe('Telemetry Manager', () => {
  test('initTelemetry should return an object with expected methods', () => {
    // Setup - create a spy on console.log to prevent output during test
    console.log = vi.fn();
    
    // Execute
    const telemetry = telemetryManager.initTelemetry({
      enabled: false,
      logToConsole: false
    });
    
    // Verify
    expect(telemetry).toBeDefined();
    expect(typeof telemetry.startTimer).toBe('function');
    expect(typeof telemetry.stopTimer).toBe('function');
    expect(typeof telemetry.recordMetric).toBe('function');
    expect(typeof telemetry.getMetrics).toBe('function');
    expect(typeof telemetry.generateReport).toBe('function');
  });
});
```

## Conclusion

Vitest provides a modern, fast, and easy-to-use testing framework that works well with ES modules. By following the best practices and examples in this guide, you can write effective tests for the Design Token Crawler project.

Remember that good tests are:
- Fast
- Independent
- Repeatable
- Self-validating
- Thorough

Happy testing!
