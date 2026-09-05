import { describe, expect, it } from 'vitest';
import { evaluarRitmo, calidadDe } from '@/motor/evaluacion';

/**
 * Estos tests protegen la decisión pedagógica más importante del proyecto: que un
 * niño regular pero desfasado NO es un niño que falla.
 */
describe('evaluación rítmica', () => {
  const rejilla = [0, 500, 1000, 1500];

  it('reconoce un pulso perfecto', () => {
    const r = evaluarRitmo(rejilla, [10, 505, 995, 1502], 'primaria-c1');
    expect(r.aciertos).toBe(4);
    expect(Math.abs(r.desvioMedioMs)).toBeLessThan(20);
  });

  it('detecta al niño regular pero desfasado y no lo penaliza', () => {
    // Todas las palmadas 120 ms tarde, pero con una desviación de solo 5 ms.
    const r = evaluarRitmo(rejilla, [120, 622, 1118, 1625], 'primaria-c1');
    expect(r.regularPeroDesfasado).toBe(true);
    expect(r.desviacionTipicaMs).toBeLessThan(20);
    expect(r.desvioMedioMs).toBeGreaterThan(100);
  });

  it('no marca como desfasado a quien va irregular', () => {
    const r = evaluarRitmo(rejilla, [10, 700, 950, 1700], 'primaria-c1');
    expect(r.regularPeroDesfasado).toBe(false);
  });

  it('cuenta como fallada la palmada que no llega', () => {
    const r = evaluarRitmo(rejilla, [0, 500, 1000], 'primaria-c1');
    expect(r.emparejados[3]!.realMs).toBeNull();
    expect(r.emparejados[3]!.calidad).toBe('fuera');
  });

  it('usa tolerancias más generosas en Infantil que en tercer ciclo', () => {
    expect(calidadDe(130, 'infantil')).toBe('perfecto');
    expect(calidadDe(130, 'primaria-c3')).toBe('casi');
  });
});
