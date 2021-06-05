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

```js
import { defineConfig } from 'vite';
import createReScriptPlugin from '@jihchi/vite-plugin-rescript';

export default defineConfig({
  plugins: [createReScriptPlugin()],
});
```

## Plugin Options

```js
// supply an object literal as options to the plugin, for example
createReScriptPlugin({ cmd: 'rescript build -with-deps -w' });
```

| Name  | Type     | Description                                                     |
| :---- | :------- | :-------------------------------------------------------------- |
| `cmd` | `string` | The CLI command to run. Default: `rescript build -with-deps -w` |
