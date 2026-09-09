import { describe, expect, it } from 'vitest';
import {
  VENTANAS_POR_CARRIL,
  desviacionEnCents,
  evaluarAfinacion,
  llevaPista,
  mensajeAfinacion,
  tonoDe,
  ultimoTramo,
} from '../src/motor/afinacion';

/**
 * La misma idea que protege `tests/evaluacion.test.ts` para el ritmo, aplicada a la voz:
 * **promedio y estabilidad son dos cosas distintas**. Un niño que canta bajo pero quieto
 * tiene buen oído y solo transporta; uno que oscila acierta la media y no sostiene. Decirle
 * lo mismo a los dos es mentirles a los dos.
 */
describe('evaluación de afinación', () => {
  const repetir = (valor: number, n = 20) => Array.from({ length: n }, () => valor);

  it('reconoce una nota bien afinada', () => {
    const e = evaluarAfinacion([...repetir(5), ...repetir(-8), ...repetir(3)]);
    expect(e.calidad).toBe('afinado');
    expect(mensajeAfinacion(e)).toBe('cantar.afinado');
  });

  it('detecta al que canta ESTABLE pero transportado, y no lo trata como un fallo', () => {
    // 70 cents bajo, pero clavado: sabe sostener la nota, solo está en otra altura.
    // Se evalúa como 5.º-6.º, donde la ventana es de 50 cents y eso ya se puede corregir.
    const e = evaluarAfinacion(repetir(-70), 'autonomos');
    expect(e.establePeroTransportado).toBe(true);
    expect(e.desviacionCents).toBeLessThan(5);
    expect(mensajeAfinacion(e)).toBe('cantar.establePeroBajo');
  });

  it('la MISMA desviación es afinada en Infantil y transportada en 5.º y 6.º', () => {
    // Es la razón de que la ventana vaya por carril. Setenta cents bajo y clavado, en un
    // niño de cuatro años, es haber encontrado la nota: su voz no da más precisión, y
    // decirle que ha fallado mide su control muscular, no su oído.
    const lecturas = repetir(-70);
    expect(evaluarAfinacion(lecturas, 'infantil').calidad).toBe('afinado');
    expect(evaluarAfinacion(lecturas, 'autonomos').calidad).not.toBe('afinado');
  });

  it('ninguna ventana llega al semitono', () => {
    // A 100 cents estás en otra nota. Darla por buena enseñaría algo falso, así que ni el
    // carril más generoso puede llegar ahí.
    for (const c of ['infantil', 'lectores', 'autonomos'] as const) {
      expect(VENTANAS_POR_CARRIL[c].afinado).toBeLessThan(100);
    }
  });

  it('distingue eso de quien no sostiene la nota', () => {
    // La media sale casi perfecta, pero oscila 80 cents arriba y abajo.
    const oscila = Array.from({ length: 20 }, (_, i) => (i % 2 ? 80 : -80));
    const e = evaluarAfinacion(oscila);
    expect(Math.abs(e.centsMedios)).toBeLessThan(20);
    expect(e.desviacionCents).toBeGreaterThan(45);
    expect(mensajeAfinacion(e)).toBe('cantar.sostenLaNota');
  });

  it('el mensaje dice hacia dónde moverse, no qué se ha hecho mal', () => {
    // Regla 7: el mensaje repara, no juzga. «Un poco más alto» es accionable;
    // «has desafinado» no lo es.
    expect(mensajeAfinacion(evaluarAfinacion(repetir(-90)))).toMatch(/Bajo|Alto|masAlto/i);
    const claves = [
      mensajeAfinacion(evaluarAfinacion(repetir(-90))),
      mensajeAfinacion(evaluarAfinacion(repetir(90))),
    ];
    for (const c of claves) expect(c).not.toMatch(/mal|fallo|error/i);
  });

  it('una lectura disparatada no arrastra el resultado', () => {
    // Un error de octava son 1200 cents. Con media aritmética se llevaría todo por
    // delante; con mediana, no. Por eso se usa mediana.
    const e = evaluarAfinacion([...repetir(5, 19), 1200]);
    expect(Math.abs(e.centsMedios)).toBeLessThan(20);
    expect(e.calidad).not.toBe('lejos');
  });

  it('si no hubo señal suficiente lo dice, en vez de inventarse una nota', () => {
    const e = evaluarAfinacion([null, null, null, 10, null, null, null, null, null, null]);
    expect(e.calidad).toBe('sin-senal');
    expect(mensajeAfinacion(e)).toBe('cantar.noTeOigo');
    expect(e.cobertura).toBeLessThan(0.35);
  });

  it('aguanta que no haya ninguna lectura', () => {
    const e = evaluarAfinacion([]);
    expect(e.calidad).toBe('sin-senal');
    expect(e.centsMedios).toBe(0);
  });

  it('la ventana de afinado es la de un niño, no la de un adulto entrenado', () => {
    // Un adulto entrenado afina a ±10 cents. Exigirle eso a un niño de siete años sería
    // decirle que desafina siempre.
    expect(evaluarAfinacion(repetir(40)).calidad).toBe('afinado');
    expect(evaluarAfinacion(repetir(10)).calidad).toBe('afinado');
  });

  it('informa de la cobertura: cuánto tiempo cantó de verdad', () => {
    const e = evaluarAfinacion([...repetir(0, 6), null, null, null, null]);
    expect(e.cobertura).toBeCloseTo(0.6, 2);
  });
});

describe('con veinte segundos, lo que cuenta es dónde acabó', () => {
  it('se evalúa el último tramo, no la búsqueda entera', () => {
    // Diez segundos de silencio y tanteo lejos, y al final la nota clavada.
    const busqueda = [...Array<null>(300).fill(null), ...Array<number>(200).fill(-120)];
    const final = Array<number>(150).fill(2);
    const todo = [...busqueda, ...final];
    expect(evaluarAfinacion(todo, 'lectores').calidad).not.toBe('afinado');
    expect(evaluarAfinacion(ultimoTramo(todo), 'lectores').calidad).toBe('afinado');
  });

  it('con pocas lecturas se devuelven todas', () => {
    expect(ultimoTramo([1, 2, 3])).toEqual([1, 2, 3]);
    expect(ultimoTramo([1, 2, 3], 2)).toEqual([2, 3]);
  });
});

describe('plegado por octavas', () => {
  // Sin esto, un adulto que canta la nota correcta una octava por debajo daba -1200
  // cents y la aguja se iba al tope izquierdo. El autor lo detectó probándolo: «a nada
  // que hablo o canto se dispara hacia la izquierda».
  const G4 = 67;

  it('la misma nota en otra octava es la misma nota', () => {
    expect(desviacionEnCents(G4, G4)).toBe(0);
    expect(desviacionEnCents(G4 - 12, G4)).toBe(0); // una octava abajo
    expect(desviacionEnCents(G4 + 12, G4)).toBe(0); // una octava arriba
    expect(desviacionEnCents(G4 - 24, G4)).toBe(0); // dos octavas abajo
  });

  it('conserva la desviación pequeña dentro de la octava', () => {
    expect(desviacionEnCents(G4 + 0.4, G4)).toBeCloseTo(40, 5);
    expect(desviacionEnCents(G4 - 0.4, G4)).toBeCloseTo(-40, 5);
  });

  it('la desviación pequeña se conserva también a una octava de distancia', () => {
    // Un adulto que canta G3 un pelín bajo: sigue siendo «un pelín bajo», no -1240.
    expect(desviacionEnCents(G4 - 12.4, G4)).toBeCloseTo(-40, 5);
  });

  it('siempre elige la octava más cercana', () => {
    // Siete semitonos arriba está más cerca por abajo: son cinco por el otro lado.
    expect(desviacionEnCents(G4 + 7, G4)).toBe(-500);
    expect(desviacionEnCents(G4 + 5, G4)).toBe(500);
    // El resultado nunca se sale de media octava.
    for (let d = -30; d <= 30; d += 0.5) {
      expect(Math.abs(desviacionEnCents(G4 + d, G4))).toBeLessThanOrEqual(600);
    }
  });

  it('una voz hablada grave ya no satura la aguja', () => {
    // 120 Hz frente a un G4: antes daban -2049 cents. Ahora cae donde le toca dentro
    // de la octava, y el filtro de estabilidad se encarga del resto.
    const midi120 = 69 + 12 * Math.log2(120 / 440);
    expect(Math.abs(desviacionEnCents(midi120, G4))).toBeLessThanOrEqual(600);
  });
});

describe('el texto y el color de la tarjeta dicen lo mismo', () => {
  /*
    El fallo que esto impide ya ocurrió. El texto lo elegía `mensajeAfinacion`, que pregunta
    a `calidad` y por tanto a la ventana del carril —90 cents en Infantil, 70 en 1.º y 2.º,
    50 en 3.º—, y el color de la tarjeta comparaba a mano contra 50. Un niño de 1.º que
    cantaba 60 cents bajo leía «¡la has cazado!» en una tarjeta pintada de corrección, con
    un consejo debajo para arreglar lo que acababa de hacer bien.

    Se recorre toda la ventana de cada carril con una voz estable, que es el caso donde las
    dos respuestas tienen que coincidir sí o sí.
  */
  /** Una voz que sostiene la nota, desviada lo que se le diga. */
  const vozEstable = (cents: number) => Array.from({ length: 20 }, () => cents);

  for (const carril of ['infantil', 'lectores', 'autonomos'] as const) {
    it(`nunca se contradicen en ${carril}`, () => {
      for (let cents = -120; cents <= 120; cents += 5) {
        const e = evaluarAfinacion(vozEstable(cents), carril);
        const dijoQueBien = mensajeAfinacion(e) === 'cantar.afinado';
        expect(tonoDe(e) === 'bien', `${cents} cents en ${carril}`).toBe(dijoQueBien);
        // Y detrás de un «la has cazado» no se cuela un consejo para corregirlo.
        expect(llevaPista(e), `${cents} cents en ${carril}`).toBe(!dijoQueBien);
      }
    });
  }

  it('sin evaluación no se felicita, y tampoco se corrige con una pista', () => {
    expect(tonoDe(null)).toBe('casi');
    expect(llevaPista(null)).toBe(false);
  });
});
