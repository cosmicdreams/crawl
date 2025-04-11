/**
 * ESLint configuration for Design Token Crawler
 *
 * This configuration sets up ESLint rules for the project,
 * focusing on common JavaScript errors and best practices.
 */

module.exports = {
  env: {
    node: true,
    browser: true, // Allow browser globals for browser-context code
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021
  },
  rules: {
    // Possible Errors
    'no-console': 'off', // Allow console for this CLI tool
    'no-debugger': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'warn',
    'no-ex-assign': 'error',
    'no-extra-boolean-cast': 'warn',
    'no-extra-semi': 'warn',
    'no-irregular-whitespace': 'warn',
    'no-unreachable': 'error',
    'no-undef': 'warn', // Downgrade to warning for initial setup
    'no-process-exit': 'warn', // Downgrade to warning for initial setup
    'no-cond-assign': 'warn', // Downgrade to warning for initial setup
    'no-misleading-character-class': 'warn', // Downgrade to warning for initial setup

    // Best Practices
    'curly': ['warn', 'multi-line'],
    'default-case': 'warn',
    'dot-notation': 'warn',
    'eqeqeq': ['warn', 'always', { 'null': 'ignore' }],
    'no-empty-function': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-multi-spaces': 'warn',
    'no-new-func': 'error',
    'no-return-await': 'warn',
    'no-useless-catch': 'warn',
    'no-useless-return': 'warn',
    'require-await': 'warn',

    // Variables
    'no-shadow': 'warn',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-use-before-define': ['error', { 'functions': false }],

    // Node.js
    'node/no-unsupported-features/es-syntax': 'off', // Allow modern ES features
    'node/no-unsupported-features/es-builtins': 'warn', // Downgrade to warning for initial setup
    'node/no-unsupported-features/node-builtins': 'warn', // Downgrade to warning for initial setup
    'node/no-unpublished-require': 'off', // Allow dev dependencies

    // Stylistic Issues
    'array-bracket-spacing': ['warn', 'never'],
    'block-spacing': 'warn',
    'brace-style': ['warn', '1tbs', { 'allowSingleLine': true }],
    'comma-dangle': ['warn', 'only-multiline'],
    'comma-spacing': 'warn',
    'comma-style': 'warn',
    'computed-property-spacing': 'warn',
    'func-call-spacing': 'warn',
    'key-spacing': 'warn',
    'keyword-spacing': 'warn',
    'linebreak-style': ['warn', 'unix'],
    'max-len': ['warn', { 'code': 120, 'ignoreComments': true, 'ignoreStrings': true }],
    'no-multiple-empty-lines': ['warn', { 'max': 2, 'maxEOF': 1 }],
    'no-trailing-spaces': 'warn',
    'object-curly-spacing': ['warn', 'always'],
    'quotes': ['warn', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
    'semi': ['warn', 'always'],
    'semi-spacing': 'warn',
    'space-before-blocks': 'warn',
    'space-before-function-paren': ['warn', { 'anonymous': 'always', 'named': 'never', 'asyncArrow': 'always' }],
    'space-in-parens': 'warn',
    'space-infix-ops': 'warn',
    'spaced-comment': 'warn'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'results/'
  ]
};
