/**
 * Comprueba que todo lo que el sitio referencia existe de verdad en dist/.
 *
 * Existe por un fallo real: `not_found_handling: "single-page-application"` hace que
 * CUALQUIER fichero que falte devuelva 200 con el index.html. Así, /icono-192.png y
 * /fuentes/Andika-Regular.woff2 llevaban desde el andamiaje sin existir, respondiendo 200,
 * y nadie lo vio. Un `curl -o /dev/null -w %{http_code}` decía «200» y mentía.
 *
 * Consecuencias que tuvo: Chrome de Android no ofrecía «Instalar aplicación» —hacen falta
 * los iconos de 192 y 512—, así que no se podía probar el micrófono en modo instalado, que
 * es media tarea T0.1. Y la app usaba la tipografía del sistema en vez de Andika.
 *
 * Se ejecuta al final de `npm run build` y sale con código 1. Un aviso entre doscientas
 * líneas de log no lo lee nadie; esto para la máquina.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

/**
 * Referencias que sabemos que faltan y tienen tarea abierta. Estar aquí es una decisión
 * consciente y con fecha, no un descuido: si añades una entrada, pon la tarea.
 */
const PENDIENTES = new Map([
  ['/fuentes/Andika-Regular.woff2', 'T1.9b — tipografías sin añadir al repositorio'],
  ['/fuentes/Bravura.woff2', 'T1.9b — tipografías sin añadir al repositorio'],
]);

const referencias = new Map(); // ruta -> de dónde sale

function anotar(ruta, origen) {
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return;
  const limpia = ruta.split('?')[0].split('#')[0];
  if (!referencias.has(limpia)) referencias.set(limpia, origen);
}

// 1. Iconos del manifiesto. Son los que deciden si la PWA es instalable.
const manifiesto = join(DIST, 'manifest.webmanifest');
if (existsSync(manifiesto)) {
  const m = JSON.parse(readFileSync(manifiesto, 'utf8'));
  for (const icono of m.icons ?? []) anotar(icono.src, 'manifest.webmanifest');
  if (m.start_url) anotar(m.start_url === '/' ? '/index.html' : m.start_url, 'manifest.webmanifest');
}

// 2. url(...) de las hojas de estilo construidas: tipografías e imágenes.
function recorrer(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (e.name.endsWith('.css')) {
      const css = readFileSync(p, 'utf8');
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        if (!m[1].startsWith('data:')) anotar(m[1], e.name);
      }
    }
  }
}
if (existsSync(DIST)) recorrer(DIST);

// 3. Comprobación.
const faltan = [];
const tolerados = [];
for (const [ruta, origen] of referencias) {
  if (existsSync(join(DIST, ruta))) continue;
  (PENDIENTES.has(ruta) ? tolerados : faltan).push({ ruta, origen });
}

for (const { ruta, origen } of tolerados) {
  console.warn(`  pendiente  ${ruta}  (${origen})  →  ${PENDIENTES.get(ruta)}`);
}

if (faltan.length > 0) {
  console.error('\nFaltan ficheros que el sitio referencia:\n');
  for (const { ruta, origen } of faltan) console.error(`  ✗ ${ruta}   referenciado en ${origen}`);
  console.error(
    '\nOJO: en producción esto NO da 404. El fallback de SPA devuelve 200 con el\n' +
      'index.html, así que el fallo es invisible salvo por el Content-Type.\n' +
      'Añade el fichero, o si tiene tarea abierta añádelo a PENDIENTES en este script.\n',
  );
  process.exit(1);
}

console.log(`  dist comprobado: ${referencias.size} referencias, ${tolerados.length} pendientes.`);
