import { describe, expect, it } from 'vitest';
import {
  actual,
  calidadDeResultado,
  calidadGlobal,
  ejerciciosDe,
  hayCasi,
  inicialSerie,
  llevaPausa,
  reducirSerie,
  type EstadoSerie,
} from '../src/motor/serie';

const r = (e: EstadoSerie, a: Parameters<typeof reducirSerie>[1]) => reducirSerie(e, a, 3);

describe('una actividad como serie de ejercicios', () => {
  it('va en orden, pasa por la pausa y acaba en el resumen', () => {
    let e = inicialSerie(3);
    expect(actual(e)).toBe(0);
    e = r(e, { tipo: 'terminar', calidad: 'bien' });
    expect(e.fase).toBe('entre');
    e = r(e, { tipo: 'seguir' });
    expect(actual(e)).toBe(1);
    e = r(r(e, { tipo: 'terminar', calidad: 'casi' }), { tipo: 'seguir' });
    e = r(e, { tipo: 'terminar', calidad: 'bien' });
    expect(e.fase).toBe('resumen');
    expect(e.resultados).toEqual({ 0: 'bien', 1: 'casi', 2: 'bien' });
  });

  it('nunca hay que repetir un ejercicio para avanzar: «casi» también pasa', () => {
    let e = inicialSerie(2);
    e = r(e, { tipo: 'terminar', calidad: 'casi' });
    expect(e.fase).toBe('entre');
  });

  it('«repetir los que costaron» rehace solo los casi, en otra vuelta', () => {
    let e = inicialSerie(3);
    e = r(r(e, { tipo: 'terminar', calidad: 'bien' }), { tipo: 'seguir' });
    e = r(r(e, { tipo: 'terminar', calidad: 'casi' }), { tipo: 'seguir' });
    e = r(e, { tipo: 'terminar', calidad: 'casi' });
    expect(hayCasi(e)).toBe(true);
    e = r(e, { tipo: 'repetirCasi' });
    expect(e.orden).toEqual([1, 2]);
    expect(e.vuelta).toBe(1);
    expect(actual(e)).toBe(1);
    // Y si esta vez sale bien, deja de estar entre los que costaron.
    e = r(r(e, { tipo: 'terminar', calidad: 'bien' }), { tipo: 'seguir' });
    e = r(e, { tipo: 'terminar', calidad: 'bien' });
    expect(hayCasi(e)).toBe(false);
    expect(calidadGlobal(e)).toBe('bien');
  });

  it('sin ningún casi, «repetir los que costaron» es la serie entera', () => {
    let e = inicialSerie(3);
    e = r(r(e, { tipo: 'terminar', calidad: 'bien' }), { tipo: 'seguir' });
    e = r(r(e, { tipo: 'terminar', calidad: 'bien' }), { tipo: 'seguir' });
    e = r(e, { tipo: 'terminar', calidad: 'bien' });
    e = r(e, { tipo: 'repetirCasi' });
    expect(e.orden).toEqual([0, 1, 2]);
    expect(e.vuelta).toBe(1);
  });

  it('las acciones fuera de su fase no hacen nada', () => {
    const e = inicialSerie(2);
    expect(r(e, { tipo: 'seguir' })).toBe(e);
    expect(r(e, { tipo: 'repetirCasi' })).toBe(e);
    expect(r(e, { tipo: 'repetirTodo' })).toBe(e);
  });

  it('la calidad global es la peor de la serie, y «hecho» si nada se evalúa', () => {
    let e = inicialSerie(2);
    e = r(r(e, { tipo: 'terminar', calidad: 'hecho' }), { tipo: 'seguir' });
    expect(calidadGlobal(r(e, { tipo: 'terminar', calidad: 'hecho' }))).toBe('hecho');
    expect(calidadGlobal(r(e, { tipo: 'terminar', calidad: 'casi' }))).toBe('casi');
  });
});

describe('la pausa entre ejercicios', () => {
  it('se salta en los tipos que ya enseñan su resultado y esperan al «siguiente»', () => {
    expect(llevaPausa('karaoke')).toBe(false);
    expect(llevaPausa('tocar-a-tiempo')).toBe(false);
    expect(llevaPausa('ordenar')).toBe(true);
    expect(llevaPausa('rejilla')).toBe(true);
  });
});

describe('los ejercicios de una actividad', () => {
  it('sin lista, la actividad es un solo ejercicio y no cambia nada', () => {
    expect(ejerciciosDe({ consigna: 'x', silabas: ['ta'] })).toEqual([{ consigna: 'x', silabas: ['ta'] }]);
  });

  it('con lista, cada ejercicio hereda lo común y pone lo suyo encima', () => {
    const lista = ejerciciosDe({
      consigna: 'x',
      tempo: 84,
      silabas: ['ta'],
      ejercicios: [{ silabas: ['ta', 'ta'] }, { silabas: ['ti-ti'], tempo: 96 }],
    });
    expect(lista).toEqual([
      { consigna: 'x', tempo: 84, silabas: ['ta', 'ta'] },
      { consigna: 'x', tempo: 96, silabas: ['ti-ti'] },
    ]);
  });
});

describe('la calidad que se deduce de un resultado', () => {
  it('manda la que diga el motor', () => {
    expect(calidadDeResultado({ calidad: 'casi', aciertos: 9, intentos: 9 })).toBe('casi');
  });
  it('seis de cada diez es bien; a la primera es bien; sin datos es hecho', () => {
    expect(calidadDeResultado({ aciertos: 6, intentos: 10 })).toBe('bien');
    expect(calidadDeResultado({ aciertos: 5, intentos: 10 })).toBe('casi');
    expect(calidadDeResultado({ intentos: 1 })).toBe('bien');
    expect(calidadDeResultado({ intentos: 3 })).toBe('casi');
    expect(calidadDeResultado({})).toBe('hecho');
  });
});
