#!/usr/bin/env node
/**
 * Regenera la tabla de tipos de motor de `docs/01-ARQUITECTURA.md`.
 *
 * Existe porque esa tabla tiene dos columnas que se desincronizan solas —qué tipos hay y
 * cuántas actividades usa cada uno— y una que no —la mecánica, que es prosa escrita a mano—.
 * El script **conserva la prosa** y solo rehace lo demás: reordena por número de
 * actividades, actualiza las cifras y añade una fila con la descripción en blanco para el
 * tipo que se acabe de registrar.
 *
 * `tests/documentacion.test.ts` es quien obliga a pasarlo. Este script solo hace que
 * cumplirlo cueste un comando en vez de contar a mano.
 *
 * Uso:  npm run docs:tipos
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(RAIZ, 'docs', '01-ARQUITECTURA.md');

/** Los tipos que la aplicación sabe ejecutar de verdad, no los que el esquema admite. */
function tiposRegistrados() {
  const fuente = readFileSync(join(RAIZ, 'src', 'motor', 'registro.ts'), 'utf-8');
  const cuerpo = fuente.slice(fuente.indexOf('= {'), fuente.indexOf('};'));
  return [...cuerpo.matchAll(/^ {2}'?([a-z-]+)'?:/gm)].map((m) => m[1]);
}

function cuantasPorTipo() {
  const dir = join(RAIZ, 'content', 'actividades');
  const cuenta = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const { tipo } = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
    cuenta[tipo] = (cuenta[tipo] ?? 0) + 1;
  }
  return cuenta;
}

const doc = readFileSync(DOC, 'utf-8');
const inicio = doc.indexOf('| Tipo | Mecánica | Actividades |');
const fin = doc.indexOf('\n\n**Antes de crear un tipo nuevo**');
if (inicio < 0 || fin < 0) {
  console.error('No se encuentra la tabla en docs/01-ARQUITECTURA.md. ¿La han movido?');
  process.exit(1);
}

// La prosa de la columna del medio se recoge de la tabla que ya hay: es lo único que este
// script no sabe escribir.
const mecanicas = {};
for (const m of doc.slice(inicio, fin).matchAll(/^\| `([a-z-]+)` \| (.*?) \| \d+ \|$/gm)) {
  mecanicas[m[1]] = m[2];
}

const cuenta = cuantasPorTipo();
const tipos = tiposRegistrados().sort(
  (a, b) => (cuenta[b] ?? 0) - (cuenta[a] ?? 0) || a.localeCompare(b),
);

const sinTexto = tipos.filter((t) => !mecanicas[t]);
const filas = tipos
  .map((t) => `| \`${t}\` | ${mecanicas[t] ?? 'PENDIENTE: describe la mecánica'} | ${cuenta[t] ?? 0} |`)
  .join('\n');

writeFileSync(
  DOC,
  doc.slice(0, inicio) + '| Tipo | Mecánica | Actividades |\n|---|---|---|\n' + filas + doc.slice(fin),
  'utf-8',
);

console.log(`tabla de tipos: ${tipos.length} tipos, ${Object.values(cuenta).reduce((a, b) => a + b, 0)} actividades`);
if (sinTexto.length) {
  console.log(`Falta escribir la mecánica de: ${sinTexto.join(', ')}`);
}
