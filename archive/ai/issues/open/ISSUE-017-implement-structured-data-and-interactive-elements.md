---
id: ISSUE-017
title: Implement Structured Data and Interactive Elements for Console UI
created: 2024-05-15
status: open
severity: medium
category: enhancement
related_components: utils, run
related_pages: run.js, all extractors
---

# Implement Structured Data and Interactive Elements for Console UI

## Description
The current console UI presents information in a dense, unstructured format that can be overwhelming and difficult to parse. It also lacks interactive elements that could guide users through the process. Adding structured data displays and interactive elements would make the application more user-friendly and easier to navigate.

## Impact
- Dense, unstructured information is difficult to parse
- Complex data is not presented in an easily scannable format
- Lack of interactive elements makes the application less user-friendly
- Users must manually enter all options at the command line

## Reproduction Steps
1. Run the application with `node run.js`
2. Observe how extraction results are displayed as unstructured text
3. Note the lack of interactive prompts for user guidance

## Expected Behavior
The console output should:
1. Present complex data in structured, tabular formats
2. Use boxed content for important information
3. Provide interactive prompts for configuration and decision points
4. Allow users to select options interactively

## Actual Behavior
The console output presents all information as unstructured text, and the application does not provide interactive elements for user guidance.

## Screenshots/Evidence
N/A

## Suggested Solution
Implement structured data displays and interactive elements:

1. Add required dependencies:
   ```bash
   npm install table inquirer boxen --save
   ```

2. Implement tabular data displays for extraction results:
   ```javascript
   const { table } = require('table');
   
   // Display extraction results in a table
   const data = [
     ['Type', 'Count', 'Examples'],
     ['Colors', '42', '#FF5733, #3D85C6, rgba(255,0,0,0.5)'],
     ['Font Families', '3', 'Arial, Roboto, Open Sans'],
     ['Spacing Values', '12', '8px, 16px, 1.5rem, 2em']
   ];
   
   console.log(table(data, {
     border: getBorderCharacters('rounded')
   }));
   ```

3. Add boxed content for important information:
   ```javascript
   const boxen = require('boxen');
   
   const errorBox = boxen(chalk.red('Error: Failed to extract colors from page'), {
     padding: 1,
     margin: 1,
     borderStyle: 'round',
     borderColor: 'red'
   });
   
   console.log(errorBox);
   ```

4. Implement interactive prompts for user guidance:
   ```javascript
   const inquirer = require('inquirer');
   
   // Confirmation prompt
   const { shouldContinue } = await inquirer.prompt([{
     type: 'confirm',
     name: 'shouldContinue',
     message: 'Paths file has been created. Would you like to review it before continuing?',
     default: true
   }]);
   
   if (shouldContinue) {
     // Show paths file
   }
   ```

5. Add interactive selection for extractors:
   ```javascript
   const { extractorsToRun } = await inquirer.prompt([{
     type: 'checkbox',
     name: 'extractorsToRun',
     message: 'Select extractors to run:',
     choices: [
       { name: 'Typography', value: 'typography', checked: true },
       { name: 'Colors', value: 'colors', checked: true },
       { name: 'Spacing', value: 'spacing', checked: true },
       { name: 'Borders', value: 'borders', checked: false },
       { name: 'Animations', value: 'animations', checked: false }
     ]
   }]);
   ```

6. Update the main run.js script to use these structured displays and interactive elements for:
   - Extraction results
   - Token summaries
   - Error reports
   - Configuration confirmation
   - Extractor selection
   - Continuation prompts

## Related Issues
- ISSUE-016: Implement Basic Styling and Progress Indicators for Console UI
- ISSUE-018: Implement Dashboard and Branding for Console UI
- ISSUE-019: Implement Custom Logger and Configuration for Console UI

## History
- 2024-05-15: Issue created
