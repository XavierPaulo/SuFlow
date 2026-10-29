import { defineConfig } from 'vitest/config';

// base relativo permite publicar em qualquer subpasta (ex.: GitHub Pages).
export default defineConfig({
  base: './',
  test: { environment: 'node' },
});
