# Design Token Crawler - Issue Tracking

This directory contains issues related to the Design Token Crawler project. Issues are tracked in a structured format to ensure consistency and provide clear information about bugs, features, and improvements.

## Issue Structure

Issues are organized into two main directories:
- `open/`: Contains active issues that need to be addressed
- `resolved/`: Contains issues that have been fixed or implemented

## Issue Numbering

Issues are numbered sequentially using the format `ISSUE-XXX` where XXX is a three-digit number. The next available issue number is stored in `issue.json` and should be incremented each time a new issue is created.

## Creating a New Issue

To create a new issue:

1. Check the current next issue number in `issue.json`
2. Create a new markdown file in the `open/` directory using the format `ISSUE-XXX-brief-description.md`
3. Use the `issue.template.md` template to structure your issue
4. Fill in all required fields in the metadata section and the issue body
5. Update the `nextIssueNumber` in `issue.json` to the next available number

### Issue Template

Each issue should follow the template structure:

```markdown
---
id: ISSUE-XXX
title: Brief descriptive title
created: YYYY-MM-DD
status: open|resolved
resolution_date: YYYY-MM-DD (if resolved)
severity: low|medium|high|critical
category: bug|feature|improvement|documentation|performance|security
related_components: component1, component2
related_pages: page1, page2
---

# Title (same as metadata title)

## Description
A clear and concise description of the issue.

## Impact
How this issue affects users or the project.

## Reproduction Steps
1. Step-by-step instructions to reproduce the issue
2. Be as specific as possible

## Expected Behavior
What should happen when following the reproduction steps.

## Actual Behavior
What actually happens when following the reproduction steps.

## Screenshots/Evidence
Include screenshots, logs, or other evidence if applicable.

## Suggested Solution (for open issues)
Describe a potential solution or implementation approach.

## Solution Implemented (for resolved issues)
Describe how the issue was resolved.

## Related Issues
- ISSUE-XXX: Related issue title
- ISSUE-YYY: Another related issue

## History
- YYYY-MM-DD: Issue created
- YYYY-MM-DD: Additional context added
- YYYY-MM-DD: Issue resolved
```

### Severity Levels

- **Critical**: Blocks major functionality, no workaround available
- **High**: Significantly impacts functionality, workaround may be available
- **Medium**: Moderately impacts functionality, workaround available
- **Low**: Minor issue with minimal impact

### Categories

- **Bug**: Something isn't working as expected
- **Feature**: A new capability or enhancement
- **Improvement**: An enhancement to existing functionality
- **Documentation**: Improvements to documentation
- **Performance**: Issues related to speed or resource usage
- **Security**: Security-related issues

## Resolving an Issue

When an issue is resolved:

1. Update the issue's metadata:
   - Change `status` to `resolved`
   - Add `resolution_date` with the current date
2. Add a `Solution Implemented` section describing how the issue was resolved
3. Update the `History` section with the resolution date
4. Move the issue file from `open/` to `resolved/`

## Tracking Issue Numbers

The `issue.json` file contains the next available issue number. This should be updated whenever a new issue is created:

```json
{
  "nextIssueNumber": 16,
  "lastUpdated": "2024-04-10"
}
```

Always check this file to determine the next issue number to use.

## Best Practices

1. **Be specific**: Provide clear, detailed information
2. **Include context**: Add relevant background information
3. **Link related issues**: Connect related problems or features
4. **Use consistent formatting**: Follow the template structure
5. **Keep updated**: Update issues as new information becomes available
6. **Document resolution**: Clearly explain how issues were resolved
