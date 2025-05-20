# Design Token Crawler v2: Implementation Plan

This document outlines the implementation plan for rebuilding the Design Token Crawler as a modern, TypeScript-based application with a visual UI powered by ReactFlow and Storybook.

## Overview

The plan involves preserving the current codebase as a reference while building a new application from scratch with a clean architecture. This approach allows for a complete redesign while ensuring no key functionality is lost.

### Ultimate Goal: Drupal Integration

The ultimate goal of this project is to create a design token crawler that can connect directly to Drupal websites. This integration will allow for:

1. **Extraction of design tokens from Drupal themes**
2. **Two-way synchronization between design systems and Drupal implementations**
3. **Generation of Drupal-compatible theme assets**
4. **Integration with Drupal's component libraries**

This will provide a powerful tool for maintaining design consistency across Drupal websites and streamlining the theme development process.

## Implementation Steps

### Step 1: Preserve the Current Codebase

```bash
# Create a backup directory
mkdir -p backup/design-token-crawler-v1

# Move all current code to the backup
mv src config tests run.js package.json package-lock.json backup/design-token-crawler-v1/

# Keep any important data or results
mkdir -p backup/results
cp -r results backup/results/ # if you want to preserve any existing results
```

This preserves all current code and functionality as a reference while giving us a clean slate to work with.

### Step 2: Set Up the New Project Structure

```bash
# Initialize a new npm project
npm init -y

# Install core dependencies
npm install typescript @types/node ts-node react react-dom reactflow @storybook/react express cors

# Dev dependencies
npm install --save-dev eslint prettier vitest @vitest/coverage-v8 @testing-library/react vite @vitejs/plugin-react concurrently

# Initialize TypeScript
npx tsc --init

# Update tsconfig.json for ESM with modern settings
sed -i '' 's/"target": "es2016"/"target": "ES2024"/g' tsconfig.json
sed -i '' 's/"module": "commonjs"/"module": "ES2022"/g' tsconfig.json
# Enable NodeNext resolution strategy (best for Node.js v23 with ESM)
sed -i '' 's/\/\/ "moduleResolution": "[^"]*"/"moduleResolution": "NodeNext"/g' tsconfig.json

# Add type: module to package.json
npm pkg set type="module"

# Create the basic directory structure
mkdir -p src/{core,ui,extractors,utils,api} src/ui/{components,nodes,pages} config tests
```

### Step 3: Create the Initial Project Files

```bash
# Create a basic .gitignore
echo "node_modules\ndist\n.env\n.DS_Store\ncoverage\nresults" > .gitignore

# Create a basic README.md
echo "# Design Token Crawler v2\n\nA visual ETL pipeline for extracting design tokens from websites." > README.md
```

### Step 4: Define the Core Architecture

Create the core pipeline architecture in TypeScript:

```typescript
// src/core/pipeline.ts
// Using ESM syntax
export interface PipelineStage<InputType, OutputType> {
  name: string;
  process: (input: InputType) => Promise<OutputType>;
  canSkip?: (input: InputType, state: Record<string, any>) => boolean;
  onError?: (error: Error, state: Record<string, any>) => Promise<void>;
}

export class Pipeline<FinalOutputType> {
  private stages: PipelineStage<any, any>[] = [];
  private state: Record<string, any> = {};

  addStage<I, O>(stage: PipelineStage<I, O>): Pipeline<FinalOutputType> {
    this.stages.push(stage);
    return this;
  }

  async run<InitialInputType>(initialInput: InitialInputType): Promise<FinalOutputType> {
    let input = initialInput;

    for (const stage of this.stages) {
      try {
        console.log(`Running stage: ${stage.name}`);

        // Check if we can skip this stage
        if (stage.canSkip && stage.canSkip(input, this.state)) {
          console.log(`Skipping stage: ${stage.name}`);
          continue;
        }

        // Process the stage
        const output = await stage.process(input);

        // Store the result in state
        this.state[stage.name] = output;

        // Pass to next stage
        input = output;

        console.log(`Completed stage: ${stage.name}`);
      } catch (error) {
        console.error(`Error in stage ${stage.name}:`, error);

        if (stage.onError) {
          await stage.onError(error as Error, this.state);
        }

        throw error;
      }
    }

    return input as FinalOutputType;
  }

  getState(): Record<string, any> {
    return { ...this.state };
  }
}
```

### Step 5: Define Core Types

Create type definitions for the application:

```typescript
// src/core/types.ts
// Using ESM syntax
export interface CrawlConfig {
  baseUrl: string;
  maxPages: number;
  timeout: number;
  ignorePatterns: string[];
  ignoreExtensions: string[];
  screenshots: boolean;
}

export interface ExtractorConfig<T> {
  inputFile: string;
  outputFile: string;
  writeToFile: boolean;
  telemetry: TelemetryOptions;
  options: T;
}

export interface TelemetryOptions {
  enabled: boolean;
  outputDir: string;
  logToConsole: boolean;
  writeToFile: boolean;
  minDuration: number;
}

export interface CrawlResult {
  baseUrl: string;
  crawledPages: PageInfo[];
  timestamp: string;
}

export interface PageInfo {
  url: string;
  title: string;
  status: number;
  contentType: string;
  screenshot?: string;
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'typography' | 'spacing' | 'border' | 'animation';
  category?: string;
  description?: string;
  usageCount?: number;
  source?: string;
}
```

### Step 6: Create a Crawler Stage

Implement the crawler stage using Playwright:

```typescript
// src/core/stages/crawler-stage.ts
// Using ESM syntax
import { Browser, chromium } from 'playwright';
import { PipelineStage } from '../pipeline';
import { CrawlConfig, CrawlResult, PageInfo } from '../types';

export class CrawlerStage implements PipelineStage<CrawlConfig, CrawlResult> {
  name = 'crawler';

  async process(config: CrawlConfig): Promise<CrawlResult> {
    const browser = await chromium.launch();
    const crawledPages: PageInfo[] = [];

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Set a reasonable timeout
      page.setDefaultTimeout(config.timeout);

      // Start with the base URL
      const visitedUrls = new Set<string>();
      const urlsToVisit = [config.baseUrl];

      while (urlsToVisit.length > 0 && crawledPages.length < config.maxPages) {
        const url = urlsToVisit.shift()!;

        if (visitedUrls.has(url)) {
          continue;
        }

        visitedUrls.add(url);

        try {
          // Navigate to the page
          await page.goto(url, { waitUntil: 'domcontentloaded' });

          // Get page info
          const title = await page.title();
          const status = 200; // Simplified
          const contentType = 'text/html'; // Simplified

          // Take screenshot if enabled
          let screenshot;
          if (config.screenshots) {
            screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
            // In a real implementation, we would save this to a file
          }

          // Add to crawled pages
          crawledPages.push({
            url,
            title,
            status,
            contentType,
            screenshot: screenshot ? `screenshot-${crawledPages.length}.jpg` : undefined
          });

          // Find links on the page
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .map(a => a.href)
              .filter(href => href && href.length > 0);
          });

          // Filter and add new links to visit
          for (const link of links) {
            try {
              const linkUrl = new URL(link);

              // Skip if different domain
              if (linkUrl.origin !== new URL(config.baseUrl).origin) {
                continue;
              }

              // Skip if matches ignore patterns
              if (config.ignorePatterns.some(pattern => link.includes(pattern))) {
                continue;
              }

              // Skip if matches ignore extensions
              if (config.ignoreExtensions.some(ext => link.endsWith(ext))) {
                continue;
              }

              // Add to queue if not visited
              if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                urlsToVisit.push(link);
              }
            } catch (e) {
              // Skip invalid URLs
              continue;
            }
          }
        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
          // Continue with next URL
        }
      }
    } finally {
      await browser.close();
    }

    return {
      baseUrl: config.baseUrl,
      crawledPages,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Step 7: Create a Basic Extractor Stage

Implement a color extractor as an example:

```typescript
// src/core/stages/color-extractor-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { CrawlResult, DesignToken } from '../types';

interface ColorExtractorOptions {
  includeTextColors: boolean;
  includeBackgroundColors: boolean;
  includeBorderColors: boolean;
  minimumOccurrences: number;
}

interface ColorExtractionResult {
  tokens: DesignToken[];
  stats: {
    totalColors: number;
    uniqueColors: number;
    textColors: number;
    backgroundColors: number;
    borderColors: number;
  };
}

export class ColorExtractorStage implements PipelineStage<CrawlResult, ColorExtractionResult> {
  name = 'color-extractor';

  constructor(private options: ColorExtractorOptions) {}

  async process(input: CrawlResult): Promise<ColorExtractionResult> {
    // In a real implementation, we would launch a browser and extract colors
    // For now, we'll return mock data

    const mockColors = [
      { name: 'primary', value: '#0066cc', type: 'color', category: 'brand', usageCount: 42 },
      { name: 'secondary', value: '#ff9900', type: 'color', category: 'brand', usageCount: 28 },
      { name: 'success', value: '#28a745', type: 'color', category: 'feedback', usageCount: 15 },
      { name: 'error', value: '#dc3545', type: 'color', category: 'feedback', usageCount: 8 },
      { name: 'text-primary', value: '#212529', type: 'color', category: 'text', usageCount: 120 },
      { name: 'text-secondary', value: '#6c757d', type: 'color', category: 'text', usageCount: 85 },
      { name: 'background', value: '#ffffff', type: 'color', category: 'background', usageCount: 150 },
      { name: 'background-alt', value: '#f8f9fa', type: 'color', category: 'background', usageCount: 65 },
      { name: 'border', value: '#dee2e6', type: 'color', category: 'border', usageCount: 92 },
    ] as DesignToken[];

    // Filter based on options
    const filteredColors = mockColors.filter(color => {
      if (color.usageCount! < this.options.minimumOccurrences) {
        return false;
      }

      if (color.category === 'text' && !this.options.includeTextColors) {
        return false;
      }

      if (color.category === 'background' && !this.options.includeBackgroundColors) {
        return false;
      }

      if (color.category === 'border' && !this.options.includeBorderColors) {
        return false;
      }

      return true;
    });

    return {
      tokens: filteredColors,
      stats: {
        totalColors: mockColors.length,
        uniqueColors: mockColors.length,
        textColors: mockColors.filter(c => c.category === 'text').length,
        backgroundColors: mockColors.filter(c => c.category === 'background').length,
        borderColors: mockColors.filter(c => c.category === 'border').length
      }
    };
  }
}
```

### Step 8: Create a Token Generator Stage

Implement a stage to generate design tokens:

```typescript
// src/core/stages/token-generator-stage.ts
// Using ESM syntax
import { PipelineStage } from '../pipeline.js';
import { DesignToken } from '../types';
import fs from 'node:fs';
import path from 'node:path';

interface TokenGeneratorOptions {
  outputFormats: ('css' | 'json' | 'figma')[];
  outputDir: string;
  prefix: string;
}

interface TokenGeneratorInput {
  tokens: DesignToken[];
}

interface TokenGeneratorOutput {
  tokens: DesignToken[];
  files: {
    format: string;
    path: string;
  }[];
}

export class TokenGeneratorStage implements PipelineStage<TokenGeneratorInput, TokenGeneratorOutput> {
  name = 'token-generator';

  constructor(private options: TokenGeneratorOptions) {}

  async process(input: TokenGeneratorInput): Promise<TokenGeneratorOutput> {
    const { tokens } = input;
    const files = [];

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Generate files in each requested format
    for (const format of this.options.outputFormats) {
      let filePath;

      switch (format) {
        case 'css':
          filePath = path.join(this.options.outputDir, 'tokens.css');
          this.generateCSSTokens(tokens, filePath);
          break;

        case 'json':
          filePath = path.join(this.options.outputDir, 'tokens.json');
          this.generateJSONTokens(tokens, filePath);
          break;

        case 'figma':
          filePath = path.join(this.options.outputDir, 'figma-tokens.json');
          this.generateFigmaTokens(tokens, filePath);
          break;
      }

      if (filePath) {
        files.push({ format, path: filePath });
      }
    }

    return {
      tokens,
      files
    };
  }

  private generateCSSTokens(tokens: DesignToken[], filePath: string): void {
    let css = ':root {\n';

    for (const token of tokens) {
      css += `  --${this.options.prefix}-${token.name}: ${token.value};\n`;
    }

    css += '}\n';

    fs.writeFileSync(filePath, css);
  }

  private generateJSONTokens(tokens: DesignToken[], filePath: string): void {
    const json = {
      tokens: tokens.reduce((acc, token) => {
        acc[`${this.options.prefix}-${token.name}`] = {
          value: token.value,
          type: token.type,
          category: token.category
        };
        return acc;
      }, {} as Record<string, any>)
    };

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  }

  private generateFigmaTokens(tokens: DesignToken[], filePath: string): void {
    // Simplified Figma tokens format
    const figmaTokens = tokens.reduce((acc, token) => {
      const category = token.category || 'global';

      if (!acc[category]) {
        acc[category] = {};
      }

      acc[category][token.name] = {
        value: token.value,
        type: token.type
      };

      return acc;
    }, {} as Record<string, any>);

    fs.writeFileSync(filePath, JSON.stringify(figmaTokens, null, 2));
  }
}
```

### Step 9: Create the Visual UI with ReactFlow

Start building the React application with ReactFlow:

```typescript
// src/ui/pages/PipelineEditor.tsx
// Using ESM syntax
import React, { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Connection,
  Edge,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node components
import CrawlerNode from '../nodes/CrawlerNode';
import ExtractorNode from '../nodes/ExtractorNode';
import TokenGeneratorNode from '../nodes/TokenGeneratorNode';
import ReportNode from '../nodes/ReportNode';

// Define custom node types
const nodeTypes: NodeTypes = {
  crawler: CrawlerNode,
  extractor: ExtractorNode,
  tokenGenerator: TokenGeneratorNode,
  report: ReportNode
};

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: 'crawler-1',
    type: 'crawler',
    position: { x: 250, y: 100 },
    data: {
      label: 'Site Crawler',
      config: {
        baseUrl: 'https://example.com',
        maxPages: 10
      }
    }
  },
  {
    id: 'extractor-1',
    type: 'extractor',
    position: { x: 250, y: 250 },
    data: {
      label: 'Color Extractor',
      type: 'colors'
    }
  },
  {
    id: 'token-generator-1',
    type: 'tokenGenerator',
    position: { x: 250, y: 400 },
    data: {
      label: 'Token Generator',
      formats: ['css', 'json', 'figma']
    }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'crawler-1', target: 'extractor-1' },
  { id: 'e2-3', source: 'extractor-1', target: 'token-generator-1' }
];

const PipelineEditor: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, any>>({});

  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  );

  // Execute the pipeline
  const executePipeline = async () => {
    // Implementation to execute the pipeline based on the visual graph
    // and update pipelineStatus with results
    setPipelineStatus({
      status: 'running',
      currentStage: 'crawler-1'
    });

    // Simulate pipeline execution
    setTimeout(() => {
      setPipelineStatus({
        status: 'completed',
        stages: {
          'crawler-1': { status: 'completed', duration: '2.3s' },
          'extractor-1': { status: 'completed', duration: '1.5s' },
          'token-generator-1': { status: 'completed', duration: '0.8s' }
        }
      });
    }, 3000);
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <div className="controls">
        <button onClick={executePipeline}>Execute Pipeline</button>
        <button onClick={() => console.log(nodes, edges)}>Save Layout</button>
        <button onClick={() => console.log('Load layout')}>Load Layout</button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <div className="status-panel">
        <h3>Pipeline Status</h3>
        <pre>{JSON.stringify(pipelineStatus, null, 2)}</pre>
      </div>
    </div>
  );
};

export default PipelineEditor;
```

### Step 10: Create a Custom Node Component

Create a custom node for the ReactFlow diagram:

```typescript
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
```

### Step 11: Set Up Storybook

Create a Storybook story for the extractor node:

```typescript
// src/ui/nodes/ExtractorNode.stories.tsx
// Using ESM syntax
import React from 'react';
import { Story, Meta } from '@storybook/react';
import ExtractorNode, { ExtractorNodeProps } from './ExtractorNode';

export default {
  title: 'Pipeline/ExtractorNode',
  component: ExtractorNode,
  argTypes: {
    data: {
      type: {
        control: {
          type: 'select',
          options: ['typography', 'colors', 'spacing', 'borders', 'animations']
        }
      },
      status: {
        control: {
          type: 'select',
          options: ['idle', 'running', 'completed', 'error']
        }
      }
    }
  }
} as Meta;

const Template: Story<ExtractorNodeProps> = (args) => <ExtractorNode {...args} />;

export const Default = Template.bind({});
Default.args = {
  id: 'extractor-1',
  type: 'default',
  position: { x: 0, y: 0 },
  data: {
    label: 'Typography Extractor',
    type: 'typography',
    status: 'idle'
  }
};

export const Running = Template.bind({});
Running.args = {
  ...Default.args,
  data: {
    ...Default.args.data,
    status: 'running',
    progress: 45
  }
};

export const Completed = Template.bind({});
Completed.args = {
  ...Default.args,
  data: {
    ...Default.args.data,
    status: 'completed',
    stats: {
      duration: '3.2s',
      elementsProcessed: 1245,
      tokensGenerated: 87
    }
  }
};

export const Error = Template.bind({});
Error.args = {
  ...Default.args,
  data: {
    ...Default.args.data,
    status: 'error',
    error: 'Failed to read input file'
  }
};
```

### Step 12: Create a Simple API Server

Create an Express server to run the pipeline:

```typescript
// src/api/server.ts
// Using ESM syntax
import express from 'express';
import cors from 'cors';
import { Pipeline } from '../core/pipeline.js';
import { CrawlerStage } from '../core/stages/crawler-stage.js';
import { ColorExtractorStage } from '../core/stages/color-extractor-stage.js';
import { TokenGeneratorStage } from '../core/stages/token-generator-stage.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

// Store active pipelines
const activePipelines: Record<string, Pipeline<any>> = {};

app.post('/api/pipeline', (req, res) => {
  const { id, config } = req.body;

  // Create a new pipeline
  const pipeline = new Pipeline();

  // Add stages based on config
  if (config.stages.includes('crawler')) {
    pipeline.addStage(new CrawlerStage());
  }

  if (config.stages.includes('color-extractor')) {
    pipeline.addStage(new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 2
    }));
  }

  if (config.stages.includes('token-generator')) {
    pipeline.addStage(new TokenGeneratorStage({
      outputFormats: ['css', 'json', 'figma'],
      outputDir: './results/tokens',
      prefix: 'dt'
    }));
  }

  activePipelines[id] = pipeline;

  res.json({ id, status: 'created' });
});

app.post('/api/pipeline/:id/run', async (req, res) => {
  const { id } = req.params;
  const { input } = req.body;

  const pipeline = activePipelines[id];
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  try {
    const result = await pipeline.run(input);
    res.json({ id, status: 'completed', result });
  } catch (error) {
    res.status(500).json({ id, status: 'error', error: (error as Error).message });
  }
});

app.get('/api/pipeline/:id/status', (req, res) => {
  const { id } = req.params;

  const pipeline = activePipelines[id];
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  res.json({ id, state: pipeline.getState() });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
```

### Step 13: Create Package Scripts

Update your package.json with useful scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev:ui": "vite",
    "dev:api": "node --loader ts-node/esm src/api/server.ts",
    "dev": "concurrently \"npm run dev:ui\" \"npm run dev:api\"",
    "build": "tsc && vite build",
    "storybook": "start-storybook -p 6006",
    "build-storybook": "build-storybook",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Development Milestones

### Milestone 1: Basic Pipeline Functionality
- Implement the core pipeline architecture
- Create a basic crawler stage
- Set up the API server
- Run a simple pipeline from the command line

### Milestone 2: First Extractor
- Implement the color extractor stage
- Generate design tokens from extracted colors
- Save tokens to different formats (CSS, JSON, Figma)

### Milestone 3: Visual UI Basics
- Set up the React application with ReactFlow
- Create custom node components
- Implement basic pipeline visualization
- Connect the UI to the API server

### Milestone 4: Complete Extractors
- Implement remaining extractors (typography, spacing, borders, animations)
- Refine the extraction algorithms
- Optimize performance

### Milestone 5: Advanced UI Features
- Add pipeline templates
- Implement real-time monitoring
- Create a dashboard for results visualization
- Add configuration panels for each node

### Milestone 6: Testing and Quality Assurance
- Set up Vitest for unit and integration testing
- Create test fixtures and mocks
- Implement test coverage reporting
- Add end-to-end tests with Playwright

### Milestone 7: Polish and Documentation
- Refine the UI design
- Add comprehensive error handling
- Create user documentation
- Optimize performance

### Milestone 8: Drupal Integration
- Create a Drupal module for exposing design tokens via REST API
- Implement a Drupal API stage in the pipeline
- Add authentication for secure access to Drupal APIs
- Create a two-way synchronization mechanism
- Develop Drupal-specific token types (blocks, fields, views, regions)
- Generate Drupal-compatible theme assets

## Drupal Integration Details

### Drupal Module Development

We will create a custom Drupal module called "Design Token API" that will:

1. **Extract tokens from Drupal themes**:
   - Parse CSS/SCSS files for variables
   - Extract computed styles from rendered components
   - Identify color, typography, spacing, and border patterns

2. **Expose REST endpoints**:
   ```
   GET /api/design-tokens - Get all design tokens
   GET /api/design-tokens/{type} - Get tokens by type
   POST /api/design-tokens - Update tokens
   ```

3. **Provide an admin interface**:
   - View all extracted tokens
   - Manually edit token values
   - Import/export token definitions

### Crawler Integration

The Design Token Crawler will be enhanced with:

1. **Drupal API Stage**:
   ```typescript
   export class DrupalApiStage implements PipelineStage<DrupalConfig, DesignToken[]> {
     name = 'drupal-api';

     async process(config: DrupalConfig): Promise<DesignToken[]> {
       // Fetch tokens from Drupal API
       // Transform to standard format
       // Return tokens
     }
   }
   ```

2. **Authentication**:
   - OAuth2 support for Drupal
   - API key authentication
   - Session-based authentication

3. **Two-way Sync**:
   - Push extracted tokens to Drupal
   - Pull tokens from Drupal
   - Conflict resolution strategies

### Theme Generation

The system will be able to generate:

1. **CSS Variables**:
   ```css
   :root {
     --color-primary: #0066cc;
     --font-heading: 'Inter', sans-serif;
     --spacing-md: 1rem;
   }
   ```

2. **Drupal Theme Files**:
   - Generate `.theme` files with token variables
   - Create Twig templates with token usage
   - Build component libraries

3. **Style Guide**:
   - Generate a living style guide for Drupal
   - Document token usage across the site
   - Provide examples for developers

## Testing Strategy

The application will use Vitest for testing, with the following approach:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test how components work together
3. **Component Tests**: Test React components with React Testing Library
4. **End-to-End Tests**: Test the full application with Playwright

## TypeScript Configuration

Create a custom `tsconfig.json` with modern settings:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ES2022",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "results"]
}
```

## Vitest Configuration

Create a `vitest.config.js` file in the project root:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'results', 'backup'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**']
    }
  }
});
```

## Reference Implementation

As you build the new application, refer to the original codebase in the backup directory for:

1. Extraction algorithms and techniques
2. Configuration options and defaults
3. Output formats and structures
4. Edge cases and error handling

## Future Considerations

### Advanced Features (Milestone 4)

Once the core functionality is stable and the UI is complete, consider implementing these advanced features:

1. **AI-Powered Token Suggestions**
   - Use machine learning to analyze extracted design elements
   - Suggest standardized tokens based on patterns
   - Identify inconsistencies and recommend improvements
   - Generate design system recommendations

2. **Integration with Design Tools**
   - Direct export to Figma, Sketch, and Adobe XD
   - Two-way synchronization with design tools
   - Plugin development for major design applications
   - Real-time collaboration features

3. **Version Tracking for Tokens**
   - Track changes to design tokens over time
   - Compare versions and visualize differences
   - Rollback to previous token states
   - Change history and audit logs

4. **Advanced Analytics**
   - Analyze design consistency across websites
   - Generate reports on token usage
   - Identify accessibility issues
   - Performance impact analysis

## Conclusion

This implementation plan provides a structured approach to rebuilding the Design Token Crawler as a modern, TypeScript-based application with a visual UI. By preserving the original codebase as a reference while building a new application from scratch, you can create a more maintainable, performant, and user-friendly tool without losing any key functionality.

The plan is designed to be flexible, allowing you to focus on implementing the features that are most valuable to you first, and gradually adding more sophisticated functionality as needed.
