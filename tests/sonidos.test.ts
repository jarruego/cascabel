import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El banco de sonidos reales (`content/sonidos.json` y `public/audio/sonidos/`).
 *
 * Lo que se comprueba es lo que hace que la atribución no mienta: que cada sonido del
 * manifiesto esté verificado por la herramienta —con una licencia de las que caben con
 * Apache-2.0 y CC BY-SA— y exista en disco; que ninguna actividad use un sonido que el
 * manifiesto no conozca; y que el banco entero pese lo que se prometió, porque va fuera del
 * precache y se baja al usarlo.
 */

const RAIZ = join(__dirname, '..');

interface Sonido {
  id: string;
  categoria: string;
  nombre: string;
  commons: string;
  segundos: number;
  verificado?: { licencia: string; autor: string; url: string; fecha: string };
}

const manifiesto = JSON.parse(
  readFileSync(join(RAIZ, 'content', 'sonidos.json'), 'utf-8'),
) as { sonidos: Sonido[] };

const LICENCIAS = /^(CC0(\s1\.0)?|Public domain|CC BY(-SA)?\s\d(\.\d)?(\s[a-z]{2})?)$/i;

describe('el banco de sonidos', () => {
  it('cada sonido está verificado, con una licencia de las que caben, y existe en disco', () => {
    const malos = manifiesto.sonidos
      .filter(
        (s) =>
          !s.verificado ||
          !LICENCIAS.test(s.verificado.licencia) ||
          !existsSync(join(RAIZ, 'public', 'audio', 'sonidos', s.categoria, `${s.id}.opus`)),
      )
      .map((s) => s.id);
    expect(malos, 'falta `python tools/sonidos.py`, o una licencia no vale').toEqual([]);
  });

  it('no hay dos con el mismo id', () => {
    const ids = manifiesto.sonidos.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ninguna actividad usa un sonido que el manifiesto no conozca', () => {
    const conocidos = new Set(manifiesto.sonidos.map((s) => `sonidos/${s.categoria}/${s.id}.opus`));
    const dir = join(RAIZ, 'content', 'actividades');
    const desconocidos: string[] = [];
    for (const f of readdirSync(dir)) {
      const texto = readFileSync(join(dir, f), 'utf-8');
      for (const m of texto.matchAll(/"(sonidos\/[^"]+\.opus)"/g)) {
        if (!conocidos.has(m[1]!)) desconocidos.push(`${f}: ${m[1]}`);
      }
    }
    expect(desconocidos).toEqual([]);
  });

  it('el banco entero pesa menos de seis megas', () => {
    // Va fuera del precache y se baja al usarlo, pero aun así: un fragmento de veinte
    // segundos a 48 kbps son 120 KB, y cien sonidos no deberían pasar de ahí por mucho.
    const raiz = join(RAIZ, 'public', 'audio', 'sonidos');
    let total = 0;
    for (const cat of readdirSync(raiz)) {
      for (const f of readdirSync(join(raiz, cat))) total += statSync(join(raiz, cat, f)).size;
    }
    expect(total).toBeLessThan(6 * 1024 * 1024);
  });
});
