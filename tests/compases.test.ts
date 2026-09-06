import { describe, expect, it } from 'vitest';
import {
  INICIAL_COMPASES,
  barrasCorrectas,
  cuadra,
  reducirCompases,
  type AccionCompases,
  type EstadoCompases,
} from '@/motor/maquinaCompases';

/** Ocho negras en 4/4: dos compases, con una sola barra en medio. */
const OCHO_NEGRAS = [1, 1, 1, 1, 1, 1, 1, 1];

const desde = (
  duraciones: number[],
  pulsos: number,
  ...acciones: AccionCompases[]
): EstadoCompases =>
  acciones.reduce(
    (e, a) => reducirCompases(e, a, duraciones, pulsos),
    INICIAL_COMPASES,
  );

describe('dónde van las barras', () => {
  it('una barra cada vez que se completa el compás', () => {
    // Ocho negras en 4/4: la barra va tras la cuarta figura, o sea en el hueco 3.
    expect(barrasCorrectas(OCHO_NEGRAS, 4)).toEqual([3]);
  });

  it('el mismo material en 2/4 lleva tres barras', () => {
    // Es lo que hace la actividad: la cifra de compás cambia la respuesta, no las figuras.
    expect(barrasCorrectas(OCHO_NEGRAS, 2)).toEqual([1, 3, 5]);
  });

  it('cuenta duraciones desiguales, no figuras', () => {
    // Blanca, negra, negra | negra, blanca, negra
    expect(barrasCorrectas([2, 1, 1, 1, 2, 1], 4)).toEqual([2]);
  });

  it('NO pide la barra final', () => {
    /*
      La última figura cierra el compás por sí sola y ahí la divisoria es redundante:
      pedirla sería pedir una formalidad, no un razonamiento.
    */
    expect(barrasCorrectas([1, 1, 1, 1], 4)).toEqual([]);
    expect(barrasCorrectas([4, 4], 4)).toEqual([0]);
  });

  it('aguanta las corcheas sin errores de coma flotante', () => {
    // 0.5 × 8 = 4, y en coma flotante eso no siempre da exactamente 4.
    expect(barrasCorrectas([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], 4)).toEqual([7]);
  });
});

describe('el contenido tiene que cuadrar', () => {
  it('reconoce una línea que suma compases enteros', () => {
    expect(cuadra(OCHO_NEGRAS, 4)).toBe(true);
    expect(cuadra([2, 1, 1, 1, 2, 1], 4)).toBe(true);
  });

  it('y una que no', () => {
    // Siete negras en 4/4 no cierran. Es un error del JSON, no del niño.
    expect(cuadra([1, 1, 1, 1, 1, 1, 1], 4)).toBe(false);
  });
});

describe('poner y quitar barras', () => {
  it('tocar un hueco pone la barra y volver a tocarlo la quita', () => {
    const puesta = desde(OCHO_NEGRAS, 4, { tipo: 'alternar', hueco: 3 });
    expect([...puesta.barras]).toEqual([3]);
    const quitada = reducirCompases(puesta, { tipo: 'alternar', hueco: 3 }, OCHO_NEGRAS, 4);
    expect([...quitada.barras]).toEqual([]);
  });

  it('deja poner una barra donde NO toca', () => {
    // Impedirlo convertiría esto en adivinar dónde deja el programa hacer clic.
    const e = desde(OCHO_NEGRAS, 4, { tipo: 'alternar', hueco: 1 });
    expect([...e.barras]).toEqual([1]);
    expect(e.fase).toBe('colocando');
  });

  it('el último hueco no admite barra', () => {
    const e = desde(OCHO_NEGRAS, 4, { tipo: 'alternar', hueco: 7 });
    expect(e.barras.size).toBe(0);
  });
});

describe('comprobar', () => {
  it('la respuesta correcta completa la actividad', () => {
    const e = desde(OCHO_NEGRAS, 4, { tipo: 'alternar', hueco: 3 }, { tipo: 'comprobar' });
    expect(e.fase).toBe('completada');
    expect(e.sobran).toEqual([]);
    expect(e.faltan).toEqual([]);
  });

  it('distingue lo que sobra de lo que falta', () => {
    // Son dos errores distintos y necesitan dos explicaciones distintas: «aquí no cierra el
    // compás» no es lo mismo que «aquí cerraba y no lo has visto».
    const e = desde(OCHO_NEGRAS, 4, { tipo: 'alternar', hueco: 2 }, { tipo: 'comprobar' });
    expect(e.fase).toBe('revisando');
    expect(e.sobran).toEqual([2]);
    expect(e.faltan).toEqual([3]);
  });

  it('sin ninguna barra, todas faltan', () => {
    const e = desde(OCHO_NEGRAS, 2, { tipo: 'comprobar' });
    expect(e.faltan).toEqual([1, 3, 5]);
    expect(e.sobran).toEqual([]);
  });
});

describe('seguir tras un fallo', () => {
  it('quita las que sobran y CONSERVA las que estaban bien', () => {
    /*
      Borrarlo todo castigaría el acierto: quien puso tres bien y una mal tendría que volver
      a poner las tres. Lo que hay que pensar otra vez es solo lo que estaba mal.
    */
    let e = desde(
      OCHO_NEGRAS,
      2,
      { tipo: 'alternar', hueco: 1 },  // bien
      { tipo: 'alternar', hueco: 3 },  // bien
      { tipo: 'alternar', hueco: 4 },  // mal
      { tipo: 'comprobar' },
    );
    expect(e.sobran).toEqual([4]);
    e = reducirCompases(e, { tipo: 'seguir' }, OCHO_NEGRAS, 2);
    expect([...e.barras].sort((a, b) => a - b)).toEqual([1, 3]);
    expect(e.fase).toBe('colocando');
  });
});
