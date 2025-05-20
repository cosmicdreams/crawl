// src/ui/pages/TemplatesPage.tsx
import React, { useState } from 'react';
import TemplateSelector from '../components/TemplateSelector';
import CreateProfileForm from '../components/CreateProfileForm';
import { PipelineTemplate } from '../../core/templates/index.js';

interface TemplatesPageProps {
  onProfileCreated: (profileName: string) => void;
}

const TemplatesPage: React.FC<TemplatesPageProps> = ({ onProfileCreated }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [step, setStep] = useState<'select' | 'create'>('select');
  
  const handleSelectTemplate = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    setStep('create');
  };
  
  const handleCancel = () => {
    setStep('select');
    setSelectedTemplate(null);
  };
  
  const handleProfileCreated = (profileName: string) => {
    onProfileCreated(profileName);
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Pipeline Templates</h1>
      
      {step === 'select' ? (
        <TemplateSelector onSelectTemplate={handleSelectTemplate} />
      ) : (
        selectedTemplate && (
          <CreateProfileForm 
            template={selectedTemplate} 
            onProfileCreated={handleProfileCreated}
            onCancel={handleCancel}
          />
        )
      )}
    </div>
  );
};

export default TemplatesPage;
