import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  sourcemap: true,
});
