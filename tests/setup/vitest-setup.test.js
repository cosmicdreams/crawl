/**
 * Simple test to verify Vitest is working correctly
 */

import { describe, test, expect } from 'vitest';

describe('Vitest Simple Test', () => {
  test('basic assertions work', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('ell');
    expect([1, 2, 3]).toHaveLength(3);
  });

  test('async functions work', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});
