import { describe, expect, it } from 'vitest';
import { letraDeNota, notaDeTecla, TECLAS } from '@/ui/tecladoQwerty';

describe('el teclado del ordenador como piano', () => {
  it('pone el do en la Z y sube por la fila de abajo', () => {
    expect(notaDeTecla('KeyZ', 4)).toBe('C4');
    expect(notaDeTecla('KeyX', 4)).toBe('D4');
    expect(notaDeTecla('KeyC', 4)).toBe('E4');
    expect(notaDeTecla('KeyV', 4)).toBe('F4');
    expect(notaDeTecla('KeyB', 4)).toBe('G4');
    expect(notaDeTecla('KeyN', 4)).toBe('A4');
    expect(notaDeTecla('KeyM', 4)).toBe('B4');
  });

  it('deja el hueco de las negras donde el piano no las tiene', () => {
    // Entre mi y fa, y entre si y do, no hay tecla negra. En el teclado del ordenador eso
    // se ve como un salto: la F y la K no tocan nada. Es lo que hace que el dibujo del
    // teclado reproduzca el del piano en vez de ser una lista arbitraria.
    expect(notaDeTecla('KeyF', 4)).toBeNull();
    expect(notaDeTecla('KeyK', 4)).toBeNull();
    expect(notaDeTecla('Digit4', 4)).toBeNull();
    expect(notaDeTecla('Digit1', 4)).toBeNull();
  });

  it('pone las negras justo encima y entre sus blancas', () => {
    expect(notaDeTecla('KeyS', 4)).toBe('C#4');
    expect(notaDeTecla('KeyD', 4)).toBe('D#4');
    expect(notaDeTecla('KeyG', 4)).toBe('F#4');
    expect(notaDeTecla('KeyH', 4)).toBe('G#4');
    expect(notaDeTecla('KeyJ', 4)).toBe('A#4');
  });

  it('la fila de las letras es la octava siguiente', () => {
    expect(notaDeTecla('KeyQ', 4)).toBe('C5');
    expect(notaDeTecla('KeyW', 4)).toBe('D5');
    expect(notaDeTecla('KeyU', 4)).toBe('B5');
    expect(notaDeTecla('KeyI', 4)).toBe('C6');
  });

  it('respeta la octava base que se le pase', () => {
    expect(notaDeTecla('KeyZ', 3)).toBe('C3');
    expect(notaDeTecla('KeyQ', 3)).toBe('C4');
  });

  it('devuelve null para una tecla que no toca nada', () => {
    expect(notaDeTecla('Space', 4)).toBeNull();
    expect(notaDeTecla('Escape', 4)).toBeNull();
  });
});

describe('la letra que se pinta en cada tecla', () => {
  it('es la inversa exacta del mapa', () => {
    for (const code of Object.keys(TECLAS)) {
      const nota = notaDeTecla(code, 4)!;
      const esperada = code.replace('Key', '').replace('Digit', '');
      expect(letraDeNota(nota, 4)).toBe(esperada);
    }
  });

  it('no inventa letra para una nota fuera del alcance del teclado', () => {
    expect(letraDeNota('C2', 4)).toBe('');
    expect(letraDeNota('D6', 4)).toBe('');
  });
});

describe('la convención de facto', () => {
  it('cubre dos octavas completas más el do de cierre', () => {
    // 12 + 12 + 1: es lo que hace que se pueda tocar una escala entera sin cambiar de
    // octava, y es lo que hacen Ableton, FL Studio y GarageBand.
    expect(Object.keys(TECLAS)).toHaveLength(25);
  });

  it('usa códigos físicos y no letras, para que funcione en cualquier distribución', () => {
    // Si algún día alguien mete aquí 'z' o 'w' en vez de 'KeyZ' y 'KeyW', el piano dejará
    // de funcionar en teclados AZERTY sin que nadie se entere.
    for (const code of Object.keys(TECLAS)) {
      expect(code).toMatch(/^(Key[A-Z]|Digit[0-9])$/);
    }
  });
});
