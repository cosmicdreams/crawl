# Implementation Roadmap
## Spec-Compliant Design System Generator

**Goal:** Transform the crawler into a complete design system documentation platform with rigorous automated testing.

---

## 📋 Summary

**What We're Building:**
1. ✅ **Spec-Compliant Design Tokens** (.tokens.json) - COMPLETE
2. ✅ **Interactive Styleguide** (HTML/CSS/JS) - COMPLETE
3. ✅ **Comprehensive Documentation** (Markdown → HTML) - COMPLETE
4. ✅ **Automated Testing** (Unit → Integration → E2E) - Phases 1-3: 125/125 tests passing

**Timeline:** 3-4 weeks for complete implementation

---

## 🎯 Phase 1: Core Infrastructure (Week 1)
**Status:** 60% Complete

### ✅ Completed
- [x] Design Tokens Specification 2025.10 type system
- [x] Primitive token types (color, dimension, fontFamily, fontWeight, duration, cubicBezier, number)
- [x] Composite token types (border, shadow, typography, gradient, transition, strokeStyle)
- [x] CSS to spec value converters
- [x] Spec-compliant token generator
- [x] Testing strategy designed

### 🔄 In Progress
- [ ] **Update Color Extractor**
  - Use `convertCSSColorToSpec()` for all colors
  - Output `ColorValue` objects instead of CSS strings
  - Add unit tests for extractor
  - Add integration tests for end-to-end extraction

- [ ] **Update Typography Extractor**
  - Use `convertCSSPropertiesToTypography()` for font properties
  - Output `TypographyValue` composite objects
  - Handle font-family fallback chains
  - Add comprehensive tests

- [ ] **Update Spacing Extractor**
  - Use `convertCSSSizeToDimension()` for all spacing
  - Output `DimensionValue` objects
  - Add tests for px/rem conversion

- [ ] **Update Border Extractor**
  - Use `convertCSSBorderToSpec()` for borders
  - Output `BorderValue` composite objects
  - Add shadow extraction
  - Comprehensive testing

- [ ] **Update Animation Extractor**
  - Use `convertCSSTimeToDuration()` for durations
  - Use `convertCSSTimingFunctionToCubicBezier()` for easing
  - Output proper typed values
  - Full test coverage

### Testing for Phase 1
```bash
# Unit tests for converters
pnpm test tests/unit/tokens/converters/

# Integration tests for extractors
pnpm test tests/integration/extractors/

# Spec compliance validation
pnpm test tests/compliance/
```

**Deliverables:**
- All extractors output spec-compliant values
- 95%+ test coverage for converters
- 90%+ test coverage for extractors
- All spec compliance tests pass

---

## 🎨 Phase 2: Styleguide Generator (Week 2)
**Status:** ✅ 100% Complete - 54/54 tests passing

### Architecture

```
src/generators/styleguide/
├── StyleguideGenerator.ts      # Main orchestrator
├── templates/
│   ├── layout.html             # Base HTML template
│   ├── colors.html             # Color palette page
│   ├── typography.html         # Typography specimens
│   ├── spacing.html            # Spacing system
│   ├── borders.html            # Borders & shadows
│   └── animations.html         # Animation demos
├── renderers/
│   ├── ColorRenderer.ts        # Color swatch generation
│   ├── TypographyRenderer.ts   # Type specimens
│   ├── SpacingRenderer.ts      # Spacing visualizations
│   └── AnimationRenderer.ts    # Animation demos
└── styles/
    ├── styleguide.css          # Styleguide styles
    └── components.css          # Component styles
```

### Features to Implement

#### 1. **Color Palette Generator**
```typescript
// src/generators/styleguide/renderers/ColorRenderer.ts
export class ColorRenderer {
  render(colorTokens: ColorToken[]): string {
    return `
      <div class="color-palette">
        ${colorTokens.map(token => this.renderColorSwatch(token)).join('')}
      </div>
    `;
  }

  private renderColorSwatch(token: ColorToken): string {
    const color = token.$value;
    const metadata = token.$extensions?.['com.designtokencrawler'];

    return `
      <div class="color-swatch" style="background: ${color.hex}">
        <div class="color-info">
          <h3>${this.getTokenName(token)}</h3>
          <div class="color-values">
            <span>Hex: ${color.hex}</span>
            <span>RGB: ${this.formatRGB(color)}</span>
            <span>HSL: ${this.formatHSL(color)}</span>
          </div>
          ${this.renderAccessibilityInfo(color)}
          ${this.renderUsageInfo(metadata)}
          <code>{${this.getTokenPath(token)}}</code>
        </div>
      </div>
    `;
  }

  private renderAccessibilityInfo(color: ColorValue): string {
    const contrastRatios = this.calculateContrastRatios(color);
    return `
      <div class="accessibility-info">
        <span class="${contrastRatios.onWhite >= 4.5 ? 'pass' : 'fail'}">
          WCAG AA (on white): ${contrastRatios.onWhite.toFixed(2)}:1
        </span>
        <span class="${contrastRatios.onBlack >= 4.5 ? 'pass' : 'fail'}">
          WCAG AA (on black): ${contrastRatios.onBlack.toFixed(2)}:1
        </span>
      </div>
    `;
  }
}
```

**Tests:**
```typescript
// tests/unit/generators/styleguide/ColorRenderer.test.ts
describe('ColorRenderer', () => {
  it('should render color swatches with all info', () => {
    const token: ColorToken = {
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0, 0.4, 0.8],
        hex: '#0066cc'
      }
    };

    const renderer = new ColorRenderer();
    const html = renderer.render([token]);

    expect(html).toContain('#0066cc');
    expect(html).toContain('WCAG AA');
  });

  it('should calculate correct contrast ratios', () => {
    const renderer = new ColorRenderer();
    const ratio = renderer.calculateContrastRatios({
      colorSpace: 'srgb',
      components: [0, 0, 0],
      hex: '#000000'
    });

    expect(ratio.onWhite).toBe(21); // Black on white = maximum contrast
  });
});
```

#### 2. **Typography Specimen Generator**
```typescript
// src/generators/styleguide/renderers/TypographyRenderer.ts
export class TypographyRenderer {
  render(typographyTokens: TypographyToken[]): string {
    return `
      <div class="typography-specimens">
        ${typographyTokens.map(token => this.renderSpecimen(token)).join('')}
      </div>
    `;
  }

  private renderSpecimen(token: TypographyToken): string {
    const typo = token.$value;
    const fontFamily = Array.isArray(typo.fontFamily)
      ? typo.fontFamily[0]
      : typo.fontFamily;

    return `
      <div class="type-specimen">
        <div class="specimen-example" style="${this.getStyles(typo)}">
          The quick brown fox jumps over the lazy dog
        </div>
        <div class="specimen-details">
          <h4>${this.getTokenName(token)}</h4>
          <dl>
            <dt>Font Family:</dt>
            <dd>${this.formatFontFamily(typo.fontFamily)}</dd>

            <dt>Size:</dt>
            <dd>${typo.fontSize.value}${typo.fontSize.unit}</dd>

            <dt>Weight:</dt>
            <dd>${typo.fontWeight}</dd>

            <dt>Line Height:</dt>
            <dd>${typo.lineHeight}</dd>

            ${typo.letterSpacing ? `
              <dt>Letter Spacing:</dt>
              <dd>${typo.letterSpacing.value}${typo.letterSpacing.unit}</dd>
            ` : ''}
          </dl>
          <code>{${this.getTokenPath(token)}}</code>
        </div>
      </div>
    `;
  }
}
```

#### 3. **Spacing Visualizer**
```typescript
// src/generators/styleguide/renderers/SpacingRenderer.ts
export class SpacingRenderer {
  render(spacingTokens: DimensionToken[]): string {
    return `
      <div class="spacing-scale">
        ${spacingTokens.map(token => this.renderSpacingItem(token)).join('')}
      </div>
    `;
  }

  private renderSpacingItem(token: DimensionToken): string {
    const dimension = token.$value;
    const pixels = this.convertToPixels(dimension);

    return `
      <div class="spacing-item">
        <div class="spacing-visual" style="width: ${pixels}px; height: ${pixels}px">
        </div>
        <div class="spacing-info">
          <h4>${this.getTokenName(token)}</h4>
          <span>${dimension.value}${dimension.unit}</span>
          ${dimension.unit !== 'px' ? `<span>(${pixels}px)</span>` : ''}
          <code>{${this.getTokenPath(token)}}</code>
        </div>
      </div>
    `;
  }
}
```

### Testing for Phase 2
```typescript
// tests/integration/generators/styleguide-generator.test.ts
describe('Styleguide Generator Integration', () => {
  it('should generate complete styleguide from tokens', async () => {
    const generator = new StyleguideGenerator({
      outputDir: './test-output/styleguide'
    });

    const result = await generator.generate(mockTokens);

    // Verify file structure
    expect(fs.existsSync(result.indexPath)).toBe(true);
    expect(fs.existsSync(result.colorsPath)).toBe(true);
    expect(fs.existsSync(result.typographyPath)).toBe(true);

    // Verify content
    const html = fs.readFileSync(result.indexPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Design System');
  });
});

// tests/visual/styleguide.visual.test.ts
describe('Styleguide Visual Regression', () => {
  test('should match visual baseline', async ({ page }) => {
    await page.goto('file://./styleguide/index.html');
    await expect(page).toHaveScreenshot('styleguide-full.png');
  });
});
```

**Deliverables:**
- Complete styleguide HTML generation
- All token types visualized
- Interactive examples
- Responsive design
- 90%+ test coverage
- Visual regression tests passing

---

## 📚 Phase 3: Documentation Generator (Week 2-3)
**Status:** ✅ 100% Complete - 71/71 tests passing

### Architecture

```
src/generators/documentation/
├── DocumentationGenerator.ts   # Main orchestrator
├── templates/
│   ├── README.md.hbs           # Quick start template
│   ├── tokens.md.hbs           # Token reference template
│   ├── integration.md.hbs      # Integration guide template
│   └── api.md.hbs              # API documentation template
├── renderers/
│   ├── MarkdownRenderer.ts     # Markdown generation
│   ├── TokenReferenceRenderer.ts # Token tables
│   └── CodeExampleRenderer.ts  # Code snippets
└── examples/
    ├── css-examples.ts         # CSS usage examples
    ├── react-examples.ts       # React integration
    ├── vue-examples.ts         # Vue integration
    └── style-dictionary.ts     # Style Dictionary config
```

### Documentation Structure

```
docs/
├── README.md                   # Quick start guide
├── tokens.md                   # Complete token reference
├── integration/
│   ├── css.md                  # CSS variables usage
│   ├── react.md                # React integration
│   ├── vue.md                  # Vue integration
│   ├── angular.md              # Angular integration
│   ├── svelte.md               # Svelte integration
│   └── style-dictionary.md     # Style Dictionary setup
├── guides/
│   ├── contributing.md         # Contribution guidelines
│   ├── migration.md            # Migration from other systems
│   └── best-practices.md       # Design system best practices
└── api/
    ├── token-format.md         # Token file format spec
    └── extensions.md           # Custom extensions guide
```

### Features to Implement

#### 1. **Token Reference Generator**
```typescript
// src/generators/documentation/renderers/TokenReferenceRenderer.ts
export class TokenReferenceRenderer {
  renderTokenReference(tokens: TokenDocument): string {
    return `
# Token Reference

## Colors

${this.renderColorTokens(tokens.colors)}

## Typography

${this.renderTypographyTokens(tokens.typography)}

## Spacing

${this.renderSpacingTokens(tokens.spacing)}

## Borders

${this.renderBorderTokens(tokens.borders)}

## Animations

${this.renderAnimationTokens(tokens.animations)}
    `;
  }

  private renderColorTokens(group: TokenGroup): string {
    const tokens = this.extractTokensFromGroup(group);

    return `
| Token | Value | Usage | Description |
|-------|-------|-------|-------------|
${tokens.map(token => this.renderColorRow(token)).join('\n')}
    `;
  }

  private renderColorRow(token: ColorToken): string {
    const value = token.$value;
    const metadata = token.$extensions?.['com.designtokencrawler'];

    return `| \`{${this.getTokenPath(token)}}\` | ${value.hex} | ${metadata?.usageCount || 0} instances | ${token.$description || ''} |`;
  }
}
```

#### 2. **Integration Guide Generator**
```typescript
// src/generators/documentation/renderers/IntegrationGuideRenderer.ts
export class IntegrationGuideRenderer {
  renderReactGuide(tokens: TokenDocument): string {
    return `
# React Integration

## Installation

\`\`\`bash
npm install @yourcompany/design-tokens
\`\`\`

## Basic Usage

\`\`\`tsx
import tokens from '@yourcompany/design-tokens/design.tokens.json';

const Button = () => (
  <button style={{
    backgroundColor: tokens.colors.primary.$value.hex,
    padding: \`\${tokens.spacing.base.$value.value}\${tokens.spacing.base.$value.unit}\`
  }}>
    Click me
  </button>
);
\`\`\`

## Using with CSS-in-JS

### Styled Components

\`\`\`tsx
import styled from 'styled-components';
import tokens from '@yourcompany/design-tokens/design.tokens.json';

const Button = styled.button\`
  background-color: \${tokens.colors.primary.$value.hex};
  padding: \${tokens.spacing.base.$value.value}\${tokens.spacing.base.$value.unit};
  font-family: \${tokens.typography.body.$value.fontFamily.join(', ')};
\`;
\`\`\`

## Type Safety

\`\`\`typescript
import { TokenDocument } from '@yourcompany/design-tokens';

function getColorHex(path: string): string {
  // Type-safe token access
}
\`\`\`
    `;
  }

  renderCSSGuide(tokens: TokenDocument): string {
    return `
# CSS Variables Integration

## Generated CSS

Design tokens are automatically converted to CSS custom properties:

\`\`\`css
:root {
${this.generateCSSVariables(tokens)}
}
\`\`\`

## Usage

\`\`\`css
.button {
  background-color: var(--colors-primary);
  padding: var(--spacing-base);
  font-family: var(--typography-body-font-family);
}
\`\`\`
    `;
  }
}
```

### Testing for Phase 3
```typescript
// tests/integration/generators/documentation-generator.test.ts
describe('Documentation Generator Integration', () => {
  it('should generate all documentation files', async () => {
    const generator = new DocumentationGenerator({
      outputDir: './test-output/docs'
    });

    const result = await generator.generate(mockTokens);

    // Verify all files exist
    expect(fs.existsSync(result.readmePath)).toBe(true);
    expect(fs.existsSync(result.tokensReferencePath)).toBe(true);
    expect(fs.existsSync(result.integrationGuidesPath)).toBe(true);

    // Verify content quality
    const readme = fs.readFileSync(result.readmePath, 'utf-8');
    expect(readme).toContain('# Design System');
    expect(readme).toContain('Quick Start');
    expect(readme).toContain('```'); // Code examples
  });

  it('should generate valid markdown', async () => {
    const generator = new DocumentationGenerator({
      outputDir: './test-output/docs'
    });

    await generator.generate(mockTokens);

    // Use markdown linter to validate
    const result = await markdownlint({
      files: ['./test-output/docs/**/*.md']
    });

    expect(result.errors).toHaveLength(0);
  });
});
```

**Deliverables:**
- Complete documentation generation
- All integration guides
- Code examples for all frameworks
- Valid markdown
- 85%+ test coverage

---

## 🔗 Phase 4: Pipeline Integration (Week 3)
**Status:** 0% Complete

### Unified Pipeline

```typescript
// src/core/Pipeline.ts
export class DesignSystemPipeline {
  async run(config: PipelineConfig): Promise<PipelineResult> {
    // 1. Crawl websites
    const crawlResult = await this.crawler.crawl(config);

    // 2. Extract tokens (spec-compliant)
    const tokens = await this.extractTokens(crawlResult);

    // 3. Generate all three outputs in parallel
    const [tokensResult, styleguideResult, docsResult] = await Promise.all([
      this.generateTokens(tokens),
      this.generateStyleguide(tokens),
      this.generateDocumentation(tokens)
    ]);

    return {
      tokens: tokensResult,
      styleguide: styleguideResult,
      documentation: docsResult
    };
  }
}
```

### Configuration

```typescript
// src/core/types.ts
export interface PipelineConfig {
  baseUrl: string;
  maxPages: number;
  outputDir: string;

  // Token generation
  tokens: {
    enabled: boolean;
    useGroups: boolean;
    prefix?: string;
  };

  // Styleguide generation
  styleguide: {
    enabled: boolean;
    title: string;
    includeAccessibility: boolean;
    includeExamples: boolean;
  };

  // Documentation generation
  documentation: {
    enabled: boolean;
    frameworks: ('react' | 'vue' | 'angular' | 'svelte' | 'css')[];
    includeCodeExamples: boolean;
  };

  // Testing
  validation: {
    runSpecCompliance: boolean;
    runVisualRegression: boolean;
  };
}
```

### Testing for Phase 4
```typescript
// tests/e2e/complete-pipeline.test.ts
describe('E2E: Complete Pipeline', () => {
  it('should generate all outputs from real website', async () => {
    const pipeline = new DesignSystemPipeline({
      baseUrl: 'https://example.com',
      maxPages: 10,
      outputDir: './e2e-output',
      tokens: { enabled: true, useGroups: true },
      styleguide: { enabled: true, title: 'Example Design System' },
      documentation: { enabled: true, frameworks: ['react', 'css'] }
    });

    const result = await pipeline.run();

    // Verify all outputs
    expect(result.tokens.path).toBeDefined();
    expect(result.styleguide.indexPath).toBeDefined();
    expect(result.documentation.readmePath).toBeDefined();

    // Validate spec compliance
    const tokens = JSON.parse(fs.readFileSync(result.tokens.path, 'utf-8'));
    expect(validateSpecCompliance(tokens)).toBe(true);

    // Validate styleguide HTML
    const styleguide = fs.readFileSync(result.styleguide.indexPath, 'utf-8');
    expect(styleguide).toContain('<!DOCTYPE html>');

    // Validate documentation
    const readme = fs.readFileSync(result.documentation.readmePath, 'utf-8');
    expect(readme).toMatch(/^# /); // Starts with H1
  }, 60000);
});
```

**Deliverables:**
- Unified pipeline orchestrator
- Configuration system
- Parallel generation
- 100% E2E test coverage

---

## ✅ Phase 5: Testing & Quality (Week 4)
**Status:** 30% Complete (Strategy Designed)

### Test Suite Completion

- [ ] Unit tests: 500+ tests, 95%+ coverage
- [ ] Integration tests: 150+ tests, 90%+ coverage
- [ ] Spec compliance: 50+ tests, 100% pass rate
- [ ] E2E tests: 10+ tests, all critical paths
- [ ] Visual regression: All styleguide pages
- [ ] Performance tests: Benchmarks met

### CI/CD Setup

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:all
      - run: pnpm test:coverage:check
      - uses: codecov/codecov-action@v3

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:visual
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: visual-test-results
          path: test-results/

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:e2e
```

**Deliverables:**
- Complete test suite
- CI/CD pipeline
- Coverage reports
- Visual regression baselines

---

## 📦 Final Deliverables

### Package Output Structure
```
results/
├── design.tokens.json          # ✅ Spec-compliant tokens
├── styleguide/
│   ├── index.html              # Main styleguide
│   ├── colors.html
│   ├── typography.html
│   ├── spacing.html
│   ├── borders.html
│   ├── animations.html
│   └── assets/
│       ├── styleguide.css
│       └── styleguide.js
├── docs/
│   ├── README.md               # Quick start
│   ├── tokens.md               # Token reference
│   ├── integration/
│   │   ├── css.md
│   │   ├── react.md
│   │   ├── vue.md
│   │   └── style-dictionary.md
│   └── api/
│       └── token-format.md
└── legacy/                     # Optional
    ├── tokens.css
    └── figma-tokens.json
```

### Quality Metrics
- ✅ 100% Design Tokens Spec 2025.10 compliance
- ✅ 90%+ code coverage
- ✅ Zero failing tests
- ✅ All visual regression tests passing
- ✅ Performance benchmarks met
- ✅ Production-ready documentation

---

## 🚀 Next Steps

**Ready to proceed?**

I can start with any of these:

1. **Complete Phase 1** - Update all extractors with tests
2. **Start Phase 2** - Build styleguide generator
3. **Start Phase 3** - Build documentation generator
4. **Build test infrastructure** - Set up test framework

**Which would you like to prioritize?**
