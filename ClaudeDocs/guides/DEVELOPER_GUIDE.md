# Site Crawler Developer Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Development Setup](#development-setup)
4. [Component Reference](#component-reference)
5. [Testing Strategy](#testing-strategy)
6. [Code Standards](#code-standards)
7. [Contributing Guidelines](#contributing-guidelines)
8. [Technical Decisions](#technical-decisions)

## Quick Start

### Prerequisites
- Node.js 18+ with ES modules support
- pnpm package manager
- Modern browser (for UI components)

### Installation & Setup
```bash
# Clone and install dependencies
pnpm install

# Configure your target site
cp config/config.json.example config/config.json
# Edit config.json with your target URL

# Run complete analysis
pnpm run all
```

## Architecture Deep Dive

### System Design Overview

The Site Crawler employs a **multi-layered architecture** with progressive enhancement and phased processing to handle complex web analysis tasks efficiently:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React + Storybook)             │
├─────────────────────────────────────────────────────────────┤
│                 API Layer (WebSocket Server)                │
├─────────────────────────────────────────────────────────────┤
│              Core Processing Layer (TypeScript)             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Pipeline  │  │   Stages     │  │   Extractors     │   │
│  │ Orchestrator│  │   System     │  │   (Legacy JS)    │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Utilities & Configuration                 │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure
```
crawl/
├── src/                    # Modern TypeScript implementation
│   ├── core/              # Core extraction logic
│   │   ├── pipeline.ts    # Main orchestration pipeline
│   │   ├── stages/        # Modular extraction stages
│   │   └── types.ts       # TypeScript definitions
│   ├── ui/                # React UI components
│   │   ├── components/    # Reusable UI components
│   │   └── pages/         # Page-level components
│   ├── api/               # WebSocket server implementation
│   └── utils/             # TypeScript utilities
├── phases/                # Legacy JavaScript phases
├── utils/                 # Legacy JavaScript utilities
├── tests/                 # Comprehensive test suites
├── output/               # Generated analysis results
├── .storybook/          # Component development environment
└── ClaudeDocs/          # Developer documentation
```

### Technology Stack

**Core Technologies:**
- **Runtime**: Node.js with ES modules
- **Languages**: TypeScript (modern), JavaScript (legacy)
- **UI Framework**: React with Storybook for component development
- **Testing**: Vitest (modern) with Playwright integration
- **Browser Automation**: Playwright for web interaction
- **Build System**: Native TypeScript compilation

**Architecture Patterns:**
- **Pipeline Pattern**: Sequential stage processing with validation
- **Strategy Pattern**: Pluggable extraction strategies
- **Observer Pattern**: Real-time progress updates via WebSocket
- **Command Pattern**: CLI command handlers

### Core Design Patterns

#### 1. Phased Extraction Pipeline

The system uses **progressive enhancement** through distinct phases to manage complexity and prevent timeouts:

```javascript
// Phase 1: Discovery - Basic URL discovery
const paths = await initialCrawl(baseUrl);

// Phase 2: Deep Crawling - Comprehensive site mapping  
const deepPaths = await deepenCrawl(paths);

// Phase 3: Metadata Collection - Page analysis
const metadata = await gatherMetadata(deepPaths);

// Phase 4: Design Token Extraction - Design system generation
const tokens = await extractTokens(metadata);
```

**Benefits:**
- **Fault Tolerance**: Failures in one phase don't affect others
- **Incremental Progress**: Results available at each stage
- **Resource Management**: Memory usage controlled per phase
- **Debugging**: Easier to identify and fix issues

#### 2. Stage-Based Processing Architecture

Each extraction type operates as an independent, testable stage:

```typescript
interface ExtractionStage {
  name: string;
  process(input: StageInput): Promise<StageOutput>;
  validate(output: StageOutput): boolean;
  cleanup?(): Promise<void>;
}

// Example stage implementation
class ColorExtractorStage implements ExtractionStage {
  async process(input: StageInput): Promise<StageOutput> {
    const results = await this.extractColors(input.pages);
    
    return {
      success: true,
      data: results,
      metadata: {
        pagesProcessed: input.pages.length,
        colorsFound: results.colors.length,
        extractionTime: Date.now()
      }
    };
  }
}
```

**Stage Orchestration:**
```typescript
const pipeline = new Pipeline([
  new CrawlerStage(),           // URL discovery and validation
  new ColorExtractorStage(),    // Color analysis
  new TypographyExtractorStage(), // Font and text analysis
  new SpacingExtractorStage(),  // Layout spacing patterns
  new TokenGeneratorStage()     // Design token compilation
]);
```

#### 3. Progressive Enhancement Model

The system builds capability in layers, ensuring graceful degradation:

- **Level 1**: Basic URL discovery and crawling
- **Level 2**: Page structure and metadata analysis
- **Level 3**: CSS extraction and design token generation
- **Level 4**: Advanced design system generation and validation

### Key Architectural Decisions

#### TypeScript Migration Strategy

**Decision**: Gradual migration from JavaScript to TypeScript
**Rationale**: 
- Maintains backward compatibility with existing phases
- Enables type safety for new development
- Allows incremental modernization

**Implementation**:
```
Legacy (phases/, utils/) ← Maintained for stability
Modern (src/) ← New development in TypeScript
```

#### Stage vs Phase Architecture

**Stages (New)**: Modular, testable, type-safe extraction units
**Phases (Legacy)**: Monolithic, script-based processing

**Migration Path**: Extract functionality from phases into stages while maintaining compatibility.

## Development Setup

### Local Development Environment

#### 1. Environment Configuration

```bash
# Install dependencies
pnpm install

# Setup environment variables
cat > .env << EOF
NODE_ENV=development
DEBUG=crawler:*
SITE_DOMAIN=https://your-target-site.com
EOF

# Configure target site analysis
cp config/config.json.example config/config.json
```

#### 2. Development Scripts

```bash
# Development workflow
pnpm run dev          # Start development server with hot reload
pnpm run build        # Build TypeScript components
pnpm run test         # Run test suite
pnpm run test:watch   # Run tests in watch mode
pnpm run storybook    # Launch component development environment

# Analysis commands
pnpm run all          # Complete site analysis
pnpm run crawl        # URL discovery only
pnpm run extract      # Run extraction stages
```

#### 3. Development Workflow

```bash
# 1. Setup development environment
git clone <repo>
cd crawl
pnpm install

# 2. Configure target site
edit config/config.json

# 3. Run analysis
pnpm run all

# 4. View results
open output/results/index.html

# 5. Develop UI components
pnpm run storybook
open http://localhost:6006
```

### IDE Configuration

#### VS Code Setup

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}

// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright"
  ]
}
```

#### Debugging Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Crawler",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/index.js",
      "args": ["all", "--url", "https://example.com"],
      "env": {
        "DEBUG": "crawler:*",
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/dist/cli.js",
      "args": ["run", "--reporter=verbose"]
    }
  ]
}
```

## Component Reference

### Core Pipeline System

#### Pipeline (`src/core/pipeline.ts`)

**Purpose**: Main orchestration engine that coordinates extraction stages.

```typescript
interface Pipeline {
  stages: ExtractionStage[];
  execute(input: PipelineInput): Promise<PipelineOutput>;
  addEventListener(event: string, handler: Function): void;
  getProgress(): ProgressInfo;
}

// Usage
const pipeline = new Pipeline([
  new CrawlerStage(),
  new ColorExtractorStage(),
  new TypographyExtractorStage()
]);

pipeline.addEventListener('stage-complete', (stage, result) => {
  console.log(`${stage.name} completed:`, result.metadata);
});

const results = await pipeline.execute({ 
  url: 'https://example.com',
  maxDepth: 2
});
```

**Key Features**:
- **Event-driven progress tracking** with WebSocket integration
- **Error isolation** - stage failures don't stop the pipeline
- **Resource management** - automatic cleanup of browser resources
- **Validation gates** - output validation before stage completion

#### Configuration System

**Config Schema**:
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

### Extraction Stages

#### CrawlerStage (`src/core/stages/crawler-stage.ts`)

**Purpose**: Discovers and catalogs all URLs within the target website.

```typescript
interface CrawlerStageOutput {
  total_urls: number;
  internal_urls: number;
  external_urls: number;
  problem_urls: number;
  crawl_depth: number;
  url_map: Map<string, PageInfo>;
}
```

**Configuration**:
```typescript
interface CrawlerStageConfig {
  maxDepth: number;         // Maximum crawl depth
  batchSize: number;        // URLs processed per batch
  timeout: number;          // Request timeout in ms
  ignorePatterns: string[]; // URL patterns to exclude
  respectRobots: boolean;   // Honor robots.txt
  userAgent: string;        // Browser user agent
}
```

#### ColorExtractorStage (`src/core/stages/color-extractor-stage.ts`)

**Purpose**: Comprehensive color analysis and design token generation.

```typescript
interface ColorExtractionOutput {
  primary_palette: {
    [colorName: string]: {
      hex: string;
      rgb: number[];
      hsl: number[];
      usage_count: number;
      contexts: string[];
      accessibility_score: number;
    }
  };
  color_statistics: {
    unique_colors: number;
    most_used_color: string;
    color_diversity_score: number;
    accessibility_violations: number;
  };
  design_tokens: {
    colors: DesignToken[];
    gradients: GradientToken[];
  };
}
```

**Features**:
- **Multi-format color extraction** (hex, rgb, hsl, named colors)
- **Accessibility analysis** with WCAG contrast ratio validation
- **Color naming** using advanced color-namer algorithms
- **Usage context analysis** (buttons, backgrounds, text, borders)
- **Gradient pattern detection** and parameterization

#### TypographyExtractorStage (`src/core/stages/typography-extractor-stage.ts`)

**Purpose**: Font system analysis and typographic design token generation.

```typescript
interface TypographyOutput {
  font_system: {
    primary: FontDefinition;
    secondary?: FontDefinition;
    display?: FontDefinition;
  };
  type_scale: {
    base_size: number;
    scale_ratio: number;
    sizes: number[];
    responsive_behavior: ResponsiveTypeInfo;
  };
  typography_metrics: {
    average_line_height: number;
    readability_score: number;
    font_loading_performance: PerformanceMetrics;
  };
}
```

**Advanced Features**:
- **Font loading analysis** with performance metrics
- **Responsive typography detection** across breakpoints
- **Reading experience scoring** based on typography research
- **Web font optimization** recommendations

### UI Components

#### TokenCard (`src/ui/components/TokenCard.tsx`)

**Purpose**: Interactive design token visualization and editing.

```typescript
interface TokenCardProps {
  token: DesignToken;
  category: TokenCategory;
  onEdit?: (token: DesignToken) => void;
  onDelete?: (token: DesignToken) => void;
  readonly?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

// Usage
<TokenCard 
  token={colorToken}
  category="colors"
  onEdit={(token) => updateToken(token.id, token)}
  variant="detailed"
/>
```

#### PipelineEditor (`src/ui/pages/PipelineEditor.tsx`)

**Purpose**: Visual pipeline configuration and real-time monitoring.

**Features**:
- **Drag-and-drop stage reordering** with validation
- **Real-time progress visualization** via WebSocket
- **Stage configuration editing** with schema validation
- **Error state management** and recovery options

### API Layer

#### WebSocket Server (`src/api/websocket-server.ts`)

**Purpose**: Real-time communication between extraction pipeline and UI.

```typescript
interface WebSocketServer {
  start(port: number): Promise<void>;
  broadcast(event: string, data: any): void;
  onConnection(handler: ConnectionHandler): void;
}

// Supported Events
interface WebSocketEvents {
  'start-extraction': ExtractionConfig;
  'progress-update': ProgressInfo;
  'stage-complete': StageResult;
  'extraction-complete': FinalResults;
  'extraction-error': ErrorInfo;
  'config-update': ConfigUpdate;
}
```

### Legacy Components (JavaScript)

#### Phase System (`phases/`)

The legacy phase system provides battle-tested extraction capabilities:

**Initial Crawl (`phases/initial-crawl.js`)**:
- Playwright-based comprehensive site discovery
- External link detection and categorization
- URL validation and normalization

**Metadata Extraction (`phases/metadata.js`)**:
- DOM structure analysis and template detection
- CSS class usage patterns
- Performance metric collection

**Design Token Extraction (`phases/extract-*.js`)**:
- Specialized extractors for colors, typography, spacing, borders
- Visual analysis and design system generation
- Screenshot-based validation

## Testing Strategy

### Testing Framework: Vitest

**Why Vitest?**
- **Native ES Module support** - no complex configuration needed
- **Faster performance** - leverages Vite's development server
- **Jest-compatible API** - easy migration and familiar syntax
- **Better HMR** - improved hot module replacement for test development

### Test Organization

```
tests/
├── unit/                  # Individual function/component tests
│   ├── core/             # Core pipeline and stage tests
│   ├── ui/               # React component tests
│   └── utils/            # Utility function tests
├── integration/          # Multi-component integration tests
│   ├── pipeline.test.ts  # End-to-end pipeline tests
│   └── extractors.test.ts # Extractor integration tests
├── e2e/                  # Full system end-to-end tests
│   └── crawler.spec.ts   # Playwright browser tests
└── fixtures/             # Test data and mock responses
    ├── mock-pages/       # HTML test pages
    └── sample-configs/   # Configuration test cases
```

### Testing Approaches

#### 1. Unit Testing

**Pure Function Testing**:
```typescript
// src/utils/color-utils.ts
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// tests/unit/utils/color-utils.test.ts
import { describe, test, expect } from 'vitest';
import { hexToRgb } from '../../../src/utils/color-utils';

describe('Color Utils', () => {
  test('hexToRgb converts valid hex colors', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
  });
  
  test('hexToRgb handles invalid input gracefully', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('')).toBeNull();
    expect(hexToRgb('#ZZZ')).toBeNull();
  });
});
```

#### 2. Integration Testing

**Pipeline Integration Tests**:
```typescript
// tests/integration/pipeline.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { Pipeline } from '../../src/core/pipeline';
import { CrawlerStage } from '../../src/core/stages/crawler-stage';
import { ColorExtractorStage } from '../../src/core/stages/color-extractor-stage';

describe('Pipeline Integration', () => {
  let pipeline: Pipeline;
  
  beforeEach(() => {
    pipeline = new Pipeline([
      new CrawlerStage(),
      new ColorExtractorStage()
    ]);
  });
  
  test('executes stages in sequence', async () => {
    const results = await pipeline.execute({ 
      url: 'https://example.com',
      maxPages: 5 
    });
    
    expect(results.success).toBe(true);
    expect(results.stages).toHaveLength(2);
    expect(results.stages[0].name).toBe('CrawlerStage');
    expect(results.stages[1].name).toBe('ColorExtractorStage');
  });
});
```

#### 3. Mocking Strategies

**Browser Automation Mocking**:
```typescript
// tests/setup/browser-mocks.ts
import { vi } from 'vitest';

// Mock Playwright
vi.mock('@playwright/test', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          evaluate: vi.fn().mockResolvedValue({
            elementStyles: { 'body': [{ styles: { color: '#000000' } }] },
            colorValues: ['#FF0000', '#00FF00', '#0000FF'],
            cssVars: { '--primary-color': '#FF0000' }
          }),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
          close: vi.fn()
        }),
        close: vi.fn()
      }),
      close: vi.fn()
    })
  }
}));
```

**File System Mocking**:
```typescript
// tests/setup/fs-mocks.ts
import { vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn((path) => path.includes('crawl-results.json')),
  readFileSync: vi.fn((path) => {
    if (path.includes('crawl-results.json')) {
      return JSON.stringify({
        baseUrl: 'https://example.com',
        crawledPages: [
          { url: 'https://example.com', title: 'Home', status: 200 },
          { url: 'https://example.com/about', title: 'About', status: 200 }
        ]
      });
    }
    throw new Error(`File not found: ${path}`);
  }),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));
```

### Test Execution

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only
pnpm test:e2e           # End-to-end tests only

# Development testing
pnpm test:watch         # Watch mode for development
pnpm test:coverage      # Generate coverage reports
pnpm test:ui            # Visual test interface

# Specific test files
pnpm test src/core/pipeline.test.ts
pnpm test tests/integration/extractors.test.ts
```

### Testing Best Practices

#### 1. Test Structure (AAA Pattern)

```typescript
test('should extract colors from page content', async () => {
  // Arrange
  const mockPage = createMockPage({
    content: '<div style="color: #FF0000;">Red text</div>'
  });
  const extractor = new ColorExtractorStage();
  
  // Act
  const result = await extractor.process({ pages: [mockPage] });
  
  // Assert
  expect(result.success).toBe(true);
  expect(result.data.colors).toContain('#FF0000');
  expect(result.metadata.colorsFound).toBeGreaterThan(0);
});
```

#### 2. Error Testing

```typescript
test('handles extraction errors gracefully', async () => {
  // Setup error condition
  const mockPage = {
    evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed'))
  };
  
  const result = await extractColorsFromPage(mockPage);
  
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error.message).toContain('Evaluation failed');
});
```

#### 3. Performance Testing

```typescript
test('completes extraction within performance bounds', async () => {
  const startTime = performance.now();
  
  await extractColorsFromCrawledPages({ maxPages: 10 });
  
  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(30000); // 30 seconds max
});
```

## Code Standards

### TypeScript Standards

#### 1. Type Safety

```typescript
// Strong typing for all interfaces
interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  error?: ErrorInfo;
  metadata: ResultMetadata;
}

// Avoid 'any' - use specific types
type CSSPropertyValue = string | number | null;
type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'named';

// Use discriminated unions for complex types
type ExtractorStage = 
  | { type: 'crawler'; config: CrawlerConfig }
  | { type: 'color'; config: ColorConfig }
  | { type: 'typography'; config: TypographyConfig };
```

#### 2. Function Signatures

```typescript
// Clear, descriptive function signatures
async function extractColorsFromPage(
  page: Page,
  options: ColorExtractionOptions = {}
): Promise<ColorExtractionResult> {
  // Implementation
}

// Use readonly for immutable data
interface ReadonlyConfig {
  readonly baseUrl: string;
  readonly extractionTypes: readonly string[];
}
```

### JavaScript Legacy Standards

#### 1. ES Modules

```javascript
// Use ES modules consistently
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

// Named exports preferred
export { extractColors, ColorExtractor };
export default extractColorsFromCrawledPages;
```

#### 2. Error Handling

```javascript
// Consistent error handling pattern
async function extractWithErrorHandling(page, config) {
  try {
    const result = await extractData(page, config);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`);
    return { 
      success: false, 
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      }
    };
  }
}
```

### CSS and Styling Standards

#### 1. Tailwind CSS

```jsx
// Component styling with Tailwind
const TokenCard = ({ token, variant = 'default' }) => (
  <div className={cn(
    "rounded-lg border bg-card p-4 transition-colors",
    variant === 'compact' && "p-2",
    variant === 'detailed' && "p-6"
  )}>
    <div className="flex items-center justify-between">
      <span className="font-medium">{token.name}</span>
      <span className="text-sm text-muted-foreground">{token.value}</span>
    </div>
  </div>
);
```

#### 2. CSS Custom Properties

```css
/* Design tokens as CSS custom properties */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-unit: 0.25rem;
  --font-family-sans: 'Inter', system-ui, sans-serif;
}

/* Responsive design patterns */
@media (min-width: 768px) {
  .container {
    padding-inline: calc(var(--spacing-unit) * 8);
  }
}
```

### Linting and Formatting

#### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "@eslint/js/recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/prop-types": "off",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Contributing Guidelines

### Pull Request Process

#### 1. Branch Naming Convention

```bash
# Feature branches
feature/add-animation-extractor
feature/improve-color-analysis
feature/ui-token-editor

# Bug fix branches  
fix/crawler-timeout-handling
fix/type-extraction-edge-cases

# Refactoring branches
refactor/extract-pipeline-logic
refactor/modernize-spacing-extractor
```

#### 2. Commit Message Format

```
type(scope): brief description

Longer description of the change, including:
- What was changed and why
- Any breaking changes
- Related issue numbers

Examples:
feat(extractor): add animation timeline analysis
fix(pipeline): handle browser launch failures gracefully
docs(api): update WebSocket event documentation
refactor(ui): migrate TokenCard to composition API
```

#### 3. Pull Request Template

```markdown
## Changes
Brief description of what this PR accomplishes.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)  
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass

## Screenshots/Examples
[If applicable, add screenshots or code examples]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings or errors introduced
```

### Code Review Guidelines

#### 1. Review Checklist

**Functionality**:
- [ ] Code accomplishes stated purpose
- [ ] Edge cases handled appropriately
- [ ] Error handling implemented
- [ ] Performance considerations addressed

**Code Quality**:
- [ ] Code is readable and well-documented
- [ ] Follows established patterns and conventions
- [ ] No obvious security vulnerabilities
- [ ] Appropriate abstraction level

**Testing**:
- [ ] Adequate test coverage
- [ ] Tests are meaningful and test behavior
- [ ] Tests are maintainable
- [ ] Manual testing documented

#### 2. Review Process

1. **Automated Checks**: All CI checks must pass
2. **Peer Review**: At least one approving review required
3. **Documentation Review**: Technical docs updated if needed
4. **Security Review**: Security implications considered
5. **Performance Review**: Performance impact assessed

### Release Process

#### 1. Versioning Strategy

**Semantic Versioning (SemVer)**:
```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)

Examples:
1.0.0 → 1.1.0 (new extractor added)
1.1.0 → 1.1.1 (bug fix)
1.1.1 → 2.0.0 (breaking API change)
```

#### 2. Release Workflow

```bash
# 1. Create release branch
git checkout -b release/v1.2.0

# 2. Update version and changelog
npm version minor
edit CHANGELOG.md

# 3. Run full test suite
pnpm test
pnpm test:e2e

# 4. Build and validate
pnpm build
pnpm run validate-build

# 5. Create pull request
gh pr create --title "Release v1.2.0" --body "Release notes..."

# 6. After approval, merge and tag
git checkout main
git merge release/v1.2.0
git tag v1.2.0
git push origin main --tags
```

#### 3. Changelog Maintenance

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- Animation extractor with timeline analysis
- WebSocket real-time progress updates  
- Export to CSS custom properties

### Changed
- Improved color extraction accuracy by 15%
- Updated UI components to use Tailwind CSS

### Fixed
- Browser timeout handling in large site crawls
- Memory leaks in long-running extractions

### Deprecated
- Legacy extraction phases (use new stage system)

## [1.1.0] - 2023-12-20
...
```

## Technical Decisions

### Architecture Decisions

#### 1. TypeScript Migration Strategy

**Decision**: Gradual migration from JavaScript to TypeScript
**Context**: Large existing JavaScript codebase with proven functionality
**Options Considered**:
- Big bang rewrite to TypeScript
- Gradual migration maintaining compatibility
- Maintain JavaScript indefinitely

**Decision**: Gradual migration
**Rationale**:
- **Risk Mitigation**: Maintains existing functionality while adding type safety
- **Developer Experience**: New features benefit from TypeScript immediately
- **Learning Curve**: Team can adopt TypeScript gradually
- **Testing**: Easier to test new TypeScript components in isolation

**Implementation**:
```
phases/ (JavaScript) - Legacy, maintained for stability
src/ (TypeScript) - New development, modern patterns
Interop layer for compatibility between old and new systems
```

#### 2. Pipeline vs Monolithic Architecture

**Decision**: Stage-based pipeline architecture
**Context**: Need to handle various extraction types efficiently
**Options Considered**:
- Monolithic extraction script
- Microservice architecture
- Pipeline with pluggable stages

**Decision**: Pipeline architecture
**Rationale**:
- **Modularity**: Each stage can be developed and tested independently
- **Fault Tolerance**: Failure in one stage doesn't crash entire process
- **Extensibility**: New extraction types can be added as stages
- **Performance**: Stages can be optimized individually
- **Debugging**: Easier to isolate and fix issues

```typescript
// Extensible pipeline design
const pipeline = new Pipeline([
  new CrawlerStage(crawlerConfig),
  new ColorExtractorStage(colorConfig),
  new TypographyExtractorStage(typographyConfig),
  new CustomExtractorStage(customConfig) // Easy to add
]);
```

#### 3. Real-time Updates via WebSocket

**Decision**: WebSocket for real-time progress updates
**Context**: Long-running extractions need progress feedback
**Options Considered**:
- Server-sent events (SSE)
- WebSocket bidirectional communication
- Polling-based status checks

**Decision**: WebSocket implementation
**Rationale**:
- **Bidirectional**: Supports configuration updates during extraction
- **Low Latency**: Real-time progress updates with minimal overhead
- **Standard Support**: Well-supported across browsers and Node.js
- **Scalability**: Can handle multiple concurrent extraction sessions

#### 4. Testing Framework Selection

**Decision**: Vitest over Jest
**Context**: Modern ES modules and Vite-based development
**Options Considered**:
- Jest with ES modules configuration
- Vitest with native ES module support
- Mocha/Chai combination

**Decision**: Vitest adoption
**Rationale**:
- **Native ES Modules**: No complex configuration required
- **Performance**: 2-3x faster test execution than Jest
- **Vite Integration**: Leverages existing Vite development server
- **Compatibility**: Jest-compatible API eases migration
- **HMR Support**: Better development experience with hot module replacement

### Performance Decisions

#### 1. Memory Management Strategy

**Decision**: Streaming processing with batch limits
**Context**: Large websites can consume excessive memory
**Problem**: Memory exhaustion on sites with 1000+ pages

**Solution**:
```typescript
// Batch processing to control memory usage
const BATCH_SIZE = 10;
const MAX_CONCURRENT_BROWSERS = 3;

async function processInBatches<T>(
  items: T[], 
  processor: (item: T) => Promise<Result>,
  batchSize: number = BATCH_SIZE
): Promise<Result[]> {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
    
    // Force garbage collection between batches
    if (global.gc) global.gc();
  }
  
  return results;
}
```

#### 2. Browser Resource Management

**Decision**: Browser instance pooling with lifecycle management
**Context**: Browser launches are expensive and resource-intensive

```typescript
class BrowserPool {
  private browsers: Browser[] = [];
  private readonly maxInstances = 3;
  
  async getBrowser(): Promise<Browser> {
    if (this.browsers.length < this.maxInstances) {
      const browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      this.browsers.push(browser);
      return browser;
    }
    
    // Reuse existing browser
    return this.browsers[Math.floor(Math.random() * this.browsers.length)];
  }
  
  async cleanup(): Promise<void> {
    await Promise.all(this.browsers.map(browser => browser.close()));
    this.browsers = [];
  }
}
```

### Security Decisions

#### 1. Input Validation and Sanitization

**Decision**: Comprehensive input validation at all boundaries
**Context**: Processing untrusted web content

```typescript
// URL validation before processing
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    
    return allowedProtocols.includes(parsed.protocol) &&
           !blockedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Content sanitization
function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

#### 2. Process Isolation

**Decision**: Sandboxed browser execution
**Context**: Processing potentially malicious websites

```typescript
const browserOptions = {
  args: [
    '--no-sandbox',           // Required for Docker
    '--disable-web-security', // Allow cross-origin requests
    '--disable-plugins',      // Disable flash/java
    '--disable-extensions',   // No browser extensions
    '--disable-dev-shm-usage' // Overcome limited resource problems
  ],
  ignoreHTTPSErrors: true,    // Handle self-signed certificates
  timeout: 30000              // Prevent hanging processes
};
```

### Data Processing Decisions

#### 1. Design Token Generation Strategy

**Decision**: Progressive enhancement from basic to sophisticated tokens
**Context**: Different users need different levels of design system sophistication

**Implementation Levels**:

```typescript
// Level 1: Basic extraction
interface BasicTokens {
  colors: string[];
  fontSizes: string[];
  spacing: string[];
}

// Level 2: Categorized tokens
interface CategorizedTokens {
  colors: {
    primary: ColorToken[];
    secondary: ColorToken[];
    neutral: ColorToken[];
  };
  typography: {
    headings: TypographyToken[];
    body: TypographyToken[];
  };
}

// Level 3: Semantic design system
interface SemanticTokens {
  foundation: FoundationTokens;
  semantic: SemanticTokens;
  component: ComponentTokens;
}
```

#### 2. Configuration Management

**Decision**: Layered configuration with environment-specific overrides
**Context**: Different deployment environments need different settings

```typescript
// Configuration hierarchy
const config = deepMerge(
  defaultConfig,           // Base configuration
  environmentConfig,       // Environment-specific (dev/staging/prod)
  userConfig,             // User-provided configuration
  runtimeConfig           // Runtime overrides
);

// Environment detection
const environment = process.env.NODE_ENV || 'development';
const configFile = `config.${environment}.json`;
```

### Future Architecture Considerations

#### 1. Scalability Planning

**Horizontal Scaling**: Design for distributed processing
```typescript
// Message queue integration for distributed processing
interface ExtractionJob {
  id: string;
  siteUrl: string;
  configuration: ExtractionConfig;
  priority: number;
}

interface WorkerNode {
  processJob(job: ExtractionJob): Promise<ExtractionResult>;
  getCapacity(): number;
  getStatus(): WorkerStatus;
}
```

#### 2. Plugin Architecture

**Extension Points**: Enable third-party extractors
```typescript
interface ExtractorPlugin {
  name: string;
  version: string;
  extract(page: Page, config: any): Promise<any>;
  validate(config: any): boolean;
}

// Plugin registration
pipeline.registerPlugin(new CustomAnimationExtractor());
```

This comprehensive developer guide provides the foundation for understanding, contributing to, and extending the Site Crawler project. The architectural decisions document the reasoning behind key technical choices, enabling future developers to make informed decisions when evolving the system.