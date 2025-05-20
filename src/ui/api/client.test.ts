// src/ui/api/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './client.js';

// Mock fetch
const originalFetch = global.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe('API Client', () => {

  it('should get profiles', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ profiles: ['default', 'example'] })
    });

    const response = await apiClient.getProfiles();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/profiles'));
    expect(response.data).toEqual({ profiles: ['default', 'example'] });
    expect(response.error).toBeUndefined();
  });

  it('should handle errors when getting profiles', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const response = await apiClient.getProfiles();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/profiles'));
    expect(response.data).toBeUndefined();
    expect(response.error).toBe('HTTP error 500');
  });

  it('should get tokens', async () => {
    const mockTokens = [
      {
        name: 'primary',
        value: '#0066cc',
        type: 'color',
        category: 'brand',
        description: 'Primary brand color',
        usageCount: 42
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTokens)
    });

    const response = await apiClient.getTokens('default');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/tokens/default'));
    expect(response.data).toEqual(mockTokens);
    expect(response.error).toBeUndefined();
  });

  it('should run crawler', async () => {
    const mockResponse = {
      status: 'started',
      profile: 'default',
      message: 'Pipeline started',
      pipelineId: 'test-pipeline'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const options = {
      extractors: ['colors', 'typography'],
      generateTokens: true
    };

    const response = await apiClient.runCrawler('default', options);

    // Check that fetch was called with the correct URL
    expect(mockFetch.mock.calls[0][0]).toContain('/run/default');

    // Check that the method is POST
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');

    // Check that the Content-Type header is set
    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');

    // Parse the body to check the content
    const bodyContent = JSON.parse(mockFetch.mock.calls[0][1].body);
    if (bodyContent.options) {
      // If the API wraps options in an 'options' property
      expect(bodyContent.options).toEqual(options);
    } else {
      // If the API sends options directly
      expect(bodyContent).toEqual(options);
    }

    expect(response.data).toEqual(mockResponse);
    expect(response.error).toBeUndefined();
  });

  it('should create profile from template', async () => {
    const mockResponse = {
      config: {
        baseUrl: 'https://example.com',
        maxPages: 10
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const options = {
      templateId: 'basic',
      profileName: 'new-profile',
      baseUrl: 'https://example.com'
    };

    const response = await apiClient.createProfile(options);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/profiles/create'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(options)
      })
    );

    expect(response.data).toEqual(mockResponse);
    expect(response.error).toBeUndefined();
  });

  it('should get templates', async () => {
    const mockTemplates = {
      templates: [
        {
          id: 'basic',
          name: 'Basic Extraction',
          description: 'Crawl a website and extract all design tokens',
          config: {
            baseUrl: 'https://example.com',
            maxPages: 10
          }
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplates)
    });

    const response = await apiClient.getTemplates();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/templates'));
    expect(response.data).toEqual(mockTemplates);
    expect(response.error).toBeUndefined();
  });

  it('should get pipeline status', async () => {
    const mockStatus = {
      id: 'test-pipeline',
      status: 'running',
      stages: {
        crawler: {
          stage: 'crawler',
          status: 'running',
          progress: 50
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatus)
    });

    const response = await apiClient.getPipelineStatus('test-pipeline');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/pipeline/test-pipeline/status'));
    expect(response.data).toEqual(mockStatus);
    expect(response.error).toBeUndefined();
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const response = await apiClient.getProfiles();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/profiles'));
    expect(response.data).toBeUndefined();
    expect(response.error).toBe('Network error');
  });
});
