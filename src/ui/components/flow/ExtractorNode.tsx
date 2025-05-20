// src/ui/components/flow/ExtractorNode.tsx
import React from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

export interface ExtractorNodeData extends BaseNodeData {
  extractorType: 'color' | 'typography' | 'spacing' | 'border';
  itemsExtracted?: number;
  options?: Record<string, any>;
}

const ExtractorNode: React.FC<NodeProps<ExtractorNodeData>> = (props) => {
  const { data } = props;
  
  // Get icon based on extractor type
  const getIcon = () => {
    switch (data.extractorType) {
      case 'color':
        return '🎨';
      case 'typography':
        return '🔤';
      case 'spacing':
        return '↔️';
      case 'border':
        return '🔲';
      default:
        return '📊';
    }
  };
  
  // Format options for display
  const formatOptions = () => {
    if (!data.options) return '';
    
    return Object.entries(data.options)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };
  
  // Enhance the base data with extractor-specific details
  const enhancedData: BaseNodeData = {
    ...data,
    icon: getIcon(),
    details: `Items Extracted: ${data.itemsExtracted || 0}\n${formatOptions()}`
  };
  
  return <BaseNode {...props} data={enhancedData} />;
};

export default ExtractorNode;
