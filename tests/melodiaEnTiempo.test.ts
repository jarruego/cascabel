import { describe, expect, it } from 'vitest';
import { duracionDe, instantesDe, type NotaEnPulsos } from '@/motor/melodiaEnTiempo';

const NEGRAS: NotaEnPulsos[] = [
  { nota: 'E4', pulsos: 1 },
  { nota: 'F4', pulsos: 1 },
  { nota: 'G4', pulsos: 2 },
];

describe('instantes de una melodía', () => {
  it('coloca cada nota después de la duración de la anterior, no de la suya', () => {
    // El error clásico: sumar la duración ANTES de anotar el instante, con lo que todo se
    // desplaza un pulso y la melodía suena tarde de principio a fin.
    expect(instantesDe(NEGRAS, 60, 0)).toEqual([0, 1, 2]);
  });

  it('escala con el tempo', () => {
    expect(instantesDe(NEGRAS, 120, 0)).toEqual([0, 0.5, 1]);
  });

  it('respeta las duraciones desiguales', () => {
    const conPuntillo: NotaEnPulsos[] = [
      { nota: 'E4', pulsos: 1.5 },
      { nota: 'D4', pulsos: 0.5 },
      { nota: 'D4', pulsos: 2 },
    ];
    expect(instantesDe(conPuntillo, 60, 0)).toEqual([0, 1.5, 2]);
  });
});

describe('margen de entrada', () => {
  it('la primera nota NUNCA suena en el instante cero', () => {
    // Es la regla que importa: en un musicograma que avanza, una nota en el instante cero
    // nace encima de la línea del presente y es imposible de acertar.
    const instantes = instantesDe(NEGRAS, 100, 2);
    expect(instantes[0]).toBeGreaterThan(0);
  });

  it('desplaza la melodía entera, sin deformarla', () => {
    const sin = instantesDe(NEGRAS, 100, 0);
    const con = instantesDe(NEGRAS, 100, 2);
    expect(con.map((t, i) => t - sin[i]!)).toEqual([2, 2, 2]);
  });

  it('da margen suficiente para ver venir la nota', () => {
    // Con 2 s de margen y una ventana visible de 3,2 s, la primera nota entra en pantalla
    // ya empezada la cuenta y recorre dos segundos hasta la línea. Si este margen bajara de
    // medio segundo, volvería el fallo que encontró el autor.
    expect(instantesDe(NEGRAS, 100, 2)[0]).toBeGreaterThanOrEqual(0.5);
  });
});

describe('duración total', () => {
  it('incluye el margen y la última nota entera', () => {
    // Cuatro pulsos a 60 bpm son cuatro segundos, más dos de margen.
    expect(duracionDe(NEGRAS, 60, 2)).toBe(6);
  });

  it('una melodía vacía dura lo que el margen', () => {
    expect(duracionDe([], 100, 2)).toBe(2);
  });
});
