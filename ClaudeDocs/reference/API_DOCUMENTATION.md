# Site Crawler API Documentation

## Overview

The Site Crawler is a multi-phase web crawling and design token extraction tool that processes websites systematically to extract design patterns, CSS tokens, and metadata. It operates through both CLI commands and a WebSocket-based API for real-time communication.

## Architecture

### Core Components

#### 1. Pipeline System (`src/core/pipeline.ts`)
The pipeline orchestrates extraction stages in sequence, providing:
- **Stage Management**: Coordinates multiple extraction stages
- **Error Handling**: Graceful failure recovery and reporting
- **Progress Tracking**: Real-time progress updates via WebSocket
- **Resource Management**: Memory and performance optimization

#### 2. Extraction Stages (`src/core/stages/`)
Specialized extractors for different design token types:

- **CrawlerStage**: Initial site discovery and URL collection
- **ColorExtractorStage**: CSS color value extraction and naming
- **TypographyExtractorStage**: Font metrics and typography tokens
- **SpacingExtractorStage**: Padding, margin, and layout spacing
- **BorderExtractorStage**: Border styles, radii, and patterns
- **AnimationExtractor**: CSS animation and transition properties
- **TokenGeneratorStage**: Consolidation into design token format

#### 3. CLI Interface (`src/cli/run.ts`)
Command-line interface providing:
- **Batch Processing**: Multiple URL processing
- **Configuration Management**: Flexible configuration options
- **Progress Reporting**: Terminal-based progress indicators
- **Error Reporting**: Detailed error messages and debugging

#### 4. WebSocket API (`src/api/websocket-server.ts`)
Real-time communication for UI integration:
- **Progress Streaming**: Live extraction progress updates
- **Configuration Sync**: Dynamic configuration updates
- **Error Broadcasting**: Real-time error notifications
- **Result Delivery**: Streaming extraction results

## API Endpoints

### CLI Commands

#### Initial Crawl
```bash
node index.js initial --url <target-url>
```
- **Purpose**: Discovers all URLs one level deep from homepage
- **Output**: `output/paths.json` with discovered URLs
- **Configuration**: Uses `crawl_settings.max_depth` from config

#### Deepen Crawl
```bash
node index.js deepen --url <target-url>
```
- **Purpose**: Extends crawling depth by one level
- **Prerequisites**: Requires existing `paths.json`
- **Output**: Updated `paths.json` with deeper URLs

#### Metadata Extraction
```bash
node index.js metadata --url <target-url>
```
- **Purpose**: Collects page metadata (body classes, templates)
- **Prerequisites**: Requires existing `paths.json`
- **Output**: `output/metadata.json` with page metadata

#### CSS Extraction
```bash
node index.js extract --url <target-url>
```
- **Purpose**: Extracts design tokens from crawled pages
- **Prerequisites**: Requires existing `metadata.json`
- **Output**: Multiple JSON files in `output/extract/` directory

#### Complete Workflow
```bash
node index.js all --url <target-url>
```
- **Purpose**: Runs entire workflow in sequence
- **Process**: initial → deepen → deepen → metadata → extract
- **Output**: Complete set of extraction results

### WebSocket API Events

#### Client → Server Events

##### `start-extraction`
```javascript
{
  "event": "start-extraction",
  "data": {
    "url": "https://example.com",
    "config": {
      "max_depth": 3,
      "batch_size": 20,
      "timeout": 45000
    }
  }
}
```

##### `update-config`
```javascript
{
  "event": "update-config",
  "data": {
    "crawl_settings": {
      "max_depth": 2,
      "batch_size": 10
    }
  }
}
```

#### Server → Client Events

##### `progress-update`
```javascript
{
  "event": "progress-update",
  "data": {
    "stage": "color-extraction",
    "progress": 0.65,
    "current_item": "processing /about page",
    "total_items": 50,
    "completed_items": 32
  }
}
```

##### `stage-complete`
```javascript
{
  "event": "stage-complete",
  "data": {
    "stage": "typography-extraction",
    "results": {
      "fonts_found": 12,
      "font_weights": [300, 400, 600, 700],
      "font_sizes": ["12px", "14px", "16px", "18px", "24px", "32px"]
    },
    "duration_ms": 2340
  }
}
```

##### `extraction-error`
```javascript
{
  "event": "extraction-error",
  "data": {
    "stage": "crawler-stage",
    "error": "Connection timeout",
    "url": "https://example.com/problematic-page",
    "retries_remaining": 2
  }
}
```

##### `extraction-complete`
```javascript
{
  "event": "extraction-complete",
  "data": {
    "total_duration_ms": 45670,
    "pages_processed": 127,
    "tokens_extracted": {
      "colors": 34,
      "typography": 18,
      "spacing": 22,
      "borders": 15,
      "animations": 8
    },
    "output_files": [
      "output/extract/colors.json",
      "output/extract/typography.json",
      "output/extract/spacing.json"
    ]
  }
}
```

## Configuration

### Main Configuration (`config/config.json`)
```json
{
  "base_url": "https://example.com",
  "name": "Project Name",
  "crawl_settings": {
    "max_depth": 3,
    "batch_size": 20,
    "max_retries": 2,
    "timeout": 45000,
    "user_agent": "Site-Crawler/1.0",
    "ignore_patterns": [
      "*.pdf",
      "*.zip",
      "/admin/*",
      "/api/*"
    ]
  },
  "extraction_settings": {
    "extract_colors": true,
    "extract_typography": true,
    "extract_spacing": true,
    "extract_borders": true,
    "extract_animations": true,
    "color_threshold": 5,
    "spacing_threshold": 2
  }
}
```

### Runtime Configuration Updates
Configuration can be updated via WebSocket or CLI flags:

```bash
node index.js extract --max-depth 2 --batch-size 10 --timeout 30000
```

## Output Formats

### Paths File (`output/paths.json`)
```json
{
  "baseUrl": "https://example.com",
  "scan_type": "initial",
  "total_paths": 127,
  "all_paths": [
    {
      "url": "https://example.com",
      "depth": 0,
      "source": "homepage",
      "last_crawled": "2024-01-15T10:30:00Z"
    }
  ],
  "external_links": ["https://external-site.com"],
  "file_urls": ["https://example.com/document.pdf"],
  "problem_paths": [
    {
      "url": "https://example.com/broken",
      "error": "404 Not Found",
      "retry_count": 2
    }
  ]
}
```

### Color Tokens (`output/extract/colors.json`)
```json
{
  "primary_colors": {
    "blue_500": {
      "hex": "#3B82F6",
      "rgb": "59, 130, 246",
      "hsl": "217, 91%, 60%",
      "usage_count": 45,
      "contexts": ["buttons", "links", "headers"]
    }
  },
  "color_palette": ["#3B82F6", "#EF4444", "#10B981"],
  "extraction_metadata": {
    "pages_analyzed": 127,
    "unique_colors": 34,
    "extraction_date": "2024-01-15T10:30:00Z"
  }
}
```

### Typography Tokens (`output/extract/typography.json`)
```json
{
  "font_families": {
    "primary": {
      "name": "Inter",
      "fallbacks": ["system-ui", "sans-serif"],
      "usage_count": 89
    }
  },
  "font_sizes": {
    "base": "16px",
    "scale": [12, 14, 16, 18, 20, 24, 32, 48]
  },
  "font_weights": [300, 400, 500, 600, 700],
  "line_heights": {
    "tight": 1.25,
    "normal": 1.5,
    "loose": 1.75
  }
}
```

## Error Handling

### Error Types

#### Network Errors
- **Connection Timeout**: Page load exceeds timeout limit
- **DNS Resolution**: Domain cannot be resolved
- **HTTP Errors**: 4xx/5xx response codes
- **SSL Errors**: Certificate validation failures

#### Extraction Errors
- **Parse Errors**: Invalid CSS or HTML structure
- **Memory Limits**: Insufficient memory for large pages
- **Processing Timeout**: Extraction exceeds time limits
- **Invalid Selectors**: CSS selectors not found

#### Configuration Errors
- **Invalid URL**: Malformed target URLs
- **Missing Files**: Required input files not found
- **Permission Errors**: File system access denied
- **Invalid Config**: Configuration validation failures

### Error Recovery

The system implements several recovery strategies:

1. **Automatic Retry**: Failed requests retry with exponential backoff
2. **Graceful Degradation**: Continues processing other pages on individual failures
3. **Checkpoint Recovery**: Resumes from last successful state
4. **Error Aggregation**: Collects and reports all errors at completion

## Usage Examples

### Basic Website Analysis
```bash
# Analyze a complete website
node index.js all --url https://example.com

# Results in output/ directory:
# - paths.json (127 URLs discovered)
# - metadata.json (page templates and structure)
# - extract/ directory with design tokens
```

### Real-time UI Integration
```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  ws.send(JSON.stringify({
    event: 'start-extraction',
    data: {
      url: 'https://example.com',
      config: { max_depth: 2 }
    }
  }));
};

ws.onmessage = (event) => {
  const { event: eventType, data } = JSON.parse(event.data);
  
  switch (eventType) {
    case 'progress-update':
      updateProgressBar(data.progress);
      break;
    case 'extraction-complete':
      displayResults(data.tokens_extracted);
      break;
  }
};
```

### Custom Extraction Pipeline
```bash
# Step-by-step with custom settings
node index.js initial --url https://example.com --max-depth 1
node index.js deepen --url https://example.com --batch-size 5
node index.js metadata --url https://example.com
node index.js extract --url https://example.com --extract-colors --extract-typography
```

This API documentation provides comprehensive coverage of the Site Crawler's capabilities, suitable for both CLI users and API integrators.