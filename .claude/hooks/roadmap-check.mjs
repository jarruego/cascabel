#!/usr/bin/env node
/**
 * Hook Stop: recuerda actualizar docs/07-ROADMAP.md cuando se ha tocado código.
 *
 * NO escribe en el roadmap. Un apéndice generado automáticamente sería ruido: la única
 * anotación útil es la que dice qué quedó a medias y por qué, y eso no lo sabe un script.
 * Lo que hace es BLOQUEAR la parada (código 2) y pedir que se actualice con contenido real.
 *
 * Bloquea si:  hay trabajo reciente bajo src/, content/, schemas/ o tools/
 *              (sin commitear, o en el commit de HEAD)
 *        Y     docs/07-ROADMAP.md no está entre esos ficheros.
 *
 * Ante cualquier error interno sale con 0. Un hook roto no puede secuestrar una sesión.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROADMAP = 'docs/07-ROADMAP.md';
const VIGILADOS = ['src/', 'content/', 'schemas/', 'tools/'];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/** Lee el JSON que Claude Code manda por stdin. Si no hay nada, seguimos con {}. */
function entrada() {
  try {
    const crudo = readFileSync(0, 'utf8').trim();
    return crudo ? JSON.parse(crudo) : {};
  } catch {
    return {};
  }
}

/** Ficheros sin commitear, incluidos los no rastreados. */
function sinCommitear() {
  // -z evita que git escape rutas con acentos o espacios, que aquí las hay.
  const trozos = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    .split('\0')
    .filter(Boolean);
  const ficheros = [];
  for (let i = 0; i < trozos.length; i++) {
    const estado = trozos[i].slice(0, 2);
    ficheros.push(trozos[i].slice(3));
    // Un rename o una copia emiten "XY destino<NUL>origen": hay que consumir el origen,
    // que viene SIN prefijo de estado. Sin esto, la ruta de origen saldría mutilada.
    if (estado.includes('R') || estado.includes('C')) {
      i++;
      if (trozos[i]) ficheros.push(trozos[i]);
    }
  }
  return ficheros.filter(Boolean);
}

/** Ficheros tocados por el commit de HEAD. */
function enHead() {
  try {
    return git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD'])
      .split('\0')
      .filter(Boolean);
  } catch {
    return []; // Repositorio sin commits todavía.
  }
}

function main() {
  const datos = entrada();

  // Guarda 1: el campo documentado en versiones que lo mandan. Si viene, se respeta.
  if (datos.stop_hook_active === true) return 0;

  const trabajo = [...new Set([...sinCommitear(), ...enHead()])];
  const relevantes = trabajo.filter((f) => VIGILADOS.some((dir) => f.startsWith(dir)));
  if (relevantes.length === 0) return 0;
  if (trabajo.includes(ROADMAP)) return 0;

  // Guarda 2: la de verdad, porque stop_hook_active no está documentado en esta versión.
  // Si el estado del repositorio no ha cambiado desde el último bloqueo, no insistimos:
  // significa que ya avisamos y no se hizo nada, y bloquear en bucle sería inaceptable.
  const firma = JSON.stringify([datos.session_id ?? '', ...trabajo.sort()]);
  const memoria = join(git(['rev-parse', '--git-dir']).trim(), 'cascabel-roadmap-check.json');
  try {
    if (JSON.parse(readFileSync(memoria, 'utf8')).firma === firma) return 0;
  } catch {
    // No hay memoria previa, o está corrupta: bloqueamos, que es lo que toca.
  }
  try {
    writeFileSync(memoria, JSON.stringify({ firma, fecha: new Date().toISOString() }));
  } catch {
    // Sin memoria no podemos garantizar que no repitamos, pero la guarda 1 sigue en pie.
  }

  const lista = relevantes.slice(0, 12).map((f) => `  · ${f}`).join('\n');
  const mas = relevantes.length > 12 ? `\n  · … y ${relevantes.length - 12} más` : '';

  process.stderr.write(
    `Se ha tocado código y ${ROADMAP} no se ha actualizado.\n\n` +
      `Ficheros con trabajo reciente:\n${lista}${mas}\n\n` +
      `Antes de parar, actualiza ${ROADMAP} TÚ MISMO y con contenido real:\n` +
      `  1. Marca con [x] las casillas que de verdad se hayan cerrado.\n` +
      `  2. Anota lo que queda a medias y qué es lo siguiente, en una línea.\n` +
      `  3. Si ha cambiado una decisión, actualiza también el ADR que corresponda.\n\n` +
      `No añadas un apéndice automático ni un registro de cambios: sería ruido.\n` +
      `Si de verdad no procede tocar el roadmap, dilo y para otra vez.\n`,
  );
  return 2;
}

let codigo = 0;
try {
  codigo = main();
} catch (e) {
  // Fallo del propio hook: no es problema del usuario.
  process.stderr.write(`roadmap-check: fallo interno, se ignora (${e?.message ?? e})\n`);
  codigo = 0;
}
process.exit(codigo);
