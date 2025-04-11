---
id: ISSUE-006
title: Incorrect File Path Checks Causing Duplicate Error Messages
created: 2023-07-10
resolved: 2024-05-15
status: resolved
severity: medium
category: bug
related_components: utils
related_pages: src/utils/cache-manager.js
---

# Incorrect File Path Checks Causing Duplicate Error Messages

## Description
The application incorrectly reports that files do not exist, even when they do. This is due to inconsistent path references in the cache-manager.js file. When the app runs, it always displays the following messages, regardless of whether the files actually exist:

```
The following changes were detected:
- Crawl results do not exist
- Crawl results do not exist
- Crawl results do not exist
- Crawl results do not exist
- Crawl results do not exist
- Crawl results do not exist
- Tokens file does not exist
- Report file does not exist
```

The issue is that the paths used to check for file existence are inconsistent between the `updateCacheForStep` function and the `checkIfStepNeedsRun` function.

## Impact
- Confusing user experience with duplicate error messages
- Incorrect reporting of file status
- Potential unnecessary re-running of steps that don't need to be run

## Reproduction Steps
1. Run the application with `node run.js`
2. Observe the duplicate error messages in the console output
3. Note that these messages appear even if the files exist

## Expected Behavior
The application should:
1. Correctly check if files exist using consistent paths
2. Only report each missing file once
3. Not report files as missing when they actually exist

## Actual Behavior
The application:
1. Uses inconsistent paths to check for file existence
2. Reports the same missing file multiple times
3. Reports files as missing even when they exist

## Root Cause Analysis
In the `updateCacheForStep` function, paths are constructed using:
```javascript
path.join(__dirname, '../../results/raw/crawl-results.json')
```

But in the `checkIfStepNeedsRun` function, paths are constructed using:
```javascript
path.join(__dirname, '../results/raw/crawl-results.json')
```

The difference in the relative paths (`../../results` vs `../results`) causes the file existence checks to fail, even when the files exist.

## Suggested Solution
Update all path references in the `checkIfStepNeedsRun` function to use consistent paths:

```javascript
// Line 219
const crawlResultsFile = path.join(__dirname, '../../results/raw/crawl-results.json');

// Line 234
const crawlResultsFile = path.join(__dirname, '../../results/raw/crawl-results.json');

// Line 254
const analysisFile = path.join(__dirname, `../../results/raw/${step}-analysis.json`);

// Line 295
const tokensFile = path.join(__dirname, '../../results/tokens/tokens.json');

// Line 321
const reportFile = path.join(__dirname, '../../results/reports/design-system-report.html');
```

## Related Issues
- None

## History
- 2023-07-10: Issue created
- 2024-05-15: Issue resolved - Fixed path inconsistencies in cache-manager.js by updating all paths to use '../../results/' consistently
