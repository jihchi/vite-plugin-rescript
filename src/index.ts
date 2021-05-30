import { Plugin } from 'vite';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import chalk from 'chalk';

export interface VitePluginReScript {
  cmd?: string;
}

export default function createReScriptPlugin(
  options?: VitePluginReScript
): Plugin {
  const cmd = options?.cmd ?? 'rescript build -with-deps -w';
  return {
    name: 'rollup-plugin-rescript',
    async buildStart() {
      const { stdout, stderr } = execa.command(cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        windowsHide: false,
        cwd: process.cwd(),
      });
      function dataListener(chunk: any) {
        console.log(
          chalk.cyan('[@jihchi/vite-plugin-rescript]'),
          chunk.toString()
        );
      }
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
    },
  };
}
