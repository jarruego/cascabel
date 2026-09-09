import { describe, expect, it } from 'vitest';
import { girar, variar } from '../src/motor/variaciones';

describe('«otra vez» no repite lo mismo', () => {
  it('la vuelta cero es lo escrito, tal cual', () => {
    const e = { silabas: ['ta', 'ti-ti', 'ta', 'sil'] };
    expect(variar('tocar-a-tiempo', e, 0)).toBe(e);
  });

  it('el ritmo se gira sin cambiar de figuras', () => {
    const e = { silabas: ['ta', 'ti-ti', 'ta', 'sil'] };
    const v1 = variar('tocar-a-tiempo', e, 1).silabas as string[];
    const v2 = variar('tocar-a-tiempo', e, 2).silabas as string[];
    expect(v1).toEqual(['sil', 'ta', 'ti-ti', 'ta']);
    expect(v2).toEqual(['ta', 'sil', 'ta', 'ti-ti']);
    expect([...v1].sort()).toEqual([...e.silabas].sort());
    // Determinista: la misma vuelta da lo mismo.
    expect(variar('tocar-a-tiempo', e, 1)).toEqual(variar('tocar-a-tiempo', e, 1));
  });

  it('el dictado mueve las columnas y deja las notas', () => {
    const e = { modo: 'dictado', columnas: 4, solucion: ['0,0', '1,1', '0,2', '1,3'] };
    expect(variar('rejilla', e, 1).solucion).toEqual(['0,1', '1,2', '0,3', '1,0']);
    // Y la rejilla libre no varía: no hay solución que mover.
    const libre = { modo: 'libre', columnas: 8 };
    expect(variar('rejilla', libre, 1)).toBe(libre);
  });

  it('los compases se giran enteros, no figura a figura', () => {
    const e = { duraciones: [1, 1, 2, 2, 1, 1], pulsosPorCompas: 2 };
    expect(variar('compases', e, 1).duraciones).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('el karaoke va un poco más deprisa y tiene tope', () => {
    expect(variar('karaoke', { tempo: 100 }, 1).tempo).toBe(106);
    expect(variar('karaoke', { tempo: 100 }, 9).tempo).toBe(120);
  });

  it('un tipo sin regla no cambia', () => {
    const e = { bloques: [1, 2] };
    expect(variar('seguir', e, 3)).toBe(e);
  });

  it('girar conserva los elementos', () => {
    expect(girar([1, 2, 3], 1)).toEqual([3, 1, 2]);
    expect(girar([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(girar([1], 5)).toEqual([1]);
  });
});
