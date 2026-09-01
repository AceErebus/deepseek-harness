// dsh-fs-tree build: browser half bundles into ./client.js in the
// __ModuleLoader__.load({ id, factory }) format the web shell kernel loads
// (externals answered by the frozen module table), host half compiles to
// lib/index.js. The browser artifact stays at the package root because the
// running dsh web server resolves exports["./client"] at boot and serves
// that exact path for /plugins/<id>/client.js; a path change would need a
// server restart, while a content change applies on page refresh.
import { defineConfig } from 'tsdown'

const id = 'dsh-fs-tree'

export default defineConfig([
  {
    name: `${id}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: '.',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
    tsconfig: 'tsconfig.client.json',
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
  {
    name: `${id}/host`,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    dts: false,
    clean: false,
    // Keep lib/index.js (the package main path) instead of tsdown's .mjs default.
    fixedExtension: false,
    tsconfig: 'tsconfig.host.json',
  },
])
