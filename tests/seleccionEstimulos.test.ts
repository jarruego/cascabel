import { describe, expect, it } from 'vitest';
import { MAX_POR_VUELTA, seleccionarEstimulos } from '../src/motor/seleccionEstimulos';

const banco = [
  { id: 1, respuesta: 'sube' },
  { id: 2, respuesta: 'baja' },
  { id: 3, respuesta: 'sube' },
  { id: 4, respuesta: 'baja' },
  { id: 5, respuesta: 'sube' },
  { id: 6, respuesta: 'baja' },
  { id: 7, respuesta: 'sube' },
  { id: 8, respuesta: 'baja' },
  { id: 9, respuesta: 'sube' },
  { id: 10, respuesta: 'baja' },
];

describe('cinco estímulos por vuelta', () => {
  it('con cinco o menos se hacen todas, en su orden', () => {
    const pocas = banco.slice(0, 4);
    expect(seleccionarEstimulos(pocas, 7)).toBe(pocas);
  });

  it('con más, salen cinco distintas', () => {
    const vuelta = seleccionarEstimulos(banco, 7);
    expect(vuelta).toHaveLength(MAX_POR_VUELTA);
    expect(new Set(vuelta.map((e) => e.id)).size).toBe(MAX_POR_VUELTA);
  });

  it('las respuestas van repartidas: de dos opciones, tres y dos', () => {
    for (const semilla of [1, 2, 3, 42, 1000]) {
      const cuenta = { sube: 0, baja: 0 };
      for (const e of seleccionarEstimulos(banco, semilla)) cuenta[e.respuesta as 'sube' | 'baja'] += 1;
      expect(Math.abs(cuenta.sube - cuenta.baja)).toBe(1);
    }
  });

  it('la misma semilla da la misma vuelta, y otra semilla suele dar otra', () => {
    const a = seleccionarEstimulos(banco, 5).map((e) => e.id);
    expect(seleccionarEstimulos(banco, 5).map((e) => e.id)).toEqual(a);
    const distintas = [1, 2, 3, 4, 6].filter(
      (s) => seleccionarEstimulos(banco, s).map((e) => e.id).join() !== a.join(),
    );
    expect(distintas.length).toBeGreaterThan(0);
  });

  it('con tres respuestas, ninguna se queda fuera', () => {
    const tres = [
      { respuesta: 'a' }, { respuesta: 'a' }, { respuesta: 'a' }, { respuesta: 'a' },
      { respuesta: 'b' }, { respuesta: 'b' }, { respuesta: 'b' },
      { respuesta: 'c' }, { respuesta: 'c' },
    ];
    const vistas = new Set(seleccionarEstimulos(tres, 9).map((e) => e.respuesta));
    expect(vistas).toEqual(new Set(['a', 'b', 'c']));
  });
});
