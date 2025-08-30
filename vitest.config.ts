import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{js,ts,jsx,tsx}', 'tests/**/*.test.{js,ts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/backup/**', '**/storybook/**'],
    coverage: {
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        'node_modules/',
        'backup/',
        'storybook/',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.stories.{js,ts,jsx,tsx}',
        'vitest.config.ts'
      ]
    }
  },
});