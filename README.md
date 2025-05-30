# @jihchi/vite-plugin-rescript

[![Workflows - CI][workflows-ci-shield]][workflows-ci-url]
[![npm package][npm-package-shield]][npm-package-url]
![npm download per month][npm-download-shield]
[![npm license][npm-licence-shield]](./LICENSE)

Integrate ReScript with Vite by:

- Starting ReScript compilation automatically
- Showing HMR overlay for ReScript compiler errors
- Importing `.res` files directly (see [Using Loader](#using-loader))

## Getting Started

> If you are looking for a template to quickly start a project using Vite, ReScript and React, take a look at [vitejs-template-react-rescript](https://github.com/jihchi/vitejs-template-react-rescript), the template depends on this plugin.

```sh
# npm
npm i -D @jihchi/vite-plugin-rescript

# yarn
yarn add -D @jihchi/vite-plugin-rescript

# pnpm
pnpm i -D @jihchi/vite-plugin-rescript
```

Configure your vite plugin in `vite.config.ts`:

```js
import { defineConfig } from 'vite';
import createReScriptPlugin from '@jihchi/vite-plugin-rescript';

export default defineConfig({
  plugins: [createReScriptPlugin()],
});
```

If you're using `require` syntax:

```js
const {
  default: createReScriptPlugin,
} = require('@jihchi/vite-plugin-rescript');
```

## Using Loader

The plugin comes with support for loading `.res` files directly. This is optional and in most cases not necessary,
but can be useful in combination with ["in-source": false](https://rescript-lang.org/docs/manual/latest/build-configuration#package-specs).
When using `"in-source": false` (without the loader), importing local files using relative paths is troublesome.
Take for example the following code:

```res
%%raw(`import "./local.css"`)
@module("./local.js") external runSomeJs: unit => unit = "default"
```

The bundler will fail when reaching this file, since the imports are resolved relative to the generated JS file (which resides in `lib`),
but the `.css` and `.js` files are not copied into this directory. By utilizing the loader it no longer fails since the bundler will
resolve the files relative to the `.res` file instead.

### Configuration

The loader is configured to support `lib/es6` output with `.bs.js` suffix by default. This can be
changed by providing an options object to the plugin:

```js
export default defineConfig({
  plugins: [
    createReScriptPlugin({
      loader: {
        output: './lib/js',
        suffix: '.mjs',
      },
      silent: false,
      rewatch: false,
    }),
  ],
});
```

_Note: It is recommended to use `.bs.js` suffix since the loader cannot otherwise distinguish
between imports of regular JS files and those that were generated by the ReScript compiler._

_Note: Using es6-global module format may cause issues with imports of ReScript node modules,
since the paths to the node_modules will be generated as relative to the `lib` folder._

### Setup

For HTML entry points, it must be imported using inline JS:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import '/src/Main.res';
    </script>
  </body>
</html>
```

If using Vite with library mode, just use the `.res` as entry point:

```js
import { defineConfig } from 'vite';
import createReScriptPlugin from '@jihchi/vite-plugin-rescript';

export default defineConfig({
  plugins: [createReScriptPlugin()],
  build: {
    lib: {
      entry: 'src/Main.res',
    },
  },
});
```

## Contributors

Many thanks for your help!

<a href="https://github.com/jihchi/vite-plugin-rescript/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=jihchi/vite-plugin-rescript" />
</a>

The image of contributors is made with [contrib.rocks](https://contrib.rocks).

[workflows-ci-shield]: https://github.com/jihchi/vite-plugin-rescript/actions/workflows/main.yml/badge.svg
[workflows-ci-url]: https://github.com/jihchi/vite-plugin-rescript/actions/workflows/main.yml
[npm-package-shield]: https://img.shields.io/npm/v/@jihchi/vite-plugin-rescript
[npm-package-url]: https://www.npmjs.com/package/@jihchi/vite-plugin-rescript
[npm-download-shield]: https://img.shields.io/npm/dm/@jihchi/vite-plugin-rescript
[npm-licence-shield]: https://img.shields.io/npm/l/@jihchi/vite-plugin-rescript
