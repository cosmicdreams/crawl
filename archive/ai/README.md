# AI Directory

This directory contains AI-related resources and data for the design token crawler. Unlike the `results` directory which contains app-level concerns that can be regenerated, this directory contains platform-level concerns that persist across runs.

## Structure

- **prompts/**: Contains prompt templates for analyzing the design system and components
  - `component-analysis.md`: Prompts for analyzing component patterns and inconsistencies
  - `design-system-review.md`: Prompts for reviewing the overall design system
  - `accessibility-check.md`: Prompts for checking accessibility issues

- **issues/**: A file-based issue tracking system
  - `issue.template.md`: Template for creating new issues
  - `open/`: Contains open issues that need to be addressed
  - `resolved/`: Contains resolved issues for reference

- **insights/**: Contains AI-generated insights and recommendations
  - `patterns.json`: Structured data about design patterns identified across the site
  - `recommendations.md`: Specific recommendations for improving the design system

## Usage

This directory is preserved when running the `nuke` command, ensuring that valuable insights and analysis persist across different crawl sessions.

### Creating Issues

To create a new issue:

1. Copy the `issue.template.md` file to `issues/open/` with a descriptive name
2. Fill in the template with details about the issue
3. When resolved, move the file to `issues/resolved/`

### Using Prompts

The prompts in the `prompts/` directory can be used with AI assistants to analyze the design system. Simply copy the content of a prompt file and use it with your preferred AI assistant, referencing the data in the `results/` directory.

### Insights

The `insights/` directory contains AI-generated analysis and recommendations. These files are updated automatically during the crawl process and can be referenced when making decisions about the design system.
