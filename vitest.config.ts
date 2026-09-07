import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // .tsx tambien: tests/montaje.test.tsx monta cada tipo de motor de verdad, y para eso
    // tiene que poder importar componentes.
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
