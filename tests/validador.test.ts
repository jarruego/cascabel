import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/**
 * El validador de contenido es la única red de seguridad que tenemos: una tanda
 * de actividades generadas con IA pasa por él y nadie las mira compás a compás.
 *
 * Este test existe porque durante meses el validador «pasó» sin comprobar nada:
 * invocaba python3 (que en Windows es el alias de la Store), y cuando le faltaban
 * jsonschema o music21 avisaba en vez de fallar. Decía «3/3 correctas» sin haber
 * mirado ni el esquema ni la música. Ver T1.11 en docs/07-ROADMAP.md.
 */

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function validar(carpeta: string) {
  const r = spawnSync('node', [join(RAIZ, 'tools', 'validar.mjs'), join(RAIZ, 'tests', 'fixtures', carpeta)], {
    encoding: 'utf8',
    cwd: RAIZ,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  return { codigo: r.status, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// music21 tarda unos segundos en importarse la primera vez.
describe('validador de contenido', { timeout: 120_000 }, () => {
  it('acepta actividades correctas, incluidas anacrusa y 3/4', () => {
    const { codigo, salida } = validar('validas');
    expect(salida).not.toMatch(/ERROR/);
    expect(codigo).toBe(0);
  });

  it('rechaza un compás desbordado, una tesitura imposible y una etapa inexistente', () => {
    const { codigo, salida } = validar('invalidas');

    // Que falle no basta: tiene que fallar por los motivos correctos.
    expect(salida).toMatch(/no es múltiplo de/); // compás desbordado
    expect(salida).toMatch(/por encima de la tesitura/); // ámbito
    expect(salida).toMatch(/is not one of/); // esquema
    expect(salida).toMatch(/0\/3 actividades correctas/);
    expect(codigo).not.toBe(0);
  });
});
