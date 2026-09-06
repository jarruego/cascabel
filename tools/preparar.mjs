/**
 * Crea .venv e instala tools/requirements.txt con un Python que sirva.
 *
 * Se separa de validar.mjs a propósito: instalar cosas es un efecto secundario
 * y no debe ocurrir por sorpresa dentro de `npm run verificar`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolverPython, RAIZ, tieneDependencias } from './interprete.mjs';

const VENV = join(RAIZ, '.venv');
const pythonVenv = join(
  VENV,
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);

function corre(cmd, args) {
  console.log(`  → ${[cmd, ...args].join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: RAIZ });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

let base;
try {
  // Aún no hay dependencias: eso es justo lo que venimos a instalar.
  base = resolverPython({ exigirDependencias: false });
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(1);
}

console.log(`Python base: ${[base.cmd, ...base.args].join(' ')} (${base.version.join('.')})`);

if (!existsSync(pythonVenv)) {
  console.log('Creando .venv...');
  corre(base.cmd, [...base.args, '-m', 'venv', VENV]);
}

console.log('Instalando tools/requirements.txt...');
corre(pythonVenv, ['-m', 'pip', 'install', '--upgrade', 'pip', '--quiet']);
corre(pythonVenv, ['-m', 'pip', 'install', '-r', join(RAIZ, 'tools', 'requirements.txt')]);

if (!tieneDependencias(pythonVenv, [])) {
  console.error('\nLa instalación terminó pero jsonschema o music21 siguen sin importar.\n');
  process.exit(1);
}
console.log('\nListo. Ya puedes ejecutar: npm run contenido:validar');
