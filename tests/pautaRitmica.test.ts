import { describe, expect, it } from 'vitest';
import { ALTO, HUECO, LINEA_1, LINEA_3, LINEA_5, anchoDe, disponerPauta, glifoDe, GLIFO } from '@/motor/pautaRitmica';

describe('la pauta de «pon las barras»', () => {
  const pauta = disponerPauta([1, 1, 2, 1, 1, 2], 2, 4);

  it('tiene un hueco menos que figuras: el último lo cierra la doble barra', () => {
    expect(pauta.figuras).toHaveLength(6);
    expect(pauta.huecos).toHaveLength(5);
  });

  it('todo va de izquierda a derecha sin montarse', () => {
    let x = pauta.cifra.x;
    pauta.figuras.forEach((f, i) => {
      expect(f.x).toBeGreaterThanOrEqual(x);
      x = f.x;
      const h = pauta.huecos[i];
      if (h) {
        expect(h.x0).toBeGreaterThan(f.x);
        expect(h.x1 - h.x0).toBe(HUECO);
        expect(h.xBarra).toBeGreaterThan(h.x0);
        expect(h.xBarra).toBeLessThan(h.x1);
        x = h.x1;
      }
    });
    expect(pauta.final.xFina).toBeGreaterThan(x);
    expect(pauta.final.xGruesa).toBeGreaterThan(pauta.final.xFina);
    expect(pauta.ancho).toBeGreaterThan(pauta.final.xGruesa);
  });

  it('la pauta ocupa las cuatro líneas centrales de las ocho unidades de alto', () => {
    expect(ALTO).toBe(8);
    expect(LINEA_5 - LINEA_1).toBe(4);
    expect(LINEA_3).toBe((LINEA_1 + LINEA_5) / 2);
  });

  it('una blanca respira más que una negra, y una redonda más que una blanca', () => {
    expect(anchoDe(2)).toBeGreaterThan(anchoDe(1));
    expect(anchoDe(4)).toBeGreaterThan(anchoDe(2));
  });

  it('las figuras llevan la plica hacia abajo: van en la tercera línea', () => {
    expect(glifoDe(1)).toBe(GLIFO.negraAbajo);
    expect(glifoDe(2)).toBe(GLIFO.blancaAbajo);
    expect(glifoDe(4)).toBe(GLIFO.redonda);
    expect(glifoDe(1.5)).toBe(GLIFO.negraAbajo + GLIFO.puntillo);
    // Tres pulsos es una blanca con puntillo, no una blanca: en 3/4 es el compás entero.
    expect(glifoDe(3)).toBe(GLIFO.blancaAbajo + GLIFO.puntillo);
  });

  it('la cifra de compás se escribe con los dígitos de Bravura', () => {
    expect(pauta.cifra.arriba).toBe(GLIFO.cifra[2]);
    expect(pauta.cifra.abajo).toBe(GLIFO.cifra[4]);
    expect(disponerPauta([1], 12, 8).cifra.arriba).toBe(GLIFO.cifra[1]! + GLIFO.cifra[2]!);
  });
});
