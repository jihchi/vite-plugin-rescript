import { Plugin } from 'vite';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import chalk from 'chalk';

export interface VitePluginReScript {
  cmd?: string;
}

const logPrefix = chalk.cyan('[@jihchi/vite-plugin-rescript]');

export default function createReScriptPlugin(
  options?: VitePluginReScript
): Plugin {
  const cmd = options?.cmd ?? 'rescript build -with-deps -w';
  return {
    name: '@jihchi/vite-plugin-rescript',
    async buildStart() {
      const subprocess = execa.command(cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        windowsHide: false,
        cwd: process.cwd(),
      });

      function dataListener(chunk: any) {
        console.log(logPrefix, chunk.toString().trimEnd());
      }

      const { stdout, stderr } = subprocess;
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
    },
  };
}
