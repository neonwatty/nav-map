import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/cli.ts', 'src/reporter.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    target: 'node18',
  },
  {
    entry: { app: 'src/viewer/app.tsx' },
    outDir: 'dist/viewer',
    platform: 'browser',
    format: ['iife'],
    globalName: 'NavMapViewer',
    outExtension: () => ({ js: '.js' }),
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: true,
    noExternal: [/.*/],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
]);
