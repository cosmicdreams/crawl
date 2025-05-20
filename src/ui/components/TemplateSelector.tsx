// src/ui/components/TemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import { PipelineTemplate } from '../../core/templates/index.js';
import { apiClient, CreateProfileOptions } from '../api/client.js';
import { CrawlConfig } from '../../core/types.js';

interface TemplateSelectorProps {
  onSelectTemplate: (template: PipelineTemplate) => void;
  onCreateProfile: (options: CreateProfileOptions) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelectTemplate, onCreateProfile }) => {
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('https://example.com');
  const [customConfig, setCustomConfig] = useState<CrawlConfig | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getTemplates();
        if (response.data) {
          setTemplates(response.data.templates);
          if (response.data.templates.length > 0) {
            setSelectedTemplateId(response.data.templates[0].id);
            // Set initial profile name based on template
            setProfileName(`${response.data.templates[0].id}-${new Date().getTime()}`);
          }
        } else if (response.error) {
          setError(`Failed to load templates: ${response.error}`);
        }
      } catch (err) {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Update custom config when template changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Clone the template config
        const config = JSON.parse(JSON.stringify(template.config));
        setCustomConfig(config);
        setBaseUrl(config.baseUrl);
      }
    }
  }, [selectedTemplateId, templates]);

  // Handle template selection
  const handleSelectTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      onSelectTemplate(template);
    }
  };

  // Handle creating a profile from template
  const handleCreateProfile = () => {
    if (!profileName.trim()) {
      setError('Profile name is required');
      return;
    }

    if (!baseUrl.trim()) {
      setError('Base URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (e) {
      setError('Invalid URL format');
      return;
    }

    onCreateProfile({
      templateId: selectedTemplateId,
      profileName: profileName.trim(),
      baseUrl: baseUrl.trim()
    });
  };

  // Update a specific extractor option
  const updateExtractorOption = (extractorType: string, option: string, value: any) => {
    if (!customConfig) return;

    setCustomConfig(prevConfig => {
      if (!prevConfig) return null;

      const newConfig = { ...prevConfig };
      if (!newConfig.extractors) {
        newConfig.extractors = {};
      }

      if (!newConfig.extractors[extractorType]) {
        newConfig.extractors[extractorType] = {};
      }

      newConfig.extractors[extractorType][option] = value;
      return newConfig;
    });
  };

  // Update token options
  const updateTokenOption = (option: string, value: any) => {
    if (!customConfig) return;

    setCustomConfig(prevConfig => {
      if (!prevConfig) return null;

      const newConfig = { ...prevConfig };
      if (!newConfig.tokens) {
        newConfig.tokens = {};
      }

      newConfig.tokens[option] = value;
      return newConfig;
    });
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
        <button
          onClick={() => setError(null)}
          style={{
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginTop: 0 }}>Create New Pipeline</h2>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="template-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Template:
        </label>
        <select
          id="template-select"
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        >
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Template Details</h3>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {selectedTemplate.description}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="profile-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Profile Name:
            </label>
            <input
              id="profile-name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter profile name"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="base-url" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Website URL:
            </label>
            <input
              id="base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                backgroundColor: 'transparent',
                color: '#0066cc',
                border: 'none',
                padding: '5px 0',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{ marginRight: '5px' }}>
                {showAdvanced ? '▼' : '►'}
              </span>
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>

            {showAdvanced && customConfig && (
              <div style={{ marginTop: '15px' }}>
                <h4>Crawler Options</h4>
                <div style={{ marginBottom: '10px' }}>
                  <label htmlFor="max-pages" style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Max Pages:
                  </label>
                  <input
                    id="max-pages"
                    type="number"
                    min="1"
                    value={customConfig.maxPages}
                    onChange={(e) => setCustomConfig({
                      ...customConfig,
                      maxPages: parseInt(e.target.value) || 1
                    })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={customConfig.screenshots}
                      onChange={(e) => setCustomConfig({
                        ...customConfig,
                        screenshots: e.target.checked
                      })}
                      style={{ marginRight: '8px' }}
                    />
                    Enable Screenshots
                  </label>
                </div>

                {customConfig.extractors && (
                  <>
                    <h4>Extractor Options</h4>

                    {customConfig.extractors.colors && (
                      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <h5 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Colors</h5>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={customConfig.extractors.colors.includeTextColors}
                              onChange={(e) => updateExtractorOption('colors', 'includeTextColors', e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            Include Text Colors
                          </label>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={customConfig.extractors.colors.includeBackgroundColors}
                              onChange={(e) => updateExtractorOption('colors', 'includeBackgroundColors', e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            Include Background Colors
                          </label>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={customConfig.extractors.colors.includeBorderColors}
                              onChange={(e) => updateExtractorOption('colors', 'includeBorderColors', e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            Include Border Colors
                          </label>
                        </div>
                      </div>
                    )}

                    {customConfig.extractors.typography && (
                      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <h5 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Typography</h5>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={customConfig.extractors.typography.includeHeadings}
                              onChange={(e) => updateExtractorOption('typography', 'includeHeadings', e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            Include Headings
                          </label>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={customConfig.extractors.typography.includeBodyText}
                              onChange={(e) => updateExtractorOption('typography', 'includeBodyText', e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            Include Body Text
                          </label>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {customConfig.tokens && (
                  <div>
                    <h4>Token Options</h4>
                    <div style={{ marginBottom: '10px' }}>
                      <label htmlFor="token-prefix" style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                        Token Prefix:
                      </label>
                      <input
                        id="token-prefix"
                        type="text"
                        value={customConfig.tokens.prefix || ''}
                        onChange={(e) => updateTokenOption('prefix', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleCreateProfile}
        style={{
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Create Pipeline
      </button>
    </div>
  );
};

export default TemplateSelector;
