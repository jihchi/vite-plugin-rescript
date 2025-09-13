import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Readable } from 'node:stream';
import chalk from 'chalk';
import { execaCommand } from 'execa';
import { npmRunPathEnv } from 'npm-run-path';
import type { Plugin } from 'vite';
import parseCompilerLog from './parseCompilerLog.js';

const logPrefix = chalk.cyan('[@jihchi/vite-plugin-rescript]');

type ReScriptProcess = {
  shutdown: () => void;
};

async function launchReScript(
  watch: boolean,
  silent: boolean,
): Promise<ReScriptProcess> {
  const cmd = watch ? 'rescript watch' : 'rescript build';

  // https://github.com/rescript-lang/rescript/blob/9676953f5b5ce96ade6909af3f23a77cd69645e9/rewatch/src/watcher.rs#L246-L258
  const finishSignal = 'Finished initial compilation';

  const result = execaCommand(cmd, {
    env: npmRunPathEnv(),
    extendEnv: true,
    shell: true,
    windowsHide: false,
    cwd: process.cwd(),
  });

  let compileOnce = (_value: unknown) => {};

  function dataListener(chunk: Readable) {
    const output = chunk.toString().trimEnd();
    if (!silent) {
      // eslint-disable-next-line no-console
      console.log(logPrefix, output);
    }
    if (watch && output.includes(finishSignal)) {
      compileOnce(true);
    }
  }

  const { stdout, stderr } = result;
  stdout?.on('data', dataListener);
  stderr?.on('data', dataListener);

  if (watch) {
    await new Promise((resolve) => {
      compileOnce = resolve;
    });
  } else {
    await result;
  }

  return {
    shutdown() {
      if (!result.killed) {
        result.kill();
      }
    },
  };
}

interface Config {
  loader?: {
    output?: string;
    suffix?: string;
  };
  silent?: boolean;
}

export default function createReScriptPlugin(config?: Config): Plugin {
  let root: string;
  let usingLoader = false;
  let childProcessReScript: undefined | ReScriptProcess;

  // Retrieve config
  const output = config?.loader?.output ?? './lib/es6';
  const suffix = config?.loader?.suffix ?? '.bs.js';
  const suffixRegex = new RegExp(`${suffix.replace('.', '\\.')}$`);
  const silent = config?.silent ?? false;

  return {
    name: '@jihchi/vite-plugin-rescript',
    enforce: 'pre',
    async configResolved(resolvedConfig) {
      root = resolvedConfig.root;

      const { build, command, inlineConfig } = resolvedConfig;

      // exclude "vite preview [--mode <mode>]"
      const isOnlyDevServerLaunching =
        command === 'serve' && !Object.hasOwn(inlineConfig, 'preview');

      const isBuildForProduction = command === 'build';

      const needReScript = isOnlyDevServerLaunching || isBuildForProduction;

      // The watch command can only be run by one process at the same time.
      const isLocked = existsSync(path.resolve('./.bsb.lock'));

      const watch = !isLocked && (command === 'serve' || Boolean(build.watch));

      if (needReScript) {
        childProcessReScript = await launchReScript(watch, silent);
      }
    },
    config: (userConfig) => ({
      build: {
        // If the build watcher is enabled (adding watch config would automatically enable it),
        // exclude rescript files since recompilation should be based on the generated JS files.
        watch: userConfig.build?.watch
          ? { exclude: ['**/*.res', '**/*.resi'] }
          : null,
      },
      server: {
        watch: {
          // Ignore rescript files when watching since they may occasionally trigger hot update
          ignored: ['**/*.res', '**/*.resi'],
        },
      },
    }),
    configureServer(server) {
      // Manually find and parse log file after server start since
      // initial compilation does not trigger handleHotUpdate.
      fs.readFile(path.resolve('./lib/bs/.compiler.log'), 'utf8').then(
        (data) => {
          const log = data.toString();
          const err = parseCompilerLog(log);
          if (err) server.hot.send({ type: 'error', err });
        },
      );
    },
    // Hook that resolves `.bs.js` imports to their `.res` counterpart
    async resolveId(source, importer, options) {
      if (source.endsWith('.res')) usingLoader = true;
      if (options.isEntry || !importer) return null;
      if (!importer.endsWith('.res')) return null;
      if (!source.endsWith(suffix)) return null;
      if (path.isAbsolute(source)) return null;

      // This is the directory name of the ReScript file
      const dirname = path.dirname(importer);

      try {
        // Check if the source is a node module or an existing file
        require.resolve(source, { paths: [dirname] });
        return null;
      } catch {
        // empty catch
      }

      // Only replace the last occurrence
      const resFile = source.replace(suffixRegex, '.res');
      const id = path.join(dirname, resFile);

      // Enable other plugins to resolve the file
      const resolution = await this.resolve(resFile, importer, {
        skipSelf: true,
        ...options,
      });

      // The file either doesn't exist or was marked as external
      if (!resolution || resolution.external) return resolution;

      // Another plugin resolved the file
      if (resolution.id !== resFile) return resolution;

      // Set the id to the absolute path of the ReScript file
      return { ...resolution, id };
    },
    // Hook that loads the generated `.bs.js` file from `lib/es6` for ReScript files
    async load(id) {
      if (!id.endsWith('.res')) return null;

      // Find the path to the generated js file
      const relativePath = path.relative(root, id);
      const filePath = path
        .resolve(output, relativePath)
        .replace(/\.res$/, suffix);

      // Add the generated file to the watch module graph
      this.addWatchFile(filePath);

      // Read the file content and return the code
      return { code: await fs.readFile(filePath, 'utf8') };
    },
    async handleHotUpdate({ file, read, server }) {
      // HMR is not automatically triggered when using the ReScript file loader.
      // This waits for the generated `.bs.js` files to be generated, then finds
      // their associated `.res` files and marks them as files to be reloaded.
      if (usingLoader && file.endsWith(suffix)) {
        const lib = path.resolve(output);
        const relativePath = path.relative(lib, file);
        if (relativePath.startsWith('..')) return;
        const resFile = relativePath.replace(suffixRegex, '.res');
        const id = path.join(root, resFile);
        const moduleNode = server.moduleGraph.getModuleById(id);
        if (moduleNode) return [moduleNode];
      } else if (file.endsWith('.compiler.log')) {
        const log = await read();
        const err = parseCompilerLog(log);
        if (err) server.hot.send({ type: 'error', err });
      }

      return;
    },
    async closeBundle() {
      childProcessReScript?.shutdown();
      return;
    },
  };
}
