import { readFile } from 'fs';
import { Plugin } from 'vite';
import execa from 'execa';
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
          // Ignore rescript files when watching since they may occasionally trigger hot update
          ignored: ['**/*.res', '**/*.resi'],
        },
      },
    }),
    configureServer(server) {
      // Manually find and parse log file after server start since
      // initial compilation does not trigger handleHotUpdate.
      readFile('./lib/bs/.compiler.log', (readFileError, data) => {
        if (!readFileError && data) {
          const log = data.toString();
          const err = parseErrorLog(log);
          if (err) server.ws.send({ type: 'error', err });
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
