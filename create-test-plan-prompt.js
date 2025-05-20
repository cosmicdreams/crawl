/**
 * Generate a test plan prompt for an AI with browser navigation capabilities
 * This script reads metadata.json and creates a QA test plan prompt
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'output');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');
const PROMPT_FILE = path.join(OUTPUT_DIR, 'qa-test-plan-prompt.md');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(chalk.green('Created output directory'));
}

/**
 * Create a test plan prompt based on metadata
 */
function createTestPlanPrompt() {
  console.log(chalk.blue('Reading metadata file...'));

  // Check if a metadata file exists
  if (!fs.existsSync(METADATA_FILE)) {
    console.error(chalk.red(`Metadata file not found: ${METADATA_FILE}`));
    console.log(chalk.yellow('Run metadata gathering phase first'));
    return;
  }

  // Read a metadata file
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  } catch (error) {
    console.error(chalk.red(`Error reading metadata file: ${error.message}`));
    return;
  }

  // Extract representative pages (first page from each template group)
  const representativePages = [];
  if (metadata.grouped_paths) {
    Object.entries(metadata.grouped_paths).forEach(([bodyClasses, pages]) => {
      if (pages && pages.length > 0) {
        // Choose the first page from this group
        representativePages.push({
          url: pages[0].url,
          title: pages[0].title || 'Untitled page',
          template: bodyClasses,
        });
      }
    });
  }

  // Get paragraph templates and components
  const paragraphs = metadata.paragraphs || [];
  const components = metadata.components || [];

  // Create the prompt content
  let promptContent = `# QA Test Plan Prompt for ${metadata.baseUrl}

You are an expert QA engineer tasked with creating an automated test plan for a website. This test plan will focus on key page templates, reusable components, and paragraph templates that make up the site architecture.

## Purpose

Create a systematic test plan in markdown format that other QA engineers can follow to verify the site has no regression bugs. Your plan should focus on:

1. Representative page templates
2. Common site components
3. Paragraph templates that make up page content

## Target Website

Base URL: \`${metadata.baseUrl}\`
Site Scan Date: ${metadata.scan_time}

## Instructions for Testing

For each test item:
1. Use browser_navigate to visit the page
2. Take a snapshot of the page to identify key elements
3. Check for proper rendering, interactions, and responsive behavior
4. Document any unexpected behavior or visual issues

## Representative Pages to Test

The following pages represent unique templates on the site. Each should be tested for proper layout, component loading, and interactions:

`;

  // Add representative pages
  representativePages.forEach((page, index) => {
    promptContent += `### Template ${index + 1}: ${page.title}\n`;
    promptContent += `- URL: \`${page.url}\`\n`;
    promptContent += `- Testing Steps:\n`;
    promptContent += `  1. Navigate to the page\n`;
    promptContent += `  2. Verify the page layout matches the expected template\n`;
    promptContent += `  3. Test all interactive elements\n`;
    promptContent += `  4. Check responsiveness at mobile, tablet, and desktop widths\n\n`;
  });

  // Add paragraph templates section
  if (paragraphs.length > 0) {
    promptContent += `## Paragraph Templates to Test

The site uses the following paragraph templates that should be tested wherever they appear:

`;
    paragraphs.forEach(paragraph => {
      promptContent += `- \`${paragraph}\`\n`;
    });

    promptContent += `
For each paragraph template:
1. Identify pages where the template appears
2. Test the specific functionality and display of the template
3. Verify consistent behavior across different pages
4. Check that content displays correctly on various screen sizes

`;
  }

  // Add components section
  if (components.length > 0) {
    promptContent += `## Components to Test

The site uses the following components that should be tested wherever they appear:

`;
    components.forEach(component => {
      promptContent += `- \`${component}\`\n`;
    });

    promptContent += `
For each component:
1. Identify all instances across different page templates
2. Test intended functionality (navigation, form submission, display, etc.)
3. Verify consistent styling and behavior
4. Test edge cases (empty states, error states, loading states)
5. Ensure accessibility standards are met

`;
  }

  // Add test execution section
  promptContent += `## Test Execution Instructions

When executing this test plan:

1. For each page template:
   \`\`\`javascript
   await browser_navigate({ url: "PAGE_URL" });
   await browser_take_screenshot();
   // Inspect key elements and interactions
   \`\`\`

2. Document the results of each test with:
   - Screenshot of the tested page/component
   - Steps performed
   - Expected vs. actual results
   - Any issues discovered (with severity rating)

3. For responsive testing, use:
   \`\`\`javascript
   // Mobile view
   await browser_resize({ width: "375", height: "667" });
   await browser_take_screenshot();

   // Tablet view
   await browser_resize({ width: "768", height: "1024" });
   await browser_take_screenshot();

   // Desktop view
   await browser_resize({ width: "1440", height: "900" });
   await browser_take_screenshot();
   \`\`\`

## Test Report Format

Compile your findings into a structured report with:

1. Executive Summary
2. Test Coverage (pages, components, paragraphs tested)
3. Issues by severity (critical, high, medium, low)
4. Recommendations for fixes
5. Screenshots documenting issues

As you navigate through the site, maintain a consistent testing approach and document all behaviors systematically to ensure comprehensive quality assurance.
`;

  // Write the prompt to file
  try {
    fs.writeFileSync(PROMPT_FILE, promptContent);
    console.log(chalk.green(`Test plan prompt saved to: ${PROMPT_FILE}`));
  } catch (error) {
    console.error(chalk.red(`Error writing prompt file: ${error.message}`));
  }
}

// Execute the function
createTestPlanPrompt();

console.log(chalk.yellow('To run this script:'));
console.log(chalk.cyan('node frontend/site-crawler/create-test-plan-prompt.js'));
