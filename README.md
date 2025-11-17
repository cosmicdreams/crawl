# Site Crawler

A sophisticated web crawling and design token extraction tool that systematically analyzes websites to extract design patterns and generate **Design Tokens Specification 2025.10** compliant output.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure your target site
cp config/local.json.example config/local.json
# Edit config/local.json with your target URL

# Run complete analysis
pnpm run all
```

## ✨ Features

### Core Crawling (CLI)
- **Multi-phase Crawling**: Prevents timeouts with systematic depth progression
- **URL Discovery**: Intelligent link extraction and validation
- **Metadata Collection**: Page templates, structure analysis, and classification
- **Error Recovery**: Robust retry mechanisms and graceful failure handling

### Design Token Extraction (TypeScript Core)
- **Spec-Compliant Output**: Generates Design Tokens Specification 2025.10 `.tokens.json` files
- **Color Analysis**: Comprehensive color palette extraction with hex values and usage tracking
- **Typography Tokens**: Font systems, scales, and hierarchy detection with font families
- **Spacing Patterns**: Layout tokens and grid system identification
- **Border & Animation**: Visual effects and motion pattern analysis

### Generators (✅ Phases 1-3 Complete - 125/125 tests passing)
- **SpecGenerator**: Core `.tokens.json` generation (Design Tokens Spec 2025.10)
- **StyleguideGenerator**: Interactive HTML/CSS/JS styleguide with live preview
- **DocumentationGenerator**: Comprehensive markdown → HTML documentation

### Modern Architecture
- **CLI Primary Interface**: JavaScript CLI (`src/cli/`) for crawling workflow
- **TypeScript Core**: Token extraction pipeline (`src/core/`) with spec-compliant generators
- **Comprehensive Testing**: Unit, integration, E2E tests with Vitest and Playwright

## 🏗️ Architecture

### Project Structure
```
├── src/
│   ├── cli/               # JavaScript CLI implementation (primary interface)
│   │   ├── index.js       # CLI entry point with Commander.js
│   │   └── phases/        # Crawling phases (initial, deepen, metadata, extract)
│   ├── core/              # TypeScript extraction pipeline
│   │   ├── stages/        # Extractor stages (color, typography, spacing, etc.)
│   │   ├── tokens/        # Design Tokens Spec 2025.10 implementation
│   │   └── generators/    # SpecGenerator, StyleguideGenerator, DocumentationGenerator
│   └── utils/             # Shared utilities
├── tests/                 # Comprehensive test suite (Vitest + Playwright)
│   ├── unit/              # Unit tests for extractors and generators
│   ├── integration/       # Cross-component integration tests
│   └── console/           # CLI workflow tests
└── config/                # Configuration files
    └── local.json         # Site-specific settings
```

### Data Flow
```
CLI Workflow:
URL Input → Initial Crawl → Deep Crawl → Metadata → Token Extraction
     ↓           ↓             ↓            ↓              ↓
config.json  paths.json    paths.json  metadata.json  raw/*.json

Generator Pipeline:
Raw Tokens → SpecGenerator → StyleguideGenerator → DocumentationGenerator
     ↓              ↓                  ↓                      ↓
raw/*.json    .tokens.json      styleguide.html       docs/index.html
```

## ⚙️ Configuration

Configure your target site in `config/local.json`:

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
    "extract_animations": true,
    "minimumOccurrences": 2   // Minimum times a token must appear to be included
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

#### Crawl Phase Outputs
- **`results/paths.json`**: Discovered URLs and crawl metadata
- **`results/metadata.json`**: Page structure and template analysis
- **`results/raw/`**: Raw extracted design tokens
  - `color-analysis.json` - Color palette with hex values and usage
  - `typography-analysis.json` - Font systems and type scales
  - `spacing-analysis.json` - Layout and spacing patterns
  - `border-analysis.json` - Border styles
  - `animation-analysis.json` - Motion and transition effects

#### Generator Outputs (Design Tokens Spec 2025.10)
- **`results/.tokens.json`**: Spec-compliant design tokens file
- **`results/styleguide.html`**: Interactive styleguide with live preview
- **`results/docs/`**: Comprehensive documentation site
  - `index.html` - Documentation homepage
  - `tokens/` - Individual token documentation pages

### Example Token Output (.tokens.json)
```json
{
  "colors": {
    "primary": {
      "blue": {
        "$type": "color",
        "$value": "#3B82F6",
        "$description": "Primary brand color used in buttons and links",
        "usageCount": 45
      }
    }
  },
  "typography": {
    "fontFamilies": {
      "sans": {
        "$type": "fontFamily",
        "$value": ["Inter", "system-ui", "sans-serif"],
        "usageCount": 127
      }
    }
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

## 📚 Project Status

### Completed Phases
- ✅ **Phase 1**: Core Infrastructure (Design Token extraction pipeline)
- ✅ **Phase 2**: Styleguide Generator (Interactive HTML/CSS/JS styleguide)
- ✅ **Phase 3**: Documentation Generator (Markdown → HTML documentation site)
- **125/125 tests passing** for Phases 1-3

### In Progress
- **Phase 4**: Pipeline Integration (CLI → TypeScript stages migration)
- **Phase 5**: Testing & Quality (Integration and E2E test fixes)

### Roadmap
See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for detailed phase breakdown and technical specifications.

## 🤝 Contributing

1. Fork the repository
2. Install dependencies: `pnpm install`
3. Create feature branch: `git checkout -b feature/amazing-feature`
4. Make changes with tests: `pnpm test`
5. Submit pull request

### Development Standards
- TypeScript strict mode for core modules
- ESLint + Prettier code formatting
- Comprehensive test coverage required
- CLI-first development approach

## 📄 License

This project is licensed under the ISC License.