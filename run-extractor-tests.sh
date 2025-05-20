#!/bin/bash
# run-extractor-tests.sh
# Script to run all extractor tests

# Create test results directory
mkdir -p test-results/raw

# Run unit tests
echo "Running unit tests for extractors..."
npx vitest run tests/unit/extractors

# Run integration tests
echo "Running integration tests for extractors..."
npx vitest run tests/integration/extractors

echo "All tests completed!"
