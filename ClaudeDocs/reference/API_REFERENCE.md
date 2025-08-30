# Site Crawler API Reference

Complete technical specification for all programmatic interfaces to the Site Crawler, including CLI commands, configuration schema, WebSocket API, and output formats.

## Table of Contents

- [CLI Reference](#cli-reference)
- [Configuration Schema](#configuration-schema)
- [WebSocket API](#websocket-api)
- [Output Formats](#output-formats)
- [Error Codes](#error-codes)
- [Integration Examples](#integration-examples)

## CLI Reference

The Site Crawler provides a comprehensive command-line interface for all crawling and extraction operations.

### Base Command

```bash
node index.js <command> [options]
# or using npm scripts
pnpm run <command>
```

### Available Commands

#### `initial` - Initial Site Discovery

Performs shallow crawl to discover site structure (1 level deep).

```bash
node index.js initial [options]
pnpm run initial
```

**Purpose**: Discovers all URLs one level deep from homepage  
**Prerequisites**: None  
**Output**: `output/paths.json` with discovered URLs

#### `deepen` - Progressive Depth Crawling

Extends crawling depth incrementally based on discovered paths.

```bash
node index.js deepen [options]
pnpm run deepen
```

**Purpose**: Extends crawling depth by one level  
**Prerequisites**: Requires existing `paths.json`  
**Output**: Updated `paths.json` with deeper URLs

#### `metadata` - Page Metadata Collection

Collects structural metadata from all discovered pages.

```bash
node index.js metadata [options]  
pnpm run metadata
```

**Purpose**: Collects page metadata (body classes, templates, structure)  
**Prerequisites**: Requires existing `paths.json`  
**Output**: `output/metadata.json` with page metadata

#### `extract` - Design Token Extraction

Extracts design tokens and CSS properties from crawled pages.

```bash
node index.js extract [options]
pnpm run extract
```

**Purpose**: Extracts design tokens from crawled pages  
**Prerequisites**: Requires existing `metadata.json`  
**Output**: Multiple JSON files in `output/extract/` directory

#### `all` - Complete Pipeline

Runs the entire workflow in sequence: initial → deepen → metadata → extract.

```bash
node index.js all [options]
pnpm run all
```

**Purpose**: Complete end-to-end site analysis  
**Prerequisites**: None  
**Output**: Complete set of extraction results

### CLI Options

All commands support the following options:

#### Core Options

| Option | Alias | Description | Default | Validation |
|--------|-------|-------------|---------|------------|
| `--url <url>` | `-u` | Base URL to crawl | Required | Valid URL format |
| `--output <dir>` | `-o` | Output directory | `./output` | Directory path |
| `--depth <number>` | `-d` | Maximum crawl depth | `3` | 1-10 |
| `--timeout <ms>` | `-t` | Request timeout (ms) | `45000` | 1000-120000 |
| `--retries <number>` | `-r` | Maximum retry attempts | `2` | 0-10 |

#### Example Usage

```bash
# Basic crawl with default settings
node index.js all --url https://example.com

# Custom configuration
node index.js all \
  --url https://example.com \
  --depth 2 \
  --timeout 30000 \
  --retries 3 \
  --output ./custom-output

# Phase-specific execution
node index.js initial --url https://example.com --depth 1
node index.js extract --url https://example.com --timeout 60000
```

### NPM Scripts

Pre-configured scripts for common operations:

```bash
pnpm run start        # Start with default command
pnpm run initial      # Initial crawl
pnpm run deepen       # Deepen crawl  
pnpm run metadata     # Metadata collection
pnpm run extract      # Design token extraction
pnpm run all          # Complete pipeline

# Development scripts
pnpm run build        # TypeScript compilation
pnpm run typecheck    # Type checking only
pnpm run lint         # ESLint checking
pnpm run test         # Run test suite
```

## Configuration Schema

The Site Crawler uses JSON configuration files for flexible setup and customization.

### Primary Configuration (`config/config.json`)

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

### Schema Validation Rules

#### Root Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `base_url` | string | Yes | Target website URL |
| `name` | string | No | Project identifier |
| `crawl_settings` | object | No | Crawling behavior configuration |
| `extraction_settings` | object | No | Token extraction configuration |

#### Crawl Settings

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `max_depth` | number | 3 | 1-10 | Maximum crawling depth |
| `batch_size` | number | 20 | 1-100 | Pages processed per batch |
| `max_retries` | number | 2 | 0-10 | Failed request retry limit |
| `timeout` | number | 45000 | 1000-120000 | Request timeout (milliseconds) |
| `user_agent` | string | "Site-Crawler/1.0" | - | HTTP User-Agent header |
| `ignore_patterns` | array | [] | - | URL patterns to skip (glob format) |

#### Extraction Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `extract_colors` | boolean | true | Enable color extraction |
| `extract_typography` | boolean | true | Enable typography extraction |
| `extract_spacing` | boolean | true | Enable spacing extraction |
| `extract_borders` | boolean | true | Enable border extraction |
| `extract_animations` | boolean | true | Enable animation extraction |
| `color_threshold` | number | 5 | Minimum color occurrences to include |
| `spacing_threshold` | number | 2 | Minimum spacing occurrences to include |

### Default Configuration (`config/default.json`)

Extended configuration with extractor-specific settings:

```json
{
  "baseUrl": "http://localhost:3000",
  "maxPages": 20,
  "timeout": 30000,
  "ignorePatterns": ["\\?", "/admin/", "/api/"],
  "ignoreExtensions": [".pdf", ".jpg", ".zip"],
  "screenshots": true,
  "outputDir": "./results",
  "extractors": {
    "colors": {
      "includeTextColors": true,
      "includeBackgroundColors": true,
      "includeBorderColors": true,
      "minimumOccurrences": 2
    },
    "typography": {
      "includeHeadings": true,
      "includeBodyText": true,
      "includeSpecialText": true,
      "minOccurrences": 2
    },
    "spacing": {
      "includeMargins": true,
      "includePadding": true,
      "includeGap": true,
      "minOccurrences": 2
    },
    "borders": {
      "includeBorderWidth": true,
      "includeBorderStyle": true,
      "includeBorderRadius": true,
      "includeShadows": true,
      "minOccurrences": 2
    }
  },
  "tokens": {
    "outputFormats": ["css", "json", "figma"],
    "prefix": "dt"
  }
}
```

### Runtime Configuration Override

Configuration can be dynamically updated via CLI flags or WebSocket messages:

```bash
# CLI override
node index.js extract --max-depth 2 --batch-size 10 --timeout 30000

# Environment variables
MAX_DEPTH=2 TIMEOUT=30000 node index.js all
```

## WebSocket API

Real-time communication interface for UI integration and live progress monitoring.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Message Format

All WebSocket messages follow this structure:

```json
{
  "event": "event-name",
  "data": {
    // Event-specific payload
  }
}
```

### Client → Server Events

#### `start-extraction`

Initiate crawling and extraction process.

```json
{
  "event": "start-extraction",
  "data": {
    "url": "https://example.com",
    "config": {
      "max_depth": 3,
      "batch_size": 20,
      "timeout": 45000,
      "extraction_settings": {
        "extract_colors": true,
        "extract_typography": true
      }
    }
  }
}
```

#### `update-config`

Dynamically update crawler configuration.

```json
{
  "event": "update-config",
  "data": {
    "crawl_settings": {
      "max_depth": 2,
      "batch_size": 10,
      "timeout": 30000
    },
    "extraction_settings": {
      "extract_animations": false
    }
  }
}
```

#### `pause-extraction`

Pause ongoing extraction process.

```json
{
  "event": "pause-extraction",
  "data": {}
}
```

#### `resume-extraction`

Resume paused extraction process.

```json
{
  "event": "resume-extraction", 
  "data": {}
}
```

### Server → Client Events

#### `progress-update`

Real-time progress notifications during extraction.

```json
{
  "event": "progress-update",
  "data": {
    "stage": "color-extraction",
    "progress": 0.65,
    "current_item": "processing /about page",
    "total_items": 50,
    "completed_items": 32,
    "estimated_remaining_ms": 15000
  }
}
```

#### `stage-complete`

Notification when extraction stage completes.

```json
{
  "event": "stage-complete",
  "data": {
    "stage": "typography-extraction",
    "results": {
      "fonts_found": 12,
      "font_weights": [300, 400, 600, 700],
      "font_sizes": ["12px", "14px", "16px", "18px", "24px", "32px"]
    },
    "duration_ms": 2340,
    "pages_processed": 25
  }
}
```

#### `extraction-error`

Error notifications with retry information.

```json
{
  "event": "extraction-error",
  "data": {
    "stage": "crawler-stage",
    "error": "Connection timeout",
    "error_code": "TIMEOUT_ERROR",
    "url": "https://example.com/problematic-page",
    "retries_remaining": 2,
    "will_retry": true,
    "retry_delay_ms": 5000
  }
}
```

#### `extraction-complete`

Final completion notification with comprehensive results.

```json
{
  "event": "extraction-complete",
  "data": {
    "total_duration_ms": 45670,
    "pages_processed": 127,
    "pages_failed": 3,
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
    ],
    "summary": {
      "success_rate": 0.976,
      "avg_page_processing_ms": 362
    }
  }
}
```

#### `server-status`

Server health and resource information.

```json
{
  "event": "server-status",
  "data": {
    "status": "healthy",
    "active_extractions": 1,
    "memory_usage_mb": 156,
    "uptime_ms": 3600000,
    "version": "1.0.0"
  }
}
```

## Output Formats

Comprehensive specification of all generated files and their schemas.

### Paths File (`output/paths.json`)

URL discovery and crawl metadata.

```json
{
  "baseUrl": "https://example.com",
  "scan_type": "complete",
  "total_paths": 127,
  "crawl_depth": 3,
  "created": "2024-01-15T10:30:00Z",
  "last_updated": "2024-01-15T11:45:00Z",
  "all_paths": [
    {
      "url": "https://example.com",
      "depth": 0,
      "source": "homepage",
      "last_crawled": "2024-01-15T10:30:00Z",
      "status_code": 200,
      "response_time_ms": 245,
      "content_type": "text/html",
      "page_size_bytes": 45672
    }
  ],
  "external_links": [
    {
      "url": "https://external-site.com",
      "source_pages": ["https://example.com/about"],
      "link_text": "Visit Partner Site"
    }
  ],
  "file_urls": [
    {
      "url": "https://example.com/document.pdf",
      "source_pages": ["https://example.com/resources"],
      "file_type": "pdf",
      "file_size_bytes": 2456789
    }
  ],
  "problem_paths": [
    {
      "url": "https://example.com/broken",
      "error": "404 Not Found",
      "error_code": "HTTP_404",
      "retry_count": 2,
      "last_attempt": "2024-01-15T10:45:00Z"
    }
  ]
}
```

### Metadata File (`output/metadata.json`)

Page structure and template analysis.

```json
{
  "baseUrl": "https://example.com", 
  "analysis_date": "2024-01-15T10:30:00Z",
  "pages_analyzed": 127,
  "pages": [
    {
      "url": "https://example.com/about",
      "title": "About Us - Example Company",
      "meta_description": "Learn about our company history and mission",
      "body_classes": ["page-about", "has-sidebar", "theme-light"],
      "template_type": "page",
      "content_type": "static",
      "language": "en",
      "canonical_url": "https://example.com/about",
      "structured_data": ["Organization", "BreadcrumbList"],
      "performance_metrics": {
        "load_time_ms": 1245,
        "dom_elements": 892,
        "images": 15,
        "scripts": 8,
        "stylesheets": 3
      }
    }
  ],
  "template_analysis": {
    "templates_found": ["homepage", "page", "blog-post", "category"],
    "most_common_template": "page",
    "template_distribution": {
      "page": 45,
      "blog-post": 32,
      "category": 15,
      "homepage": 1
    }
  },
  "technology_stack": {
    "cms": "WordPress",
    "frameworks": ["jQuery", "Bootstrap"],
    "analytics": ["Google Analytics", "GTM"]
  }
}
```

### Design Token Files

#### Colors (`output/extract/colors.json`)

```json
{
  "primary_colors": {
    "blue_500": {
      "hex": "#3B82F6",
      "rgb": "59, 130, 246", 
      "hsl": "217, 91%, 60%",
      "usage_count": 45,
      "contexts": ["buttons", "links", "headers"],
      "accessibility_score": "AA",
      "contrast_ratios": {
        "white": 4.2,
        "black": 14.8
      }
    }
  },
  "secondary_colors": {
    "gray_100": {
      "hex": "#F3F4F6",
      "usage_count": 23,
      "contexts": ["backgrounds", "borders"]
    }
  },
  "color_palette": ["#3B82F6", "#EF4444", "#10B981"],
  "color_relationships": {
    "complementary": ["#3B82F6", "#F6823B"],
    "analogous": ["#3B82F6", "#3B5CF6", "#3BBAF6"]
  },
  "extraction_metadata": {
    "pages_analyzed": 127,
    "unique_colors": 34,
    "extraction_date": "2024-01-15T10:30:00Z",
    "extraction_duration_ms": 2340
  }
}
```

#### Typography (`output/extract/typography.json`)

```json
{
  "font_families": {
    "primary": {
      "name": "Inter",
      "fallbacks": ["system-ui", "sans-serif"],
      "usage_count": 89,
      "font_weight_range": [300, 700],
      "unicode_range": "U+0000-00FF"
    },
    "secondary": {
      "name": "Roboto Mono", 
      "fallbacks": ["monospace"],
      "usage_count": 12,
      "contexts": ["code", "pre"]
    }
  },
  "font_sizes": {
    "base": "16px",
    "scale_type": "modular",
    "scale_ratio": 1.25,
    "sizes": [12, 14, 16, 18, 20, 24, 32, 48, 64]
  },
  "font_weights": [300, 400, 500, 600, 700],
  "line_heights": {
    "tight": 1.25,
    "normal": 1.5, 
    "loose": 1.75,
    "heading": 1.1,
    "body": 1.6
  },
  "typography_scale": {
    "h1": {
      "font_size": "48px",
      "font_weight": 700,
      "line_height": 1.1,
      "letter_spacing": "-0.02em"
    },
    "body": {
      "font_size": "16px", 
      "font_weight": 400,
      "line_height": 1.6,
      "letter_spacing": "0em"
    }
  },
  "text_decoration": {
    "link_styles": ["underline", "none"],
    "emphasis_styles": ["italic", "bold"]
  }
}
```

#### Spacing (`output/extract/spacing.json`)

```json
{
  "spacing_scale": {
    "base_unit": "rem",
    "scale": [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
    "pixel_equivalents": [4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256]
  },
  "margin_patterns": {
    "small": "0.5rem",
    "medium": "1rem", 
    "large": "2rem",
    "xlarge": "4rem"
  },
  "padding_patterns": {
    "button": "0.5rem 1rem",
    "card": "1.5rem",
    "section": "4rem 0"
  },
  "layout_patterns": {
    "container_max_width": "1200px",
    "grid_gap": "2rem",
    "column_gap": "1rem"
  },
  "responsive_breakpoints": {
    "mobile": "320px",
    "tablet": "768px", 
    "desktop": "1024px",
    "wide": "1440px"
  }
}
```

#### Borders (`output/extract/borders.json`)

```json
{
  "border_widths": {
    "thin": "1px",
    "medium": "2px",
    "thick": "4px"
  },
  "border_styles": ["solid", "dashed", "dotted", "none"],
  "border_radius": {
    "small": "4px",
    "medium": "8px", 
    "large": "16px",
    "round": "50%"
  },
  "box_shadows": {
    "subtle": "0 1px 3px rgba(0, 0, 0, 0.1)",
    "medium": "0 4px 6px rgba(0, 0, 0, 0.1)",
    "large": "0 10px 15px rgba(0, 0, 0, 0.1)"
  },
  "outline_patterns": {
    "focus": "2px solid #3B82F6",
    "error": "2px solid #EF4444"
  }
}
```

#### Animations (`output/extract/animations.json`)

```json
{
  "transitions": {
    "default": "all 0.2s ease-in-out",
    "fast": "all 0.1s ease-in-out", 
    "slow": "all 0.3s ease-in-out"
  },
  "easing_functions": [
    "ease",
    "ease-in-out", 
    "cubic-bezier(0.4, 0, 0.2, 1)"
  ],
  "durations": {
    "instant": "0.05s",
    "fast": "0.1s",
    "normal": "0.2s",
    "slow": "0.3s"
  },
  "keyframe_animations": [
    {
      "name": "fadeIn",
      "keyframes": {
        "0%": { "opacity": 0 },
        "100%": { "opacity": 1 }
      },
      "duration": "0.3s"
    }
  ],
  "transform_patterns": {
    "scale_hover": "scale(1.05)",
    "rotate_loading": "rotate(360deg)"
  }
}
```

#### Extraction Summary (`output/extract/summary.json`)

```json
{
  "baseUrl": "https://example.com",
  "extract_time": "2024-01-15T10:30:00Z",
  "extraction_duration_ms": 45670,
  "paths_processed": 127,
  "successful_extractions": 124,
  "failed_extractions": 3,
  "extraction_categories": [
    {
      "name": "typography",
      "description": "Typography (fonts, sizes, etc.)",
      "file": "typography.json",
      "tokens_found": 18,
      "processing_time_ms": 2340
    },
    {
      "name": "colors", 
      "description": "Colors (backgrounds, text, borders)",
      "file": "colors.json",
      "tokens_found": 34,
      "processing_time_ms": 3450
    }
  ],
  "path_results": [
    {
      "url": "https://example.com/about",
      "title": "About Us",
      "processing_time_ms": 362,
      "extracted": {
        "typography": true,
        "colors": true,
        "spacing": true,
        "borders": true,
        "animations": true
      },
      "error": null
    }
  ],
  "performance_metrics": {
    "avg_page_processing_ms": 362,
    "total_tokens_extracted": 91,
    "success_rate": 0.976
  }
}
```

## Error Codes

Comprehensive error classification and troubleshooting guide.

### Error Categories

#### Network Errors (1000-1999)

| Code | Error Type | Description | Resolution |
|------|------------|-------------|------------|
| 1001 | CONNECTION_TIMEOUT | Page load exceeds timeout limit | Increase `timeout` setting |
| 1002 | DNS_RESOLUTION | Domain cannot be resolved | Check URL spelling and DNS |
| 1003 | CONNECTION_REFUSED | Server refuses connection | Verify server is running |
| 1004 | SSL_ERROR | SSL certificate validation failed | Check SSL certificate validity |
| 1005 | HTTP_4XX | Client error response (400-499) | Check URL and access permissions |
| 1006 | HTTP_5XX | Server error response (500-599) | Server-side issue, try later |

#### Extraction Errors (2000-2999)

| Code | Error Type | Description | Resolution |
|------|------------|-------------|------------|
| 2001 | PARSE_ERROR | Invalid CSS or HTML structure | Check page markup validity |
| 2002 | MEMORY_LIMIT | Insufficient memory for processing | Increase Node.js memory limit |
| 2003 | PROCESSING_TIMEOUT | Extraction exceeds time limit | Reduce batch size or increase timeout |
| 2004 | SELECTOR_NOT_FOUND | CSS selector not found | Verify CSS selector validity |
| 2005 | EMPTY_CONTENT | No extractable content found | Check if page has renderable content |

#### Configuration Errors (3000-3999)

| Code | Error Type | Description | Resolution |
|------|------------|-------------|------------|
| 3001 | INVALID_URL | Malformed target URL | Verify URL format |
| 3002 | MISSING_CONFIG | Configuration file not found | Create config.json from example |
| 3003 | INVALID_CONFIG | Configuration validation failed | Check config schema compliance |
| 3004 | PERMISSION_ERROR | File system access denied | Check directory permissions |
| 3005 | OUTPUT_DIR_ERROR | Cannot create output directory | Verify path and permissions |

#### System Errors (4000-4999)

| Code | Error Type | Description | Resolution |
|------|------------|-------------|------------|
| 4001 | DISK_SPACE | Insufficient disk space | Free up disk space |
| 4002 | FILE_LOCK | Output file locked by another process | Close other applications using files |
| 4003 | DEPENDENCY_ERROR | Required dependency missing | Run `pnpm install` |
| 4004 | VERSION_MISMATCH | Node.js version incompatible | Update to supported Node.js version |

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": true,
  "error_code": "CONNECTION_TIMEOUT",
  "message": "Page load exceeded timeout limit of 45000ms",
  "details": {
    "url": "https://example.com/slow-page",
    "timeout_ms": 45000,
    "retry_count": 2,
    "stage": "initial-crawl"
  },
  "suggestions": [
    "Increase timeout setting with --timeout flag",
    "Check if page requires authentication",
    "Verify page exists and is accessible"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Recovery Strategies

#### Automatic Recovery

1. **Exponential Backoff**: Failed requests retry with increasing delays
2. **Graceful Degradation**: Continue processing other pages on individual failures
3. **Checkpoint Recovery**: Resume from last successful state
4. **Error Aggregation**: Collect and report all errors at completion

#### Manual Recovery

```bash
# Memory issues - increase Node.js memory
node --max-old-space-size=4096 index.js all

# Timeout issues - increase timeout
node index.js all --timeout 60000

# SSL issues (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js all

# Debug mode
DEBUG=crawler:* node index.js all
```

## Integration Examples

Real-world usage patterns and integration code samples.

### Basic Website Analysis

```bash
#!/bin/bash
# complete-analysis.sh - Full website analysis script

echo "🔍 Starting complete website analysis..."

# Configure target
URL="https://example.com"
OUTPUT_DIR="./analysis-results"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run complete pipeline
node index.js all \
  --url "$URL" \
  --output "$OUTPUT_DIR" \
  --depth 3 \
  --timeout 45000 \
  --retries 2

echo "✅ Analysis complete. Results in $OUTPUT_DIR"

# Generate report
echo "📊 Generating summary report..."
node -e "
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('$OUTPUT_DIR/extract/summary.json'));
console.log(\`
Analysis Summary:
- Pages processed: \${summary.paths_processed}
- Success rate: \${(summary.successful_extractions/summary.paths_processed*100).toFixed(1)}%
- Tokens extracted: \${Object.values(summary.extraction_categories).reduce((sum, cat) => sum + (cat.tokens_found || 0), 0)}
- Duration: \${(summary.extraction_duration_ms/1000).toFixed(1)}s
\`);
"
```

### Real-time UI Integration

```javascript
// webapp/src/crawler-client.js
class CrawlerClient {
  constructor(wsUrl = 'ws://localhost:3001') {
    this.ws = new WebSocket(wsUrl);
    this.listeners = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('Connected to Site Crawler');
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      const { event: eventType, data } = JSON.parse(event.data);
      this.emit(eventType, data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Site Crawler');
      this.emit('disconnected');
    };
  }

  // Event system
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  emit(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // API methods
  startExtraction(config) {
    this.send('start-extraction', config);
  }

  updateConfig(config) {
    this.send('update-config', config);
  }

  pauseExtraction() {
    this.send('pause-extraction', {});
  }

  resumeExtraction() {
    this.send('resume-extraction', {});
  }

  send(event, data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }
}

// Usage example
const crawler = new CrawlerClient();

// Progress tracking
crawler.on('progress-update', (data) => {
  const progress = Math.round(data.progress * 100);
  updateProgressBar(progress);
  updateStatusText(`${data.current_item} (${data.completed_items}/${data.total_items})`);
});

// Stage completion
crawler.on('stage-complete', (data) => {
  console.log(`✅ ${data.stage} complete:`, data.results);
  addStageToHistory(data.stage, data.results, data.duration_ms);
});

// Error handling
crawler.on('extraction-error', (data) => {
  console.error(`❌ Error in ${data.stage}:`, data.error);
  if (data.will_retry) {
    showRetryNotification(data.retries_remaining, data.retry_delay_ms);
  } else {
    showErrorModal(data.error, data.error_code);
  }
});

// Final results
crawler.on('extraction-complete', (data) => {
  console.log('🎉 Extraction complete:', data);
  displayResults(data.tokens_extracted);
  showDownloadLinks(data.output_files);
  updateAnalytics(data.summary);
});

// Start extraction
crawler.startExtraction({
  url: 'https://example.com',
  config: {
    max_depth: 2,
    extract_colors: true,
    extract_typography: true
  }
});
```

### Custom Extraction Pipeline

```javascript
// automation/custom-pipeline.js
import fs from 'fs';
import path from 'path';
import { initialCrawl } from '../phases/initial-crawl.js';
import { deepenCrawl } from '../phases/deepen-crawl.js';
import { gatherMetadata } from '../phases/metadata.js';
import { extractCss } from '../phases/extract.js';

class CustomPipeline {
  constructor(config) {
    this.config = config;
    this.results = {};
    this.startTime = Date.now();
  }

  async runPipeline() {
    console.log(`🚀 Starting custom pipeline for ${this.config.url}`);

    try {
      // Phase 1: Conditional initial crawl
      if (this.shouldRunPhase('initial')) {
        await this.runPhase('initial', () => 
          initialCrawl(this.config.url, this.createSpinner('Initial'))
        );
      }

      // Phase 2: Smart depth crawling
      const targetDepth = this.calculateOptimalDepth();
      for (let depth = 1; depth <= targetDepth; depth++) {
        await this.runPhase(`deepen-${depth}`, () =>
          deepenCrawl(this.config.url, depth, this.createSpinner(`Depth ${depth}`))
        );
      }

      // Phase 3: Metadata with filtering
      await this.runPhase('metadata', () =>
        gatherMetadata(this.config.url, this.createSpinner('Metadata'))
      );

      // Phase 4: Selective extraction
      await this.runPhase('extract', async () => {
        const customConfig = {
          ...this.config,
          extractors: this.getActiveExtractors()
        };
        return extractCss(this.config.url, this.createSpinner('Extract'), customConfig);
      });

      // Generate custom report
      await this.generateReport();

      console.log(`✅ Pipeline complete in ${this.getDuration()}s`);

    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
      await this.generateErrorReport(error);
      throw error;
    }
  }

  async runPhase(name, phaseFunction) {
    const phaseStart = Date.now();
    console.log(`📍 Phase: ${name}`);
    
    try {
      const result = await phaseFunction();
      const duration = Date.now() - phaseStart;
      
      this.results[name] = {
        success: true,
        duration_ms: duration,
        result
      };

      console.log(`✅ ${name} completed in ${duration}ms`);
    } catch (error) {
      this.results[name] = {
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart
      };
      throw error;
    }
  }

  shouldRunPhase(phase) {
    // Skip phases based on existing output or configuration
    const outputFile = this.getPhaseOutputFile(phase);
    return this.config.force_rerun || !fs.existsSync(outputFile);
  }

  calculateOptimalDepth() {
    // Dynamic depth calculation based on site size
    const siteType = this.detectSiteType();
    const depthMap = {
      'small_business': 2,
      'corporate': 3,
      'ecommerce': 4,
      'large_portal': 5
    };
    return depthMap[siteType] || this.config.max_depth;
  }

  getActiveExtractors() {
    // Return only requested extractors
    return Object.entries(this.config.extractors || {})
      .filter(([_, enabled]) => enabled)
      .reduce((acc, [name, _]) => ({ ...acc, [name]: true }), {});
  }

  async generateReport() {
    const report = {
      pipeline_config: this.config,
      execution_results: this.results,
      total_duration_ms: this.getDuration() * 1000,
      timestamp: new Date().toISOString(),
      summary: this.generateSummary()
    };

    const reportPath = path.join(this.config.output_dir, 'pipeline-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Report generated: ${reportPath}`);
  }

  getDuration() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  createSpinner(phase) {
    // Mock spinner implementation
    return {
      start: () => console.log(`⏳ Starting ${phase}...`),
      succeed: () => console.log(`✅ ${phase} completed`),
      fail: (msg) => console.log(`❌ ${phase} failed: ${msg}`)
    };
  }
}

// Usage
const pipeline = new CustomPipeline({
  url: 'https://example.com',
  output_dir: './custom-output',
  max_depth: 3,
  force_rerun: false,
  extractors: {
    colors: true,
    typography: true,
    spacing: false,
    borders: true,
    animations: false
  }
});

pipeline.runPipeline().catch(console.error);
```

### Batch Processing Multiple Sites

```javascript
// automation/batch-processor.js
import fs from 'fs';
import path from 'path';

class BatchProcessor {
  constructor(sitesFile, baseOutputDir) {
    this.sites = JSON.parse(fs.readFileSync(sitesFile, 'utf8'));
    this.baseOutputDir = baseOutputDir;
    this.results = [];
  }

  async processBatch() {
    console.log(`🔄 Processing ${this.sites.length} sites...`);

    for (let i = 0; i < this.sites.length; i++) {
      const site = this.sites[i];
      console.log(`\n📍 Processing site ${i + 1}/${this.sites.length}: ${site.url}`);

      try {
        const result = await this.processSite(site);
        this.results.push({ ...site, success: true, ...result });
        console.log(`✅ ${site.name} completed successfully`);
      } catch (error) {
        this.results.push({ 
          ...site, 
          success: false, 
          error: error.message 
        });
        console.error(`❌ ${site.name} failed: ${error.message}`);
        
        // Continue with next site rather than failing entire batch
        if (!site.critical) continue;
        throw error;
      }
    }

    await this.generateBatchReport();
    return this.results;
  }

  async processSite(site) {
    const outputDir = path.join(this.baseOutputDir, site.slug);
    
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Run extraction pipeline
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const crawler = spawn('node', [
        'index.js', 'all',
        '--url', site.url,
        '--output', outputDir,
        '--depth', site.depth?.toString() || '3',
        '--timeout', site.timeout?.toString() || '45000'
      ]);

      let output = '';
      let errorOutput = '';

      crawler.stdout.on('data', (data) => {
        output += data.toString();
      });

      crawler.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      crawler.on('close', (code) => {
        if (code === 0) {
          // Parse results from output directory
          const summaryFile = path.join(outputDir, 'extract', 'summary.json');
          const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
          
          resolve({
            output_directory: outputDir,
            pages_processed: summary.paths_processed,
            tokens_extracted: summary.extraction_categories.reduce(
              (total, cat) => total + (cat.tokens_found || 0), 0
            ),
            processing_time_ms: summary.extraction_duration_ms
          });
        } else {
          reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  async generateBatchReport() {
    const report = {
      batch_config: {
        total_sites: this.sites.length,
        output_directory: this.baseOutputDir,
        processed_at: new Date().toISOString()
      },
      results: this.results,
      summary: {
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        success_rate: this.results.filter(r => r.success).length / this.results.length,
        total_pages: this.results.reduce((sum, r) => sum + (r.pages_processed || 0), 0),
        total_tokens: this.results.reduce((sum, r) => sum + (r.tokens_extracted || 0), 0)
      }
    };

    const reportPath = path.join(this.baseOutputDir, 'batch-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Batch processing complete!`);
    console.log(`- Successful: ${report.summary.successful}/${report.summary.total_sites}`);
    console.log(`- Total pages: ${report.summary.total_pages}`);
    console.log(`- Total tokens: ${report.summary.total_tokens}`);
    console.log(`- Report: ${reportPath}`);
  }
}

// sites.json example
const sitesExample = [
  {
    "name": "Company Website",
    "url": "https://example.com", 
    "slug": "example-com",
    "depth": 3,
    "timeout": 45000,
    "critical": true
  },
  {
    "name": "Marketing Site",
    "url": "https://marketing.example.com",
    "slug": "marketing-example",
    "depth": 2,
    "timeout": 30000,
    "critical": false
  }
];

// Usage
const processor = new BatchProcessor('./sites.json', './batch-output');
processor.processBatch()
  .then(results => console.log('Batch complete:', results))
  .catch(error => console.error('Batch failed:', error));
```

This comprehensive API reference provides complete technical specifications for integrating with the Site Crawler through all available interfaces, enabling developers to build robust automation workflows and real-time applications.