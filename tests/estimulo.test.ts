import { describe, expect, it } from 'vitest';
import { duracionDe, eventosDe, suena } from '@/motor/estimulo';

/**
 * Los estímulos descritos en el JSON, convertidos en instantes.
 *
 * Es la parte que se puede probar sin altavoz y la que más cuesta ver a oído: si un
 * intervalo sale con las dos notas a la vez, o un tres por cuatro acentúa el pulso que no
 * es, la actividad enseña algo falso con toda la confianza del mundo.
 */
describe('un estímulo dicho en notas', () => {
  it('coloca cada nota donde le toca, según su duración y el tempo', () => {
    const ev = eventosDe({ notas: ['C4', 'E4', 'G4'], duraciones: [1, 1, 2], respuesta: 'x' }, 60);
    expect(ev.map((e) => e.en)).toEqual([0, 1, 2]);
    expect(duracionDe({ notas: ['C4', 'E4', 'G4'], duraciones: [1, 1, 2], respuesta: 'x' }, 60)).toBe(4);
  });

  it('el picado dura un instante y el ligado casi todo el hueco', () => {
    const pic = eventosDe({ notas: ['C4', 'D4'], articulacion: 'staccato', respuesta: 'x' }, 60);
    const lig = eventosDe({ notas: ['C4', 'D4'], articulacion: 'legato', respuesta: 'x' }, 60);
    const d = (e: (typeof pic)[number]) => (e.tipo === 'nota' ? e.duracion : 0);
    expect(d(pic[0]!)).toBeLessThan(0.2);
    expect(d(lig[0]!)).toBeGreaterThan(0.9);
  });

  it('la dinámica es volumen, y sin decir nada no es ni forte ni piano', () => {
    const [f] = eventosDe({ notas: ['C4'], volumen: 1, respuesta: 'x' });
    const [p] = eventosDe({ notas: ['C4'], volumen: 0.25, respuesta: 'x' });
    const [n] = eventosDe({ notas: ['C4'], respuesta: 'x' });
    const v = (e: typeof f) => (e?.tipo === 'nota' ? e.volumen : -1);
    expect(v(f)).toBeGreaterThan(v(n));
    expect(v(n)).toBeGreaterThan(v(p));
  });
});

describe('un estímulo dicho en ritmo', () => {
  it('cada figura es un clic, y el acento cae donde se dice', () => {
    // Dos compases de tres por cuatro: seis negras con acento en la primera de cada tres.
    const ev = eventosDe({ ritmo: [1, 1, 1, 1, 1, 1], acentos: [0, 3], respuesta: 'x' }, 120);
    expect(ev.map((e) => e.en)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    expect(ev.map((e) => e.tipo === 'clic' && e.acentuado)).toEqual([
      true, false, false, true, false, false,
    ]);
  });

  it('una blanca ocupa el sitio de dos negras', () => {
    const ev = eventosDe({ ritmo: [2, 1, 1], respuesta: 'x' }, 60);
    expect(ev.map((e) => e.en)).toEqual([0, 2, 3]);
  });
});

describe('un estímulo dicho en golpes del kit', () => {
  it('varios golpes en la misma celda suenan a la vez, y la celda vacía calla', () => {
    const ev = eventosDe({ patron: ['bombo+charles', '', 'caja'], respuesta: 'x' }, 60);
    expect(ev.map((e) => [e.en, e.tipo === 'golpe' ? e.golpe : ''])).toEqual([
      [0, 'bombo'],
      [0, 'charles'],
      [2, 'caja'],
    ]);
  });

  it('la celda puede ser media negra, para corcheas', () => {
    const ev = eventosDe({ patron: ['charles', 'charles', 'charles', 'charles'], celda: 0.5, respuesta: 'x' }, 60);
    expect(ev.map((e) => e.en)).toEqual([0, 0.5, 1, 1.5]);
  });
});

describe('qué suena y qué no', () => {
  it('un caso escrito no suena, así que no hay nada que repetir', () => {
    expect(suena({ texto: 'actividad.x.caso1', respuesta: 'x' })).toBe(false);
    expect(suena({ audio: 'muestras/x.opus', respuesta: 'x' })).toBe(true);
    expect(suena({ notas: ['C4'], respuesta: 'x' })).toBe(true);
    expect(suena({ ritmo: [1], respuesta: 'x' })).toBe(true);
    expect(suena({ patron: ['bombo'], respuesta: 'x' })).toBe(true);
  });

  it('notas y ritmo a la vez se suman, ordenados en el tiempo', () => {
    const ev = eventosDe({ notas: ['C4', 'D4'], ritmo: [1, 1], respuesta: 'x' }, 60);
    expect(ev.map((e) => e.en)).toEqual([0, 0, 1, 1]);
  });
});
