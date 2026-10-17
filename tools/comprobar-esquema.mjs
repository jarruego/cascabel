#!/usr/bin/env node
/**
 * Comprueba, antes de construir, que cada actividad cumple el esquema y que su fichero se
 * llama como su `id`.
 *
 * Existe porque el despliegue de Cloudflare solo ejecuta `npm run build`: ni los tests ni
 * `tools/validar.py`, que necesita el `.venv` con music21 y allí no lo hay. Y desde el
 * 2026-10-18 el panel de cocomusic hace commits en `main` que cambian el JSON de las
 * actividades. Sin esto, un JSON que no cumple el esquema se publicaría igual, y la
 * actividad fallaría en el aula y no en el build.
 *
 * El nombre del fichero importa porque `/actividad/:id` carga `content/actividades/<id>.json`
 * y esa ruta es un contrato con cocomusic (CLAUDE.md §10): un `id` cambiado dentro del JSON
 * sin cambiar el fichero deja un enlace publicado que no abre nada.
 *
 * NO sustituye a `npm run contenido:validar`: aquí no se mira la música (compases, ámbito,
 * saltos), solo la forma. Sale con código 1, que es lo que para el despliegue.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(RAIZ, 'content', 'actividades');
const esquema = JSON.parse(readFileSync(join(RAIZ, 'schemas', 'actividad.schema.json'), 'utf8'));

// `strict: false` porque los `if/then` del esquema ponen `properties` sin repetir
// `type: "object"`, y el modo estricto de ajv eso lo rechaza aunque sea JSON Schema válido.
// Lo que se valida no cambia: es lo mismo que comprueba jsonschema en `tools/validar.py`.
const validar = new Ajv2020({ allErrors: true, strict: false }).compile(esquema);

const fallos = [];
const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.json'));
for (const f of ficheros) {
  let actividad;
  try {
    actividad = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  } catch (e) {
    fallos.push(`${f}: no es JSON válido (${e.message})`);
    continue;
  }
  if (!validar(actividad)) {
    for (const e of validar.errors) fallos.push(`${f}: ${e.instancePath || '/'} ${e.message}`);
  }
  if (`${actividad.id}.json` !== f) {
    fallos.push(`${f}: el id es «${actividad.id}» y el fichero tiene que llamarse igual`);
  }
}

if (fallos.length) {
  console.error(`Esquema: ${fallos.length} problema(s). No se construye.\n`);
  for (const l of fallos) console.error(`  ${l}`);
  process.exit(1);
}
console.log(`Esquema: ${ficheros.length} actividades correctas.`);
