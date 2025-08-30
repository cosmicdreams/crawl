/**
 * ESLint Test
 *
 * This test verifies that the codebase passes ESLint checks.
 * It runs ESLint as a child process and fails if there are any errors.
 */

const { execSync } = require('child_process');
const path = require('path');

describe('Linting', () => {
  test('ESLint should pass with no errors', () => {
    // Set a higher timeout for linting large codebases
    jest.setTimeout(30000);

    try {
      // Run ESLint on the src directory with --quiet flag to only report errors, not warnings
      const output = execSync('npx eslint src --format stylish --quiet', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Log the output for visibility in test output
      console.log(output || 'No linting issues found.');

      // If we got here, there were no errors
      expect(true).toBe(true);
    } catch (error) {
      // Log the error output
      console.error(error.stdout);

      // Fail the test
      expect(error.stdout).toBeFalsy();
      // If the above doesn't fail the test, force it to fail
      expect(true).toBe(false);
    }
  });
});
