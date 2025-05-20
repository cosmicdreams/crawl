// src/ui/components/flow/BaseNode.tsx
import React from 'react';

export interface BaseNodeData {
  label?: string;
  [key: string]: any;
}

const BaseNode: React.FC<{ data: BaseNodeData }> = ({ data }) => {
  return (
    <div style={{ border: '1px solid #bbb', padding: 12, borderRadius: 6 }}>
      {data.label || 'BaseNode Component Placeholder'}
    </div>
  );
};

export default BaseNode;
