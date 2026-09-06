/**
 * Localiza un Python utilizable para las herramientas de contenido.
 *
 * Existe por una razón concreta: en Windows `python3` no es Python, es el alias
 * de la Microsoft Store, que imprime un anuncio y sale con error. Llamar a
 * `python3` directamente desde package.json deja `npm run verificar` roto en la
 * máquina del autor sin que nadie se entere.
 *
 * Orden de preferencia: el entorno virtual del proyecto primero, porque es el
 * único donde sabemos qué versiones hay instaladas.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Python del entorno virtual del proyecto, si existe. */
function delEntornoVirtual() {
  const candidatos = [
    join(RAIZ, '.venv', 'Scripts', 'python.exe'), // Windows
    join(RAIZ, '.venv', 'bin', 'python3'), // macOS y Linux
    join(RAIZ, '.venv', 'bin', 'python'),
  ];
  return candidatos.find((p) => existsSync(p)) ?? null;
}

/** Candidatos del sistema. `py -3` es el lanzador oficial de Windows. */
const DEL_SISTEMA = [
  { cmd: 'python', args: [] },
  { cmd: 'py', args: ['-3'] },
  { cmd: 'python3', args: [] },
];

const VERSION_MINIMA = [3, 11]; // Lo exige music21 10.5.0 de tools/requirements.txt.

function interroga(cmd, args) {
  try {
    const salida = execFileSync(
      cmd,
      [...args, '-c', 'import sys,json;print(json.dumps(list(sys.version_info[:3])))'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 },
    );
    // El alias de la Store no imprime JSON: si no parsea, no es Python.
    const v = JSON.parse(salida.trim());
    if (!Array.isArray(v) || v.length !== 3) return null;
    return v;
  } catch {
    return null;
  }
}

function suficiente(v) {
  return v[0] > VERSION_MINIMA[0] || (v[0] === VERSION_MINIMA[0] && v[1] >= VERSION_MINIMA[1]);
}

/** ¿Están las dependencias de tools/requirements.txt? */
export function tieneDependencias(cmd, args) {
  try {
    execFileSync(cmd, [...args, '-c', 'import jsonschema, music21'], {
      stdio: 'ignore',
      timeout: 60000, // music21 tarda lo suyo en importar la primera vez.
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve `{ cmd, args, version, completo }` o lanza con un mensaje que dice
 * exactamente qué hacer. `completo` indica si además tiene las dependencias.
 */
export function resolverPython({ exigirDependencias = true } = {}) {
  const candidatos = [];
  const venv = delEntornoVirtual();
  if (venv) candidatos.push({ cmd: venv, args: [] });
  candidatos.push(...DEL_SISTEMA);

  const validos = [];
  for (const c of candidatos) {
    const version = interroga(c.cmd, c.args);
    if (version && suficiente(version)) validos.push({ ...c, version });
  }

  if (validos.length === 0) {
    throw new Error(
      `No encuentro un Python ${VERSION_MINIMA.join('.')} o superior.\n` +
        `Probé: ${candidatos.map((c) => [c.cmd, ...c.args].join(' ')).join(', ')}\n\n` +
        `En Windows, "python3" suele ser el alias de la Microsoft Store y no vale.\n` +
        `Instala Python desde python.org y vuelve a intentarlo, o usa Docker:\n` +
        `  docker compose --profile tools run contenido`,
    );
  }

  for (const c of validos) {
    if (tieneDependencias(c.cmd, c.args)) return { ...c, completo: true };
  }

  if (!exigirDependencias) return { ...validos[0], completo: false };

  const mejor = [validos[0].cmd, ...validos[0].args].join(' ');
  throw new Error(
    `Hay Python (${validos[0].version.join('.')}) pero le faltan jsonschema o music21,\n` +
      `así que el validador no comprobaría ni el esquema ni la música.\n\n` +
      `Arréglalo con:\n` +
      `  npm run contenido:preparar\n\n` +
      `O a mano:\n` +
      `  ${mejor} -m venv .venv\n` +
      `  ${process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'} -m pip install -r tools/requirements.txt\n\n` +
      `O con Docker, sin instalar nada:\n` +
      `  docker compose --profile tools run contenido`,
  );
}

// Ejecutado directamente: diagnóstico del entorno.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const p = resolverPython({ exigirDependencias: false });
    console.log(`intérprete           : ${[p.cmd, ...p.args].join(' ')}`);
    console.log(`versión              : ${p.version.join('.')}`);
    console.log(`jsonschema + music21 : ${p.completo ? 'sí' : 'NO'}`);
    process.exit(p.completo ? 0 : 1);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
