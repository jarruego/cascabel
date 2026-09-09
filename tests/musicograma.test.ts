import { describe, expect, it } from 'vitest';
import {
  carrilesDe,
  figuraDe,
  geometriaDe,
  representaAltura,
  type NotaMusicograma,
  type OpcionesGeometria,
  type Representacion, anchoDeBandas } from '@/motor/musicograma';

const NOTAS: NotaMusicograma[] = [
  { nota: 'C4', pulsos: 1 },
  { nota: 'E4', pulsos: 1 },
  { nota: 'G4', pulsos: 1 },
];

const BASE: OpcionesGeometria = {
  representacion: 'pentagrama',
  orientacion: 'horizontal',
  clave: 'sol',
  lineaPct: 22,
  anticipacionS: 3.2,
  transversalPx: 160,
  separacion: 14,
  margen: 46,
};

describe('la regla que decide qué puede significar el eje transversal', () => {
  it('solo pentagrama y color dicen algo de la altura', () => {
    expect(representaAltura('pentagrama')).toBe(true);
    expect(representaAltura('color')).toBe(true);
    expect(representaAltura('silaba')).toBe(false);
    expect(representaAltura('figura')).toBe(false);
    expect(representaAltura('icono')).toBe(false);
  });

  it('las representaciones de duración van SIEMPRE en un solo carril', () => {
    // Es la regla que no admite matiz: una sílaba rítmica o una negra no dicen nada de la
    // altura, y colocarlas a alturas distintas enseñaría una relación que no existe.
    for (const r of ['silaba', 'figura', 'icono'] as Representacion[]) {
      const cruces = NOTAS.map((n, i) =>
        geometriaDe(n, 1, i, NOTAS.length, { ...BASE, representacion: r }).cruce,
      );
      expect(new Set(cruces).size, `«${r}» reparte por altura y no debe`).toBe(1);
      expect(cruces[0]).toBe(BASE.transversalPx / 2);
    }
  });

  it('y da igual la orientación: la regla es de la representación, no del eje', () => {
    for (const orientacion of ['horizontal', 'vertical'] as const) {
      const cruces = NOTAS.map((n, i) =>
        geometriaDe(n, 1, i, NOTAS.length, { ...BASE, representacion: 'silaba', orientacion })
          .cruce,
      );
      expect(new Set(cruces).size).toBe(1);
    }
  });
});

describe('avance por el eje del tiempo', () => {
  it('una nota que suena ahora está justo en la línea', () => {
    expect(geometriaDe(NOTAS[0]!, 0, 0, 3, BASE).avance).toBe(BASE.lineaPct);
  });

  it('una nota en el límite de la ventana acaba de entrar por el fondo', () => {
    expect(geometriaDe(NOTAS[0]!, BASE.anticipacionS, 0, 3, BASE).avance).toBe(100);
  });

  it('avanza hacia la línea según se acerca su momento', () => {
    const lejos = geometriaDe(NOTAS[0]!, 3, 0, 3, BASE).avance;
    const cerca = geometriaDe(NOTAS[0]!, 1, 0, 3, BASE).avance;
    expect(cerca).toBeLessThan(lejos);
  });

  it('una nota ya pasada queda por detrás de la línea', () => {
    expect(geometriaDe(NOTAS[0]!, -0.5, 0, 3, BASE).avance).toBeLessThan(BASE.lineaPct);
  });
});

describe('subir de nota se ve como subir, en las dos orientaciones', () => {
  const cruce = (nota: string, o: Partial<OpcionesGeometria>) =>
    geometriaDe({ nota, pulsos: 1 }, 1, 0, 1, { ...BASE, ...o }).cruce;

  it('en horizontal, lo agudo queda MÁS ARRIBA (menos píxeles desde arriba)', () => {
    expect(cruce('G4', {})).toBeLessThan(cruce('C4', {}));
  });

  it('en vertical, lo agudo queda MÁS A LA DERECHA, como en un piano', () => {
    const v = { orientacion: 'vertical' as const };
    expect(cruce('G4', v)).toBeGreaterThan(cruce('C4', v));
  });

  it('los carriles de color respetan el mismo sentido', () => {
    const c = (nota: string, i: number, o: Partial<OpcionesGeometria>) =>
      geometriaDe({ nota, pulsos: 1 }, 1, i, 3, { ...BASE, representacion: 'color', ...o }).cruce;
    expect(c('G4', 2, {})).toBeLessThan(c('C4', 0, {}));
    const v = { orientacion: 'vertical' as const };
    expect(c('G4', 2, v)).toBeGreaterThan(c('C4', 0, v));
  });

  it('los carriles de color caben dentro del recuadro', () => {
    for (let i = 0; i < 3; i++) {
      const { cruce: x } = geometriaDe(NOTAS[i]!, 1, i, 3, { ...BASE, representacion: 'color' });
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(BASE.transversalPx);
    }
  });
});

describe('carriles de color', () => {
  it('van de grave a agudo', () => {
    expect(carrilesDe([
      { nota: 'G4', pulsos: 1 },
      { nota: 'C4', pulsos: 1 },
      { nota: 'E4', pulsos: 1 },
    ])).toEqual(['C4', 'E4', 'G4']);
  });

  it('no duplica una nota que se repite', () => {
    expect(carrilesDe([
      { nota: 'C4', pulsos: 1 },
      { nota: 'C4', pulsos: 2 },
      { nota: 'D4', pulsos: 1 },
    ])).toEqual(['C4', 'D4']);
  });

  it('ordena bien a través de una octava', () => {
    expect(carrilesDe([
      { nota: 'C5', pulsos: 1 },
      { nota: 'B4', pulsos: 1 },
      { nota: 'C4', pulsos: 1 },
    ])).toEqual(['C4', 'B4', 'C5']);
  });
});

describe('figuras', () => {
  it('cada duración tiene su figura', () => {
    // Glifos SMuFL de Bravura: la figura entera, no una secuencia Unicode combinada.
    expect(figuraDe(4)).toBe('\uE1D2');
    expect(figuraDe(2)).toBe('\uE1D3');
    expect(figuraDe(1.5)).toBe('\uE1D5\uE1E7');
    expect(figuraDe(1)).toBe('\uE1D5');
    expect(figuraDe(0.5)).toBe('\uE1D7');
    expect(figuraDe(0.25)).toBe('\uE1D9');
  });

  it('más duración nunca da una figura más breve', () => {
    const duraciones = [0.25, 0.5, 1, 1.5, 2, 4];
    const figuras = duraciones.map(figuraDe);
    expect(new Set(figuras).size).toBe(duraciones.length);
  });
});

describe('carriles con alteraciones', () => {
  // Salió de un fallo real: la primera versión quitaba la alteración antes de agrupar, con
  // lo que re sostenido y re compartían banda. Lo destapó el motivo de la Quinta, que es
  // justamente re, mi bemol, fa y sol: cuatro alturas de las que dos comparten letra.
  it('un sostenido NO comparte carril con su nota natural', () => {
    const carriles = carrilesDe([
      { nota: 'D4', pulsos: 1 },
      { nota: 'D#4', pulsos: 1 },
      { nota: 'F4', pulsos: 1 },
      { nota: 'G4', pulsos: 1 },
    ]);
    expect(carriles).toHaveLength(4);
    expect(carriles).toEqual(['D4', 'D#4', 'F4', 'G4']);
  });

  it('el motivo de la Quinta da exactamente cuatro bandas', () => {
    const motivo: NotaMusicograma[] = [
      { nota: 'G4', pulsos: 0.5 }, { nota: 'G4', pulsos: 0.5 }, { nota: 'G4', pulsos: 0.5 },
      { nota: 'D#4', pulsos: 2 },
      { nota: 'F4', pulsos: 0.5 }, { nota: 'F4', pulsos: 0.5 }, { nota: 'F4', pulsos: 0.5 },
      { nota: 'D4', pulsos: 2 },
    ];
    expect(carrilesDe(motivo)).toEqual(['D4', 'D#4', 'F4', 'G4']);
  });

  it('ordena por altura real y no por letra', () => {
    // Si se ordenara por letra, el do de la octava de arriba caería antes que el si.
    expect(carrilesDe([
      { nota: 'C5', pulsos: 1 },
      { nota: 'B4', pulsos: 1 },
      { nota: 'A#4', pulsos: 1 },
    ])).toEqual(['A#4', 'B4', 'C5']);
  });
});

describe('el ancho de las bandas', () => {
  // Cada banda es también su botón, así que su ancho es un objetivo táctil, no una
  // decisión estética. 75 px es el mínimo de Infantil; 48 el de los mayores.
  it('reparte el ancho disponible entre las bandas', () => {
    // Mientras ninguna cota apriete, la tira ocupa exactamente lo que hay: 600 entre
    // cuatro son 150 por banda, y entre cinco, 120.
    expect(anchoDeBandas(4, 600, 48)).toBe(600);
    expect(anchoDeBandas(5, 600, 48)).toBe(600);
  });

  it('no baja del objetivo táctil aunque no quepa', () => {
    // Cuatro bandas de Infantil en un móvil estrecho: 4 × 75 = 300, más que los 280 que
    // hay. Se desborda a propósito y la caja desplaza: mejor arrastrar que fallar el toque.
    expect(anchoDeBandas(4, 280, 75)).toBe(300);
  });

  it('no crece sin límite en una pizarra', () => {
    // Una banda de un palmo obliga a recorrerla entera con el ojo para ver por dónde va a
    // caer la nota, y entonces la anchura juega en contra.
    expect(anchoDeBandas(4, 4000, 48)).toBe(680);
  });

  it('sin medir todavía, devuelve lo que había antes de medir', () => {
    // Un fotograma con el ancho antiguo no se ve; empezar en cero colapsaría el recuadro.
    expect(anchoDeBandas(4, 0, 48)).toBe(352);
    expect(anchoDeBandas(8, 0, 48)).toBe(360);
  });

  it('cero bandas no divide por cero', () => {
    expect(Number.isFinite(anchoDeBandas(0, 800, 48))).toBe(true);
  });
});
