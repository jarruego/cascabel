import { describe, expect, it } from 'vitest';
import {
  AJUSTE_MAXIMO_MS,
  ajusteDesdeCalibracion,
  calcularCalibracion,
  mensajeCalibracion,
} from '../src/audio/calibracion';

describe('calibración de latencia', () => {
  const rejilla = [0, 600, 1200, 1800];

  it('detecta un desfase constante, que es justo lo que hay que compensar', () => {
    // Todos los golpes 80 ms tarde y muy regulares: es latencia, no falta de pulso.
    const r = calcularCalibracion([80, 682, 1278, 1881], rejilla);
    expect(r.desvioMs).toBeCloseTo(80, 0);
    expect(r.desviacionTipicaMs).toBeLessThan(5);
    expect(r.fiable).toBe(true);
  });

  it('marca como NO fiable un pulso irregular', () => {
    // Aquí no hay latencia que medir: la persona no estaba marcando el pulso.
    const r = calcularCalibracion([10, 800, 1150, 2100], rejilla);
    expect(r.fiable).toBe(false);
    expect(mensajeCalibracion(r)).toBe('calibracion.irregular');
  });

  it('pide más golpes si hay menos de tres', () => {
    const r = calcularCalibracion([80, 680], rejilla);
    expect(r.fiable).toBe(false);
    expect(mensajeCalibracion(r)).toBe('calibracion.pocosGolpes');
  });

  it('aguanta que no haya ningún golpe', () => {
    const r = calcularCalibracion([], rejilla);
    expect(r).toMatchObject({ golpes: 0, fiable: false, desvioMs: 0 });
  });

  it('el ajuste descuenta lo que el navegador ya compensaba', () => {
    // El usuario va 80 ms tarde y el navegador ya declaraba 52: faltaban 28.
    expect(ajusteDesdeCalibracion(80, 52)).toBe(28);
  });

  it('en Firefox, donde baseLatency es 0, el ajuste sale mayor', () => {
    // Mismo equipo, mismo desfase real: si el navegador declara menos, compensamos más.
    expect(ajusteDesdeCalibracion(80, 34)).toBeGreaterThan(ajusteDesdeCalibracion(80, 52));
  });

  it('acota el ajuste: más de 300 ms es que algo va mal, no que el equipo sea lento', () => {
    expect(ajusteDesdeCalibracion(5000, 0)).toBe(AJUSTE_MAXIMO_MS);
    expect(ajusteDesdeCalibracion(-5000, 0)).toBe(-AJUSTE_MAXIMO_MS);
  });

  it('un desvío negativo significa adelantarse, y también se compensa', () => {
    const r = calcularCalibracion([-40, 562, 1158, 1762], rejilla);
    expect(r.desvioMs).toBeCloseTo(-39.5, 0);
    expect(r.fiable).toBe(true);
  });
});
