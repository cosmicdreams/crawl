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
    jest: true,
    'vitest-globals/env': true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:promise/recommended',
    'plugin:jsdoc/recommended'
  ],
  plugins: [
    'import',
    'promise',
    'jsdoc',
    'vitest-globals'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true
    }
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
    'node/no-unpublished-import': ['error', {
      'allowModules': ['vitest', '@vitest/browser', '@playwright/test'],
      'tryExtensions': ['.js', '.json', '.node']
    }],

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
    'spaced-comment': 'warn',

    // Import Plugin
    'import/no-unresolved': ['warn', {
      'ignore': ['vitest', 'vitest/config', '@vitest/browser', '@playwright/test']
    }],
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'warn',
    'import/export': 'error',
    'import/order': ['warn', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always'
    }],

    // Promise Plugin
    'promise/always-return': 'warn',
    'promise/no-return-wrap': 'warn',
    'promise/param-names': 'warn',
    'promise/catch-or-return': 'warn',
    'promise/no-native': 'off',
    'promise/no-callback-in-promise': 'warn',

    // JSDoc Plugin
    'jsdoc/require-jsdoc': ['warn', {
      'publicOnly': true,
      'require': {
        'FunctionDeclaration': true,
        'MethodDefinition': true,
        'ClassDeclaration': true,
        'ArrowFunctionExpression': false,
        'FunctionExpression': false
      }
    }],
    'jsdoc/require-param': 'warn',
    'jsdoc/require-param-type': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-returns-type': 'warn',
    'jsdoc/require-returns-description': 'warn',
    'jsdoc/valid-types': 'warn'
  },
  settings: {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.json', '.node']
      }
    }
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'results/',
    'backup/'
  ]
};
