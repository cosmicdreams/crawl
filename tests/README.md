# Unit Tests for Design Token Crawler

This directory contains unit tests for the Design Token Crawler application. The tests are organized to mirror the structure of the source code.

## Running Tests

To run the tests, use one of the following npm commands:

```bash
# Run all tests
npm test

# Run tests in watch mode (automatically re-run when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

The tests are organized as follows:

- `tests/utils/` - Tests for utility modules
- `tests/extractors/` - Tests for data extraction modules
- `tests/generators/` - Tests for token and report generation

## Coverage Reports

When running tests with coverage (`npm run test:coverage`), a coverage report will be generated in the `coverage` directory. This report shows which parts of the code are covered by tests and which are not.

## Writing Tests

When writing new tests, follow these guidelines:

1. Create test files with the `.test.js` or `.spec.js` extension
2. Organize tests to mirror the source code structure
3. Use descriptive test names that explain what is being tested
4. Use the AAA pattern (Arrange, Act, Assert) for test structure
5. Mock external dependencies like file system and network requests
6. Test both success and failure cases

## Test-Driven Refactoring

As we add more tests, we'll identify opportunities to refactor the code to make it more maintainable and testable. This might include:

1. Extracting pure functions from larger modules
2. Reducing dependencies between modules
3. Improving error handling
4. Standardizing interfaces between components
5. Removing duplicate code

The goal is to use the test creation process to guide improvements to the codebase.
