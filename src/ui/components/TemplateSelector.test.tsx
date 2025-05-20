// src/ui/components/TemplateSelector.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateSelector from './TemplateSelector';
import { apiClient } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    getTemplates: vi.fn()
  }
}));

describe('TemplateSelector', () => {
  const mockOnSelectTemplate = vi.fn();
  const mockOnCreateProfile = vi.fn();
  const mockTemplates = {
    templates: [
      {
        id: 'basic',
        name: 'Basic Extraction',
        description: 'Crawl a website and extract all design tokens',
        config: {
          baseUrl: 'https://example.com',
          maxPages: 10,
          extractors: {
            colors: {
              includeTextColors: true,
              includeBackgroundColors: true,
              includeBorderColors: true
            },
            typography: {
              includeHeadings: true,
              includeBodyText: true
            }
          },
          tokens: {
            prefix: 'dt'
          }
        }
      },
      {
        id: 'minimal',
        name: 'Minimal Extraction',
        description: 'Extract only colors and typography',
        config: {
          baseUrl: 'https://example.com',
          maxPages: 5,
          extractors: {
            colors: {
              includeTextColors: true,
              includeBackgroundColors: false,
              includeBorderColors: false
            },
            typography: {
              includeHeadings: true,
              includeBodyText: false
            }
          }
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API response
    vi.mocked(apiClient.getTemplates).mockResolvedValue({
      data: mockTemplates
    });
  });

  it('should display loading state initially', () => {
    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('should display templates when loaded', async () => {
    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Check that templates are displayed
    expect(screen.getByText('Create New Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Basic Extraction')).toBeInTheDocument();
    expect(screen.getByText('Minimal Extraction')).toBeInTheDocument();
    expect(screen.getByText('Crawl a website and extract all design tokens')).toBeInTheDocument();
  });

  it('should allow selecting a template', async () => {
    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Select the second template
    const selectElement = screen.getByLabelText('Template:');
    fireEvent.change(selectElement, { target: { value: 'minimal' } });

    // Check that the template description is updated
    expect(screen.getByText('Extract only colors and typography')).toBeInTheDocument();
  });

  it('should validate form inputs before creating profile', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Clear the profile name
    const profileNameInput = screen.getByLabelText('Profile Name:');
    await user.clear(profileNameInput);

    // Try to create profile
    const createButton = screen.getByText('Create Pipeline');
    await user.click(createButton);

    // Check that validation error is displayed
    expect(screen.getByText('Error: Profile name is required')).toBeInTheDocument();
    expect(mockOnCreateProfile).not.toHaveBeenCalled();
  });

  it('should validate URL format', async () => {
    // Mock the URL constructor to throw an error for invalid URLs
    const originalURL = global.URL;
    global.URL = function(url) {
      if (url.includes('invalid-url')) {
        throw new Error('Invalid URL');
      }
      return new originalURL(url);
    } as any;

    // Mock the onCreateProfile to track calls
    const mockCreateProfile = vi.fn();

    const user = userEvent.setup();

    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Enter invalid URL
    const urlInput = screen.getByLabelText('Website URL:');
    await user.clear(urlInput);
    await user.type(urlInput, 'invalid-url');

    // Try to create profile
    const createButton = screen.getByText('Create Pipeline');
    await user.click(createButton);

    // Wait a moment for any validation to occur
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that mockCreateProfile was not called (validation failed)
    expect(mockCreateProfile).not.toHaveBeenCalled();

    // Restore original URL constructor
    global.URL = originalURL;
  });

  it('should create profile with valid inputs', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Enter profile name and URL
    const profileNameInput = screen.getByLabelText('Profile Name:');
    await user.clear(profileNameInput);
    await user.type(profileNameInput, 'my-test-profile');

    const urlInput = screen.getByLabelText('Website URL:');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://test-site.com');

    // Create profile
    const createButton = screen.getByText('Create Pipeline');
    await user.click(createButton);

    // Check that onCreateProfile was called with correct parameters
    expect(mockOnCreateProfile).toHaveBeenCalledWith({
      templateId: 'basic',
      profileName: 'my-test-profile',
      baseUrl: 'https://test-site.com'
    });
  });

  it('should toggle advanced options', async () => {
    const user = userEvent.setup();

    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Advanced options should be hidden initially
    expect(screen.queryByText('Crawler Options')).not.toBeInTheDocument();

    // Show advanced options
    const showAdvancedButton = screen.getByText('Show Advanced Options');
    await user.click(showAdvancedButton);

    // Check that advanced options are displayed
    expect(screen.getByText('Crawler Options')).toBeInTheDocument();
    expect(screen.getByText('Extractor Options')).toBeInTheDocument();
    expect(screen.getByText('Token Options')).toBeInTheDocument();

    // Hide advanced options
    const hideAdvancedButton = screen.getByText('Hide Advanced Options');
    await user.click(hideAdvancedButton);

    // Check that advanced options are hidden again
    expect(screen.queryByText('Crawler Options')).not.toBeInTheDocument();
  });

  it('should display error message when API call fails', async () => {
    // Mock API error
    vi.mocked(apiClient.getTemplates).mockResolvedValueOnce({
      error: 'Failed to load templates'
    });

    render(
      <TemplateSelector
        onSelectTemplate={mockOnSelectTemplate}
        onCreateProfile={mockOnCreateProfile}
      />
    );

    // Wait for the API call to resolve
    await waitFor(() => {
      expect(apiClient.getTemplates).toHaveBeenCalled();
    });

    // Check that error container is displayed
    const errorContainer = screen.getByText(/Error:/i);
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer.textContent).toContain('Failed to load templates');
  });
});
