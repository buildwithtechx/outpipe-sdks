import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts'],
  external: ['next'],
  format: ['esm'],
  sourcemap: true,
});
