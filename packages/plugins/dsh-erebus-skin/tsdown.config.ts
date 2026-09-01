// dsh-erebus-skin host half builds through tsdown; the browser half is
// produced by scripts/build-client.mjs (esbuild) into lib/client.js.
import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'dsh-erebus-skin/host',
  entry: ['src/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: false,
  fixedExtension: false,
})
