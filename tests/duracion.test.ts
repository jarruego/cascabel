import { describe, expect, it } from 'vitest';
import { duracionLegible } from '@/motor/duracion';

describe('cómo se dice una duración', () => {
  it('por debajo de la hora, minutos y ya está', () => {
    expect(duracionLegible(9)).toEqual({ clave: 'duracion.minutos', valores: { n: 9 } });
    expect(duracionLegible(59)).toEqual({ clave: 'duracion.minutos', valores: { n: 59 } });
  });

  it('a partir de la hora se parte, porque 135 min obliga a dividir de cabeza', () => {
    expect(duracionLegible(135)).toEqual({ clave: 'duracion.horas', valores: { h: 2, m: 15 } });
  });

  it('la hora justa no arrastra un «0 min»', () => {
    expect(duracionLegible(60)).toEqual({ clave: 'duracion.horasJustas', valores: { h: 1 } });
    expect(duracionLegible(240)).toEqual({ clave: 'duracion.horasJustas', valores: { h: 4 } });
  });

  it('un cero o un dato que falta no dicen nada raro', () => {
    // Pasa cuando una actividad del camino no declara `duracion_min`: la suma es 0 y lo que
    // se ve es «0 min», que es honesto. Lo que no puede salir es un número negativo.
    expect(duracionLegible(0)).toEqual({ clave: 'duracion.minutos', valores: { n: 0 } });
    expect(duracionLegible(-5)).toEqual({ clave: 'duracion.minutos', valores: { n: 0 } });
  });
});
