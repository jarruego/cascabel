import { describe, expect, it } from 'vitest';
import {
  desplazamientoY,
  notaDe,
  sitiosDelPentagrama,
} from '../src/motor/pentagramaPosiciones';

/**
 * Esto es conocimiento musical fijo, no criterio: en clave de sol la segunda línea es SOL,
 * y de ahí sale todo lo demás. Pero es exactamente el tipo de cosa que se implementa mal
 * con un signo cambiado y no lo detecta nadie hasta que una maestra ve la nota una línea
 * más arriba de donde debe.
 */
describe('posiciones en clave de sol', () => {
  it('la segunda línea es SOL, que es de donde le viene el nombre a la clave', () => {
    expect(notaDe({ linea: 2 })).toMatchObject({ nombre: 'sol', octava: 4 });
  });

  it('las cinco líneas son mi, sol, si, re, fa de abajo arriba', () => {
    const esperado = [
      ['mi', 4],
      ['sol', 4],
      ['si', 4],
      ['re', 5],
      ['fa', 5],
    ] as const;
    esperado.forEach(([nombre, octava], i) => {
      expect(notaDe({ linea: i + 1 })).toMatchObject({ nombre, octava });
    });
  });

  it('los cuatro espacios deletrean FA-LA-DO-MI', () => {
    // La regla mnemotécnica de toda la vida, y sirve de comprobación cruzada.
    const esperado = [
      ['fa', 4],
      ['la', 4],
      ['do', 5],
      ['mi', 5],
    ] as const;
    esperado.forEach(([nombre, octava], i) => {
      expect(notaDe({ espacio: i + 1 })).toMatchObject({ nombre, octava });
    });
  });

  it('coincide con lo que declara la actividad c2-01', () => {
    expect(notaDe({ linea: 2 }).nombre).toBe('sol');
    expect(notaDe({ espacio: 2 }).nombre).toBe('la');
    expect(notaDe({ linea: 3 }).nombre).toBe('si');
    expect(notaDe({ espacio: 3 }).nombre).toBe('do');
  });

  it('la octava cambia donde toca: de si4 a do5', () => {
    expect(notaDe({ linea: 3 })).toMatchObject({ nombre: 'si', octava: 4 });
    expect(notaDe({ espacio: 3 })).toMatchObject({ nombre: 'do', octava: 5 });
  });

  it('da la notación que entiende VexFlow', () => {
    expect(notaDe({ linea: 2 }).vexflow).toBe('g/4');
    expect(notaDe({ espacio: 3 }).vexflow).toBe('c/5');
  });
});

describe('posiciones en clave de fa', () => {
  it('la cuarta línea es FA, que es de donde le viene el nombre', () => {
    expect(notaDe({ linea: 4 }, 'fa')).toMatchObject({ nombre: 'fa', octava: 3 });
  });

  it('el do central cae en la primera línea adicional superior, o sea fuera', () => {
    // Comprobación indirecta: la quinta línea es la4, así que do5 queda por encima.
    expect(notaDe({ linea: 5 }, 'fa')).toMatchObject({ nombre: 'la', octava: 3 });
  });
});

describe('límites', () => {
  it('rechaza líneas y espacios que no existen', () => {
    expect(() => notaDe({ linea: 0 })).toThrow(/1 a 5/);
    expect(() => notaDe({ linea: 6 })).toThrow(/1 a 5/);
    expect(() => notaDe({ espacio: 5 })).toThrow(/1 a 4/);
  });

  it('hay nueve sitios y salen ordenados de grave a agudo', () => {
    const sitios = sitiosDelPentagrama();
    expect(sitios).toHaveLength(9);
    const nombres = sitios.map((s) => notaDe(s));
    // De mi4 a fa5: cada uno más agudo que el anterior.
    for (let i = 1; i < nombres.length; i++) {
      const a = nombres[i - 1]!;
      const b = nombres[i]!;
      const grado = (n: typeof a) => n.octava * 7 + ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'].indexOf(n.nombre);
      expect(grado(b)).toBeGreaterThan(grado(a));
    }
  });
});

describe('coordenadas en pantalla', () => {
  // La música cuenta hacia arriba y el DOM crece hacia abajo. Este es el sitio donde se
  // invierte, y si el signo se cambia todo aparece reflejado sin que falle nada.
  const SEP = 12;

  it('la línea de arriba (la quinta) está en el cero', () => {
    expect(desplazamientoY({ linea: 5 }, SEP)).toBe(0);
  });

  it('la línea de abajo (la primera) está cuatro separaciones más abajo', () => {
    expect(desplazamientoY({ linea: 1 }, SEP)).toBe(4 * SEP);
  });

  it('cuanto más grave, más abajo en la pantalla', () => {
    expect(desplazamientoY({ linea: 1 }, SEP)).toBeGreaterThan(desplazamientoY({ linea: 5 }, SEP));
    expect(desplazamientoY({ espacio: 1 }, SEP)).toBeGreaterThan(
      desplazamientoY({ espacio: 4 }, SEP),
    );
  });

  it('un espacio cae justo entre sus dos líneas', () => {
    const media = (desplazamientoY({ linea: 1 }, SEP) + desplazamientoY({ linea: 2 }, SEP)) / 2;
    expect(desplazamientoY({ espacio: 1 }, SEP)).toBe(media);
  });
});
