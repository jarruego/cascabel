import { describe, expect, it } from 'vitest';
import { notaDe, desplazamientoY } from '@/motor/pentagramaPosiciones';
import {
  alturaEnPauta,
  gradoDiatonico,
  gradosSobrePauta,
  yDeLinea,
} from '@/motor/alturaEnPauta';

const SEP = 14;
const MARGEN = 46;

describe('grados diatónicos', () => {
  it('cuenta siete grados por octava, no doce', () => {
    expect(gradoDiatonico('C5') - gradoDiatonico('C4')).toBe(7);
    expect(gradoDiatonico('E4') - gradoDiatonico('C4')).toBe(2);
  });

  it('mi y fa son grados contiguos aunque solo haya un semitono', () => {
    // Es justo el error que se comete al colocar notas por altura MIDI: en el pentagrama
    // mi-fa ocupa el mismo espacio que do-re, aunque suene la mitad.
    expect(gradoDiatonico('F4') - gradoDiatonico('E4')).toBe(1);
    expect(gradoDiatonico('D4') - gradoDiatonico('C4')).toBe(1);
  });
});

describe('posición en clave de sol', () => {
  it('pone sol4 en la segunda línea, que es lo que da nombre a la clave', () => {
    expect(gradosSobrePauta('G4', 'sol')).toBe(2);
    expect(alturaEnPauta('G4', 'sol', SEP, MARGEN).y).toBe(yDeLinea(2, SEP, MARGEN));
  });

  it('pone mi4 en la primera línea y fa5 en la quinta', () => {
    expect(alturaEnPauta('E4', 'sol', SEP, MARGEN).y).toBe(yDeLinea(1, SEP, MARGEN));
    expect(alturaEnPauta('F5', 'sol', SEP, MARGEN).y).toBe(yDeLinea(5, SEP, MARGEN));
  });

  it('coincide con pentagramaPosiciones en todas las líneas y espacios', () => {
    // Los dos módulos recorren el camino en sentidos opuestos. Si divergen, uno miente.
    for (const linea of [1, 2, 3, 4, 5]) {
      const d = notaDe({ linea }, 'sol');
      const nota = `${d.vexflow[0]!.toUpperCase()}${d.octava}`;
      expect(alturaEnPauta(nota, 'sol', SEP, MARGEN).y).toBe(
        MARGEN + desplazamientoY({ linea }, SEP),
      );
    }
    for (const espacio of [1, 2, 3, 4]) {
      const d = notaDe({ espacio }, 'sol');
      const nota = `${d.vexflow[0]!.toUpperCase()}${d.octava}`;
      expect(alturaEnPauta(nota, 'sol', SEP, MARGEN).y).toBe(
        MARGEN + desplazamientoY({ espacio }, SEP),
      );
    }
  });
});

describe('notas fuera del pentagrama', () => {
  it('da a do4 una línea adicional, y la pone a su altura', () => {
    const c4 = alturaEnPauta('C4', 'sol', SEP, MARGEN);
    expect(c4.adicionales).toHaveLength(1);
    expect(c4.adicionales[0]).toBe(c4.y);
  });

  it('no le da línea adicional a re4, que va colgando debajo de la primera', () => {
    // Re4 está en el espacio bajo la primera línea: no lleva línea propia. Dibujársela es
    // el error clásico y convierte el re en un do a ojos de quien lea.
    expect(alturaEnPauta('D4', 'sol', SEP, MARGEN).adicionales).toHaveLength(0);
  });

  it('baja según se baja de nota', () => {
    const y = (n: string) => alturaEnPauta(n, 'sol', SEP, MARGEN).y;
    expect(y('C4')).toBeGreaterThan(y('D4'));
    expect(y('D4')).toBeGreaterThan(y('E4'));
    expect(y('E4')).toBeGreaterThan(y('G4'));
  });

  it('da dos líneas adicionales a la4, que está dos grados más abajo que do4', () => {
    expect(alturaEnPauta('A3', 'sol', SEP, MARGEN).adicionales).toHaveLength(2);
  });

  it('también las pone por arriba: la5 lleva una', () => {
    expect(alturaEnPauta('A5', 'sol', SEP, MARGEN).adicionales).toHaveLength(1);
  });
});

describe('clave de fa', () => {
  it('pone fa3 en la cuarta línea, que es lo que da nombre a la clave', () => {
    expect(alturaEnPauta('F3', 'fa', SEP, MARGEN).y).toBe(yDeLinea(4, SEP, MARGEN));
  });

  it('coloca el do4 central en la primera línea adicional POR ARRIBA', () => {
    // El mismo do central que en clave de sol cuelga por debajo. Es la comprobación que
    // distingue haber implementado las claves de haber copiado una tabla.
    const c4 = alturaEnPauta('C4', 'fa', SEP, MARGEN);
    expect(c4.adicionales).toHaveLength(1);
    expect(c4.y).toBeLessThan(yDeLinea(5, SEP, MARGEN));
  });
});

describe('el tema de la Novena cabe donde debe', () => {
  it('no se sale por arriba y solo usa línea adicional en el do4', () => {
    const melodia = ['E4', 'F4', 'G4', 'D4', 'C4'];
    for (const nota of melodia) {
      const a = alturaEnPauta(nota, 'sol', SEP, MARGEN);
      expect(a.y).toBeGreaterThan(0);
      expect(a.adicionales.length).toBe(nota === 'C4' ? 1 : 0);
    }
  });
});
