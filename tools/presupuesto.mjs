#!/usr/bin/env node
/**
 * Presupuesto de peso del arranque.
 *
 * Falla la CI si el JS inicial se dispara. No es una manía: la app tiene que arrancar
 * en menos de dos segundos con 3G en la tablet vieja del aula, y el precache del
 * service worker tiene que caber por debajo del límite práctico de iOS (~50 MB, y
 * nosotros apuntamos a 10).
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const LIMITE_JS_INICIAL_KB = 400;
const LIMITE_TOTAL_MB = 10;

const dir = 'dist/assets';
let inicialGz = 0;
let total = 0;

async function recorrer(d) {
  for (const entrada of await readdir(d, { withFileTypes: true })) {
    const p = join(d, entrada.name);
    if (entrada.isDirectory()) {
      await recorrer(p);
      continue;
    }
    total += (await stat(p)).size;
    // Los chunks con nombre (partitura, audio) se cargan bajo demanda: no cuentan.
    if (entrada.name.endsWith('.js') && !/partitura|audio|verovio/.test(entrada.name)) {
      inicialGz += gzipSync(readFileSync(p)).length;
    }
  }
}

try {
  await recorrer(dir);
} catch {
  console.log('No hay dist/: ejecuta npm run build primero.');
  process.exit(0);
}

const kb = (inicialGz / 1024).toFixed(1);
const mb = (total / 1024 / 1024).toFixed(2);
console.log(`JS inicial: ${kb} KB gzip (límite ${LIMITE_JS_INICIAL_KB})`);
console.log(`Total dist: ${mb} MB (límite ${LIMITE_TOTAL_MB})`);

if (inicialGz / 1024 > LIMITE_JS_INICIAL_KB || total / 1024 / 1024 > LIMITE_TOTAL_MB) {
  console.error('Presupuesto excedido.');
  process.exit(1);
}
