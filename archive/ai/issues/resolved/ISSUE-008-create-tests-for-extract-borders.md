---
id: ISSUE-008
title: Create tests for extract-borders.js
created: 2023-11-15
status: resolved
severity: medium
category: testing
related_components: extractors
related_pages: borders-analysis
---

# Create tests for extract-borders.js

## Description
We need to implement unit tests for the borders extractor to verify it correctly extracts border widths, styles, radii, and shadows from web pages. This will help ensure the extractor works correctly and make it easier to refactor the code in the future.

## Impact
Without proper tests, we can't be confident that the borders extractor is working correctly. Adding tests will:
- Help identify bugs in the current implementation
- Make it safer to refactor the code
- Provide documentation for how the extractor should work

## Reproduction Steps
1. Create a new test file at `tests/extractors/extract-borders.test.js`
2. Implement tests for the main extraction function and helper functions
3. Run the tests with `npm test`

## Expected Behavior
All tests should pass, verifying that the borders extractor:
- Correctly extracts border properties from pages
- Properly identifies different border styles
- Extracts border radii values
- Extracts box shadows
- Gracefully handles errors
- Generates the expected output format

## Actual Behavior
Currently, there are no tests for the borders extractor.

## Screenshots/Evidence
N/A

## Suggested Solution
Create a test file following the pattern of existing extractor tests. The test file should:

1. Mock dependencies (fs, playwright)
2. Test the main `extractBordersFromCrawledPages` function
3. Test the `extractBorders` function
4. Test error handling

Additionally, the extractor could be refactored to make it more testable:
- Extract the page evaluation logic into a separate function that can be tested independently
- Make the config object injectable for testing
- Add an `extractBordersFromPage` function similar to other extractors
- Separate the visualization generation into a more testable function

## Related Issues
- ISSUE-007: Create tests for extract-spacing.js
- ISSUE-009: Create tests for extract-animations.js
- ISSUE-010: Create tests for extract-components.js

## History
- 2023-11-15: Issue created
