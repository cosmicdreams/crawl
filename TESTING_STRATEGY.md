# Comprehensive Testing Strategy
## Design Token Crawler - Spec Compliance & Quality Assurance

---

## 🎯 Testing Philosophy

**Every component must be tested. Every output must be validated. Zero compromises.**

### Testing Principles
1. **Spec Compliance First** - All outputs must validate against Design Tokens spec
2. **Automated Everything** - No manual testing required for CI/CD
3. **Fast Feedback** - Unit tests run in <5s, full suite in <60s
4. **Regression Prevention** - Snapshot tests prevent breaking changes
5. **Real-World Validation** - Test against actual websites
6. **Coverage Targets** - 90%+ code coverage, 100% critical paths

---

## 📊 Test Pyramid

```
                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱ E2E ╲              5% - Full pipeline validation
                ╱───────╲
               ╱         ╲
              ╱Integration╲           25% - Component interaction
             ╱─────────────╲
            ╱               ╲
           ╱  Unit Tests     ╲        70% - Individual functions
          ╱───────────────────╲
         ▕▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▏
```

---

## 🧪 Test Levels

### 1. **Unit Tests** (70% of tests)
**Purpose:** Validate individual functions and utilities in isolation

#### Coverage Areas:

**A. Type System Validation**
```typescript
// tests/unit/tokens/types/base.test.ts
describe('Token Type System', () => {
  describe('validateTokenName', () => {
    it('should reject names starting with $', () => {
      const result = validateTokenName('$invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start with $');
    });

    it('should reject names containing .', () => {
      const result = validateTokenName('invalid.name');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot contain .');
    });

    it('should accept valid names', () => {
      expect(validateTokenName('primary-blue').valid).toBe(true);
      expect(validateTokenName('spacing-base').valid).toBe(true);
    });

    it('should accept $root special name', () => {
      expect(validateTokenName('$root').valid).toBe(true);
    });
  });

  describe('Type Guards', () => {
    it('should identify tokens correctly', () => {
      const token = { $value: '#0066cc', $type: 'color' };
      expect(isToken(token)).toBe(true);
    });

    it('should identify groups correctly', () => {
      const group = { $type: 'color', primary: { $value: '#0066cc' } };
      expect(isGroup(group)).toBe(true);
    });
  });
});
```

**B. Converter Tests**
```typescript
// tests/unit/tokens/converters/color-converter.test.ts
describe('Color Converter', () => {
  describe('convertCSSColorToSpec', () => {
    it('should convert hex colors', () => {
      const result = convertCSSColorToSpec('#0066cc');
      expect(result).toEqual({
        colorSpace: 'srgb',
        components: [0, 0.4, 0.8],
        hex: '#0066cc'
      });
    });

    it('should convert hex with alpha', () => {
      const result = convertCSSColorToSpec('#0066cc80');
      expect(result.alpha).toBe(0.502); // ~50% alpha
    });

    it('should convert rgb()', () => {
      const result = convertCSSColorToSpec('rgb(0, 102, 204)');
      expect(result.hex).toBe('#0066cc');
    });

    it('should convert rgba()', () => {
      const result = convertCSSColorToSpec('rgba(0, 102, 204, 0.5)');
      expect(result.alpha).toBe(0.5);
    });

    it('should convert hsl()', () => {
      const result = convertCSSColorToSpec('hsl(210, 100%, 40%)');
      expect(result.hex).toBe('#0066cc');
    });

    it('should convert named colors', () => {
      const result = convertCSSColorToSpec('red');
      expect(result.hex).toBe('#ff0000');
    });

    it('should throw on invalid colors', () => {
      expect(() => convertCSSColorToSpec('invalid')).toThrow();
    });
  });
});

// tests/unit/tokens/converters/value-converters.test.ts
describe('Value Converters', () => {
  describe('convertCSSSizeToDimension', () => {
    it('should convert px values', () => {
      expect(convertCSSSizeToDimension('16px')).toEqual({
        value: 16,
        unit: 'px'
      });
    });

    it('should convert rem values', () => {
      expect(convertCSSSizeToDimension('1.5rem')).toEqual({
        value: 1.5,
        unit: 'rem'
      });
    });

    it('should handle unitless 0', () => {
      expect(convertCSSSizeToDimension('0')).toEqual({
        value: 0,
        unit: 'px'
      });
    });

    it('should reject invalid units', () => {
      expect(() => convertCSSSizeToDimension('16em')).toThrow();
    });
  });

  describe('convertCSSTimingFunctionToCubicBezier', () => {
    it('should convert named presets', () => {
      expect(convertCSSTimingFunctionToCubicBezier('ease-in-out'))
        .toEqual([0.42, 0, 0.58, 1]);
    });

    it('should convert cubic-bezier()', () => {
      expect(convertCSSTimingFunctionToCubicBezier('cubic-bezier(0.25, 0.1, 0.25, 1)'))
        .toEqual([0.25, 0.1, 0.25, 1]);
    });

    it('should validate x-coordinates range', () => {
      expect(() => convertCSSTimingFunctionToCubicBezier('cubic-bezier(1.5, 0, 0.5, 1)'))
        .toThrow('x-coordinates must be in range [0, 1]');
    });
  });
});
```

**C. Primitive Type Validators**
```typescript
// tests/unit/tokens/types/primitives.test.ts
describe('Primitive Type Validators', () => {
  describe('isColorValue', () => {
    it('should validate complete color values', () => {
      const color: ColorValue = {
        colorSpace: 'srgb',
        components: [0, 0.4, 0.8],
        hex: '#0066cc'
      };
      expect(isColorValue(color)).toBe(true);
    });

    it('should reject invalid color values', () => {
      expect(isColorValue({ colorSpace: 'srgb' })).toBe(false);
      expect(isColorValue({ components: [0, 0, 0] })).toBe(false);
    });
  });

  describe('isFontWeightValue', () => {
    it('should accept valid numeric weights', () => {
      expect(isFontWeightValue(400)).toBe(true);
      expect(isFontWeightValue(700)).toBe(true);
    });

    it('should reject out-of-range weights', () => {
      expect(isFontWeightValue(0)).toBe(false);
      expect(isFontWeightValue(1001)).toBe(false);
    });

    it('should accept valid preset names', () => {
      expect(isFontWeightValue('bold')).toBe(true);
      expect(isFontWeightValue('semi-bold')).toBe(true);
    });

    it('should reject invalid preset names', () => {
      expect(isFontWeightValue('super-bold')).toBe(false);
    });
  });
});
```

**Target:** 500+ unit tests, 95%+ coverage

---

### 2. **Integration Tests** (25% of tests)

**Purpose:** Validate component interactions and data flow

#### Coverage Areas:

**A. Extractor Tests**
```typescript
// tests/integration/extractors/color-extractor.test.ts
describe('Color Extractor Integration', () => {
  it('should extract colors and convert to spec format', async () => {
    const html = `
      <style>
        .primary { color: #0066cc; }
        .accent { background: rgb(255, 99, 71); }
      </style>
      <div class="primary">Text</div>
      <div class="accent">Box</div>
    `;

    const extractor = new ColorExtractor();
    const tokens = await extractor.extract(html);

    expect(tokens).toHaveLength(2);

    // Verify spec-compliant format
    expect(tokens[0]).toMatchObject({
      type: 'color',
      value: {
        colorSpace: 'srgb',
        components: expect.any(Array),
        hex: expect.stringMatching(/^#[0-9a-f]{6}$/)
      }
    });
  });

  it('should deduplicate identical colors', async () => {
    const html = `
      <style>
        .a { color: #0066cc; }
        .b { color: #0066cc; }
        .c { color: rgb(0, 102, 204); } /* Same as #0066cc */
      </style>
    `;

    const extractor = new ColorExtractor();
    const tokens = await extractor.extract(html);

    // Should only have one token
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value.hex).toBe('#0066cc');
  });
});

// tests/integration/extractors/typography-extractor.test.ts
describe('Typography Extractor Integration', () => {
  it('should extract typography and create composite tokens', async () => {
    const html = `
      <style>
        h1 {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
        }
      </style>
      <h1>Heading</h1>
    `;

    const extractor = new TypographyExtractor();
    const tokens = await extractor.extract(html);

    expect(tokens[0].value).toMatchObject({
      fontFamily: expect.any(Array), // Should be array for fallbacks
      fontSize: { value: 32, unit: 'px' },
      fontWeight: 700,
      lineHeight: 1.2
    });
  });
});
```

**B. Generator Tests**
```typescript
// tests/integration/generators/spec-generator.test.ts
describe('Spec-Compliant Generator Integration', () => {
  it('should generate valid .tokens.json file', async () => {
    const tokens: ExtractedTokenData[] = [
      {
        type: 'color',
        name: 'primary',
        value: {
          colorSpace: 'srgb',
          components: [0, 0.4, 0.8],
          hex: '#0066cc'
        },
        usageCount: 42
      }
    ];

    const generator = new SpecCompliantTokenGenerator({
      outputDir: './test-output',
      useGroups: true
    });

    const outputPath = await generator.generate(tokens);

    // Verify file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify file content
    const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

    // Verify structure
    expect(content.colors).toBeDefined();
    expect(content.colors.$type).toBe('color');
    expect(content.colors.primary).toBeDefined();
    expect(content.colors.primary.$value).toBeDefined();
    expect(content.colors.primary.$extensions).toBeDefined();
  });

  it('should validate all token names', async () => {
    const tokens: ExtractedTokenData[] = [
      {
        type: 'color',
        name: 'invalid.name', // Should be sanitized
        value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' }
      }
    ];

    const generator = new SpecCompliantTokenGenerator({
      outputDir: './test-output'
    });

    // Should not throw, but sanitize the name
    await expect(generator.generate(tokens)).resolves.toBeDefined();
  });
});
```

**C. Pipeline Integration Tests**
```typescript
// tests/integration/pipeline.test.ts
describe('Pipeline Integration', () => {
  it('should process HTML through entire pipeline', async () => {
    const html = `
      <style>
        :root {
          --primary: #0066cc;
          --spacing: 16px;
        }
        h1 {
          color: var(--primary);
          margin: var(--spacing);
          font: 700 32px/1.2 'Helvetica Neue', Arial;
        }
      </style>
      <h1>Test</h1>
    `;

    const pipeline = new Pipeline({
      outputDir: './test-output'
    });

    const result = await pipeline.process(html);

    // Verify all three outputs
    expect(result.tokens).toBeDefined();
    expect(result.styleguide).toBeDefined();
    expect(result.documentation).toBeDefined();

    // Verify tokens file is spec-compliant
    const tokens = JSON.parse(
      fs.readFileSync(result.tokens.path, 'utf-8')
    );
    expect(tokens.colors).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.typography).toBeDefined();
  });
});
```

**Target:** 150+ integration tests

---

### 3. **Spec Compliance Tests** (Critical)

**Purpose:** Prove 100% compliance with Design Tokens Specification 2025.10

```typescript
// tests/compliance/spec-validation.test.ts
describe('Design Tokens Spec 2025.10 Compliance', () => {
  let generatedTokens: TokenDocument;

  beforeAll(async () => {
    // Generate tokens from test fixtures
    const generator = new SpecCompliantTokenGenerator({
      outputDir: './test-output'
    });
    const outputPath = await generator.generate(testFixtures);
    generatedTokens = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  });

  describe('File Format', () => {
    it('should be valid JSON', () => {
      expect(() => JSON.stringify(generatedTokens)).not.toThrow();
    });

    it('should use .tokens.json extension', () => {
      // Verified in generator test
    });
  });

  describe('Token Structure', () => {
    it('all tokens must have $value property', () => {
      validateAllTokensHaveValue(generatedTokens);
    });

    it('all tokens must have determinable $type', () => {
      validateAllTokensHaveType(generatedTokens);
    });

    it('token names must not start with $', () => {
      validateNoNamesStartWithDollar(generatedTokens);
    });

    it('token names must not contain . { }', () => {
      validateNoForbiddenCharacters(generatedTokens);
    });
  });

  describe('Value Formats', () => {
    it('color values must match spec format', () => {
      const colors = getAllTokensOfType(generatedTokens, 'color');
      colors.forEach(token => {
        expect(token.$value).toHaveProperty('colorSpace');
        expect(token.$value).toHaveProperty('components');
        expect(token.$value.components).toHaveLength(3);
      });
    });

    it('dimension values must use px or rem', () => {
      const dimensions = getAllTokensOfType(generatedTokens, 'dimension');
      dimensions.forEach(token => {
        expect(token.$value.unit).toMatch(/^(px|rem)$/);
      });
    });

    it('font weight must be in range [1, 1000]', () => {
      const typography = getAllTokensOfType(generatedTokens, 'typography');
      typography.forEach(token => {
        const weight = token.$value.fontWeight;
        if (typeof weight === 'number') {
          expect(weight).toBeGreaterThanOrEqual(1);
          expect(weight).toBeLessThanOrEqual(1000);
        }
      });
    });

    it('cubic bezier x-coords must be in [0, 1]', () => {
      const beziers = getAllTokensOfType(generatedTokens, 'cubicBezier');
      beziers.forEach(token => {
        const [x1, _, x2, __] = token.$value;
        expect(x1).toBeGreaterThanOrEqual(0);
        expect(x1).toBeLessThanOrEqual(1);
        expect(x2).toBeGreaterThanOrEqual(0);
        expect(x2).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Groups', () => {
    it('groups must not have $value property', () => {
      validateGroupsHaveNoValue(generatedTokens);
    });

    it('type inheritance must work correctly', () => {
      // Colors group has $type: 'color'
      // Child tokens inherit this type
      const colorsGroup = generatedTokens.colors;
      expect(colorsGroup.$type).toBe('color');

      // Children should not need explicit $type
      Object.entries(colorsGroup).forEach(([key, value]) => {
        if (key.startsWith('$')) return;
        if (isToken(value)) {
          // Either has explicit $type or inherits from group
          expect(
            value.$type === 'color' || value.$type === undefined
          ).toBe(true);
        }
      });
    });
  });

  describe('Extensions', () => {
    it('extensions must use reverse domain notation', () => {
      const allTokens = getAllTokens(generatedTokens);
      allTokens.forEach(token => {
        if (token.$extensions) {
          Object.keys(token.$extensions).forEach(key => {
            // Should look like: com.company.product
            expect(key).toMatch(/^[a-z]+\.[a-z]+(\.[a-z]+)*$/);
          });
        }
      });
    });
  });
});

// Helper functions
function validateAllTokensHaveValue(doc: TokenDocument) {
  const allTokens = getAllTokens(doc);
  allTokens.forEach(token => {
    expect(token).toHaveProperty('$value');
  });
}

function getAllTokens(doc: any, tokens: Token[] = []): Token[] {
  Object.values(doc).forEach(value => {
    if (isToken(value)) {
      tokens.push(value);
    } else if (isGroup(value)) {
      getAllTokens(value, tokens);
    }
  });
  return tokens;
}

function getAllTokensOfType(doc: TokenDocument, type: string): Token[] {
  return getAllTokens(doc).filter(token =>
    token.$type === type ||
    getInheritedType(token, doc) === type
  );
}
```

**Target:** 50+ spec compliance tests, 100% pass rate

---

### 4. **End-to-End Tests** (5% of tests)

**Purpose:** Validate complete workflows from start to finish

```typescript
// tests/e2e/full-pipeline.test.ts
describe('E2E: Complete Pipeline', () => {
  it('should crawl real website and generate all outputs', async () => {
    const crawler = new DesignTokenCrawler({
      baseUrl: 'https://example.com',
      maxPages: 5,
      outputDir: './e2e-output'
    });

    const result = await crawler.run();

    // Verify all three outputs exist
    expect(fs.existsSync(result.tokensPath)).toBe(true);
    expect(fs.existsSync(result.styleguidePath)).toBe(true);
    expect(fs.existsSync(result.docsPath)).toBe(true);

    // Verify tokens are spec-compliant
    const tokens = JSON.parse(fs.readFileSync(result.tokensPath, 'utf-8'));
    expect(validateSpecCompliance(tokens)).toBe(true);

    // Verify styleguide is valid HTML
    const styleguide = fs.readFileSync(result.styleguidePath, 'utf-8');
    expect(styleguide).toContain('<!DOCTYPE html>');
    expect(styleguide).toContain('Design System');

    // Verify documentation exists
    const readme = fs.readFileSync(
      path.join(result.docsPath, 'README.md'),
      'utf-8'
    );
    expect(readme).toContain('# Design System');
  }, 30000); // 30s timeout for real crawl
});
```

**Target:** 10+ E2E tests covering critical user journeys

---

### 5. **Visual Regression Tests**

**Purpose:** Ensure styleguide output remains visually consistent

```typescript
// tests/visual/styleguide.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Styleguide Visual Regression', () => {
  test('color palette should match baseline', async ({ page }) => {
    await page.goto('file://./styleguide/index.html');
    await page.waitForSelector('.color-palette');

    // Take screenshot and compare
    await expect(page.locator('.color-palette'))
      .toHaveScreenshot('color-palette.png');
  });

  test('typography specimens should match baseline', async ({ page }) => {
    await page.goto('file://./styleguide/typography.html');

    await expect(page.locator('.typography-specimens'))
      .toHaveScreenshot('typography-specimens.png');
  });

  test('spacing visualizations should match baseline', async ({ page }) => {
    await page.goto('file://./styleguide/spacing.html');

    await expect(page.locator('.spacing-scale'))
      .toHaveScreenshot('spacing-scale.png');
  });
});
```

**Target:** Visual regression tests for all styleguide pages

---

### 6. **Performance Tests**

**Purpose:** Ensure the system performs efficiently

```typescript
// tests/performance/crawler.perf.test.ts
describe('Performance Tests', () => {
  it('should process 100 pages in under 30 seconds', async () => {
    const startTime = Date.now();

    await crawler.crawl({
      maxPages: 100,
      outputDir: './perf-test'
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  });

  it('should generate tokens in under 1 second', async () => {
    const startTime = Date.now();

    await tokenGenerator.generate(largeTokenSet);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 📁 Test Organization

```
tests/
├── unit/                           # Unit tests (70%)
│   ├── tokens/
│   │   ├── types/
│   │   │   ├── base.test.ts
│   │   │   ├── primitives.test.ts
│   │   │   └── composites.test.ts
│   │   ├── converters/
│   │   │   ├── color-converter.test.ts
│   │   │   └── value-converters.test.ts
│   │   └── validators/
│   │       └── spec-validator.test.ts
│   ├── extractors/
│   │   ├── color-extractor.test.ts
│   │   ├── typography-extractor.test.ts
│   │   ├── spacing-extractor.test.ts
│   │   ├── border-extractor.test.ts
│   │   └── animation-extractor.test.ts
│   └── generators/
│       ├── spec-generator.test.ts
│       ├── styleguide-generator.test.ts
│       └── docs-generator.test.ts
│
├── integration/                    # Integration tests (25%)
│   ├── extractors/
│   │   └── full-extraction.test.ts
│   ├── generators/
│   │   └── full-generation.test.ts
│   └── pipeline/
│       └── pipeline-integration.test.ts
│
├── compliance/                     # Spec compliance tests
│   ├── spec-validation.test.ts
│   ├── token-structure.test.ts
│   └── value-formats.test.ts
│
├── e2e/                            # End-to-end tests (5%)
│   ├── full-pipeline.test.ts
│   ├── real-world-sites.test.ts
│   └── edge-cases.test.ts
│
├── visual/                         # Visual regression
│   ├── styleguide.visual.test.ts
│   └── baselines/
│       ├── color-palette.png
│       ├── typography-specimens.png
│       └── spacing-scale.png
│
├── performance/                    # Performance tests
│   ├── crawler.perf.test.ts
│   └── generator.perf.test.ts
│
└── fixtures/                       # Test data
    ├── html/
    │   ├── simple.html
    │   ├── complex.html
    │   └── edge-cases.html
    ├── tokens/
    │   ├── valid.tokens.json
    │   └── invalid-examples/
    └── screenshots/
```

---

## 🎯 Coverage Targets

| Category | Target | Critical |
|----------|--------|----------|
| **Overall Code Coverage** | 90% | 100% |
| **Type System** | 95% | 100% |
| **Converters** | 100% | 100% |
| **Extractors** | 90% | 95% |
| **Generators** | 95% | 100% |
| **Pipeline** | 85% | 90% |
| **Spec Compliance** | 100% | 100% |

---

## 🚀 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run spec compliance tests
        run: pnpm test:compliance

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Generate coverage report
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Fail if coverage < 90%
        run: pnpm test:coverage:check
```

---

## 📊 Test Execution

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:compliance": "vitest run tests/compliance",
    "test:e2e": "playwright test tests/e2e",
    "test:visual": "playwright test tests/visual",
    "test:performance": "vitest run tests/performance",
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "vitest run --coverage && node scripts/check-coverage.js",
    "test:watch": "vitest watch",
    "test:all": "pnpm test:unit && pnpm test:integration && pnpm test:compliance && pnpm test:e2e"
  }
}
```

---

## ✅ Success Criteria

**Before merging ANY code:**
- ✅ All tests pass
- ✅ Coverage ≥ 90%
- ✅ Spec compliance tests 100% pass
- ✅ No visual regressions
- ✅ Performance benchmarks met
- ✅ CI/CD green

**Quality Gates:**
- Zero failing tests in main branch
- Coverage never decreases
- All new features must have tests
- All bug fixes must have regression tests

---

This testing strategy ensures **bulletproof quality** and **spec compliance**. Every component is validated, every output is verified, and we can prove the system works correctly.

**Ready to implement?** I'll start building the test suite alongside the implementation.
