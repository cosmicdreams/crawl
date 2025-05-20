// src/ui/components/templates/TemplateLibrary.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { PipelineTemplate } from '../../../core/templates/index.js';
import { logger } from '../../../utils/logger.js';
import './TemplateLibrary.css';

interface TemplateLibraryProps {
  onSelectTemplate: (template: PipelineTemplate) => void;
  onCreateProfile: (profileName: string, templateId: string) => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onSelectTemplate, onCreateProfile }) => {
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getTemplates();
        if (response.data) {
          setTemplates(response.data);
        } else if (response.error) {
          setError(`Failed to load templates: ${response.error}`);
        }
      } catch (err) {
        setError('Failed to load templates');
        logger.error('Error loading templates', { error: err });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: PipelineTemplate) => {
    setSelectedTemplate(template);
    onSelectTemplate(template);
    setShowCreateForm(true);
  }, [onSelectTemplate]);

  // Handle profile creation
  const handleCreateProfile = useCallback(() => {
    if (!selectedTemplate || !profileName.trim()) {
      return;
    }

    onCreateProfile(profileName.trim(), selectedTemplate.id);
    setProfileName('');
    setShowCreateForm(false);
  }, [selectedTemplate, profileName, onCreateProfile]);

  // Filter templates based on search query and filter
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filter === 'all' || template.category === filter;

    return matchesSearch && matchesFilter;
  });

  // Get unique categories for filter dropdown
  const categories = [...new Set(templates.map(template => template.category))];

  return (
    <div className="template-library">
      <div className="template-library-header">
        <h2>Pipeline Templates</h2>
        <div className="template-library-filters">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-container">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="no-templates">
          {searchQuery || filter !== 'all'
            ? 'No templates match your search criteria'
            : 'No templates available'}
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="template-header">
                <h3>{template.name}</h3>
                <span className="template-category">{template.category || 'General'}</span>
              </div>
              <p className="template-description">{template.description}</p>
              <div className="template-details">
                <div className="template-stages">
                  <strong>Stages:</strong> {template.stages?.length || 'N/A'}
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div className="template-tags">
                    {template.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Template preview section */}
              <div className="template-preview">
                <div className="preview-title">Template Configuration:</div>
                {template.config && (
                  <>
                    <div><strong>Base URL:</strong> {template.config.baseUrl}</div>
                    <div><strong>Max Pages:</strong> {template.config.maxPages}</div>
                    {template.config.extractors && (
                      <div className="preview-stages">
                        {Object.keys(template.config.extractors).map(extractor => (
                          <span key={extractor} className="preview-stage">{extractor}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                className="use-template-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectTemplate(template);
                }}
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && selectedTemplate && (
        <div className="create-profile-form">
          <h3>Create Profile from Template</h3>
          <p>Selected template: <strong>{selectedTemplate.name}</strong></p>
          <div className="form-group">
            <label htmlFor="profileName">Profile Name:</label>
            <input
              type="text"
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter a name for your profile"
              className="profile-name-input"
            />
          </div>

          {/* Template configuration preview */}
          <div className="form-group">
            <label>Template Configuration:</label>
            <div className="preview-config">
              {JSON.stringify(selectedTemplate.config, null, 2)}
            </div>
          </div>

          <div className="form-actions">
            <button
              className="cancel-button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
            <button
              className="create-button"
              onClick={handleCreateProfile}
              disabled={!profileName.trim()}
            >
              Create Profile
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default TemplateLibrary;
