// src/runner/generator-exports.js - Provides uniform access to generator modules
import generateTokensModule from '../generators/generate-tokens.js';
import generateReportsModule from '../generators/generate-reports.js';

// Extract the functions from each module
export const generateDesignTokens = generateTokensModule.generateDesignTokens;
export const generateMarkdownReport = generateReportsModule.generateMarkdownReport;
export const generateReports = generateReportsModule.generateReports;