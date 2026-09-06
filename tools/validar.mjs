/**
 * Punto de entrada de `npm run contenido:validar`.
 *
 * Su única razón de ser: package.json no puede llamar a `python3` a secas. En
 * Windows eso es el alias de la Microsoft Store, que no es Python, imprime un
 * anuncio y sale con error — dejando la puerta de calidad rota sin que se note.
 * Aquí se resuelve el intérprete de verdad y se le pasan los argumentos tal cual.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { resolverPython, RAIZ } from './interprete.mjs';

let python;
try {
  python = resolverPython({ exigirDependencias: true });
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(1);
}

const argumentos = process.argv.slice(2);
if (argumentos.length === 0) argumentos.push('content/actividades');

const r = spawnSync(
  python.cmd,
  [...python.args, join(RAIZ, 'tools', 'validar.py'), ...argumentos],
  // PYTHONIOENCODING por si el script se invoca desde una consola cp1252.
  { stdio: 'inherit', cwd: RAIZ, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
);

process.exit(r.status ?? 1);
