import { readFile } from 'fs';
import { Plugin } from 'vite';
import execa from 'execa';
import glob from 'glob';
import npmRunPath from 'npm-run-path';
import chalk from 'chalk';
import parseErrorLog from './overlay';

const logPrefix = chalk.cyan('[@jihchi/vite-plugin-rescript]');

async function launchReScript(watch: boolean) {
  const cmd = watch
    ? 'rescript build -with-deps -w'
    : 'rescript build -with-deps';

  const result = execa.command(cmd, {
    env: npmRunPath.env(),
    extendEnv: true,
    shell: true,
    windowsHide: false,
    cwd: process.cwd(),
  });

  let compileOnce = (_value: unknown) => {};

  function dataListener(chunk: any) {
    const output = chunk.toString().trimEnd();
    // eslint-disable-next-line no-console
    console.log(logPrefix, output);
    if (watch && output.includes('>>>> Finish compiling')) {
      compileOnce(true);
    }
  }

  const { stdout, stderr } = result;
  stdout && stdout.on('data', dataListener);
  stderr && stderr.on('data', dataListener);

  if (watch) {
    await new Promise(resolve => {
      compileOnce = resolve;
    });
  } else {
    await result;
  }
}

export default function createReScriptPlugin(): Plugin {
  return {
    name: '@jihchi/vite-plugin-rescript',
    async configResolved(resolvedConfig) {
      const { build, command, mode } = resolvedConfig;
      const needReScript =
        (command === 'serve' && mode === 'development') || command === 'build';

      if (needReScript) {
        await launchReScript(command === 'serve' || Boolean(build.watch));
      }
    },
    config: () => ({
      server: {
        watch: {
          // Only watch for changes to the actual compiled js files, except the
          // ".compiler.log" file which is needed for showing the error overlay.
          // JS is not outputted when the compiler errors, but the rescript files
          // would still trigger an update. That is why they are ignored here.
          ignored: [
            '**/*.res',
            '**/*.resi',
            '**/lib/bs',
            '!**/lib/bs/.compiler.log',
          ],
        },
      },
    }),
    configureServer(server) {
      // Manually find and parse log file after server start since
      // initial compilation does not trigger handleHotUpdate.
      glob('**/lib/bs/.compiler.log', {}, (globError, files) => {
        if (!globError && files.length > 0) {
          const [logPath] = files;
          readFile(logPath, (readFileError, data) => {
            if (!readFileError && data) {
              const log = data.toString();
              const err = parseErrorLog(log);
              if (err) server.ws.send({ type: 'error', err });
            }
          });
        }
      });
    },
    async handleHotUpdate({ file, read, server }) {
      if (file.endsWith('.compiler.log')) {
        const log = await read();
        const err = parseErrorLog(log);
        if (err) server.ws.send({ type: 'error', err });
      }
    },
  };
}
