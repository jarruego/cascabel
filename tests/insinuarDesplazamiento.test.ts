import { describe, expect, it } from 'vitest';
import { curvaDeInsinuacion, distanciaDeInsinuacion } from '@/ui/insinuarDesplazamiento';

describe('insinuar que hay más a la derecha', () => {
  it('la curva sale de cero, llega al máximo a la mitad y vuelve a cero', () => {
    expect(curvaDeInsinuacion(0)).toBeCloseTo(0);
    expect(curvaDeInsinuacion(0.5)).toBeCloseTo(1);
    expect(curvaDeInsinuacion(1)).toBeCloseTo(0);
  });

  it('acelera y frena: los extremos se mueven menos que el centro', () => {
    const inicio = curvaDeInsinuacion(0.1) - curvaDeInsinuacion(0);
    const medio = curvaDeInsinuacion(0.3) - curvaDeInsinuacion(0.2);
    expect(medio).toBeGreaterThan(inicio);
    // Y es simétrica: la vuelta es la ida al revés.
    expect(curvaDeInsinuacion(0.3)).toBeCloseTo(curvaDeInsinuacion(0.7));
  });

  it('fuera de [0, 1] se queda en los extremos', () => {
    expect(curvaDeInsinuacion(-1)).toBeCloseTo(0);
    expect(curvaDeInsinuacion(2)).toBeCloseTo(0);
  });

  it('no se mueve si apenas sobra nada, y nunca más de lo que sobra', () => {
    expect(distanciaDeInsinuacion(0, 360)).toBe(0);
    expect(distanciaDeInsinuacion(8, 360)).toBe(0);
    expect(distanciaDeInsinuacion(40, 360)).toBe(40);
  });

  it('un tercio de la caja, y nunca menos de 72 px para que se note', () => {
    expect(distanciaDeInsinuacion(2000, 360)).toBe(108);
    expect(distanciaDeInsinuacion(2000, 200)).toBe(72);
  });
});
