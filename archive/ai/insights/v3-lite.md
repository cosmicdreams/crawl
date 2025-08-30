# Design Token Crawler v3-lite: Team Challenge

## Vision
A modern, TypeScript-based design token crawler and pipeline, with a visual UI, robust testing, and deep Drupal integration.

## Core Principles
- TypeScript everywhere
- Test-driven: Vitest & Playwright
- Visual pipelines: ReactFlow UI
- API-first: CLI & UI parity
- Drupal insights via custom module

## System Overview
- **Pipeline Engine**: Modular ETL (crawl, extract, transform, generate), each stage as a TypeScript class.
- **Visual UI**: React + ReactFlow, drag-and-drop pipeline editor, sidebar for config/logs, browser preview.
- **API Layer**: RESTful, drives both UI and CLI.
- **Drupal Integration**: Custom module for tokens, content types, blocks; two-way sync.

## User Flow

### Multi-Step Form (with Back/Next Navigation)

#### Step 1: Simple Config & Initial Crawl
- User sees a form with:
  - A required text field for the base URL (must match `<name>.ddev.site` for local sites).
  - Additional fields for sensible defaults (optional to change).
- User submits the form to start the initial crawl.

##### Initial Crawl Actions
- App checks if the site is Drupal.  
- Checks for the `crawl_helper` module and `/crawl-manifest.json` endpoint.
- Checks for `sitemap.xml`.
- Checks if Drupal is using twig debug mode.  (Every template wrapped in html code comments)
- Uses both manifest and sitemap to assemble a collection of paths.
- Presents the paths in a Windows Explorer-like folder hierarchy.
- User can view and edit the discovered paths in the UI.
- User can go back to previous steps to adjust config if needed.
- As the user clicks on a path, the user sees the page open in a browser component.

##### Browser component
- shows a light border around every template.
- content type 

#### Step 2: Path Submission & Extraction
- User submits selected paths to crawl.
- Extractors scan these paths and discover unique CSS styles from the pages.
- Extraction results will later be used to build a styleguide, component library, and organized CSS variables/files.
- An intelligent component extractor also identifies UI components and begins building a Storybook with discovered components.
- Ideally, extracted components are output as Drupal 11 Single Directory Components (Twig templates with YAML fixtures), ready for direct use in Drupal projects.

##### Step 2 User interactions
- User can review the extract json files 
- User can edit the extracted json files
- User can click the refresh button to ensure the changes are used by the system
- User sees statistics on what has been found.

#### Step 3: Generate
- The output of the extractors is used to create:
  - Design tokens
  - Styleguide (with CSS Variables and separate CSS files for foundational styles)
  - Component library (Storybook)

## Features
- Visual pipeline editing & execution
- Composable stages: crawler, extractors, transformers, generators, Drupal sync
- Live dataflow visualization
- Extensible & testable
- Out-of-the-box Drupal support

## Example Pipeline
1. Crawl site
2. Extract tokens (color, typography, etc.)
3. Transform & dedupe
4. Generate assets (CSS, JSON, Figma, styleguide, component library)

## Developer Experience
- Strong typing
- Hot reloading
- Storybook/Playwright for UI & pipeline tests
- CLI & UI feature parity

## Testing
- Vitest: unit/integration
- Playwright: e2e
- Realistic fixtures

## Tech Stack
- TypeScript, React, ReactFlow
- Vitest, Playwright
- Express API
- Custom Drupal module

## Next Steps
- Define pipeline interfaces/types
- Build ReactFlow editor
- Implement Drupal module
- Write tests for all stages
- Iterate and build the best design token crawler!