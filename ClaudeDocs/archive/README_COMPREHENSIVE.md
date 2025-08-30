# Site Crawler - Comprehensive Documentation

## Overview

Site Crawler is a sophisticated web crawling and design token extraction tool that systematically analyzes websites to extract design patterns, CSS tokens, and metadata. It combines both legacy JavaScript implementations and modern TypeScript architecture to provide comprehensive website analysis capabilities.

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
pnpm install

# Configure target site
cp config/config.json.example config/config.json
# Edit config.json with your target URL

# Run complete analysis
pnpm run all
```

### Basic Usage
```bash
# Analyze complete website (recommended)
node index.js all --url https://example.com

# Step-by-step analysis
node index.js initial --url https://example.com    # Discover URLs
node index.js deepen --url https://example.com     # Deep crawl
node index.js metadata --url https://example.com   # Extract metadata
node index.js extract --url https://example.com    # Generate tokens
```

## 📁 Project Structure

```
crawl/
├── src/                     # Modern TypeScript architecture
│   ├── core/               # Core extraction pipeline
│   │   ├── pipeline.ts     # Main orchestration
│   │   ├── stages/         # Extraction stages
│   │   └── types.ts        # Type definitions
│   ├── ui/                 # React UI components
│   │   ├── components/     # Reusable components
│   │   └── pages/          # Page-level components
│   ├── api/                # WebSocket server
│   └── utils/              # Shared utilities
├── phases/                 # Legacy JavaScript phases
│   ├── initial-crawl.js    # URL discovery
│   ├── deepen-crawl.js     # Deep crawling
│   ├── metadata.js         # Metadata extraction
│   └── extract.js          # CSS extraction
├── utils/                  # JavaScript utilities
├── tests/                  # Comprehensive test suite
├── output/                 # Generated results
├── .storybook/            # UI component development
└── ClaudeDocs/            # Project documentation
```

## 🏗️ Architecture

### Dual Architecture Approach

**Modern TypeScript (src/)**: New features and UI components
- Pipeline-based extraction system
- React UI with Storybook integration
- WebSocket API for real-time communication
- Comprehensive testing with Vitest

**Legacy JavaScript (phases/, utils/)**: Core crawling functionality
- Proven crawling algorithms
- Playwright-based browser automation
- File system management
- CLI command processing

### Data Flow
```
URL Input → Initial Crawl → Deep Crawl → Metadata → Extraction → Design Tokens
     ↓           ↓            ↓           ↓            ↓            ↓
  config.json  paths.json   paths.json  metadata.json  extract/   tokens/
```

## 🔧 Configuration

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
    "ignore_patterns": ["*.pdf", "/admin/*"]
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

### CLI Options
```bash
# Override configuration via CLI
node index.js all \
  --url https://example.com \
  --max-depth 2 \
  --batch-size 10 \
  --timeout 30000
```

## 📊 Output Formats

### Generated Files

#### URL Discovery (`output/paths.json`)
```json
{
  "baseUrl": "https://example.com",
  "total_paths": 127,
  "all_paths": [
    {
      "url": "https://example.com/about",
      "depth": 1,
      "source": "homepage"
    }
  ]
}
```

#### Page Metadata (`output/metadata.json`)
```json
{
  "page_templates": {
    "homepage": {
      "body_classes": ["home", "page"],
      "h1_count": 1,
      "image_count": 24,
      "template_type": "landing"
    }
  }
}
```

#### Design Tokens (`output/extract/`)
- `colors.json` - Color palette and usage
- `typography.json` - Font systems and scales
- `spacing.json` - Layout and spacing tokens
- `borders.json` - Border styles and patterns
- `animations.json` - Motion and transition tokens

## 🎨 UI Components

### Storybook Development
```bash
# Start Storybook development server
pnpm run storybook

# Run Storybook tests
pnpm run test:storybook
```

### Key Components
- **TokenCard**: Individual design token display
- **TokenGrid**: Token collection management
- **PipelineEditor**: Visual pipeline configuration
- **Dashboard**: Main application interface

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
# Unit tests
pnpm test

# Integration tests  
pnpm test:integration

# End-to-end tests
pnpm test:e2e

# Coverage report
pnpm test:coverage

# UI component tests
pnpm run storybook
pnpm test:storybook
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Cross-component interaction
- **E2E Tests**: Complete workflow validation
- **Visual Tests**: UI component regression testing
- **Performance Tests**: Load and memory testing

## 🚀 Development

### Adding New Extraction Stages
1. Create stage class in `src/core/stages/`
2. Implement `ExtractionStage` interface
3. Add to pipeline configuration
4. Write comprehensive tests
5. Update documentation

### Contributing Workflow
```bash
# Setup development environment
git clone <repository>
pnpm install

# Create feature branch
git checkout -b feature/new-extraction-stage

# Make changes and test
pnpm test
pnpm run lint
pnpm run typecheck

# Submit changes
git commit -m "feat: add new extraction stage"
git push origin feature/new-extraction-stage
```

## 📚 Documentation

### Available Documentation
- **[API Documentation](./API_DOCUMENTATION.md)**: Complete API reference
- **[Developer Guide](./DEVELOPER_GUIDE.md)**: Development workflows and patterns
- **[Component Reference](./COMPONENT_REFERENCE.md)**: Detailed component documentation
- **[Storybook Improvement Report](./STORYBOOK_IMPROVEMENT_REPORT.md)**: UI development status

### Documentation Standards
- **API Documentation**: All public interfaces documented
- **Code Comments**: Inline JSDoc for complex functions
- **README Files**: Each major directory has usage guide
- **Storybook Stories**: All UI components have interactive examples

## 🔍 Troubleshooting

### Common Issues

#### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 index.js all --url large-site.com

# Reduce batch size
node index.js all --batch-size 5 --url large-site.com
```

#### Timeout Issues
```bash
# Increase timeout
node index.js all --timeout 60000 --url slow-site.com
```

#### SSL Certificate Issues
```bash
# Development only - skip SSL verification
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js all --url https://self-signed.com
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=crawler:* node index.js all --url https://example.com

# Specific debug namespace
DEBUG=crawler:extraction node index.js extract
```

## 🚢 Deployment

### Production Build
```bash
# Build TypeScript components
pnpm run build

# Run production crawl
NODE_ENV=production node index.js all --url https://production-site.com
```

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

### CI/CD Integration
- Automated testing on pull requests
- Daily scheduled crawling runs
- Artifact storage for results
- Performance regression detection

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create feature branch
3. Install dependencies: `pnpm install`
4. Make changes with tests
5. Submit pull request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code style enforcement  
- **Prettier**: Automatic code formatting
- **Commitizen**: Conventional commit messages
- **Husky**: Pre-commit hooks for quality

### Review Process
- All changes require pull request review
- Automated tests must pass
- Documentation updates for new features
- Performance impact assessment

## 📄 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 🆘 Support

### Getting Help
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check ClaudeDocs/ directory
- **Storybook**: UI component examples at `pnpm run storybook`

### Maintenance Status
- **Active Development**: New features and improvements ongoing
- **Bug Fixes**: Critical issues resolved within 48 hours
- **Security Updates**: Dependencies updated monthly
- **Documentation**: Kept current with codebase changes

This comprehensive documentation provides complete coverage of the Site Crawler project, from quick start to advanced development patterns.