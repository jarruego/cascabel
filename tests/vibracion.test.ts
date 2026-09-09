import { afterEach, describe, expect, it, vi } from 'vitest';
import { hayVibracion, ponerVibracion, vibrarPulso } from '@/ui/vibracion';

/**
 * El pulso en la mano.
 *
 * `docs/04-DISENO-UI.md` lo pide desde el principio contra WCAG 1.2 —«toda actividad de
 * ritmo debe poder hacerse mirando: pulso visual + `navigator.vibrate()`, un alumno sordo
 * tiene que poder participar»— y durante meses no existió en ninguna parte: el pulso visual
 * sí, la vibración no.
 *
 * Lo que se prueba aquí es lo único que se puede probar sin un aparato en la mano: que no
 * revienta donde no existe, que el interruptor manda, y que el acento dura más que el pulso.
 * **Que se note al tocarlo hay que probarlo en un móvil de verdad.**
 */

function conVibrate(fn: (llamadas: unknown[]) => void) {
  const llamadas: unknown[] = [];
  const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: (ms: unknown) => {
      llamadas.push(ms);
      return true;
    },
  });
  try {
    fn(llamadas);
  } finally {
    if (original) Object.defineProperty(navigator, 'vibrate', original);
    else delete (navigator as { vibrate?: unknown }).vibrate;
  }
}

afterEach(() => ponerVibracion(true));

describe('la vibración del pulso', () => {
  it('no hace nada, y no se rompe, donde el aparato no vibra', () => {
    // Es el caso de cualquier ordenador y de todo iOS. Una actividad de ritmo no puede
    // caerse por un golpecito que no existe: la misma regla que el micrófono (§8).
    expect(hayVibracion()).toBe(false);
    expect(() => vibrarPulso()).not.toThrow();
  });

  it('el acento dura más que el pulso, porque un móvil no tiene fuerza, solo duración', () => {
    conVibrate((llamadas) => {
      vibrarPulso(false);
      vibrarPulso(true);
      expect(llamadas.length).toBe(2);
      expect(Number(llamadas[1])).toBeGreaterThan(Number(llamadas[0]));
    });
  });

  it('apagada no vibra, y vuelve a vibrar al encenderla', () => {
    conVibrate((llamadas) => {
      ponerVibracion(false);
      vibrarPulso();
      expect(llamadas).toEqual([]);
      ponerVibracion(true);
      vibrarPulso();
      expect(llamadas.length).toBe(1);
    });
  });

  it('un navegador que la tiene y la bloquea tampoco tumba la actividad', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        throw new Error('bloqueada');
      },
    });
    try {
      expect(() => vibrarPulso()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(navigator, 'vibrate', original);
      else delete (navigator as { vibrate?: unknown }).vibrate;
    }
  });

  it('no se usa vi.fn sin restaurar: el resto de tests ven el navigator de siempre', () => {
    expect(typeof (navigator as { vibrate?: unknown }).vibrate).toBe('undefined');
    expect(vi.isMockFunction(vibrarPulso)).toBe(false);
  });
});
