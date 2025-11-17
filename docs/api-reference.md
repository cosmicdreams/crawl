# API Reference

## Token Access Methods

### CSS Variables

```css
.element {
  /* Color tokens */
  color: var(--color-primary);

  /* Typography tokens */
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);

  /* Spacing tokens */
  margin: var(--spacing-md);

  /* Animation tokens */
  transition: var(--transition-normal-ease);
}
```

### JavaScript/TypeScript

```typescript
import { tokens } from '@your-org/design-tokens';

// Access tokens
const primaryColor = tokens.color.primary;
const bodyFont = tokens.typography.body;
const normalSpacing = tokens.spacing.md;
const fadeTransition = tokens.animation.fadeNormalEase;
```

### Sass/SCSS

```scss
@import '@your-org/design-tokens/scss';

.element {
  color: $color-primary;
  font-size: $font-size-body;
  margin: $spacing-md;
  transition: $transition-normal-ease;
}
```

## Token Structure

All tokens follow the [Design Tokens Community Group specification](https://design-tokens.github.io/community-group/format/).

### Token Format

```json
{
  "tokenName": {
    "$type": "color",
    "$value": "#3b82f6",
    "$description": "Primary brand color"
  }
}
```

## Available Token Types

- **Color**: RGB/Hex color values
- **Typography**: Font properties (family, size, weight, line-height)
- **Dimension**: Size values with units (px, rem, em)
- **Transition**: Animation timing and easing
- **Shadow**: Box shadow values
- **Border**: Border styles and widths
- **Radius**: Border radius values
