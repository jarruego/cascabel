#!/usr/bin/env node
/**
 * Trae de cocomusic.es qué páginas suyas corresponden a cada actividad, y lo guarda en
 * `content/cocomusic.json`, que va en git.
 *
 * Se hace AL CONSTRUIR, nunca en el navegador: la app lee la copia de su propio origen y no
 * le pide nada a cocomusic, así que la regla 1 de CLAUDE.md sigue intacta y la CSP no se
 * toca. Lo que llega son títulos y rutas; la ficha del maestro los pinta como enlaces.
 *
 * Si cocomusic no responde, o lo que devuelve no tiene la forma esperada, **el build sigue
 * con la copia de git** y lo dice. Una caída de la otra web no puede impedir publicar esta:
 * eso ataría los dos despliegues, que es justo lo que se quiere evitar.
 *
 * Solo se acepta `base` igual a la web del proyecto. Las rutas las vuelve a filtrar
 * `src/datos/cocomusic.ts` al pintarlas; aquí se rechaza el fichero entero si viene raro.
 */
import { readFile, writeFile } from 'node:fs/promises';

const ORIGEN = 'https://cocomusic.es/cascabel.json';
const BASE = 'https://cocomusic.es';
const RUTA = 'content/cocomusic.json';

function problemaDe(datos) {
  if (!datos || typeof datos !== 'object') return 'no es un objeto';
  if (datos.base !== BASE) return `base inesperada: ${JSON.stringify(datos.base)}`;
  if (!datos.actividades || typeof datos.actividades !== 'object' || Array.isArray(datos.actividades)) {
    return '`actividades` no es un objeto';
  }
  for (const [id, paginas] of Object.entries(datos.actividades)) {
    if (!Array.isArray(paginas)) return `actividades.${id} no es una lista`;
    for (const p of paginas) {
      if (typeof p?.titulo !== 'string' || typeof p?.ruta !== 'string' || !p.ruta.startsWith('/')) {
        return `actividades.${id} tiene una página sin título o con una ruta que no es relativa`;
      }
    }
  }
  if (!Array.isArray(datos.paginas)) return '`paginas` no es una lista';
  return null;
}

let nuevo;
try {
  const respuesta = await fetch(ORIGEN, { signal: AbortSignal.timeout(15000) });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  nuevo = await respuesta.json();
  const problema = problemaDe(nuevo);
  if (problema) throw new Error(problema);
} catch (e) {
  console.warn(`cocomusic.json: no se ha podido usar ${ORIGEN} (${e.message}). Sigue la copia de git.`);
  process.exit(0);
}

const texto = JSON.stringify(nuevo, null, 2) + '\n';
const anterior = await readFile(RUTA, 'utf8').catch(() => null);
if (anterior === texto) {
  console.log('cocomusic.json: sin cambios');
} else {
  await writeFile(RUTA, texto);
  const vinculadas = Object.keys(nuevo.actividades).length;
  console.log(`cocomusic.json: actualizado, ${vinculadas} actividad(es) con páginas vinculadas`);
}
