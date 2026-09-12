import { describe, expect, it } from 'vitest';
import { manchaAlAzar } from '../src/ui/FiguraTarjeta';

/**
 * La mancha de las tarjetas se genera al azar, y lo que no puede pasar es que deje la
 * figura fuera: el radio va del 40 al 48 % del lienzo. Se comprueba con los dos extremos
 * del azar y con un azar cualquiera.
 */
function radios(d: string): number[] {
  // Los puntos por los que pasa la curva son los dos últimos números de cada tramo C.
  return [...d.matchAll(/C[^C]*?([\d.]+) ([\d.]+)(?=C|Z)/g)].map(
    (m) => Math.hypot(Number(m[1]) - 50, Number(m[2]) - 50),
  );
}

describe('manchaAlAzar', () => {
  it('es un camino cerrado con siete tramos curvos', () => {
    const d = manchaAlAzar();
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect((d.match(/C/g) ?? []).length).toBe(7);
  });

  it('con el azar al mínimo es casi un círculo del 40 %', () => {
    for (const r of radios(manchaAlAzar(() => 0))) expect(r).toBeCloseTo(40, 0);
  });

  it('nunca sale del lienzo ni se queda pequeña', () => {
    for (const azar of [() => 0.999, Math.random, () => 0.5]) {
      for (const r of radios(manchaAlAzar(azar))) {
        // Con una décima de margen: los puntos se escriben redondeados a un decimal.
        expect(r).toBeGreaterThanOrEqual(39.9);
        expect(r).toBeLessThanOrEqual(48.1);
      }
    }
  });

  it('dos llamadas dan dos formas', () => {
    expect(manchaAlAzar()).not.toBe(manchaAlAzar());
  });
});
