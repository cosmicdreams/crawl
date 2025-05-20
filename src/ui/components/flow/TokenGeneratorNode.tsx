// src/ui/components/flow/TokenGeneratorNode.tsx
import React from 'react';
import { NodeProps } from 'reactflow';
import BaseNode, { BaseNodeData } from './BaseNode';

export interface TokenGeneratorNodeData extends BaseNodeData {
  outputFormats?: string[];
  tokensGenerated?: number;
  prefix?: string;
}

const TokenGeneratorNode: React.FC<NodeProps<TokenGeneratorNodeData>> = (props) => {
  const { data } = props;
  
  // Enhance the base data with token generator-specific details
  const enhancedData: BaseNodeData = {
    ...data,
    icon: '🏷️',
    details: `Formats: ${data.outputFormats?.join(', ') || 'None'}\nTokens: ${data.tokensGenerated || 0}\nPrefix: ${data.prefix || 'None'}`
  };
  
  return <BaseNode {...props} data={enhancedData} />;
};

export default TokenGeneratorNode;
