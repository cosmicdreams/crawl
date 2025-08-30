# UI V3: Technical Specification

## Overview
This document outlines the workflow, features, components, and technologies required to build the UI V2 for the application. The goal is to create a user-friendly interface for scanning and analyzing Drupal sites, with features like path visualization, Drupal integration, and seamless user interaction.

---

## User Flow

### 1. Initial Page
- **User Input**:
  - Provide the root URL of the site.
  - Validate that the site is local (e.g., must match the pattern `https://<name>.ddev.site`).
  - Use sensible defaults for most other configurations.  User can modify settings but can also just submit form.
- **Display**
  - The config of the app as an editible form
  - User accepts config by initializing initial scan.

#### Initial Site Scan
- **Actions**:
  - Perform an initial scan of the site using the provided root URL.
  - Generate the following files:
    - `config.json`: Contains the root URL and sensible defaults.
    - `paths.json`: Contains the discovered paths.
  - Display a component that visualizes the paths and their hierarchy (similar to a directory listing).
  - If a sitemap is available, expand the paths using the sitemap data.
  - Execute Drupal site check

#### Drupal Site Check
- **Actions**:
  - Determine if the site is a Drupal site.
  - If it is, check for the presence of a helper module.
  - Fetch the site manifest (`/site-manifest.json`) to obtain detailed information about the site's anatomy.
  - Use the manifest to:
    - Identify all content types, views, blocks, and paragraphs.
    - Map paths to their corresponding templates.
    - Generate a registry of reusable frontend components.
  - Leverage the helper module's JSON API for collections of content types, views, paragraphs, and blocks.

#### Path Synthesis and Distillation
- **Goals**:
  - Use the site manifest/sitemap to refine the collection of paths.
  - Focus on unique kinds of pages based on content types, blocks, paragraphs, or views.
  - Optionally scan two instances of each unique kind.

#### User Intervention
- **User Review**:
  - Present the results of the scan to the user for review before proceeding.
  - Display a left sidebar showing the directory structure of paths. Only paths selected for scanning are shown.
  - Allow the user to click on a path to view a modal displaying similar paths identified by the process.
  - Provide access to the generated `config.json` and `paths.json` files for direct editing outside the UI.
  - Include a feature to refresh the displayed data after the user makes edits, ensuring their changes are reflected.
  - User can click the multi-step form's "Extract" button to advance to phase 2

#### Component Extraction
- Benfits from helper module's crawl-manifest.json
- Will get a collection of component machine_names to look for
- If Drupal is using twig debug mode, Scan the html code comments for use of pre-approved components
- If helper module isn't detected, if crawl-manifest.json doesn't have a top level components key in the json object, or if the user just wants to add onto knowledge the helper gives, the user can edit the components.json file with additional machine_names for components to look for.    

### 2. Extract
- The app executes all extractors:
  - Typography
  - Colors
  - Spacing
  - Borders
  - Animations
  - Components
- Each extractor produces a corresponding JSON file (e.g., `typography.json`, `colors.json`, etc.) that can be reviewed to understand the app's reasoning and findings.
- A component extractor runs in parallel, identifying unique non-global components present in the crawled pages.
- extractor json files can be reviewed in the Editor component.
- When user is ready they click the "Synthesize" button to move to the final step.

### 3. Synthesize
- Parses the extractor's json files into deliverables.  End goal is to produce
* Styleguide: a simple html document showing a nice breakout of all the styles gathered.
* Component library: A populated Storybook that shows all the components gathered.
* Design tokens: shown in the editor component.


---

## Features

### 1. Path Visualization
- A directory-style component to display the hierarchy of paths.
- Highlight paths selected for scanning.

### 2. Modal for Similar Paths
- A modal view to show paths that are similar to a selected path.
- Allow users to confirm or adjust the selection of similar paths.

### 3. File Access and Refresh
- Provide links or buttons to open `config.json` and `paths.json` in an external editor.
- Include a "Refresh" button to reload the data and update the UI after external edits.

### 4. Drupal Integration
- Automatically detect Drupal sites and check for the helper module.
- Use the helper module to fetch JSON data for content types, views, paragraphs, and blocks.

### 5. Sensible Defaults
- Preconfigure most settings to reduce user input requirements.
- Validate the root URL to ensure it matches the expected local site pattern.

### 6. User-Friendly Design
- Intuitive navigation with a left sidebar for path selection.
- Clear modals and visualizations to guide user decisions.
- Seamless integration of manual edits and automated processes.

### 7. Testing
- Implement automated integration tests to ensure the UI components work seamlessly together.

---

## Components

### 1. Global Header
- **Purpose**: Display the app name and provide a dropdown for selecting or switching between site configurations.
- **Features**:
  - Dropdown to select the active configuration.
  - Display the name of the app prominently.
  - Configurations include:
    - `config.json`: Configures the app.
    - `paths.json`: Initially generated paths, editable by the user.
    - `components.json`: Generated components, also editable by the user.
    - Additional configurations as needed.

### 2. File Directory Sidebar
- **Purpose**: Visualize the collection of paths in a collapsible and expandable directory-like structure.
- **Design**:
  - Curved borders.
  - White background color.
  - Dark font for readability.
- **Features**:
  - Collapsible and expandable paths to show child paths.
  - Display metadata about a path when clicked, including:
    - Title of the path.
    - Collection of similar paths grouped under this path.
    - Drupal Content type inferred from the scan.
    - Drupal Components identified on the path.
    - Drupal Fields identified on the path.

### 3. Browser Component
- **Purpose**: Display the actual page corresponding to a clicked path and provide visual cues for Drupal templates used on the page.
- **Features**:
  - Render the page associated with the selected path.
  - Parse HTML comments to identify Drupal templates (Twig debug mode annotations).
  - Highlight elements with borders based on their type:
    - **Global elements**: Light blue borders.
    - **Block elements**: Light green borders.
    - **Components**: Light purple borders.
    - **Drupal views**: Light red borders.
  - **Click Interaction**: When the user clicks an element, add the element to the `components.json` file. The file will store a collection of components identified during the initial scan and user interactions.
  - **Hover Interaction**: When the user hovers over an element, display the name of the element (as determined by the HTML comments) in a tooltip or overlay.
  - Provide a toggle to enable or disable the visual borders for better user focus.

### 4. Editor Component
- **Purpose**: Display and edit the contents of files generated during the extraction and generation steps.
- **Usage**:
  - In Step 2, the Editor shows extracted data files (e.g., `typography.json`, `colors.json`, etc.).
  - In Step 3, the Editor displays generated files such as the styleguide, component library, or design token files.
- **Features**:
  - Syntax-highlighted view and editing for JSON, CSS, and other relevant formats.
  - Toggle between the Editor and Browser component:
    - For styleguide and component library files, users can switch to a browser preview to see the rendered output.
    - For data files, users can review and edit the raw content directly.
  - Seamless integration with the multi-step flow, updating the displayed file as the user progresses through steps.
  - Option to save changes and refresh the UI to reflect edits.

---

## Integration with Current UI

The new UI will integrate seamlessly with the existing app's phases, including data extraction, style guide generation, component library creation, and design token generation. The following enhancements will ensure a natural flow and reuse of common elements:

### 1. File Directory Component
- Reuse the file directory-like component to display a tree structure of deliverables.
- Deliverables include:
  - Generated style guides.
  - Component libraries.
  - Design tokens.
  - Extracted raw data.

### 2. Browser Component
- Reuse the browser component (or a similar variation) to display:
  - The contents of configuration files.
  - Raw data compiled by extractors.
  - Generated deliverables for review.
- Features:
  - Provide visual cues and interactivity for better user understanding.
  - Allow users to navigate and inspect the deliverables and raw data efficiently.

---

## Phased Development

To ensure a smooth transition and successful implementation of the new UI, the development process will be divided into the following phases:

### 1. Initial Proof of Concept
- **Objective**: Validate the basic design and functionality of the new UI.
- **Tasks**:
  - Develop a minimal version of the frontend to demonstrate the core ideas.
  - Include key components such as the file directory and browser components.
  - Focus on path visualization and basic interactivity.
  - Gather feedback from stakeholders to confirm alignment on the design and functionality.

### 2. Backup of Existing UI
- **Objective**: Preserve the current UI to ensure we can revert if needed.
- **Tasks**:
  - Create a complete backup of the existing UI codebase.
  - Document the current UI's functionality and structure for reference.
  - Store the backup in a separate, easily accessible location.

### 3. Incremental Development of New UI
- **Objective**: Build the new UI in manageable increments to ensure stability and quality.
- **Tasks**:
  - Implement the new UI features in phases, starting with the most critical components.
  - Continuously test and validate each feature before moving to the next.
  - Maintain compatibility with the existing app during development.

### 4. Integration with Existing App
- **Objective**: Seamlessly integrate the new UI with the app's existing functionality.
- **Tasks**:
  - Replace the old UI with the new one in a controlled manner.
  - Ensure all existing features, such as data extraction and style guide generation, work with the new UI.
  - Address any compatibility issues that arise during integration.

### 5. User Testing and Feedback
- **Objective**: Ensure the new UI meets user expectations and requirements.
- **Tasks**:
  - Conduct user testing sessions to gather feedback on the new UI.
  - Identify and address usability issues or missing features.
  - Iterate on the design and functionality based on user feedback.

### 6. Final Deployment
- **Objective**: Launch the new UI as the default interface for the app.
- **Tasks**:
  - Perform a final round of testing to ensure stability and performance.
  - Update documentation to reflect the new UI.
  - Deploy the new UI to production and monitor for any post-launch issues.

---

## Technologies Used

### Frontend
- **Tailwind CSS**:
  - A utility-first CSS framework to ensure the UI is visually appealing and easy to style.
  - Enables rapid prototyping and consistent design across components.
- **ReactFlow**:
  - A library for building interactive node-based UIs.
  - Ideal for visualizing workflows, hierarchies, and relationships, such as the path visualization component.
- **TypeScript**:
  - Provides static typing for JavaScript, ensuring type safety and reducing runtime errors.
  - Enhances developer productivity and code maintainability.

### Testing
- **Vitest**:
  - A fast and lightweight testing framework for unit and integration tests.
  - Seamlessly integrates with TypeScript and modern frontend tooling.
- **Playwright**:
  - A robust framework for end-to-end (e2e) testing of user journeys.
  - Supports cross-browser testing and ensures the app behaves as expected in real-world scenarios.

### Additional Tools
- **Node.js**:
  - Used for building and running the backend services and scripts.
- **JSON API**:
  - Utilized for fetching structured data from the Drupal helper module.
- **Caching**:
  - Leverages Drupal's caching mechanisms to optimize performance and reduce redundant computations.

