// src/runner/prompt-utils.js
import { DEFAULT_PATHS_PATH, readPaths } from '../utils/config-manager.js';

/**
 * Prompt the user to continue after reviewing paths.json
 * @returns {Promise<void>}
 */
export async function promptToContinue() {
  // Use the imported DEFAULT_PATHS_PATH constant
  const pathsFile = DEFAULT_PATHS_PATH;
  console.log('\n=== IMPORTANT: PATHS FILE REVIEW ===');
  console.log(`A paths file has been generated at: ${pathsFile}`);
  console.log('\nThis file contains the URLs that will be analyzed during the extraction process.');
  console.log('\nReview instructions:');
  console.log('1. Open the file in a text editor');
  console.log('2. Review the "paths" array and remove any paths you don\'t want to include');
  console.log('3. Add any important paths that might have been missed');
  console.log('4. The paths have been deduplicated, but you may want to further reduce them');
  console.log('5. Paths with numeric IDs or UUIDs have been consolidated to reduce duplication');
  console.log('\nTIP: Focus on keeping paths that represent different page templates or components');
  console.log('     rather than many variations of the same page type.');

  // Try to display the number of paths in the file
  try {
    const pathsData = readPaths(DEFAULT_PATHS_PATH);
    if (pathsData && pathsData.paths && Array.isArray(pathsData.paths)) {
      console.log(`\nThe file currently contains ${pathsData.paths.length} paths.`);

      // Group paths by their first segment to help the user understand the structure
      const segments = {};
      pathsData.paths.forEach(p => {
        const firstSegment = p === '/' ? '/' : p.split('/').filter(s => s)[0] || 'other';
        segments[firstSegment] = (segments[firstSegment] || 0) + 1;
      });

      console.log('\nPath distribution by section:');
      Object.entries(segments).forEach(([segment, count]) => {
        console.log(`  ${segment}: ${count} paths`);
      });
    }
  } catch (e) {
    console.log('\nCould not read path statistics from the file.');
  }

  console.log('\nWhen you\'re ready to continue, press Enter...');

  // Create a readline interface using ES modules
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Return a promise that resolves when the user presses Enter
  return new Promise(resolve => {
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}