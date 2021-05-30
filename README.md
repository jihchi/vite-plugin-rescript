# @jihchi/vite-plugin-rescript

## Getting Started

### npm

```sh
npm i -D @jihchi/vite-plugin-rescript
```

### yarn

```sh
yarn add -D @jihchi/vite-plugin-rescript
```

Configure your vite plugin in `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import createReScriptPlugin from '@jihchi/vite-plugin-rescript';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ReScript()],
});
```
