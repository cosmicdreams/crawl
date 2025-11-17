# CSS Variables Integration Guide

## Installation

```bash
npm install @your-org/design-tokens
```

## Setup

### 1. Import CSS

```css
@import '@your-org/design-tokens/css/tokens.css';
```

Or import in your JavaScript/TypeScript:

```typescript
import '@your-org/design-tokens/css/tokens.css';
```

### 2. Use CSS Variables

```css
.button {
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: var(--transition-fade-normal-ease);
}

.button:hover {
  background-color: var(--color-primary-hover);
}
```

## Available Variables

### Colors




### Spacing




See the [complete token reference](./README.md) for all available variables.

## Custom Properties

You can also access tokens programmatically:

```javascript
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary');
```

## Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-text: var(--color-gray-100);
  }
}
```
