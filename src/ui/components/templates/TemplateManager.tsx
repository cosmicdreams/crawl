// src/ui/components/templates/TemplateManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { PipelineTemplate } from '../../../core/templates/index.js';
import { logger } from '../../../utils/logger.js';

interface TemplateManagerProps {
  currentProfile?: string;
  onTemplateCreated?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ currentProfile, onTemplateCreated }) => {
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    description: string;
    category: string;
    tags: string;
  }>({
    name: '',
    description: '',
    category: 'general',
    tags: ''
  });

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

  // Handle input changes for new template form
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTemplate(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle template creation
  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim()) {
      setError('Name and description are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createTemplate({
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim(),
        category: newTemplate.category,
        tags: newTemplate.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        sourceProfile: currentProfile
      });

      if (response.data) {
        setTemplates(prev => [...prev, response.data]);
        setSuccessMessage(`Template "${newTemplate.name}" created successfully`);
        setNewTemplate({
          name: '',
          description: '',
          category: 'general',
          tags: ''
        });
        setShowCreateForm(false);
        
        if (onTemplateCreated) {
          onTemplateCreated();
        }
      } else if (response.error) {
        setError(`Failed to create template: ${response.error}`);
      }
    } catch (err) {
      setError('Failed to create template');
      logger.error('Error creating template', { error: err });
    } finally {
      setLoading(false);
    }
  }, [newTemplate, currentProfile, onTemplateCreated]);

  // Handle template deletion
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.deleteTemplate(templateId);
      if (response.data && response.data.success) {
        setTemplates(prev => prev.filter(template => template.id !== templateId));
        setSuccessMessage('Template deleted successfully');
      } else if (response.error) {
        setError(`Failed to delete template: ${response.error}`);
      }
    } catch (err) {
      setError('Failed to delete template');
      logger.error('Error deleting template', { error: err, templateId });
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <h2>Template Manager</h2>
        <button 
          className="create-template-button"
          onClick={() => setShowCreateForm(true)}
          disabled={!currentProfile}
        >
          Create Template from Current Profile
        </button>
      </div>

      {!currentProfile && (
        <div className="info-message">
          Select a profile to create a template from it
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {showCreateForm && (
        <div className="create-template-form">
          <h3>Create New Template</h3>
          <div className="form-group">
            <label htmlFor="name">Template Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newTemplate.name}
              onChange={handleInputChange}
              placeholder="Enter a name for your template"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={newTemplate.description}
              onChange={handleInputChange}
              placeholder="Describe what this template is for"
              className="form-textarea"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <select
              id="category"
              name="category"
              value={newTemplate.category}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="general">General</option>
              <option value="website">Website</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="blog">Blog</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated):</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={newTemplate.tags}
              onChange={handleInputChange}
              placeholder="e.g. responsive, mobile, dark-mode"
              className="form-input"
            />
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
              onClick={handleCreateTemplate}
              disabled={!newTemplate.name.trim() || !newTemplate.description.trim() || loading}
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </div>
      )}

      <div className="templates-list">
        <h3>Your Templates</h3>
        {loading && templates.length === 0 ? (
          <div className="loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="no-templates">No templates available</div>
        ) : (
          <table className="templates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>{template.category}</td>
                  <td>{template.description}</td>
                  <td>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .template-manager {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .template-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .create-template-button {
          padding: 8px 16px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .create-template-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .info-message {
          padding: 10px;
          margin-bottom: 20px;
          background-color: #cce5ff;
          color: #004085;
          border-radius: 4px;
        }
        
        .error-message {
          padding: 10px;
          margin-bottom: 20px;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 4px;
        }
        
        .success-message {
          padding: 10px;
          margin-bottom: 20px;
          background-color: #d4edda;
          color: #155724;
          border-radius: 4px;
        }
        
        .create-template-form {
          margin-bottom: 20px;
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
        }
        
        .form-textarea {
          resize: vertical;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .cancel-button, .create-button {
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .cancel-button {
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          color: #212529;
        }
        
        .create-button {
          background-color: #0066cc;
          border: none;
          color: white;
          font-weight: bold;
        }
        
        .create-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .templates-list {
          margin-top: 20px;
        }
        
        .loading, .no-templates {
          padding: 20px;
          text-align: center;
          color: #6c757d;
        }
        
        .templates-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .templates-table th, .templates-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        
        .templates-table th {
          background-color: #e9ecef;
          font-weight: bold;
        }
        
        .delete-button {
          padding: 4px 8px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default TemplateManager;
