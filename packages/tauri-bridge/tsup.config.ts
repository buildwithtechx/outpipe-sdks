import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts'],
  external: ['@tauri-apps/api'],
  format: ['esm'],
  sourcemap: true,
});
