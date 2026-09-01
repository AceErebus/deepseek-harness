// dsh-skill-manager host half builds through tsdown from src/index.js
// (source form preserved from the original lib artifact); the browser half
// is the prebuilt client.js at the package root.
import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'dsh-skill-manager/host',
  entry: ['src/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: false,
  fixedExtension: false,
})
