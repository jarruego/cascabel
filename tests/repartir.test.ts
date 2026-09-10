import { describe, expect, it } from 'vitest';
import { columnasPara, repartir } from '@/ui/repartir';

describe('repartir N elementos por la pantalla', () => {
  it('cuatro son dos y dos, y cinco son tres y dos, en las dos orientaciones', () => {
    expect(columnasPara(4, false)).toBe(2);
    expect(columnasPara(4, true)).toBe(2);
    expect(columnasPara(5, false)).toBe(3);
    expect(columnasPara(5, true)).toBe(3);
  });

  it('seis son dos columnas en vertical y tres en apaisado', () => {
    expect(columnasPara(6, false)).toBe(2);
    expect(columnasPara(6, true)).toBe(3);
  });

  it('hasta tres van en una sola fila', () => {
    expect(columnasPara(1, false)).toBe(1);
    expect(columnasPara(3, true)).toBe(3);
  });

  it('el kit entero: cinco y cinco en apaisado, dos columnas en vertical', () => {
    expect(columnasPara(10, true)).toBe(5);
    expect(columnasPara(10, false)).toBe(2);
    expect(repartir(10, 800, 400).filas).toBe(2);
    expect(repartir(10, 400, 800).filas).toBe(5);
  });

  it('el lado lo limita lo que más apriete: el ancho, el alto o el tope', () => {
    // Cuatro en 2×2 en un móvil vertical de 360×600: manda el ancho.
    expect(repartir(4, 360, 600, { hueco: 16 }).lado).toBe(156);
    // Los mismos en apaisado 640×280: manda el alto.
    expect(repartir(4, 640, 280, { hueco: 16 }).lado).toBe(116);
    // Y en una pizarra no crecen sin fin.
    expect(repartir(4, 1600, 900, { hueco: 16, maximo: 220 }).lado).toBe(220);
  });

  it('nunca baja del objetivo táctil, aunque no quepa', () => {
    expect(repartir(10, 300, 300, { minimo: 60 }).lado).toBe(60);
  });
});
