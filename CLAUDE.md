# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
The Design Token Crawler is a Node.js tool that:
- Crawls websites to extract design elements (typography, colors, spacing, borders, animations)
- Generates standardized design tokens and reports
- Creates documentation for design systems

## Build and Test Commands
- Start app: `npm start` or `npm run crawl`
- Run specific extractor: `npm run crawl:[typography|colors|spacing|borders|animations]`
- Run with options: `node run.js --url https://example.com --only colors,typography`
- Run lint: `npm run lint` (fix with `npm run lint:fix`)
- Run all tests: `npm test`
- Run single test file: `npm test -- tests/path/to/file.test.js`
- Run single test case: `npm test -- -t "test description"`
- Run tests with watch: `npm run test:watch`
- Run test coverage: `npm run test:coverage`

## Code Style Guidelines
- Language: JavaScript only (no TypeScript)
- Types: JSDoc comments for type documentation (@typedef, @param, @returns)
- Imports: ES modules with import/export (tests use CommonJS)
- Functions: Regular for exports, arrow for callbacks
- Naming: camelCase for variables/functions, hyphenated-names for files
- Error handling: try/catch with detailed error objects
- Formatting: 2-space indent, max 120 chars line length, single quotes
- Always add JSDoc comments for functions with @param and @returns
- Tests use Jest with describe/test blocks and AAA pattern

## Project Structure
- Source code: `/src/`
  - `/src/crawler/` - Website crawling functionality
  - `/src/extractors/` - Design element extraction modules
  - `/src/generators/` - Token and report generation
  - `/src/utils/` - Utility functions and helpers
- Tests: `/tests/`
  - Jest is used for all unit testing
  - Tests mirror the src directory structure
  - Each module has a corresponding test file (e.g., `extract-colors.js` → `extract-colors.test.js`)
  - Tests use `describe` blocks for grouping and `test` for individual test cases
  - Unit tests follow the Arrange-Act-Assert pattern
  - Mock external dependencies (fs, Playwright) using Jest mocks

## Architecture Patterns
- Extractors process specific design elements and save to results/raw/*.json
- Config managed via config-manager.js with defaults + CLI overrides
- Async/await for browser automation with Playwright
- Caching system to avoid redundant processing between runs

## Issue Management
- Issues are tracked in files at `/ai/issues/`
- Open issues are in `/ai/issues/` (root), resolved in `/ai/issues/resolved/`
- Use `issue.template.md` format for new issues
- Issue numbering follows `ISSUE-XXX` format (3-digit sequential number)
- Check `issue.json` for the next available issue number
- Issues include metadata (id, status, severity) and structured sections
- When resolving an issue, update status and move to the resolved directory

## AI Recommendations
- When asked to prepare recommendations, create a markdown file in `/ai/insights/`
- Name files descriptively (e.g., `feature-recommendations.md`, `refactoring-plan.md`)
- Include detailed analysis, reasoning, and specific action items
- Format with clear headings, bullet points, and code examples when relevant
- Follow existing files in the insights directory as structural examples

## Documentation
- User-targeted documentation goes in `/docs/` directory
- Technical documentation for extractors is in `/docs/extractors/`
- Use markdown format with clear headings and examples
- Include usage examples and configuration options
- For new features, create corresponding documentation
- Focus on clarity for end users rather than implementation details

## Ignored Directories
- The following directories should be ignored (per .gitignore):
  - `/results/` - Contains generated outputs (recreated at runtime)
  - `/node_modules/` - External dependencies 
  - `/coverage/` - Test coverage reports
  - `/backup/` - Backup files
  - Other ignored files: `.crawl-cache.json`, `.idea`, `config.json`
- Do not modify or analyze files in these directories unless specifically requested