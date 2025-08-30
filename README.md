# Site Crawler

A sophisticated web crawling and design token extraction tool that systematically analyzes websites to extract design patterns, CSS tokens, and metadata.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure your target site
cp config/config.json.example config/config.json
# Edit config.json with your target URL

# Run complete analysis
pnpm run all
```

## ✨ Features

### Core Crawling
- **Multi-phase Crawling**: Prevents timeouts with systematic depth progression
- **URL Discovery**: Intelligent link extraction and validation  
- **Metadata Collection**: Page templates, structure analysis, and classification
- **Error Recovery**: Robust retry mechanisms and graceful failure handling

### Design Token Extraction
- **Color Analysis**: Comprehensive color palette extraction and naming
- **Typography Tokens**: Font systems, scales, and hierarchy detection
- **Spacing Patterns**: Layout tokens and grid system identification
- **Border & Animation**: Visual effects and motion pattern analysis

### Modern Architecture
- **Dual Implementation**: TypeScript pipeline + proven JavaScript phases
- **Real-time UI**: React components with Storybook development
- **WebSocket API**: Live progress updates and result streaming
- **Comprehensive Testing**: Unit, integration, E2E, and visual regression tests

## 🏗️ Architecture

### Project Structure
```
├── src/                    # Modern TypeScript architecture  
│   ├── core/              # Extraction pipeline
│   ├── ui/                # React UI components
│   └── api/               # WebSocket server
├── phases/                # Legacy JavaScript crawling
├── utils/                 # Shared utilities
├── tests/                 # Comprehensive test suite
└── ClaudeDocs/           # Complete documentation
```

### Data Flow
```
URL Input → Initial Crawl → Deep Crawl → Metadata → Extraction → Design Tokens
     ↓           ↓            ↓           ↓            ↓            ↓
  config.json  paths.json   paths.json  metadata.json  extract/   tokens/
```

## ⚙️ Configuration

Before running the crawler, configure your target site in `config/config.json`:

```json5
{
  "base_url": "https://example.com",
  "name": "Website Analysis Project",
  "crawl_settings": {
    "max_depth": 3,           // Maximum crawl depth
    "batch_size": 20,         // Pages per batch
    "max_retries": 2,         // Failed request retries  
    "timeout": 45000,         // Page load timeout (ms)
    "ignore_patterns": [      // URL patterns to skip
      "*.pdf", "/admin/*", "/api/*"
    ]
  },
  "extraction_settings": {
    "extract_colors": true,
    "extract_typography": true,
    "extract_spacing": true,
    "extract_borders": true,
    "extract_animations": true
  }
}
```

## 🎯 Usage

### Complete Workflow (Recommended)
```bash
# Analyze entire website with all phases
pnpm run all
# or with custom URL
node index.js all --url https://example.com
```

### Phase-by-Phase Execution
```bash
# 1. Initial discovery (1 level deep)
pnpm run initial

# 2. Deepen crawl progressively  
pnpm run deepen

# 3. Extract page metadata
pnpm run metadata

# 4. Generate design tokens
node index.js extract --url https://example.com
```

### CLI Options
```bash
# Override configuration via CLI
node index.js all \
  --url https://example.com \
  --max-depth 2 \
  --batch-size 10 \
  --timeout 30000
```

## 🎨 UI Development

### Storybook Development
```bash
# Start interactive component development
pnpm run storybook

# Run Storybook tests
pnpm run test:storybook
```

### Real-time Integration
```javascript
// WebSocket connection for live updates
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const { event: eventType, data } = JSON.parse(event.data);
  
  switch (eventType) {
    case 'progress-update':
      updateProgress(data.progress);
      break;
    case 'extraction-complete':
      displayResults(data.results);
      break;
  }
};
```

## 🧪 Testing

### Test Suites
```bash
# Run all tests
pnpm test

# Specific test types
pnpm test:unit              # Unit tests
pnpm test:integration       # Cross-component tests
pnpm test:e2e              # End-to-end workflows
pnpm test:coverage         # Coverage reporting

# Development
pnpm test:watch            # Watch mode
pnpm test:ui               # Visual test runner
```

### Quality Checks
```bash
# Code quality
pnpm run lint              # ESLint checking
pnpm run typecheck         # TypeScript validation
pnpm run build             # Build verification
```

## 📊 Output

### Generated Files
- **`output/paths.json`**: Discovered URLs and crawl metadata
- **`output/metadata.json`**: Page structure and template analysis
- **`output/extract/`**: Design token JSON files
  - `colors.json` - Color palette and usage patterns
  - `typography.json` - Font systems and type scales  
  - `spacing.json` - Layout and spacing tokens
  - `borders.json` - Border styles and visual patterns
  - `animations.json` - Motion and transition effects

### Example Output
```json
{
  "primary_palette": {
    "brand_blue": {
      "hex": "#3B82F6",
      "usage_count": 45,
      "contexts": ["buttons", "links", "headers"]
    }
  },
  "color_statistics": {
    "unique_colors": 34,
    "most_used_color": "#3B82F6"
  }
}
```

## 🚢 Deployment

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "index.js", "all"]
```

### Production Build
```bash
# Build TypeScript components
pnpm run build

# Run production crawl
NODE_ENV=production node index.js all --url https://production-site.com
```

## 🔧 Troubleshooting

### Common Issues

**Memory Issues:**
```bash
# Increase Node.js memory limit  
node --max-old-space-size=4096 index.js all --url large-site.com

# Reduce batch size
node index.js all --batch-size 5 --url large-site.com  
```

**Timeout Issues:**
```bash
# Increase timeout
node index.js all --timeout 60000 --url slow-site.com
```

**SSL Certificate Issues:**
```bash
# Development only - skip SSL verification
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js all --url https://self-signed.com
```

**Debug Mode:**
```bash
# Enable debug logging
DEBUG=crawler:* node index.js all --url https://example.com

# Specific debug namespace
DEBUG=crawler:extraction node index.js extract
```

## 📚 Documentation

### Complete Documentation Available
- **[API Documentation](ClaudeDocs/API_DOCUMENTATION.md)**: WebSocket API and CLI reference
- **[Developer Guide](ClaudeDocs/DEVELOPER_GUIDE.md)**: Development workflows and patterns
- **[Component Reference](ClaudeDocs/COMPONENT_REFERENCE.md)**: Detailed component documentation

## 🤝 Contributing

1. Fork the repository
2. Install dependencies: `pnpm install`  
3. Create feature branch: `git checkout -b feature/amazing-feature`
4. Make changes with tests: `pnpm test`
5. Submit pull request

### Development Standards
- TypeScript strict mode enabled
- ESLint + Prettier code formatting
- Comprehensive test coverage required
- Documentation updates for new features

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

- **Documentation**: Check `ClaudeDocs/` directory for comprehensive guides
- **UI Components**: Interactive examples at `pnpm run storybook`  
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions