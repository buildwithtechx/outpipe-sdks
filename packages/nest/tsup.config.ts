import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts'],
  external: ['@nestjs/common'],
  format: ['esm'],
  sourcemap: true,
});
