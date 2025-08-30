---
id: ISSUE-039
title: Migrate from Jest to Vitest for Better ES Module Support
created: 2024-05-15
status: open
severity: high
category: improvement
related_components: testing, jest, vitest
related_pages: tests/*, package.json, jest.config.js
---

# Migrate from Jest to Vitest for Better ES Module Support

## Description
The project is currently configured as an ES module project (`"type": "module"` in package.json), but we're experiencing issues with Jest tests due to incompatibilities between Jest's CommonJS-based architecture and ES modules. We need to migrate from Jest to Vitest, which has better native support for ES modules and will simplify our testing setup.

## Impact
- Current Jest tests are difficult to configure and maintain with ES modules
- Test failures are occurring due to module system incompatibilities
- Development velocity is reduced due to time spent troubleshooting test configuration issues
- Some tests may be skipped or simplified to avoid configuration problems

## Reproduction Steps
1. Run existing Jest tests with `npm test`
2. Observe errors related to ES module compatibility
3. Note the complex configuration in jest.config.js needed to support ES modules
4. Examine test files that use a mix of ES module and CommonJS patterns

## Expected Behavior
Tests should run reliably without complex configuration or workarounds for ES module support.

## Actual Behavior
Tests require extensive configuration to work with ES modules, and even then, some tests fail or require special handling due to module system incompatibilities.

## Screenshots/Evidence
Current issues include:
- Need for special Jest configuration with `extensionsToTreatAsEsm`
- Complex `moduleNameMapper` settings
- Issues with mocking modules in ES module context
- Need to add `.js` extensions to all imports

## Suggested Solution
1. Install Vitest as a development dependency
2. Create a Vitest configuration file
3. Update package.json scripts to use Vitest instead of Jest
4. Migrate existing Jest tests to Vitest:
   - Replace Jest API calls with Vitest equivalents
   - Update mocking syntax
   - Fix import paths
5. Ensure all tests pass with the new setup
6. Document the migration process for future reference

Vitest offers several advantages for our ES module-based project:
- Native ES module support without complex configuration
- Faster test execution
- Compatible API with Jest (minimal changes needed)
- Better hot module replacement for watch mode
- Simpler mocking system for ES modules

## Related Issues
- ISSUE-005: Linting Errors Throughout Codebase (related to module system inconsistencies)

## History
- 2024-05-15: Issue created
