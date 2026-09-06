/**
 * Comprueba en PRODUCCIÓN lo que solo se puede comprobar en producción.
 *
 * Existe porque la promesa central del proyecto —«ni una petición fuera de nuestro
 * origen», «el audio del micrófono nunca sale del dispositivo»— no la sostiene el código,
 * la sostienen unas cabeceras HTTP. Y las cabeceras solo existen de verdad cuando un
 * servidor real las envía: `public/_headers` es un fichero de intenciones hasta que
 * Cloudflare lo aplica.
 *
 * También comprueba que ningún fichero declarado falte. Con
 * `not_found_handling: single-page-application`, un fichero ausente devuelve 200 con el
 * index.html, así que el código de estado MIENTE y hay que mirar el Content-Type. Así se
 * nos colaron los iconos de la PWA y las tipografías durante meses.
 *
 * Uso:  node tools/comprobar-produccion.mjs [url]
 */

const BASE = process.argv[2] ?? 'https://cascabel.jarruego.workers.dev';

/** Directivas de CSP que no son negociables, con el porqué de cada una. */
const CSP_OBLIGATORIA = [
  ["default-src 'self'", 'nada carga desde fuera si no se dice lo contrario'],
  ["connect-src 'self'", 'IMPIDE exfiltrar el audio del micrófono. Es la directiva clave'],
  ["script-src 'self'", 'sin CDN ni scripts de terceros'],
  ["font-src 'self'", 'las tipografías no pueden venir de Google Fonts'],
  ["frame-ancestors 'none'", 'nadie puede meter la app en un iframe'],
];

const CABECERAS = [
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'no-referrer'],
  ['permissions-policy', 'camera=()'],
];

/** Rutas que tienen que existir, con el tipo que deben devolver. */
const RUTAS = [
  ['/', 'text/html'],
  ['/content/indice.json', 'application/json'],
  ['/manifest.webmanifest', 'application/manifest+json'],
  ['/icono-192.png', 'image/png'],
  ['/icono-512.png', 'image/png'],
  ['/icono-512-maskable.png', 'image/png'],
  ['/fuentes/Andika-Regular.woff2', 'font/woff2'],
  ['/audio/muestras/marimba/c4.opus', 'audio/'],
  ['/sw.js', 'javascript'],
  ['/worklets/tono-processor.js', 'javascript'],
];

/** Rutas de cliente: no son ficheros, las resuelve el router. Deben dar HTML. */
const RUTAS_SPA = ['/diagnostico', '/ajustes', '/privacidad', '/creditos'];

let fallos = 0;
const mal = (msg) => {
  fallos += 1;
  console.error(`  ✗ ${msg}`);
};
const bien = (msg) => console.log(`  ✓ ${msg}`);

const raiz = await fetch(BASE, { redirect: 'follow' });

console.log(`\nComprobando ${BASE}\n`);
console.log('Cabeceras de seguridad');

const csp = raiz.headers.get('content-security-policy') ?? '';
if (!csp) {
  mal('NO hay Content-Security-Policy. La promesa de privacidad no está respaldada por nada.');
} else {
  for (const [directiva, porque] of CSP_OBLIGATORIA) {
    if (csp.includes(directiva)) bien(`${directiva} — ${porque}`);
    else mal(`falta «${directiva}» en la CSP — ${porque}`);
  }
  // Una CSP que permita cualquier origen es peor que no tenerla: da falsa seguridad.
  if (/\*|https?:\/\//.test(csp.replace(/'[^']*'/g, ''))) {
    mal(`la CSP permite orígenes externos: ${csp}`);
  }
}

for (const [cabecera, esperado] of CABECERAS) {
  const v = raiz.headers.get(cabecera) ?? '';
  if (v.includes(esperado)) bien(`${cabecera}: ${v}`);
  else mal(`${cabecera} debería contener «${esperado}» y vale «${v || '(vacío)'}»`);
}

console.log('\nFicheros declarados');
for (const [ruta, tipo] of RUTAS) {
  const r = await fetch(BASE + ruta);
  const ct = r.headers.get('content-type') ?? '';
  if (!r.ok) mal(`${ruta} → ${r.status}`);
  else if (!ct.includes(tipo)) {
    // Esto es lo que hay que mirar: 200 con text/html donde debía ir un PNG significa
    // que el fichero NO existe y el fallback de SPA está devolviendo la página.
    mal(`${ruta} → 200 pero Content-Type «${ct}», se esperaba «${tipo}». El fichero no existe.`);
  } else bien(`${ruta} → ${ct}`);
}

console.log('\nRutas del router (deben dar HTML, no 404)');
for (const ruta of RUTAS_SPA) {
  const r = await fetch(BASE + ruta);
  const ct = r.headers.get('content-type') ?? '';
  if (r.ok && ct.includes('text/html')) bien(`${ruta}`);
  else mal(`${ruta} → ${r.status} ${ct}`);
}

console.log(
  fallos === 0
    ? '\nTodo correcto: la promesa de privacidad está respaldada por las cabeceras reales.\n'
    : `\n${fallos} problema(s). En producción, no en local.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
