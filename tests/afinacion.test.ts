import { describe, expect, it } from 'vitest';
import { desviacionEnCents, evaluarAfinacion, mensajeAfinacion } from '../src/motor/afinacion';

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
    const e = evaluarAfinacion(repetir(-70));
    expect(e.establePeroTransportado).toBe(true);
    expect(e.desviacionCents).toBeLessThan(5);
    expect(mensajeAfinacion(e)).toBe('cantar.establePeroBajo');
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
