import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/validation.ts', 'src/workflow.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  banner: {
    js: '"use client";',
  },
});
