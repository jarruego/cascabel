import { describe, expect, it } from 'vitest';
import { MARIMBA, aMidi, elegirMuestra } from '../src/audio/sampler';

/**
 * Si el `playbackRate` está mal, TODO el proyecto desafina y no lo nota nadie hasta que un
 * niño canta encima y el detector de tono le dice que está equivocado. Es el tipo de fallo
 * que hay que atrapar con un test y no con el oído.
 */
describe('sampler', () => {
  it('convierte nombres de nota a MIDI', () => {
    expect(aMidi('C4')).toBe(60); // do central
    expect(aMidi('A4')).toBe(69); // la de 440 Hz
    expect(aMidi('C#4')).toBe(61);
    expect(aMidi('C-1')).toBe(0);
  });

  it('rechaza una nota mal escrita en vez de sonar cualquier cosa', () => {
    expect(() => aMidi('H4')).toThrow();
    expect(() => aMidi('do4')).toThrow();
  });

  const notas = MARIMBA.map((m) => aMidi(m.nota));

  it('usa la muestra exacta cuando existe, sin estirar nada', () => {
    for (const m of MARIMBA) {
      const r = elegirMuestra(notas, aMidi(m.nota));
      expect(r.semitonos).toBe(0);
      expect(r.velocidad).toBe(1);
    }
  });

  it('elige siempre la muestra más cercana', () => {
    // D4 (62) está entre C4 (60) y G4 (67): gana C4, a dos semitonos.
    expect(elegirMuestra(notas, aMidi('D4')).origen).toBe(aMidi('C4'));
    // E5 (76) está entre B4 (71) y F5 (77): gana F5, a un semitono.
    expect(elegirMuestra(notas, aMidi('E5')).origen).toBe(aMidi('F5'));
  });

  it('nunca estira más de tres semitonos dentro de la tesitura infantil', () => {
    // De C4 a E5 es donde canta un niño. Estirar más de tres semitonos empieza a
    // delatarse incluso en un timbre percusivo, y ahí es donde vive el repertorio.
    for (let midi = aMidi('C4'); midi <= aMidi('E5'); midi++) {
      const { semitonos } = elegirMuestra(notas, midi);
      expect(Math.abs(semitonos), `nota MIDI ${midi}`).toBeLessThanOrEqual(3);
    }
  });

  it('la velocidad de reproducción es la razón correcta', () => {
    // Una octava arriba es exactamente el doble de rápido. Si esto falla, todo desafina.
    expect(elegirMuestra([60], 72).velocidad).toBeCloseTo(2, 10);
    expect(elegirMuestra([60], 48).velocidad).toBeCloseTo(0.5, 10);
    // Un semitono es la raíz doceava de dos.
    expect(elegirMuestra([60], 61).velocidad).toBeCloseTo(1.0594630943592953, 10);
  });

  it('cubre de F3 a C6 con seis muestras', () => {
    expect(MARIMBA).toHaveLength(6);
    expect(Math.min(...notas)).toBe(aMidi('F3'));
    expect(Math.max(...notas)).toBe(aMidi('C6'));
  });
});
