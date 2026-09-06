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
    // 130 ms: en Infantil aún es un acierto pleno; en 5.º-6.º ya no lo es.
    expect(calidadDe(130, 'infantil')).toBe('perfecto');
    expect(calidadDe(130, 'primaria-c3')).toBe('bien');
    // 200 ms: separa claramente las dos etapas.
    expect(calidadDe(200, 'infantil')).toBe('bien');
    expect(calidadDe(200, 'primaria-c3')).toBe('casi');
  });
});

/**
 * La tolerancia se indexa por CARRIL (edad) y no por etapa (ciclo LOMLOE), porque lo que
 * mide es control motor. Decisión del 2026-09-06, documentada en src/config.ts.
 */
describe('tolerancia por carril', () => {
  it('un mismo desfase es «bien» para un niño de 3.º y «casi» para uno de 4.º', () => {
    // 90 ms de error: dentro de la ventana de «perfecto» de lectores (100), fuera de la
    // de autónomos (70). La misma actividad, dos niños de edades distintas.
    expect(calidadDe(90, 'lectores')).toBe('perfecto');
    expect(calidadDe(90, 'autonomos')).toBe('bien');
  });

  it('sin saber quién está delante, usa la ventana más ANCHA de esa etapa', () => {
    // primaria-c2 la abren lectores (100 ms) y autónomos (70). Ante la duda, la ancha:
    // que un niño con buen pulso se sienta torpe cuesta más que lo contrario.
    expect(calidadDe(90, 'primaria-c2')).toBe('perfecto');
    expect(calidadDe(90, 'primaria-c3')).toBe('bien');
  });

  it('Infantil es la más generosa de todas', () => {
    expect(calidadDe(140, 'infantil')).toBe('perfecto');
    expect(calidadDe(140, 'lectores')).toBe('bien');
  });
});
