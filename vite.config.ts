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
      includeAssets: ['favicon.svg', 'fuentes/Andika-Regular.woff2', 'audio/**/*'],
      manifest: {
        name: 'Cascabel · Música para Infantil y Primaria',
        short_name: 'Cascabel',
        description: 'Biblioteca libre de actividades de música. Sin registro, sin anuncios.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#F2F3EF',
        theme_color: '#BF3B26',
        // Los genera tools/iconos.py con la geometría de public/favicon.svg. Chrome de
        // Android EXIGE 192 y 512 para ofrecer «Instalar aplicación»: sin ellos no se
        // puede probar el micrófono en modo instalado, que es media T0.1.
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // El maskable es un fichero DISTINTO, con un 20 % de margen por lado. Android
          // recorta en círculo, gota o cuadrado según el fabricante, y reutilizar aquí el
          // icono normal le corta la anilla del cascabel.
          {
            src: '/icono-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Workbox va DENTRO de sw.js en vez de en un fichero aparte.
      //
      // No es cosmético: Chrome solo considera instalable una PWA si el service worker
      // registra su manejador de `fetch` durante la evaluación inicial del script. Con el
      // runtime en un fichero aparte, sw.js lo cargaba y el addEventListener('fetch')
      // acababa ejecutándose dentro de una promesa, después. Resultado: Chrome de Android
      // ofrecía «Añadir a pantalla de inicio» en vez de «Instalar aplicación», y sin
      // instalación de verdad no se puede probar el micrófono en modo standalone (T0.1).
      injectRegister: 'auto',
      workbox: {
        inlineWorkboxRuntime: true,
        // Una navegación a / la resuelve el index.html precacheado. Sin esto, el service
        // worker no sabe servir la start_url sin conexión, que es otro de los requisitos.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/content\//, /^\/audio\//, /^\/worklets\//],
        globPatterns: ['**/*.{js,css,html,svg,png,opus,json}', 'fuentes/Andika-Regular.woff2'],
        // Fuera del precache a propósito:
        //  - Bravura (316 KB) y el chunk `partitura` con VexFlow y abcjs (691 KB gzip).
        //    Los usa UNA actividad de las quince. Precachearlos triplicaría la primera
        //    descarga de todos los niños de un colegio para algo que la mayoría no abre.
        //    Se bajan el día que se abre un pentagrama, y entonces se quedan cacheados.
        //  - Los .txt de licencia, que son para humanos y no para la app.
        //  - Los instrumentos que NO son el de por defecto. Son 1,9 MB entre piano,
        //    xilófono, flauta, guitarra, violín y voz, y una actividad usa uno. Meterlos
        //    en el precache multiplicaría por tres la primera descarga de todo un colegio
        //    para bajar cinco instrumentos que ese niño no va a abrir. Se cachean al
        //    usarlos, con la regla de abajo, y a partir de ahí funcionan sin conexión.
        globIgnores: [
          'fuentes/Bravura.woff2',
          '**/*OFL.txt',
          'assets/partitura-*.js',
          'audio/muestras/piano/**',
          'audio/muestras/xilofono/**',
          'audio/muestras/flauta/**',
          'audio/muestras/guitarra/**',
          'audio/muestras/violin/**',
          'audio/muestras/voz/**',
          'audio/muestras/coro/**',
          'audio/muestras/glockenspiel/**',
          'audio/muestras/trompeta/**',
          'audio/muestras/marimba-gm/**',
          'audio/muestras/sitar/**',
          'audio/muestras/koto/**',
          'audio/muestras/kalimba/**',
          'audio/muestras/gaita/**',
          'audio/muestras/banjo/**',
          'audio/muestras/tambor-metalico/**',
        ],
        // Presupuesto de precache: por debajo de 10 MB (límite práctico de iOS).
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/content\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'contenido-actividades' },
          },
          {
            /*
              Instrumentos a demanda. `CacheFirst` y no `StaleWhileRevalidate`: una muestra
              de audio no cambia nunca —si cambiara sería otro fichero—, así que revalidar
              sería una petición de red por nota y por sesión a cambio de nada.

              Lo que esto compra: el primer día que un niño abre la actividad del piano se
              bajan sus muestras, y a partir de ahí funciona sin conexión igual que el resto.
            */
            urlPattern: /\/audio\/muestras\/[^/]+\/.*\.opus$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'instrumentos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
      },
    }),
  ],
});
