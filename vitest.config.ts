import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve alias '@/' -> ./src (khop tsconfig paths) de test import giong app.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
