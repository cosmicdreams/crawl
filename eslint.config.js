// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

export default [
  {
    ignores: [
      'tests/**',
      'test-results/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      'vitest.*.js',
      'dist/**',
      'coverage/**',
      'node_modules/**',
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin, react },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2021, sourceType: 'module', ecmaFeatures: { jsx: true } }
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off'
    },
    settings: {
      react: { version: 'detect' }
    }
  }
];