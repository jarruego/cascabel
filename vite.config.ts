import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

/**
 * Sirve y publica `content/`.
 *
 * El contenido no vive en `public/` a propósito: es la fuente de verdad del proyecto, la
 * revisa una maestra y la valida `tools/validar.py`; meterlo en `public/` lo mezclaría con
 * los assets. Pero entonces `vite build` no lo copia, y en desarrollo funcionaba solo por
 * casualidad —Vite sirve la raíz del proyecto—, así que la biblioteca entera habría dado
 * 404 el día del despliegue y no antes.
 */
function contenido(): Plugin {
  const origen = fileURLToPath(new URL('./content', import.meta.url));

  /** Todos los ficheros de content/, con su ruta relativa en POSIX. */
  function listar(dir: string, prefijo = ''): Array<{ relativa: string; absoluta: string }> {
    const salida: Array<{ relativa: string; absoluta: string }> = [];
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const absoluta = join(dir, entrada.name);
      const relativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.isDirectory()) salida.push(...listar(absoluta, relativa));
      else salida.push({ relativa, absoluta });
    }
    return salida;
  }

  return {
    name: 'cascabel-contenido',

    configureServer(servidor) {
      // Explícito a propósito: en desarrollo funcionaba porque Vite sirve la raíz del
      // proyecto, que es una casualidad y no un contrato. Así dev y producción sirven
      // el contenido por el mismo camino.
      servidor.middlewares.use((peticion, respuesta, siguiente) => {
        const url = peticion.url ?? '';
        if (!url.startsWith('/content/')) return siguiente();
        const relativa = decodeURIComponent(url.split('?')[0]!).slice('/content/'.length);
        if (relativa.includes('..')) {
          respuesta.statusCode = 400;
          return respuesta.end();
        }
        const fichero = join(origen, relativa);
        if (!existsSync(fichero)) return siguiente();
        respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
        respuesta.end(readFileSync(fichero));
      });
    },

    // Se emite como parte del bundle en vez de copiarlo a mano después. Así lo escribe
    // Rollup con el resto, entra en el manifiesto —y por tanto en el precache de la PWA—
    // y no hay carrera con ficheros que Windows tenga bloqueados.
    generateBundle() {
      for (const { relativa, absoluta } of listar(origen)) {
        this.emitFile({
          type: 'asset',
          fileName: `content/${relativa}`,
          source: readFileSync(absoluta),
        });
      }
    },
  };
}

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
    contenido(),
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
