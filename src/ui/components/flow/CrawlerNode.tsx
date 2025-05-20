// src/ui/components/flow/CrawlerNode.tsx
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface CrawlerNodeData {
  label?: string;
  status?: string;
  baseUrl?: string;
  maxPages?: number;
  pagesDiscovered?: number;
  pagesCrawled?: number;
  [key: string]: any;
}

const CrawlerNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div style={{
      padding: '10px',
      borderRadius: '5px',
      border: '2px solid #007bff',
      backgroundColor: 'white',
      width: '250px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ marginBottom: '8px' }}>
        <strong>{data.label || 'Crawler Node'}</strong>
        <div style={{ fontSize: '12px', color: '#666' }}>Type: crawler</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default CrawlerNode;
