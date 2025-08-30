# Component Reference Guide

## Core Components

### Pipeline System

#### Pipeline (`src/core/pipeline.ts`)
**Purpose**: Orchestrates the complete extraction workflow through sequential stages.

```typescript
interface Pipeline {
  stages: ExtractionStage[];
  execute(input: PipelineInput): Promise<PipelineOutput>;
  addEventListener(event: string, handler: Function): void;
}
```

**Key Methods**:
- `execute()`: Runs all stages in sequence
- `addEventListener()`: Subscribes to pipeline events
- `getProgress()`: Returns current execution progress

**Usage Example**:
```typescript
const pipeline = new Pipeline([
  new CrawlerStage(),
  new ColorExtractorStage(),
  new TypographyExtractorStage()
]);

pipeline.addEventListener('stage-complete', (stage, result) => {
  console.log(`${stage.name} completed:`, result);
});

const results = await pipeline.execute({ url: 'https://example.com' });
```

---

### Extraction Stages

#### CrawlerStage (`src/core/stages/crawler-stage.ts`)
**Purpose**: Discovers and catalogs all URLs within the target website.

```typescript
interface CrawlerStageConfig {
  maxDepth: number;
  batchSize: number;
  timeout: number;
  ignorePatterns: string[];
}
```

**Features**:
- Recursive URL discovery with depth control
- Batch processing for memory efficiency  
- Automatic retry mechanism for failed requests
- External link detection and filtering

**Output Format**:
```json
{
  "total_urls": 127,
  "internal_urls": 115,
  "external_urls": 12,
  "problem_urls": 3,
  "crawl_depth": 3
}
```

#### ColorExtractorStage (`src/core/stages/color-extractor-stage.ts`)
**Purpose**: Extracts and analyzes color usage patterns across the website.

```typescript
interface ColorExtractionOptions {
  includeGradients: boolean;
  colorThreshold: number;
  nameColors: boolean;
  groupSimilar: boolean;
}
```

**Features**:
- CSS color value extraction (hex, rgb, hsl, named)
- Color frequency analysis and ranking
- Automatic color naming using color-namer library
- Gradient pattern detection
- Color accessibility analysis

**Output Format**:
```json
{
  "primary_palette": {
    "brand_blue": {
      "hex": "#3B82F6",
      "rgb": [59, 130, 246],
      "hsl": [217, 91, 60],
      "usage_count": 45,
      "contexts": ["buttons", "links", "accent"]
    }
  },
  "color_statistics": {
    "unique_colors": 34,
    "most_used_color": "#3B82F6",
    "color_diversity_score": 0.82
  }
}
```

#### TypographyExtractorStage (`src/core/stages/typography-extractor-stage.ts`)
**Purpose**: Analyzes typography patterns and creates font-based design tokens.

```typescript
interface TypographyExtractionConfig {
  includeFontMetrics: boolean;
  analyzeLineHeight: boolean;
  detectTypeScale: boolean;
  measureReadability: boolean;
}
```

**Features**:
- Font family detection and classification
- Font size analysis with scale detection
- Line height and spacing measurements
- Font weight distribution analysis
- Typography hierarchy detection

**Output Format**:
```json
{
  "font_system": {
    "primary": {
      "family": "Inter",
      "weights": [300, 400, 500, 600, 700],
      "variants": ["normal", "italic"],
      "usage_percentage": 85.4
    }
  },
  "type_scale": {
    "base_size": 16,
    "scale_ratio": 1.25,
    "sizes": [12, 14, 16, 18, 20, 24, 30, 36, 48]
  },
  "typography_metrics": {
    "average_line_height": 1.5,
    "readability_score": 8.2
  }
}
```

#### SpacingExtractorStage (`src/core/stages/spacing-extractor-stage.ts`)
**Purpose**: Identifies consistent spacing patterns and layout tokens.

**Features**:
- Margin and padding analysis
- Grid system detection
- Spacing scale identification
- Layout pattern recognition

#### BorderExtractorStage (`src/core/stages/border-extractor-stage.ts`)
**Purpose**: Extracts border styles, radii, and visual separation patterns.

**Features**:
- Border width and style analysis
- Border radius pattern detection
- Box shadow extraction
- Visual hierarchy analysis

---

### Utility Components

#### ConfigManager (`src/utils/config-manager.ts`)
**Purpose**: Centralized configuration management with validation.

```typescript
interface ConfigManager {
  loadConfig(path?: string): Promise<Config>;
  validateConfig(config: Config): ValidationResult;
  updateConfig(updates: Partial<Config>): void;
  getConfig(): Config;
}
```

**Features**:
- JSON schema validation
- Environment variable override support
- Runtime configuration updates
- Configuration file watching

#### Logger (`src/utils/logger.ts`)
**Purpose**: Structured logging with multiple output formats.

```typescript
interface Logger {
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, meta?: object): void;
  debug(message: string, meta?: object): void;
}
```

**Features**:
- Multiple log levels and filtering
- Structured JSON logging
- Console and file output
- Performance timing utilities

---

### Legacy Components (JavaScript)

#### Initial Crawl (`phases/initial-crawl.js`)
**Purpose**: Legacy JavaScript implementation of initial site discovery.

**Features**:
- Playwright-based browser automation
- Link extraction and validation
- URL normalization and deduplication
- External link collection

**Usage**:
```javascript
import { initialCrawl } from './phases/initial-crawl.js';

const result = await initialCrawl('https://example.com');
// Outputs: paths.json with discovered URLs
```

#### Metadata Extraction (`phases/metadata.js`)
**Purpose**: Page-level metadata collection and analysis.

**Features**:
- DOM structure analysis
- CSS class extraction
- Template pattern detection
- Performance metrics collection

**Output Format**:
```json
{
  "page_templates": {
    "homepage": {
      "body_classes": ["home", "page"],
      "meta_description": "Site description",
      "h1_count": 1,
      "image_count": 24
    }
  }
}
```

---

### UI Components

#### TokenCard (`src/ui/components/TokenCard.tsx`)
**Purpose**: Visual representation of individual design tokens.

```typescript
interface TokenCardProps {
  token: DesignToken;
  category: TokenCategory;
  onEdit?: (token: DesignToken) => void;
  onDelete?: (token: DesignToken) => void;
}
```

**Features**:
- Visual token preview
- Editable token properties
- Usage statistics display
- Copy-to-clipboard functionality

#### TokenGrid (`src/ui/components/TokenGrid.tsx`)
**Purpose**: Grid layout for organizing and displaying token collections.

```typescript
interface TokenGridProps {
  tokens: DesignToken[];
  layout: 'grid' | 'list';
  filters?: TokenFilter[];
  sortBy?: 'name' | 'usage' | 'category';
}
```

**Features**:
- Responsive grid layout
- Advanced filtering and sorting
- Bulk token operations
- Drag-and-drop reordering

#### PipelineEditor (`src/ui/pages/PipelineEditor.tsx`)
**Purpose**: Visual pipeline configuration and monitoring interface.

**Features**:
- Drag-and-drop stage reordering
- Real-time progress monitoring
- Stage configuration editing
- Error state visualization

---

### API Components

#### WebSocket Server (`src/api/websocket-server.ts`)
**Purpose**: Real-time communication server for UI integration.

```typescript
interface WebSocketServer {
  start(port: number): Promise<void>;
  broadcast(event: string, data: any): void;
  onConnection(handler: ConnectionHandler): void;
}
```

**Supported Events**:
- `start-extraction`: Begin extraction process
- `progress-update`: Real-time progress updates
- `stage-complete`: Stage completion notifications
- `extraction-error`: Error reporting
- `config-update`: Runtime configuration changes

#### API Client (`src/ui/api/client.ts`)
**Purpose**: Frontend WebSocket client for server communication.

```typescript
interface APIClient {
  connect(): Promise<void>;
  startExtraction(config: ExtractionConfig): void;
  onProgress(handler: ProgressHandler): void;
  onComplete(handler: CompleteHandler): void;
}
```

---

## Configuration Schema

### Main Configuration
```typescript
interface Config {
  base_url: string;
  name: string;
  crawl_settings: {
    max_depth: number;
    batch_size: number;
    max_retries: number;
    timeout: number;
    user_agent: string;
    ignore_patterns: string[];
  };
  extraction_settings: {
    extract_colors: boolean;
    extract_typography: boolean;
    extract_spacing: boolean;
    extract_borders: boolean;
    extract_animations: boolean;
    color_threshold: number;
    spacing_threshold: number;
  };
  output_settings: {
    format: 'json' | 'yaml' | 'css';
    include_metadata: boolean;
    compress_output: boolean;
  };
}
```

### Stage-Specific Configurations
Each extraction stage accepts its own configuration object:

```typescript
// Color extraction configuration
interface ColorStageConfig {
  include_gradients: boolean;
  color_threshold: number;
  name_colors: boolean;
  group_similar_colors: boolean;
  accessibility_analysis: boolean;
}

// Typography extraction configuration
interface TypographyStageConfig {
  include_font_metrics: boolean;
  analyze_line_height: boolean;
  detect_type_scale: boolean;
  measure_readability: boolean;
  include_web_fonts: boolean;
}
```

---

## Error Handling

### Error Types
```typescript
enum ErrorType {
  NETWORK_ERROR = 'network_error',
  PARSE_ERROR = 'parse_error',
  TIMEOUT_ERROR = 'timeout_error',
  CONFIGURATION_ERROR = 'config_error',
  EXTRACTION_ERROR = 'extraction_error'
}

interface CrawlerError {
  type: ErrorType;
  message: string;
  url?: string;
  stage?: string;
  recoverable: boolean;
  details?: object;
}
```

### Error Recovery Strategies
- **Automatic Retry**: Network and timeout errors
- **Graceful Degradation**: Continue processing on non-critical errors
- **Error Aggregation**: Collect and report all errors at completion
- **Fallback Extraction**: Use alternative extraction methods when primary fails

---

## Performance Considerations

### Memory Management
- **Streaming Processing**: Large datasets processed in chunks
- **Resource Cleanup**: Automatic cleanup of browser resources
- **Cache Management**: LRU cache for frequently accessed data
- **Memory Monitoring**: Built-in memory usage tracking

### Optimization Strategies
- **Batch Processing**: Configurable batch sizes for memory efficiency
- **Parallel Processing**: Concurrent processing where safe
- **Progressive Enhancement**: Results available as stages complete
- **Lazy Loading**: UI components load data on demand

This component reference provides detailed information about each major component in the Site Crawler system, including their APIs, configuration options, and usage patterns.