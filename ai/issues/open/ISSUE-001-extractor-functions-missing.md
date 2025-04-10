---
id: ISSUE-001
title: Missing Extractor Functions for Single Page Analysis
created: 2023-07-10
status: open
severity: medium
category: code-organization
related_components: extractors
related_pages: src/extractors/extract-typography.js, src/extractors/extract-colors.js
---

# Missing Extractor Functions for Single Page Analysis

## Description
The extractor modules (extract-typography.js and extract-colors.js) were missing functions to extract data from a single page. The modules only had functions to extract data from crawled pages, but not from a single page, which made it difficult to test and reuse the extraction logic.

## Impact
- Reduced code reusability
- Difficult to test the extraction logic in isolation
- Potential for code duplication if other parts of the application need to extract data from a single page

## Reproduction Steps
1. Try to import and use `extractTypographyFromPage` or `extractColorsFromPage` functions
2. Observe that these functions don't exist in the respective modules

## Expected Behavior
The extractor modules should provide functions to extract data from a single page, making the code more modular and testable.

## Actual Behavior
The extractor modules only provided functions to extract data from crawled pages, with the extraction logic embedded within these functions.

## Suggested Solution
Add `extractTypographyFromPage` and `extractColorsFromPage` functions to the respective modules, extracting the page-specific logic from the existing functions. Export these functions alongside the existing ones.

## Related Issues
- None

## History
- 2023-07-10: Issue created
- 2023-07-10: Fixed by adding the missing functions and updating the module exports
