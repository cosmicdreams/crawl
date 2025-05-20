// src/ui/nodes/ExtractorNode.tsx
// Using ESM syntax
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface ExtractorNodeProps extends NodeProps {
    data: {
        label: string;
        type: 'typography' | 'colors' | 'spacing' | 'borders' | 'animations';
        status?: 'idle' | 'running' | 'completed' | 'error';
        progress?: number;
        stats?: Record<string, any>;
        error?: string;
        config?: Record<string, any>;
    };
}

const ExtractorNode: React.FC<ExtractorNodeProps> = ({ data }) => {
    const { label, type, status = 'idle', progress, stats, error } = data;

    // Determine node style based on status
    let statusColor = '#ccc'; // idle
    if (status === 'running') statusColor = '#3498db';
    if (status === 'completed') statusColor = '#2ecc71';
    if (status === 'error') statusColor = '#e74c3c';

    return (
        <div style={{
            padding: '10px',
            borderRadius: '5px',
            border: `2px solid ${statusColor}`,
            backgroundColor: 'white',
            width: '250px'
        }}>
            <Handle type="target" position={Position.Top} />

            <div style={{ marginBottom: '8px' }}>
                <strong>{label}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>Type: {type}</div>
            </div>

            {status === 'running' && progress !== undefined && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ height: '6px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        <div
                            style={{
                                height: '100%',
                                width: `${progress}%`,
                                backgroundColor: statusColor,
                                borderRadius: '3px'
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '12px', textAlign: 'center' }}>{progress}%</div>
                </div>
            )}

            {status === 'completed' && stats && (
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                    {Object.entries(stats).map(([key, value]) => (
                        <div key={key}>
                            {key}: {value}
                        </div>
                    ))}
                </div>
            )}

            {status === 'error' && error && (
                <div style={{
                    fontSize: '12px',
                    color: '#e74c3c',
                    padding: '5px',
                    backgroundColor: '#fadbd8',
                    borderRadius: '3px',
                    marginBottom: '8px'
                }}>
                    {error}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default ExtractorNode;