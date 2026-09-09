import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * «Parar» tiene que parar también lo que ya estaba en cola.
 *
 * Salió de una queja literal del autor sobre el constructor de ritmos: al pulsar parar, o
 * vaciar, o al salir de la actividad, la melodía seguía sonando. La causa es que una fuente
 * de Web Audio no se puede cancelar desde fuera una vez programada, y el constructor
 * programaba la vuelta entera de golpe. Lo que se prueba aquí es el mecanismo que lo
 * arregla: toda fuente queda apuntada y `pararTodo()` la detiene, aunque no haya empezado.
 *
 * El `AudioContext` se finge con lo mínimo que usa el motor: jsdom no trae ninguno.
 */

function contextoFalso() {
  const gain = () => ({
    gain: {
      value: 1,
      cancelScheduledValues() {},
      setValueAtTime() {},
      linearRampToValueAtTime() {},
    },
    connect() {},
  });
  return class {
    currentTime = 10;
    state = 'running';
    destination = {};
    createGain = gain;
    resume = async () => {};
  };
}

function fuenteFalsa() {
  const f = {
    paradaEn: null as number | null,
    oyentes: new Map<string, () => void>(),
    stop(cuando: number) {
      if (this.paradaEn !== null) throw new Error('ya parada');
      this.paradaEn = cuando;
    },
    addEventListener(evento: string, cb: () => void) {
      this.oyentes.set(evento, cb);
    },
    terminar() {
      this.oyentes.get('ended')?.();
    },
  };
  return f as unknown as AudioScheduledSourceNode & typeof f;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('AudioContext', contextoFalso());
});
afterEach(() => vi.unstubAllGlobals());

describe('parar todo', () => {
  it('detiene las fuentes apuntadas, incluidas las que aún no han empezado', async () => {
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    const a = fuenteFalsa();
    const b = fuenteFalsa();
    motor.registrarFuente(a);
    motor.registrarFuente(b);
    expect(motor.fuentesVivas()).toBe(2);

    motor.pararTodo();
    // Un pelín después de ahora, para que la salida maestra haya bajado y no chasque.
    expect(a.paradaEn).toBeGreaterThan(10);
    expect(b.paradaEn).toBeGreaterThan(10);
    expect(motor.fuentesVivas()).toBe(0);
  });

  it('una fuente que ya terminó se borra sola y no se intenta parar dos veces', async () => {
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    const a = fuenteFalsa();
    motor.registrarFuente(a);
    a.terminar();
    expect(motor.fuentesVivas()).toBe(0);
    expect(() => motor.pararTodo()).not.toThrow();
    expect(a.paradaEn).toBeNull();
  });

  it('sin contexto creado no hace nada, y no lo crea', async () => {
    // Salir de una actividad que nunca sonó no debe arrancar el audio: eso solo se hace
    // dentro de un gesto del usuario (§7).
    const motor = await import('@/audio/AudioEngine');
    expect(() => motor.pararTodo()).not.toThrow();
    expect(motor.fuentesVivas()).toBe(0);
  });
});
