---
id: ISSUE-015
title: Fix Config Parameter Not Being Passed to Page Evaluate in Extractors
created: 2024-04-10
status: resolved
resolution_date: 2024-04-10
severity: high
category: bug
related_components: extractors
related_pages: all
---

# Fix Config Parameter Not Being Passed to Page Evaluate in Extractors

## Description
The spacing, borders, and animations extractors were failing with a "ReferenceError: config is not defined" error. This was happening because the config parameter was not being passed correctly to the page.evaluate function, causing the evaluation functions to fail when they tried to access the config object.

## Impact
- Extractors failing to run properly
- Error messages in the console
- Incomplete extraction results
- Broken functionality for spacing, borders, and animations extraction

## Reproduction Steps
1. Run the spacing, borders, or animations extractor on any site
2. Observe the error message: "ReferenceError: config is not defined"

## Expected Behavior
The extractors should run without errors, with the config parameter properly passed to the page.evaluate function.

## Actual Behavior
The extractors failed with a "ReferenceError: config is not defined" error because the config parameter was not being passed to the page.evaluate function.

## Screenshots/Evidence
Error messages:
```
Analyzing page 1/20: https://pncb.ddev.site/
Error extracting spacing: page.evaluate: ReferenceError: config is not defined
at evaluateSpacing (eval at evaluate (:234:30), <anonymous>:34:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)

Analyzing page 1/20: https://pncb.ddev.site/
Error extracting borders: page.evaluate: ReferenceError: config is not defined
at evaluateBorders (eval at evaluate (:234:30), <anonymous>:52:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)

Analyzing page 1/20: https://pncb.ddev.site/
Error extracting animations: page.evaluate: ReferenceError: config is not defined
at evaluateAnimations (eval at evaluate (:234:30), <anonymous>:53:35)
at UtilityScript.evaluate (<anonymous>:236:17)
at UtilityScript.<anonymous> (<anonymous>:1:44)
```

## Solution Implemented
1. Modified the extractors to pass the config parameter directly to the page.evaluate function:
   ```javascript
   // Before
   const evaluationFn = createXEvaluationFunction(config);
   return await page.evaluate(evaluationFn);
   
   // After
   return await page.evaluate(evaluateX, config);
   ```

2. Renamed the evaluation functions from `createXEvaluationFunction` to `evaluateX` and modified them to accept the config parameter directly.

3. Fixed syntax errors with closing braces in the borders and animations extractors.

4. Added tests to verify that the config parameter is being passed correctly to the page.evaluate function.

5. Fixed an issue with the `shouldCloseBrowser` variable in the spacing extractor.

## Related Issues
None

## History
- 2024-04-10: Issue identified
- 2024-04-10: Issue fixed and resolved
