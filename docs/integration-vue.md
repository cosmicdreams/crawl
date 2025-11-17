# Vue Integration Guide

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

```vue
<template>
  <button :style="buttonStyles">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { tokens } from '@your-org/design-tokens';
import { computed } from 'vue';

const buttonStyles = computed(() => ({
  backgroundColor: tokens.color.primary,
  color: tokens.color.textOnPrimary,
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.md,
  transition: tokens.animation.fadeNormalEase
}));
</script>
```

### 3. Create a Plugin (Optional)

```typescript
// plugins/design-tokens.ts
import { tokens } from '@your-org/design-tokens';
import type { App } from 'vue';

export default {
  install(app: App) {
    app.config.globalProperties.$tokens = tokens;
    app.provide('tokens', tokens);
  }
};
```

```typescript
// main.ts
import { createApp } from 'vue';
import designTokensPlugin from './plugins/design-tokens';
import App from './App.vue';

const app = createApp(App);
app.use(designTokensPlugin);
app.mount('#app');
```

### 4. Usage with Plugin

```vue
<script setup lang="ts">
import { inject } from 'vue';

const tokens = inject('tokens');
</script>
```

## Composition API

```typescript
import { ref, computed } from 'vue';
import { tokens } from '@your-org/design-tokens';

export const useTheme = () => {
  return {
    tokens,
    colors: computed(() => tokens.color),
    spacing: computed(() => tokens.spacing)
  };
};
```

## Examples

See the [examples directory](./examples/vue) for complete working examples.
