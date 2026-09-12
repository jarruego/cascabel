import { describe, expect, it } from 'vitest';
import { GLIFOS, cuadroDe, esGlifo, type NombreGlifo } from '../src/ui/glifos';

/**
 * El signo tiene que quedar centrado en su cuadrado: el centro de la caja medida del glifo
 * coincide con el centro del `viewBox`, y el cuadrado es un poco mayor que el lado mayor
 * de la caja. Es lo que dejaba la clave de sol descolgada cuando se centraba como texto.
 */
describe('cuadroDe', () => {
  it('centra la caja del glifo en el viewBox, para todos', () => {
    for (const nombre of Object.keys(GLIFOS) as NombreGlifo[]) {
      const [x0, y0, x1, y1] = GLIFOS[nombre].caja;
      const { viewBox, lado } = cuadroDe(nombre);
      const [vx, vy, vw, vh] = viewBox.split(' ').map(Number) as [number, number, number, number];
      expect(vw).toBeCloseTo(lado, 3);
      expect(vh).toBeCloseTo(lado, 3);
      expect(vx + vw / 2).toBeCloseTo((x0 + x1) / 2, 2);
      expect(vy + vh / 2).toBeCloseTo(-(y0 + y1) / 2, 2);
      expect(lado).toBeGreaterThan(Math.max(x1 - x0, y1 - y0));
    }
  });

  it('la clave de sol es el caso que fallaba: baja más que sube', () => {
    const [, y0, , y1] = GLIFOS['clave-sol'].caja;
    expect(y0).toBeLessThan(-0.5);
    expect(y1).toBeGreaterThan(1);
  });

  it('reconoce los nombres', () => {
    expect(esGlifo('negra')).toBe(true);
    expect(esGlifo('cuatro')).toBe(true);
    expect(esGlifo('semicorchea')).toBe(false);
  });
});
