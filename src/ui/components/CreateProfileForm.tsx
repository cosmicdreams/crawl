// src/ui/components/CreateProfileForm.tsx
import React, { useState } from 'react';
import { PipelineTemplate } from '../../core/templates/index.js';
import { apiClient, CreateProfileOptions } from '../api/client.js';

interface CreateProfileFormProps {
  template: PipelineTemplate;
  onProfileCreated: (profileName: string) => void;
  onCancel: () => void;
}

const CreateProfileForm: React.FC<CreateProfileFormProps> = ({ 
  template, 
  onProfileCreated,
  onCancel
}) => {
  const [profileName, setProfileName] = useState('');
  const [baseUrl, setBaseUrl] = useState(template.config.baseUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileName.trim()) {
      setError('Profile name is required');
      return;
    }
    
    if (!baseUrl.trim()) {
      setError('Base URL is required');
      return;
    }
    
    // Validate profile name (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(profileName)) {
      setError('Profile name can only contain letters, numbers, and hyphens');
      return;
    }
    
    // Validate URL
    try {
      new URL(baseUrl);
    } catch (err) {
      setError('Please enter a valid URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const options: CreateProfileOptions = {
      templateId: template.id,
      profileName,
      baseUrl
    };
    
    try {
      const response = await apiClient.createProfile(options);
      if (response.data) {
        onProfileCreated(profileName);
      } else if (response.error) {
        setError(`Failed to create profile: ${response.error}`);
      }
    } catch (err) {
      setError('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginTop: 0 }}>Create Profile from Template</h2>
      <p>Template: <strong>{template.name}</strong></p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="profile-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Profile Name:
          </label>
          <input
            id="profile-name"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="e.g., my-site"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
            required
          />
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
            Use only letters, numbers, and hyphens
          </small>
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
              fontSize: '16px'
            }}
            required
          />
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: '#f8f9fa',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProfileForm;
