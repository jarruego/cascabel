import { describe, expect, it } from 'vitest';
import { anclar, compararEco, mensajeEco } from '@/motor/eco';

/**
 * El eco a dos.
 *
 * Lo que hay que probar aquí es que la comparación **no premia empezar a la vez** —nadie
 * empieza a la vez, y no tiene por qué— y que reconoce el caso que más importa
 * pedagógicamente: el mismo patrón a otra velocidad. Un niño que repite la forma acelerada
 * la ha entendido, y llamarlo fallo sería mentirle.
 *
 * Se usa el carril de los mayores (`autonomos`, ±70 ms para «perfecto») porque es el más
 * exigente: lo que pasa ahí pasa en los tres.
 */

/** Cuatro negras a 100 ppm: 600 ms entre golpe y golpe. */
const NEGRAS = [0, 600, 1200, 1800];

describe('anclar', () => {
  it('lleva el primer golpe a cero', () => {
    expect(anclar([5000, 5600, 6200])).toEqual([0, 600, 1200]);
  });

  it('una serie vacía se queda vacía, no revienta', () => {
    expect(anclar([])).toEqual([]);
  });
});

describe('comparar un eco', () => {
  it('empezar tres segundos después no es un error', () => {
    // Es la razón de ser del anclaje: el segundo niño empieza cuando le toca, no a la vez.
    const segundo = NEGRAS.map((m) => m + 3000);
    const r = compararEco(NEGRAS, segundo, 'autonomos');
    expect(r.seParecen).toBe(true);
    expect(r.mismoRitmoOtraVelocidad).toBe(false);
  });

  it('una repetición con imprecisión normal sigue pareciéndose', () => {
    const segundo = [0, 630, 1180, 1840];
    expect(compararEco(NEGRAS, segundo, 'autonomos').seParecen).toBe(true);
  });

  it('reconoce el mismo ritmo hecho más rápido', () => {
    // El patrón entero al 75 %: la forma es la misma y eso es lo que se ha aprendido.
    const segundo = NEGRAS.map((m) => m * 0.75);
    const r = compararEco(NEGRAS, segundo, 'autonomos');
    expect(r.mismoRitmoOtraVelocidad).toBe(true);
    expect(r.seParecen).toBe(true);
    expect(mensajeEco(r, 'autonomos')).toBe('eco.igualMasRapido');
  });

  it('reconoce el mismo ritmo hecho más lento', () => {
    const segundo = NEGRAS.map((m) => m * 1.3);
    const r = compararEco(NEGRAS, segundo, 'autonomos');
    expect(r.mismoRitmoOtraVelocidad).toBe(true);
    expect(mensajeEco(r, 'autonomos')).toBe('eco.igualMasLento');
  });

  it('un cambio de velocidad minúsculo no se llama cambio de velocidad', () => {
    // Un 2 % cabe dentro de la imprecisión de cualquiera. Llamarlo «otro tempo» sería
    // inventarse una explicación para algo que no la tiene.
    const segundo = NEGRAS.map((m) => m * 1.02);
    const r = compararEco(NEGRAS, segundo, 'autonomos');
    expect(r.mismoRitmoOtraVelocidad).toBe(false);
    expect(r.seParecen).toBe(true);
  });

  it('otro reparto de los mismos golpes NO se parece', () => {
    // Cuatro golpes también, pero dos rápidos y dos lentos: es otro ritmo.
    const segundo = [0, 200, 1200, 1800];
    const r = compararEco(NEGRAS, segundo, 'autonomos');
    expect(r.seParecen).toBe(false);
    expect(mensajeEco(r, 'autonomos')).toBe('eco.otroReparto');
  });

  it('cuenta los golpes de cada uno y lo dice cuando faltan', () => {
    const r = compararEco(NEGRAS, [0, 600, 1200], 'autonomos');
    expect(r.golpesPrimero).toBe(4);
    expect(r.golpesSegundo).toBe(3);
    expect(mensajeEco(r, 'autonomos')).toBe('eco.faltanGolpes');
  });

  it('y cuando sobran', () => {
    const r = compararEco(NEGRAS, [0, 600, 1200, 1800, 2400], 'autonomos');
    expect(mensajeEco(r, 'autonomos')).toBe('eco.sobranGolpes');
  });

  it('no hacer nada no es parecerse', () => {
    // El mismo fallo que apareció en las actividades de palmear: una lista vacía da
    // desviación cero, que leído del revés parece un pulso perfecto.
    const r = compararEco(NEGRAS, [], 'autonomos');
    expect(r.seParecen).toBe(false);
    expect(mensajeEco(r, 'autonomos')).toBe('eco.nadaSegundo');
  });

  it('un solo golpe no es un ritmo', () => {
    const r = compararEco([0], [0], 'autonomos');
    expect(r.seParecen).toBe(false);
    expect(r.velocidad).toBeNull();
  });

  it('la velocidad se estima aunque falte un golpe en medio', () => {
    // Con el hueco medio, saltarse un golpe dispara la estimación; con la duración total
    // apenas se nota, y por eso se usa ésa.
    const r = compararEco(NEGRAS, [0, 600, 1800], 'autonomos');
    expect(r.velocidad).toBeCloseTo(1, 2);
  });
});
