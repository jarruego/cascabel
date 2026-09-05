import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Necesario en Docker y en WSL para que el recarga en caliente funcione.
    watch: { usePolling: true },
    headers: {
      // Con menores: nada sale de nuestro origen. Ver docs/08-LEGAL.md.
      'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // Verovio y compañía nunca entran en el arranque.
          partitura: ['abcjs', 'vexflow'],
          audio: ['tone'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'fuentes/**/*', 'audio/**/*'],
      manifest: {
        name: 'Cascabel · Música para Infantil y Primaria',
        short_name: 'Cascabel',
        description: 'Biblioteca libre de actividades de música. Sin registro, sin anuncios.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#F2F3EF',
        theme_color: '#BF3B26',
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,opus,json}'],
        // Presupuesto de precache: por debajo de 10 MB (límite práctico de iOS).
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/content\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'contenido-actividades' },
          },
        ],
      },
    }),
  ],
});
