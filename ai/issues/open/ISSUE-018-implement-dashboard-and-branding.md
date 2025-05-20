---
id: ISSUE-018
title: Implement Dashboard and Branding for Console UI
created: 2024-05-15
status: open
severity: low
category: enhancement
related_components: utils, run
related_pages: run.js
---

# Implement Dashboard and Branding for Console UI

## Description
The current console UI lacks branding elements and does not provide a comprehensive summary of the extraction process. Adding a dashboard-like summary and branding elements would create a more professional and cohesive user experience, while also providing users with a clear overview of the extraction results.

## Impact
- No clear branding or identity for the application
- Lack of comprehensive summary at the end of the process
- Results are presented in a fragmented way
- Professional appearance is diminished

## Reproduction Steps
1. Run the application with `node run.js`
2. Complete the extraction process
3. Note the lack of a comprehensive summary and branding elements

## Expected Behavior
The console output should:
1. Display an ASCII art logo and application header at startup
2. Present a dashboard-like summary at the end of the process
3. Use consistent branding elements throughout the application

## Actual Behavior
The console output has no branding elements and does not provide a comprehensive summary of the extraction process.

## Screenshots/Evidence
N/A

## Suggested Solution
Implement dashboard and branding elements:

1. Add required dependencies:
   ```bash
   npm install figlet --save
   ```

2. Create an ASCII art logo for the application:
   ```javascript
   const figlet = require('figlet');
   
   console.log(
     chalk.cyan(
       figlet.textSync('Design Token Crawler', {
         font: 'Standard',
         horizontalLayout: 'default',
         verticalLayout: 'default'
       })
     )
   );
   console.log(chalk.cyan('v1.0.0') + chalk.gray(' - Extract design tokens from websites\n'));
   ```

3. Implement a dashboard-like summary at the end of the process:
   ```javascript
   const boxen = require('boxen');
   
   // Create a summary box
   const summary = boxen(
     chalk.bold('Extraction Summary\n\n') +
     `${chalk.green('✓')} Pages analyzed: ${chalk.cyan('24')}\n` +
     `${chalk.green('✓')} Colors extracted: ${chalk.cyan('42')}\n` +
     `${chalk.green('✓')} Typography styles: ${chalk.cyan('15')}\n` +
     `${chalk.green('✓')} Spacing values: ${chalk.cyan('12')}\n` +
     `${chalk.green('✓')} Border styles: ${chalk.cyan('8')}\n` +
     `${chalk.green('✓')} Animation patterns: ${chalk.cyan('5')}\n\n` +
     `Results saved to: ${chalk.underline('./results')}`,
     {
       padding: 1,
       margin: 1,
       borderStyle: 'round',
       borderColor: 'blue',
       backgroundColor: '#555555'
     }
   );
   
   console.log(summary);
   ```

4. Create a function to display the summary:
   ```javascript
   function displaySummary(results) {
     // Create summary content based on results
     const summaryContent = chalk.bold('Extraction Summary\n\n');
     
     // Add pages analyzed
     summaryContent += `${chalk.green('✓')} Pages analyzed: ${chalk.cyan(results.pagesAnalyzed.length)}\n`;
     
     // Add extraction results for each type
     if (results.colors) {
       summaryContent += `${chalk.green('✓')} Colors extracted: ${chalk.cyan(results.colors.length)}\n`;
     }
     
     // Add other extraction results...
     
     // Add results location
     summaryContent += `\nResults saved to: ${chalk.underline(config.outputDir)}`;
     
     // Create and display the summary box
     const summary = boxen(summaryContent, {
       padding: 1,
       margin: 1,
       borderStyle: 'round',
       borderColor: 'blue',
       backgroundColor: '#555555'
     });
     
     console.log(summary);
   }
   ```

5. Update the main run.js script to:
   - Display the ASCII art logo at startup
   - Use consistent branding elements throughout
   - Show the dashboard-like summary at the end of the process

## Related Issues
- ISSUE-016: Implement Basic Styling and Progress Indicators for Console UI
- ISSUE-017: Implement Structured Data and Interactive Elements for Console UI
- ISSUE-019: Implement Custom Logger and Configuration for Console UI

## History
- 2024-05-15: Issue created
