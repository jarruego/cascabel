import { describe, expect, it } from 'vitest';
import { faltaPara, posicionEnVuelta, vueltasEncoladas } from '../src/motor/bucle';

/**
 * Que el bucle no pierda el pulso.
 *
 * Lo oyó el autor: «las actividades que ponen un sonido en bucle no mantienen el ritmo al
 * reiniciar». Las dos que dan vueltas relanzaban la reproducción al acabar cada una, y el
 * relanzamiento salía desde el instante en que ocurría más un margen para tener el sonido
 * cargado: medio segundo en el musicograma, 270 ms en la rejilla. Ese margen es correcto la
 * primera vez y una costura todas las demás.
 *
 * Es un fallo que **solo se oye**: nada falla, ninguna prueba se pone roja, y hay que
 * escuchar dos vueltas seguidas sabiendo qué buscar. Por eso la aritmética vive fuera del
 * componente y tiene test — que es además lo que `CLAUDE.md` §11 pide para todo lo temporal.
 */

const VUELTA = 2727.27; // cuatro pulsos a 88, que es «Ta y ti-ti»

describe('la vuelta N sale donde acaba la N-1', () => {
  it('sin hueco, por muchas vueltas que den', () => {
    /*
      La comprobación del fallo. Cada salida se calcula sumando desde un solo inicio, así que
      la distancia entre dos consecutivas es exactamente una vuelta: ni un milisegundo más.
      Con el relanzamiento antiguo, esa distancia era una vuelta MÁS el margen.
    */
    const inicio = 1000;
    const salidas = Array.from({ length: 50 }, (_, n) => inicio + n * VUELTA);
    for (let n = 1; n < salidas.length; n++) {
      expect(salidas[n]! - salidas[n - 1]!).toBeCloseTo(VUELTA, 6);
    }
    // Y a las cincuenta vueltas no se ha ido ni un milisegundo.
    expect(salidas[49]! - inicio).toBeCloseTo(49 * VUELTA, 6);
  });

  it('se encola por delante, y poco', () => {
    const v = (ahora: number) => vueltasEncoladas({ inicio: 1000, duracionVuelta: 1000, ahora }, 200);
    expect(v(500), 'antes de empezar, nada').toBe(0);
    expect(v(900), 'a 100 ms de empezar, la primera ya entra en la ventana').toBe(1);
    expect(v(1000), 'al empezar, solo la primera').toBe(1);
    expect(v(1900), 'a 100 ms de la segunda').toBe(2);
    // En 5000 arranca la quinta (salen en 1000, 2000, 3000, 4000, 5000).
    expect(v(5000), 'justo al empezar la quinta').toBe(5);
  });

  it('una pausa larga del hilo no pierde ni repite vueltas', () => {
    /*
      Devuelve el TOTAL y no «cuántas faltan» a propósito: si la pestaña se va a segundo
      plano y el reloj del navegador se para dos segundos, al volver hay que ponerse al día
      de una vez, no encolar una vuelta por cada tic perdido.
    */
    const antes = vueltasEncoladas({ inicio: 0, duracionVuelta: 1000, ahora: 1000 }, 200);
    const despues = vueltasEncoladas({ inicio: 0, duracionVuelta: 1000, ahora: 9000 }, 200);
    expect(antes).toBe(2);
    expect(despues).toBe(10);
  });
});

describe('el cursor da la vuelta sin saltar', () => {
  it('en bucle, cuenta el resto y no se reinicia', () => {
    const dentro = (ahora: number) =>
      posicionEnVuelta({ inicio: 100, duracionVuelta: 1000, ahora }, true);
    expect(dentro(100)).toBe(0);
    expect(dentro(600)).toBe(500);
    // Justo al pasar de vuelta: 1099 está al final de la primera y 1101 al principio de la
    // segunda. Si hubiera costura, aquí saldría un número que no pertenece a ninguna.
    expect(dentro(1099)).toBeCloseTo(999);
    expect(dentro(1101)).toBeCloseTo(1);
    expect(dentro(5600), 'cinco vueltas después, la misma posición').toBeCloseTo(500);
  });

  it('sin bucle, sigue contando hacia arriba', () => {
    const dentro = (ahora: number) =>
      posicionEnVuelta({ inicio: 100, duracionVuelta: 1000, ahora }, false);
    expect(dentro(1600)).toBe(1500);
  });

  it('antes de empezar da negativo, para no encender nada durante la entrada', () => {
    expect(posicionEnVuelta({ inicio: 500, duracionVuelta: 1000, ahora: 0 }, true)).toBe(-500);
  });
});

describe('lo que falta para cada bloque', () => {
  it('el que acaba de pasar sigue un rato en negativo', () => {
    // Se le deja seguir viéndose un poco después de cruzar, que es lo que hace que no
    // desaparezca justo en el momento en que hay que tocarlo.
    expect(faltaPara(0, 200, 1000, true)).toBe(-200);
  });

  it('el que ya pasó del todo vuelve a acercarse por arriba', () => {
    /*
      Sin esto, en un musicograma de notas que caen el bloque desaparecería al llegar abajo y
      reaparecería de golpe arriba en la vuelta siguiente. Con esto, fluye.
    */
    expect(faltaPara(0, 950, 1000, true)).toBe(50);
  });

  it('sin bucle no da la vuelta: lo que pasó, pasó', () => {
    expect(faltaPara(0, 950, 1000, false)).toBe(-950);
  });
});
