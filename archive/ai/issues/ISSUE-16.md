---
id: ISSUE-16
title: CommonJS Module Import Compatibility Issues
created: 2024-04-10
status: open
severity: high
category: build
related_components: ["src/utils/ui-utils.js", "src/utils/colors.js"]
related_pages: []
---

# CommonJS Module Import Compatibility Issues

## Description
Several CommonJS modules are being imported incorrectly in an ES module context. The affected modules include:
- cli-progress
- ora
- boxen
- table
- inquirer
- figlet
- chalk

These modules are being imported using ES module syntax, but they are CommonJS modules that require special handling when used in an ES module context.

## Impact
The application fails to start with errors like:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /Users/Chris.Weber/Tools/crawl/node_modules/cli-progress/lib/cli-progress.js from /Users/Chris.Weber/Tools/crawl/src/utils/ui-utils.js not supported.
```

## Reproduction Steps
1. Run the application
2. Observe the error messages related to module imports

## Expected Behavior
The application should start without module import errors.

## Actual Behavior
The application fails to start due to module import errors.

## Screenshots/Evidence
Error message:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /Users/Chris.Weber/Tools/crawl/node_modules/cli-progress/lib/cli-progress.js from /Users/Chris.Weber/Tools/crawl/src/utils/ui-utils.js not supported.
```

## Suggested Solution
1. Update the imports to use CommonJS-compatible syntax:
```javascript
import pkg from 'module-name';
const { neededExport } = pkg;
```

2. Consider updating package.json to use the "type": "module" field and ensure all dependencies are compatible with ES modules.

## Related Issues
- None

## History
- 2024-04-10: Issue created 