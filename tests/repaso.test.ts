import { describe, expect, it } from 'vitest';
import { diasEntre, haceCuanto, queRepasar } from '@/motor/repaso';
import type { RegistroProgreso } from '@/datos/progreso';

/**
 * Las sugerencias de repaso.
 *
 * Además de que las cuentas salgan, aquí hay que probar lo que **no** hace: que no sugiera
 * lo de ayer, que no aparezca nada cuando no hay nada, y sobre todo que no dé un orden
 * distinto en cada recarga. Una lista de sugerencias que baila no es una sugerencia, es
 * ruido.
 */

function reg(id: string, dia: string, veces = 1, completada = true): RegistroProgreso {
  return { actividadId: id, dia, veces, completada };
}

const HOY = '2026-09-07';

describe('días entre dos fechas', () => {
  it('cuenta días naturales', () => {
    expect(diasEntre('2026-09-01', '2026-09-07')).toBe(6);
  });

  it('cruza el cambio de mes y el de año', () => {
    expect(diasEntre('2026-08-31', '2026-09-01')).toBe(1);
    expect(diasEntre('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('una fecha ilegible vale cero y no NaN', () => {
    // Un NaN se propagaría a la comparación y colaría la actividad en la lista sin que
    // nada avisara: fallaría hacia dentro, que es la peor dirección.
    expect(diasEntre('ayer', HOY)).toBe(0);
  });
});

describe('qué repasar', () => {
  it('no sugiere nada recién hecho', () => {
    expect(queRepasar([reg('a', '2026-09-06')], HOY)).toEqual([]);
  });

  it('sugiere lo de hace más de una semana la primera vez', () => {
    const r = queRepasar([reg('a', '2026-08-20')], HOY);
    expect(r.map((x) => x.actividadId)).toEqual(['a']);
    expect(r[0]!.diasDesde).toBe(18);
  });

  it('el hueco se ensancha con las veces que se ha hecho', () => {
    // Diez días: mucho para quien lo hizo una vez, poco para quien lo hizo tres.
    const hace10 = '2026-08-28';
    expect(queRepasar([reg('novato', hace10, 1)], HOY)).toHaveLength(1);
    expect(queRepasar([reg('veterano', hace10, 2)], HOY)).toHaveLength(0);
    expect(queRepasar([reg('experto', hace10, 5)], HOY)).toHaveLength(0);
  });

  it('a partir de la tercera vez se usa el hueco más largo, no uno infinito', () => {
    expect(queRepasar([reg('x', '2026-01-01', 9)], HOY)).toHaveLength(1);
  });

  it('lo que no se completó no se sugiere', () => {
    // Repasar es volver sobre algo que se hizo. Lo que se abrió y se dejó a medias no es
    // un repaso pendiente: es una actividad sin hacer, y de eso ya habla el camino.
    expect(queRepasar([reg('a', '2026-01-01', 1, false)], HOY)).toEqual([]);
  });

  it('primero lo que más tiempo lleve', () => {
    const r = queRepasar(
      [reg('reciente', '2026-08-20'), reg('viejo', '2026-02-01'), reg('medio', '2026-06-01')],
      HOY,
    );
    expect(r.map((x) => x.actividadId)).toEqual(['viejo', 'medio', 'reciente']);
  });

  it('con empate, el orden no baila entre recargas', () => {
    const mismos = [reg('zeta', '2026-01-01'), reg('alfa', '2026-01-01')];
    expect(queRepasar(mismos, HOY).map((x) => x.actividadId)).toEqual(['alfa', 'zeta']);
    expect(queRepasar([...mismos].reverse(), HOY).map((x) => x.actividadId)).toEqual([
      'alfa',
      'zeta',
    ]);
  });

  it('nunca sugiere más de tres', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => reg(`a${i}`, '2026-01-01'));
    expect(queRepasar(muchos, HOY)).toHaveLength(3);
  });

  it('un reloj movido hacia atrás no inventa repasos', () => {
    expect(queRepasar([reg('futuro', '2027-01-01')], HOY)).toEqual([]);
  });

  it('sin progreso, no hay sugerencias y no hay sección', () => {
    expect(queRepasar([], HOY)).toEqual([]);
  });
});

describe('cómo se dice hace cuánto', () => {
  it('en semanas hasta el mes', () => {
    expect(haceCuanto(8)).toEqual({ clave: 'repaso.unaSemana', cantidad: 1 });
    expect(haceCuanto(21)).toEqual({ clave: 'repaso.semanas', cantidad: 3 });
  });

  it('en meses a partir de ahí', () => {
    expect(haceCuanto(35)).toEqual({ clave: 'repaso.unMes', cantidad: 1 });
    expect(haceCuanto(90)).toEqual({ clave: 'repaso.meses', cantidad: 3 });
  });
});
