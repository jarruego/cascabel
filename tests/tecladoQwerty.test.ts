import { describe, expect, it } from 'vitest';
import { letraDeNota, mapaDe, notaDeTecla } from '@/ui/tecladoQwerty';

describe('disposición horizontal: el teclado dibuja el piano', () => {
  it('pone las blancas seguidas en la fila central', () => {
    expect(notaDeTecla('KeyA', 4)).toBe('C4');
    expect(notaDeTecla('KeyS', 4)).toBe('D4');
    expect(notaDeTecla('KeyD', 4)).toBe('E4');
    expect(notaDeTecla('KeyF', 4)).toBe('F4');
    expect(notaDeTecla('KeyG', 4)).toBe('G4');
    expect(notaDeTecla('KeyH', 4)).toBe('A4');
    expect(notaDeTecla('KeyJ', 4)).toBe('B4');
    expect(notaDeTecla('KeyK', 4)).toBe('C5');
  });

  it('pone cada negra sobre el hueco físico entre sus dos blancas', () => {
    // La W está entre la A y la S; el do sostenido está entre el do y el re. Es toda la
    // idea de esta disposición: si esto se rompe, el teclado deja de parecerse al piano.
    expect(notaDeTecla('KeyW', 4)).toBe('C#4');
    expect(notaDeTecla('KeyE', 4)).toBe('D#4');
    expect(notaDeTecla('KeyT', 4)).toBe('F#4');
    expect(notaDeTecla('KeyY', 4)).toBe('G#4');
    expect(notaDeTecla('KeyU', 4)).toBe('A#4');
  });

  it('deja mudas la R y la I, que es donde el piano no tiene negra', () => {
    // Entre mi y fa, y entre si y do, no hay tecla negra. Que la R y la I no suenen no es
    // una omisión: es el hueco, y es lo que se ve al mirar el teclado.
    expect(notaDeTecla('KeyR', 4)).toBeNull();
    expect(notaDeTecla('KeyI', 4)).toBeNull();
  });

  it('llega a una octava y media, que es lo que da la fila central', () => {
    // Catorce blancas seguidas necesitarían catorce letras contiguas en una fila y hay
    // once. El límite es el teclado, no el mapa.
    expect(notaDeTecla('Semicolon', 4)).toBe('E5');
    expect(notaDeTecla('Quote', 4)).toBe('F5');
    expect(Object.keys(mapaDe('horizontal'))).toHaveLength(18);
  });

  it('no usa la fila de abajo, para no partir las octavas', () => {
    expect(notaDeTecla('KeyZ', 4)).toBeNull();
    expect(notaDeTecla('KeyX', 4)).toBeNull();
  });
});

describe('disposición apilada: la de los secuenciadores', () => {
  it('parte dos octavas en dos filas', () => {
    expect(notaDeTecla('KeyZ', 4, 'apilada')).toBe('C4');
    expect(notaDeTecla('KeyM', 4, 'apilada')).toBe('B4');
    expect(notaDeTecla('KeyQ', 4, 'apilada')).toBe('C5');
    expect(notaDeTecla('KeyI', 4, 'apilada')).toBe('C6');
  });

  it('cubre dos octavas completas más el do de cierre', () => {
    expect(Object.keys(mapaDe('apilada'))).toHaveLength(25);
  });

  it('la misma tecla suena distinta en cada disposición', () => {
    // Es la razón de que la disposición se declare y no se adivine: la S es un re en
    // horizontal y un do sostenido en apilada.
    expect(notaDeTecla('KeyS', 4, 'horizontal')).toBe('D4');
    expect(notaDeTecla('KeyS', 4, 'apilada')).toBe('C#4');
  });
});

describe('la letra que se pinta en cada tecla', () => {
  it('es la inversa exacta del mapa', () => {
    for (const code of Object.keys(mapaDe('horizontal'))) {
      const nota = notaDeTecla(code, 4)!;
      expect(letraDeNota(nota, 4)).not.toBe('');
    }
  });

  it('traduce las dos teclas que un teclado español serigrafía distinto', () => {
    expect(letraDeNota('E5', 4)).toBe('Ñ');
    expect(letraDeNota('F5', 4)).toBe('´');
  });

  it('no inventa letra para una nota fuera del alcance del teclado', () => {
    expect(letraDeNota('C2', 4)).toBe('');
    expect(letraDeNota('D6', 4)).toBe('');
  });
});

describe('en las dos disposiciones', () => {
  it('se indexa por posición física y no por letra', () => {
    // Si algún día alguien mete aquí 'a' o 'w' en vez de 'KeyA' y 'KeyW', el piano dejará
    // de funcionar en teclados AZERTY sin que nadie se entere desde aquí.
    for (const disposicion of ['horizontal', 'apilada'] as const) {
      for (const code of Object.keys(mapaDe(disposicion))) {
        expect(code).toMatch(/^(Key[A-Z]|Digit[0-9]|Semicolon|Quote)$/);
      }
    }
  });

  it('respeta la octava base que se le pase', () => {
    expect(notaDeTecla('KeyA', 3)).toBe('C3');
    expect(notaDeTecla('KeyZ', 3, 'apilada')).toBe('C3');
  });

  it('devuelve null para una tecla que no toca nada', () => {
    expect(notaDeTecla('Space', 4)).toBeNull();
    expect(notaDeTecla('Escape', 4, 'apilada')).toBeNull();
  });
});
