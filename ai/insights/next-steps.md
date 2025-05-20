# Next Steps for Design Token Crawler v2

This document outlines the next steps to complete the Design Token Crawler v2, ensure its maintainability, and add advanced features to enhance its functionality and usability.

## Goals

1. **Complete the app as a finished product**
2. **Ensure long-term maintainability**
3. **Add a ReactFlow-based UI for visualizing data processing**
4. **Prepare for an "inside-out" data acquisition approach**

---

## Step 1: Complete the App

### 1.1 Finalize Core Features
- **Implement Remaining Extractors**: Complete the implementation of extractors for typography, spacing, borders, and animations.
- **Enhance Token Generation**: Ensure the token generator supports all required formats (CSS, JSON, Figma) and includes robust error handling.
- **Optimize Crawler**: Improve the crawler to handle edge cases, such as infinite loops, redirects, and large websites.

### 1.2 Testing and Quality Assurance
- **Unit Tests**: Write comprehensive unit tests for all core modules.
- **Integration Tests**: Test the interaction between pipeline stages.
- **End-to-End Tests**: Use Playwright to simulate real-world usage scenarios.
- **Performance Testing**: Benchmark the app to ensure it performs well on large datasets.

### 1.3 Documentation
- **User Guide**: Create a detailed user guide explaining how to use the app.
- **Developer Guide**: Document the codebase to help new developers understand the architecture and contribute effectively.

---

## Step 2: Ensure Long-Term Maintainability

### 2.1 Code Quality
- **Adopt Coding Standards**: Use ESLint and Prettier to enforce consistent coding standards.
- **Refactor Code**: Simplify complex modules and remove redundant code.
- **TypeScript Best Practices**: Ensure all modules use strict typing and avoid `any` types.

### 2.2 Modular Architecture
- **Decouple Components**: Ensure each module has a single responsibility and minimal dependencies.
- **Reusable Components**: Create reusable UI components for ReactFlow nodes and other UI elements.

### 2.3 Continuous Integration
- **Set Up CI/CD**: Use GitHub Actions or another CI/CD tool to automate testing and deployment.
- **Code Reviews**: Establish a code review process to maintain code quality.

### 2.4 Dependency Management
- **Update Dependencies**: Regularly update npm packages to avoid security vulnerabilities.
- **Lock File Maintenance**: Use `npm audit` and `npm dedupe` to keep the dependency tree clean.

---

## Step 3: Add ReactFlow-Based UI for Data Visualization

### 3.1 Design the UI
- **Pipeline Visualization**: Use ReactFlow to create a visual representation of the ETL pipeline.
- **Node Details**: Allow users to click on nodes to view details about each stage, including input, output, and processing time.
- **Real-Time Updates**: Show real-time progress as the pipeline processes data.

### 3.2 Implement the UI
- **Custom Nodes**: Create custom ReactFlow nodes for each pipeline stage (e.g., Crawler, Extractor, Token Generator).
- **Drag-and-Drop**: Allow users to rearrange pipeline stages using drag-and-drop.
- **Save and Load Pipelines**: Enable users to save pipeline configurations and reload them later.

### 3.3 Integrate with Backend
- **API Integration**: Connect the ReactFlow UI to the backend API to fetch pipeline status and results.
- **Error Handling**: Display errors in the UI when a pipeline stage fails.

---

## Step 4: Prepare for "Inside-Out" Data Acquisition

### 4.1 Research Drupal JSON API
- **Understand Capabilities**: Investigate the Drupal JSON API to understand how to fetch rendered content and design tokens.
- **Authentication**: Determine the best authentication method (e.g., OAuth2, API keys).
- **Data Structure**: Identify the structure of the data returned by the API.

### 4.2 Design Inside-Out Approach
- **API Integration**: Create a new pipeline stage to fetch data directly from the Drupal JSON API.
- **Data Transformation**: Transform the fetched data into a format compatible with the existing pipeline.
- **Two-Way Sync**: Implement a mechanism to push updates back to Drupal.

### 4.3 Modularize Data Acquisition
- **Abstract Data Sources**: Create a common interface for data acquisition modules, whether scraping websites or fetching from APIs.
- **Add Extensibility**: Allow new data sources to be added with minimal changes to the core pipeline.

---

## Conclusion

By following this plan, the Design Token Crawler v2 can be completed as a robust, maintainable, and user-friendly application. The addition of a ReactFlow-based UI will enhance usability, while preparing for an inside-out data acquisition approach will future-proof the app for integration with Drupal and other systems.