# React Integration Guide

## Installation

```bash
npm install @your-org/design-tokens
```

## Setup

### 1. Import Tokens

```typescript
import { tokens } from '@your-org/design-tokens';
```

### 2. Use in Components

```tsx
import React from 'react';
import { tokens } from '@your-org/design-tokens';

export const Button: React.FC = ({ children }) => {
  return (
    <button
      style={{
        backgroundColor: tokens.color.primary,
        color: tokens.color.textOnPrimary,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        transition: tokens.animation.fadeNormalEase
      }}
    >
      {children}
    </button>
  );
};
```

### 3. Create a Theme Provider (Optional)

```tsx
import React, { createContext, useContext } from 'react';
import { tokens } from '@your-org/design-tokens';

const ThemeContext = createContext(tokens);

export const ThemeProvider: React.FC = ({ children }) => {
  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTokens = () => useContext(ThemeContext);
```

### 4. Usage with Theme Provider

```tsx
import { useTokens } from './ThemeProvider';

export const Card: React.FC = ({ children }) => {
  const tokens = useTokens();

  return (
    <div
      style={{
        backgroundColor: tokens.color.surface,
        padding: tokens.spacing.lg,
        boxShadow: tokens.shadow.md
      }}
    >
      {children}
    </div>
  );
};
```

## TypeScript Support

Full TypeScript support with autocomplete:

```typescript
import { DesignTokens } from '@your-org/design-tokens';

const myColor: string = tokens.color.primary; // Type-safe
```

## Examples

See the [examples directory](./examples/react) for complete working examples.
