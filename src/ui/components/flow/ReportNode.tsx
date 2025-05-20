import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ReportNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div style={{
      padding: '10px',
      borderRadius: '5px',
      border: '2px solid #6c757d',
      backgroundColor: 'white',
      width: '250px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ marginBottom: '8px' }}>
        <strong>{data.label || 'Report Node'}</strong>
        <div style={{ fontSize: '12px', color: '#666' }}>Type: report</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default ReportNode;
