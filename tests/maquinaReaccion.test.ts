import { describe, expect, it } from 'vitest';
import { CIERRE_DESDE_MS, REFRACTARIO_MS, TRAS_ACIERTO_MS, esperaTrasRespuesta, sePuedeCerrar } from '../src/motor/maquinaReaccion';
import { createElement, Fragment } from 'react';
import {
  BASE_MS,
  POR_CARACTER_MS,
  duracionMs,
  seVe,
  textoDe,
} from '../src/motor/maquinaReaccion';

/**
 * Que la pista que enseña no se vaya antes de leerse.
 *
 * Sale de una medida del 2026-09-09 sobre las 71 pistas con texto del catálogo: mediana de
 * 88 caracteres y 18 palabras, que un niño de 2.º de Primaria lee en unos veinte segundos a
 * los 60 ppm de los baremos españoles. La tarjeta duraba 6,2 segundos, y las 71 se quedaban
 * cortas. Ahora la corrección no lleva reloj y el elogio sí.
 *
 * Y hay un segundo fallo debajo, que es el que no se veía: la duración decía escalar con el
 * texto y **no escalaba**, porque `children` es un array en seis de los once sitios y el
 * código preguntaba `typeof children === 'string'`. Justo los seis que llevan la pista larga
 * se quedaban en el 60 de reserva. Por eso se prueba `textoDe` con las formas reales que
 * escriben los tipos de motor, y no solo con una cadena.
 *
 * La invariante de la que depende todo esto —que la pista concreta solo aparezca al fallar—
 * está razonada en el módulo y no se puede comprobar leyendo un JSX. Lo más cerca que hay es
 * `tests/pistasAlNino.test.ts`, que vigila lo contiguo: que todo tipo capaz de decir «casi»
 * lea las pistas de la actividad.
 */

describe('el texto de la tarjeta', () => {
  it('lee una cadena suelta', () => {
    expect(textoDe('Casi')).toBe('Casi');
  });

  it('lee las dos formas que de verdad escriben los tipos de motor', () => {
    // `{fase === 'bien' && t('comun.bien')}{fase === 'casi' && …}`: una rama falsa y otra no.
    expect(textoDe([false, 'Escucha otra vez'])).toBe('Escucha otra vez');
    // Cantar y Karaoke concatenan la pista detrás de la frase, con un hueco delante.
    expect(textoDe(['Casi', ' sopla más flojo'])).toBe('Casi sopla más flojo');
  });

  it('entra en los fragmentos, que es como Compases añade su pista', () => {
    const nodo = [
      'Aquí no cierra el compás',
      createElement(Fragment, null, ' cuenta los pulsos'),
    ];
    expect(textoDe(nodo)).toBe('Aquí no cierra el compás cuenta los pulsos');
  });

  it('no se rompe con lo que no es texto', () => {
    expect(textoDe(null)).toBe('');
    expect(textoDe(undefined)).toBe('');
    expect(textoDe(false)).toBe('');
  });
});

describe('si la tarjeta se ve', () => {
  it('un elogio o una corrección se ven aunque no traigan texto propio', () => {
    expect(seVe('bien', '')).toBe(true);
    expect(seVe('casi', '')).toBe(true);
  });

  it('una instrucción sin texto no es nada', () => {
    expect(seVe('neutro', '')).toBe(false);
    expect(seVe('neutro', 'Sigue el dibujo mientras suena')).toBe(true);
  });
});

describe('cuánto se queda', () => {
  it('el elogio lleva reloj y mide el texto de verdad', () => {
    expect(duracionMs('bien', '')).toBe(BASE_MS);
    expect(duracionMs('bien', '¡Muy bien!')).toBe(BASE_MS + 10 * POR_CARACTER_MS);
  });

  it('el elogio ya no se queda clavado en el 60 de reserva', () => {
    /*
      Es el fallo concreto: con `children` en array, `typeof children === 'string'` daba
      falso y la duración era siempre 3500 + 60 × 45 = 6200 ms. Ahora sale del texto.
    */
    const antes = BASE_MS + 60 * POR_CARACTER_MS;
    expect(duracionMs('bien', textoDe([false, '¡Muy bien!']))).not.toBe(antes);
  });

  it('la corrección no lleva reloj, por larga que sea', () => {
    const mediana =
      'Sopla flojo y seguido. Si soplas fuerte la nota sube, y eso no se arregla con los dedos.';
    expect(mediana.length).toBe(88); // la mediana real del catálogo, para que no se olvide
    expect(duracionMs('casi', mediana)).toBeNull();
    expect(duracionMs('casi', 'Casi')).toBeNull();
  });

  it('la instrucción tampoco', () => {
    expect(duracionMs('neutro', 'Sigue el dibujo mientras suena')).toBeNull();
  });
});

describe('cuánto se espera tras una respuesta', () => {
  it('tras un acierto, enseguida: no hay nada que leer', () => {
    expect(esperaTrasRespuesta(true, 'una pista larguísima que no se va a leer')).toBe(TRAS_ACIERTO_MS);
  });

  it('tras un fallo, lo que tarda en leerse la pista', () => {
    const pista = 'Cada compás tiene que sumar exactamente tres pulsos.';
    expect(esperaTrasRespuesta(false, pista)).toBe(BASE_MS + pista.length * POR_CARACTER_MS);
    expect(esperaTrasRespuesta(false, pista)).toBeGreaterThan(esperaTrasRespuesta(false, 'Casi.'));
  });
});

describe('cerrar la tarjeta con un toque', () => {
  it('en los dos primeros segundos, no: ese toque es el de la actividad', () => {
    expect(sePuedeCerrar(0)).toBe(false);
    expect(sePuedeCerrar(CIERRE_DESDE_MS - 1)).toBe(false);
  });

  it('a partir de los dos segundos, sí', () => {
    expect(sePuedeCerrar(CIERRE_DESDE_MS)).toBe(true);
    expect(sePuedeCerrar(10000)).toBe(true);
  });
});

describe('el refractario tras un fallo que no bloquea', () => {
  it('es lo justo para un doble toque: menos que el «¡bien!» y muy por debajo de leer nada', () => {
    expect(REFRACTARIO_MS).toBeGreaterThan(0);
    expect(REFRACTARIO_MS).toBeLessThan(TRAS_ACIERTO_MS);
    expect(REFRACTARIO_MS).toBeLessThan(esperaTrasRespuesta(false, 'Casi.'));
  });
});
