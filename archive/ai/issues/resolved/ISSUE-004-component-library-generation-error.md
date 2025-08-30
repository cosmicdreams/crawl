---
id: ISSUE-004
title: Component Library Generation Error - Cannot read properties of undefined
created: 2023-07-10
status: resolved
severity: high
category: bug
related_components: extractors
related_pages: src/extractors/extract-components.js
---

# Component Library Generation Error - Cannot read properties of undefined

## Description
When generating the component library, the application crashes with the error: `TypeError: Cannot read properties of undefined (reading '0')`. This occurs in the `generateComponentLibrary` function when trying to access `component.instances[0]` which is undefined.

## Impact
- Component library generation fails completely
- The crawler process crashes when components are enabled
- No component report is generated

## Reproduction Steps
1. Run the crawler with component extraction enabled
2. Wait for the crawl to complete
3. When it reaches the component library generation step, the application crashes with the error:
```
Error: TypeError: Cannot read properties of undefined (reading '0')
at /Users/Chris.Weber/Tools/crawl/src/extractors/extract-components.js:445:73
```

## Expected Behavior
The component library generation should handle cases where a component doesn't have any instances, either by:
1. Skipping components without instances, or
2. Providing default values when instances are missing

## Actual Behavior
The code attempts to access `component.instances[0]` without first checking if `component.instances` exists or has any elements, causing the application to crash.

## Suggested Solution
Add a check before accessing `component.instances[0]` to ensure it exists:

```javascript
// Before creating a new component, check if instances exist
if (!component.instances || component.instances.length === 0) {
  component.instances = [{ url, html, classes, attributes }];
}

// Then add the component to componentsByType
componentsByType[type].push({
  signature,
  type,
  name: generateComponentName(type, classes, component.instances[0]),
  description: generateComponentDescription(type, classes, attributes, component.instances[0]),
  instances: component.instances
});
```

Alternatively, modify the `generateComponentName` and `generateComponentDescription` functions to handle the case where the instance parameter is undefined.

## Related Issues
- None

## History
- 2023-07-10: Issue created
- 2023-11-15: Issue resolved - Added check for undefined instances before accessing component.instances[0]
