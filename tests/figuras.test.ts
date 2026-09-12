import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { esGlifo } from '../src/ui/glifos';
import { esCifra } from '../src/ui/cifras';

/**
 * Toda tarjeta lleva su figura (2026-09-12: «todas las tarjetas con un icono, imagen,
 * símbolo musical o svg representativo»). Esto vigila que ninguna actividad se quede con
 * la de reserva del eje, que el icono exista en `public/iconos` —un nombre mal escrito
 * pinta un círculo vacío— y que el signo esté en la tabla de Bravura.
 */
const RAIZ = join(__dirname, '..');
const CARPETA = join(RAIZ, 'content', 'actividades');

interface Actividad {
  id: string;
  tipo: string;
  figura?: { icono?: string; glifo?: string };
}

const actividades: Actividad[] = readdirSync(CARPETA)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(CARPETA, f), 'utf-8')) as Actividad);

describe('figura de la tarjeta', () => {
  it('toda actividad que no es una presentación la declara', () => {
    const sin = actividades.filter((a) => a.tipo !== 'presentacion' && !a.figura).map((a) => a.id);
    expect(sin).toEqual([]);
  });

  it('las presentaciones no la llevan: enseñan al personaje', () => {
    const con = actividades.filter((a) => a.tipo === 'presentacion' && a.figura).map((a) => a.id);
    expect(con).toEqual([]);
  });

  it('cada icono existe en public/iconos', () => {
    const malos = actividades
      .filter(
        (a) =>
          a.figura?.icono &&
          !esCifra(a.figura.icono) &&
          !existsSync(join(RAIZ, 'public', 'iconos', `${a.figura.icono}.svg`)),
      )
      .map((a) => `${a.id}: ${a.figura?.icono}`);
    expect(malos).toEqual([]);
  });

  it('cada signo está en la tabla de Bravura', () => {
    const malos = actividades
      .filter((a) => a.figura?.glifo && !esGlifo(a.figura.glifo))
      .map((a) => `${a.id}: ${a.figura?.glifo}`);
    expect(malos).toEqual([]);
  });
});
