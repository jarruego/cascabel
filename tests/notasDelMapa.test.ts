import { describe, expect, it } from 'vitest';
import { notasDelMapa } from '@/motor/notasDelMapa';

describe('cuándo suena cada nota de un mapa', () => {
  it('tantas notas como pulsos: una por pulso, y los nulos callan', () => {
    // Cuatro bloques de dos pulsos (desfases 0, 1000, 2000, 3000) y ocho notas.
    const r = notasDelMapa(['C4', 'D4', null, 'E4', 'F4', null, null, 'G4'], [0, 1000, 2000, 3000], 500);
    expect(r).toEqual([
      { nota: 'C4', ms: 0 },
      { nota: 'D4', ms: 500 },
      { nota: 'E4', ms: 1500 },
      { nota: 'F4', ms: 2000 },
      { nota: 'G4', ms: 3500 },
    ]);
  });

  it('tantas notas como casillas: una por casilla, aunque la casilla dure dos pulsos', () => {
    // La canción con pictogramas: un dibujo, una nota; el segundo dibujo dura dos pulsos.
    const r = notasDelMapa(['G4', 'E4', 'A4'], [0, 500, 1500], 500);
    expect(r).toEqual([{ nota: 'G4', ms: 0 }, { nota: 'E4', ms: 500 }, { nota: 'A4', ms: 1500 }]);
  });

  it('el fallo que hubo: sesenta y cuatro notas con cuatro bloques ya no son cuatro notas', () => {
    const notas = Array.from({ length: 64 }, (_, i) => (i % 2 ? 'E4' : 'C4'));
    const r = notasDelMapa(notas, [0, 16 * 341, 32 * 341, 48 * 341], 341);
    expect(r).toHaveLength(64);
    expect(r[1]!.ms - r[0]!.ms).toBe(341);
  });

  it('sin notas no suena nada', () => {
    expect(notasDelMapa(undefined, [0, 500], 500)).toEqual([]);
  });
});
