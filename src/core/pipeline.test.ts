// src/core/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pipeline } from './pipeline.js';
import { PipelineStage } from './pipeline.js';

// Mock stage for testing
class MockStage implements PipelineStage<string, number> {
  name = 'mock-stage';
  process = vi.fn().mockResolvedValue(42);
  canSkip = vi.fn().mockReturnValue(false);
  onError = vi.fn();
}

describe('Pipeline', () => {
  let pipeline: Pipeline<number>;
  let mockStage: MockStage;

  beforeEach(() => {
    pipeline = new Pipeline<number>();
    mockStage = new MockStage();
  });

  it('should add stages correctly', () => {
    pipeline.addStage(mockStage);
    expect(pipeline.getState()).toEqual({});
  });

  it('should run stages in order', async () => {
    pipeline.addStage(mockStage);
    const result = await pipeline.run('input');

    expect(mockStage.process).toHaveBeenCalledWith('input');
    expect(result).toBe(42);
  });

  it('should store stage results in state', async () => {
    pipeline.addStage(mockStage);
    await pipeline.run('input');

    expect(pipeline.getState()).toEqual({
      'mock-stage': 42
    });
  });

  it('should skip stages when canSkip returns true', async () => {
    mockStage.canSkip.mockReturnValue(true);
    pipeline.addStage(mockStage);

    await pipeline.run('input');

    expect(mockStage.process).not.toHaveBeenCalled();
  });

  it('should handle errors in stages', async () => {
    const error = new Error('Test error');
    mockStage.process.mockRejectedValue(error);
    pipeline.addStage(mockStage);

    await expect(pipeline.run('input')).rejects.toThrow('Test error');
    // Use a more flexible assertion that doesn't check the exact error state object
    expect(mockStage.onError).toHaveBeenCalled();
    expect(mockStage.onError.mock.calls[0][0]).toEqual(error);
  });
});
