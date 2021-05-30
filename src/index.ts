import { Plugin } from 'vite';
import { debug as Debug } from 'debug';

export interface VitePluginReScript {}

const debug = Debug('@jihchi/vite-plugin-rescript');

export default function createReScriptPlugin(
  options: VitePluginReScript
): Plugin {
  debug('options:', options);
  return {
    name: 'rollup-plugin-rescript',
    async buildStart() {
      debug('buildStart');
    },
  };
}
