---
id: ISSUE-013
title: Add Telemetry and Performance Metrics to Extractors
created: 2024-04-10
resolved: 2024-05-15
status: resolved
severity: medium
category: performance
related_components: extractors, utils
related_pages: all
---

# Add Telemetry and Performance Metrics to Extractors

## Description
Collecting performance metrics could help identify bottlenecks and optimize the extraction process. Currently, there's no systematic way to measure performance or identify slow operations. Adding telemetry would provide insights into which parts of the extraction process are taking the most time and where optimizations would be most beneficial.

## Impact
- Difficult to identify performance bottlenecks
- No data to guide optimization efforts
- Unclear which extractors or operations are slowest
- No way to measure improvements over time

## Reproduction Steps
1. Run any extractor on a site
2. Try to determine which parts of the extraction process are taking the most time
3. Note that there's no detailed timing information available

## Expected Behavior
The extraction process should collect and report detailed timing information for each step, allowing users to identify bottlenecks and measure improvements.

## Actual Behavior
The extraction process only provides basic logging without detailed timing information, making it difficult to identify bottlenecks.

## Screenshots/Evidence
N/A

## Suggested Solution
Implement telemetry collection for all extractors:

1. Create a `telemetry-manager.js` utility in the `utils` directory
2. Implement functions for:
   - Starting/stopping timers
   - Recording metrics
   - Generating reports
3. Modify extractors to use the telemetry manager
4. Add telemetry configuration options to the default config

Example implementation:
```javascript
async function extractWithTelemetry(page, url, config, logger) {
  const startTime = performance.now();

  try {
    const result = await extractFromPage(page, url, config);

    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.log(`Extraction completed in ${duration.toFixed(2)}ms`);

    return {
      ...result,
      telemetry: {
        duration,
        timestamp: new Date().toISOString(),
        url
      }
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.error(`Extraction failed after ${duration.toFixed(2)}ms: ${error.message}`);
    throw error;
  }
}
```

## Related Issues
- ISSUE-011: Implement Caching Mechanism for Extractors
- ISSUE-012: Implement Parallel Processing for Extractors

## History
- 2024-04-10: Issue created
- 2024-05-15: Issue resolved - Implemented telemetry manager and integrated it with all extractors
