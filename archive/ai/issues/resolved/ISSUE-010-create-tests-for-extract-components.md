---
id: ISSUE-010
title: Create tests for extract-components.js
created: 2023-11-15
status: resolved
severity: medium
category: testing
related_components: extractors
related_pages: component-library
---

# Create tests for extract-components.js

## Description
We need to implement unit tests for the components extractor to verify it correctly identifies, extracts, and processes UI components from web pages. This will help ensure the extractor works correctly and make it easier to refactor the code in the future.

## Impact
Without proper tests, we can't be confident that the components extractor is working correctly. Adding tests will:
- Help identify bugs in the current implementation
- Make it safer to refactor the code
- Provide documentation for how the extractor should work

## Reproduction Steps
1. Create a new test file at `tests/extractors/extract-components.test.js`
2. Implement tests for the main extraction function and helper functions
3. Run the tests with `npm test`

## Expected Behavior
All tests should pass, verifying that the components extractor:
- Correctly identifies components using selectors
- Extracts component properties and styles
- Generates component libraries
- Creates component reports
- Generates component JavaScript
- Gracefully handles errors
- Generates the expected output format

## Actual Behavior
Currently, there are no tests for the components extractor.

## Screenshots/Evidence
N/A

## Suggested Solution
Create a test file following the pattern of existing extractor tests. The test file should:

1. Mock dependencies (fs, playwright)
2. Test the `extractComponents` function
3. Test the `generateComponentLibrary` function
4. Test the `saveComponentLibrary` function
5. Test the `generateComponentReport` function
6. Test error handling

Additionally, the extractor could be refactored to make it more testable:
- Extract the page evaluation logic into a separate function that can be tested independently
- Make the config object injectable for testing
- Separate the component identification logic from the extraction logic
- Improve error handling for component extraction
- Add more explicit return types and validation

## Related Issues
- ISSUE-007: Create tests for extract-spacing.js
- ISSUE-008: Create tests for extract-borders.js
- ISSUE-009: Create tests for extract-animations.js

## History
- 2023-11-15: Issue created
