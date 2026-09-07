import { describe, expect, it } from 'vitest';
import { instantesDe, transponer, type Patron } from '@/audio/acompanamiento';

/**
 * El acompañamiento en bucle.
 *
 * Lo que se prueba aquí es lo que se equivoca **en silencio**: un bordón que entra medio
 * pulso tarde no lanza ningún error, solo suena mal, y quien lo escuche pensará que la
 * actividad es así. El reproductor en sí necesita un `AudioContext` y no se prueba; lo que
 * se saca aparte para poder probarlo es el cálculo de instantes y el transporte.
 */

const BASE: Patron = {
  tempo: 60,
  pulsosPorVuelta: 4,
  bordon: 'C3',
  percusion: [
    { golpe: 'bombo', pulso: 0 },
    { golpe: 'caja', pulso: 2 },
  ],
};

describe('transponer', () => {
  it('sube semitonos dentro de la octava', () => {
    expect(transponer('C4', 1)).toBe('C#4');
    expect(transponer('C4', 2)).toBe('D4');
  });

  it('cruza la octava en los dos sentidos', () => {
    expect(transponer('B3', 1)).toBe('C4');
    expect(transponer('C4', -1)).toBe('B3');
  });

  it('una quinta justa son siete semitonos', () => {
    // Es la única distancia que necesita un bordón, así que conviene que esté clavada.
    expect(transponer('C3', 7)).toBe('G3');
    expect(transponer('F3', 7)).toBe('C4');
    expect(transponer('G3', 7)).toBe('D4');
  });

  it('una octava son doce y devuelve la misma nota una arriba', () => {
    expect(transponer('D4', 12)).toBe('D5');
    expect(transponer('D4', -12)).toBe('D3');
  });

  it('deja en paz lo que no reconoce, en vez de inventarse una nota', () => {
    // Devolver algo plausible sería peor: sonaría, y nadie miraría por qué desafina.
    expect(transponer('bombo', 3)).toBe('bombo');
    expect(transponer('', 3)).toBe('');
  });
});

describe('instantes de una vuelta', () => {
  it('coloca la percusión en el pulso que dice el patrón', () => {
    // A 60 ppm un pulso dura exactamente un segundo, así que los números se leen solos.
    expect(instantesDe(BASE).percusion).toEqual([0, 2]);
  });

  it('el tempo escala los instantes, no los reordena', () => {
    const rapido = instantesDe({ ...BASE, tempo: 120 }).percusion;
    expect(rapido).toEqual([0, 1]);
  });

  it('el bordón entra una vez por vuelta, en el primer pulso', () => {
    // Uno por vuelta y no uno por pulso: repetirlo cada pulso lo convierte en un ostinato,
    // que es otra cosa y tapa lo que toca el niño.
    expect(instantesDe(BASE).bordon).toEqual([0]);
  });

  it('sin bordón declarado no suena ninguno', () => {
    const sin = { ...BASE };
    delete sin.bordon;
    expect(instantesDe(sin).bordon).toEqual([]);
  });

  it('sin percusión declarada no se inventa un pulso', () => {
    const sin = { ...BASE };
    delete sin.percusion;
    expect(instantesDe(sin).percusion).toEqual([]);
  });
});
