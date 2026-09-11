import { describe, expect, it } from 'vitest';
import {
  MAYOR,
  MENOR,
  distancia,
  distanciasDe,
  escalaDesde,
  esEscalaMayor,
  falloAlAnadir,
  gradosConSemitono,
} from '@/motor/escala';

describe('tonos y semitonos', () => {
  it('un semitono es una tecla; un tono, dos', () => {
    expect(distancia('E4', 'F4')).toBe('semitono');
    expect(distancia('C4', 'D4')).toBe('tono');
    expect(distancia('B4', 'C5')).toBe('semitono');
  });

  it('mi-fa y si-do son semitonos aunque no haya tecla negra en medio', () => {
    /*
      Es la idea de toda la actividad. En el pentagrama esas dos parejas se ven igual de
      separadas que do-re, y no lo están. Se ve en el piano, no en el papel: por eso el
      teclado y la pauta tienen que ir juntos.
    */
    expect(distancia('E4', 'F4')).toBe('semitono');
    expect(distancia('C4', 'D4')).toBe('tono');
    expect(distancia('B3', 'C4')).toBe('semitono');
    expect(distancia('F4', 'G4')).toBe('tono');
  });

  it('una distancia mayor de un tono no es ninguna de las dos', () => {
    expect(distancia('C4', 'E4')).toBeNull();
    expect(distancia('C4', 'C5')).toBeNull();
  });

  it('da igual el sentido', () => {
    expect(distancia('F4', 'E4')).toBe('semitono');
  });
});

describe('construir una escala', () => {
  it('do mayor sale con teclas blancas', () => {
    expect(escalaDesde('C4')).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
  });

  it('sol mayor necesita un fa sostenido', () => {
    // El patrón es el mismo; lo que cambia es que para mantenerlo hace falta una alteración.
    // Esto es lo que hace evidente que la escala es un patrón y no una lista de blancas.
    expect(escalaDesde('G4')).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5']);
  });

  it('fa mayor necesita un si bemol, escrito aquí como la sostenido', () => {
    expect(escalaDesde('F4')[3]).toBe('A#4');
  });

  it('incluye la octava, que es la que cierra el patrón', () => {
    /*
      Ocho notas y no siete. Sin la octava, el último semitono —el de si a do— no aparece, y
      es justamente el que hace que la escala suene a que ha terminado.
    */
    const escala = escalaDesde('C4');
    expect(escala).toHaveLength(8);
    expect(distancia(escala[6]!, escala[7]!)).toBe('semitono');
  });

  it('la menor pone los semitonos en otro sitio', () => {
    expect(gradosConSemitono(MAYOR)).toEqual([3, 7]);
    expect(gradosConSemitono(MENOR)).toEqual([2, 5]);
  });
});

describe('reconocer una escala mayor', () => {
  it('do mayor y sol mayor son las dos mayores', () => {
    // Son la misma escala empezada en otro sitio, y eso es lo que hay que entender.
    expect(esEscalaMayor(escalaDesde('C4'))).toBe(true);
    expect(esEscalaMayor(escalaDesde('G4'))).toBe(true);
    expect(esEscalaMayor(escalaDesde('D4'))).toBe(true);
  });

  it('la menor no lo es', () => {
    expect(esEscalaMayor(escalaDesde('A4', MENOR))).toBe(false);
  });

  it('las blancas empezando en re tampoco', () => {
    // Es el error clásico: tocar ocho blancas seguidas creyendo que eso es una escala.
    expect(esEscalaMayor(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'])).toBe(false);
  });

  it('una secuencia incompleta no cuela', () => {
    expect(esEscalaMayor(['C4', 'D4', 'E4'])).toBe(false);
  });
});

describe('distancias de una secuencia', () => {
  it('do mayor da tono, tono, semitono, tono, tono, tono, semitono', () => {
    expect(distanciasDe(escalaDesde('C4'))).toEqual([
      'tono', 'tono', 'semitono', 'tono', 'tono', 'tono', 'semitono',
    ]);
  });

  it('marca como desconocida una distancia que no es ni tono ni semitono', () => {
    expect(distanciasDe(['C4', 'E4'])).toEqual([null]);
  });
});

describe('construir la escala paso a paso: cualquier paso fuera del patrón avisa', () => {
  it('la escala entera, nota a nota, no falla en ningún paso', () => {
    const sol = escalaDesde('G4');
    sol.forEach((nota, i) => {
      expect(falloAlAnadir(sol.slice(0, i), nota, 'G4')).toBeNull();
    });
  });

  it('el fallo que pidió el autor: fa natural en vez de fa sostenido es un semitono donde toca un tono', () => {
    expect(falloAlAnadir(['G4', 'A4', 'B4', 'C5', 'D5', 'E5'], 'F5', 'G4')).toBe('semitono');
  });

  it('y un tono donde toca un semitono también avisa', () => {
    // De si a do sostenido, cuando en sol mayor de si se va a do.
    expect(falloAlAnadir(['G4', 'A4', 'B4'], 'C#5', 'G4')).toBe('tono');
  });

  it('un salto, una nota repetida y una que baja', () => {
    expect(falloAlAnadir(['G4', 'A4'], 'D5', 'G4')).toBe('salto');
    expect(falloAlAnadir(['G4', 'A4'], 'A4', 'G4')).toBe('repite');
    expect(falloAlAnadir(['G4', 'A4'], 'G4', 'G4')).toBe('baja');
  });

  it('la escala empieza en la tónica, en la octava que sea', () => {
    expect(falloAlAnadir([], 'A4', 'G4')).toBe('empieza');
    expect(falloAlAnadir([], 'G5', 'G4')).toBeNull();
    expect(falloAlAnadir(['G5'], 'A5', 'G4')).toBeNull();
  });
});
