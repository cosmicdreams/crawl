/**
 * Production Optimizer Configuration
 * 
 * Centralized configuration for all production optimization settings.
 * This file consolidates all performance-related settings and provides
 * a single source of truth for optimization parameters.
 */

/**
 * Site size thresholds for adaptive optimization
 */
export const SITE_THRESHOLDS = {
  SMALL_MAX_PAGES: 15,
  MEDIUM_MAX_PAGES: 50,
  LARGE_MIN_PAGES: 51
};

/**
 * Concurrency configurations by site category
 */
export const CONCURRENCY_CONFIGS = {
  SMALL: {
    metadata: 2,
    extract: 2,
    deepen: 3
  },
  MEDIUM: {
    metadata: 4,
    extract: 3,
    deepen: 6
  },
  LARGE: {
    metadata: 8,
    extract: 6,
    deepen: 12
  }
};

/**
 * Browser and resource configurations
 */
export const RESOURCE_CONFIGS = {
  DEFAULT_TIMEOUT: 45000,
  MAX_RETRIES: 2,
  VIEWPORT: { width: 1920, height: 1080 },
  BLOCKED_RESOURCES: ['image', 'font', 'media', 'manifest', 'other'],
  NETWORK_HEADERS: {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=30, max=100'
  }
};

/**
 * Performance targets and monitoring thresholds
 */
export const PERFORMANCE_TARGETS = {
  SMALL_SITE_TARGET: { min: 30, max: 45 }, // seconds
  MEDIUM_SITE_TARGET: { min: 60, max: 80 }, // seconds
  LARGE_SITE_TARGET: { min: 80, max: 120 }, // seconds
  MIN_SUCCESS_RATE: 95, // percentage
  BASELINE_DURATION: 115.06 // seconds (original performance)
};

/**
 * Error handling and retry configurations
 */
export const ERROR_CONFIGS = {
  MAX_PAGE_ERRORS: 5, // per phase
  RETRY_DELAYS: [1000, 2000, 4000], // milliseconds
  CRITICAL_ERROR_TYPES: ['TimeoutError', 'NetworkError', 'ConnectionError'],
  RECOVERABLE_ERRORS: ['ValidationError', 'ExtractionError']
};

/**
 * Quality gates and validation settings
 */
export const QUALITY_GATES = {
  MIN_DATA_COMPLETENESS: 90, // percentage
  MAX_FAILED_EXTRACTIONS: 10, // percentage
  REQUIRED_FILE_VALIDATION: true,
  ENABLE_PROGRESS_TRACKING: true,
  ENABLE_PERFORMANCE_MONITORING: true
};

/**
 * Production feature flags
 */
export const FEATURE_FLAGS = {
  ENABLE_ADAPTIVE_OPTIMIZATION: true,
  ENABLE_PARALLEL_PHASES: true,
  ENABLE_RESOURCE_MONITORING: true,
  ENABLE_ERROR_RECOVERY: true,
  ENABLE_VALIDATION_GATES: true
};

/**
 * Get complete configuration for a site category
 */
export function getProductionConfig(category, overrides = {}) {
  const baseConfig = {
    concurrency: CONCURRENCY_CONFIGS[category] || CONCURRENCY_CONFIGS.SMALL,
    resources: RESOURCE_CONFIGS,
    performance: PERFORMANCE_TARGETS,
    errors: ERROR_CONFIGS,
    quality: QUALITY_GATES,
    features: FEATURE_FLAGS
  };

  // Deep merge with overrides
  return {
    ...baseConfig,
    ...overrides,
    concurrency: { ...baseConfig.concurrency, ...(overrides.concurrency || {}) },
    resources: { ...baseConfig.resources, ...(overrides.resources || {}) },
    features: { ...baseConfig.features, ...(overrides.features || {}) }
  };
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(config) {
  const errors = [];
  
  // Validate concurrency settings
  if (config.concurrency) {
    for (const [phase, value] of Object.entries(config.concurrency)) {
      if (typeof value !== 'number' || value < 1 || value > 20) {
        errors.push(`Invalid concurrency for ${phase}: ${value} (must be 1-20)`);
      }
    }
  }
  
  // Validate timeout settings
  if (config.resources?.DEFAULT_TIMEOUT) {
    const timeout = config.resources.DEFAULT_TIMEOUT;
    if (timeout < 10000 || timeout > 120000) {
      errors.push(`Invalid timeout: ${timeout}ms (must be 10000-120000ms)`);
    }
  }
  
  // Validate performance targets
  if (config.performance) {
    for (const [target, range] of Object.entries(config.performance)) {
      if (target.includes('TARGET') && range.min && range.max) {
        if (range.min >= range.max) {
          errors.push(`Invalid performance target ${target}: min (${range.min}) must be less than max (${range.max})`);
        }
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Production configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}
