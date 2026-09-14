import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Una sesión entera contra un `AudioContext` fingido: **que no quede ni un nodo enchufado**.
 *
 * Los otros tests comprueban el mecanismo (`registrarFuente` desconecta, `salidaDe` no
 * duplica). Éste comprueba lo que de verdad importaba, que es el resultado: se hace sonar lo
 * que hace sonar una actividad de karaoke —sus notas y un clic por cada toque, muchas veces
 * y muchas actividades seguidas— y al final **todo lo que se creó tiene que estar
 * desconectado**.
 *
 * Hacía falta porque el fallo no se parecía a un fallo: «al ejecutar varias actividades de
 * karaoke acaba fallando el sonido y no se oye nada; reinicio la app y ya se oye» (el autor,
 * 2026-09-14). Ninguna pantalla fallaba, ningún test rojo, ningún error en consola. Lo único
 * que pasaba es que el grafo crecía, y eso solo se ve contándolo.
 *
 * El contexto fingido lleva la cuenta de **cada nodo que se crea** y de si sigue conectado,
 * que es exactamente lo que el navegador no deja mirar.
 */

interface Registro {
  tipo: string;
  conectadoA: unknown[];
  desconectado: boolean;
}

const creados: Registro[] = [];

function parametro() {
  return {
    value: 1,
    cancelScheduledValues() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

function nodo(tipo: string) {
  const registro: Registro = { tipo, conectadoA: [], desconectado: false };
  creados.push(registro);
  return {
    registro,
    connect(destino: unknown) {
      registro.conectadoA.push(destino);
      registro.desconectado = false;
      return destino;
    },
    disconnect() {
      registro.desconectado = true;
    },
  };
}

/** Una fuente que avisa de su final, como hace el navegador. */
function fuente(tipo: string) {
  const oyentes: Array<() => void> = [];
  let arrancada = false;
  let finalizada = false;
  const base = nodo(tipo);
  return Object.assign(base, {
    buffer: null as unknown,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    playbackRate: { value: 1 },
    frequency: { value: 440 },
    type: 'sine',
    addEventListener(evento: string, cb: () => void) {
      if (evento === 'ended') oyentes.push(cb);
    },
    start() {
      arrancada = true;
    },
    stop() {
      if (!arrancada) throw new Error('no arrancada');
    },
    /** Lo que hace el navegador cuando la fuente llega a su final. */
    terminar() {
      if (finalizada) return;
      finalizada = true;
      for (const cb of oyentes) cb();
    },
  });
}

/** Todas las fuentes creadas, para poder «terminarlas» como haría el navegador. */
const fuentes: Array<ReturnType<typeof fuente>> = [];

function contextoFalso() {
  return class {
    currentTime = 0;
    state = 'running';
    destination = { nombre: 'destino' };
    sampleRate = 48000;
    baseLatency = 0.01;
    outputLatency = 0.02;
    createGain() {
      return Object.assign(nodo('gain'), { gain: parametro() });
    }
    createOscillator() {
      const f = fuente('oscilador');
      fuentes.push(f);
      return f;
    }
    createBufferSource() {
      const f = fuente('fuente');
      fuentes.push(f);
      return f;
    }
    decodeAudioData = async () => ({ duration: 1.3, length: 62400, sampleRate: 48000 });
    resume = async () => {
      this.state = 'running';
    };
  };
}

beforeEach(() => {
  creados.length = 0;
  fuentes.length = 0;
  vi.resetModules();
  vi.stubGlobal('AudioContext', contextoFalso());
  // Las muestras: seis ficheros por instrumento. Aquí basta con que la promesa resuelva.
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
});
afterEach(() => vi.unstubAllGlobals());

/** Nodos creados que siguen enchufados al grafo. */
function enchufados(): number {
  return creados.filter((n) => n.conectadoA.length > 0 && !n.desconectado).length;
}

describe('una sesión larga no deja el grafo lleno', () => {
  it('seis actividades de karaoke seguidas no dejan nodos colgando', async () => {
    const motor = await import('@/audio/AudioEngine');
    const { clicYa } = await import('@/audio/clic');
    const { samplerPara } = await import('@/audio/instrumentos');

    motor.obtenerContexto();
    const sampler = samplerPara('marimba');
    await sampler.cargar();

    // Lo que hay enchufado de forma permanente: la maestra y la salida de los samplers.
    const permanentes = enchufados();
    expect(permanentes).toBeLessThanOrEqual(2);

    for (let actividad = 0; actividad < 6; actividad += 1) {
      // Cada actividad vuelve a pedir su sampler, como hace el componente al montarse.
      const s = samplerPara('marimba');
      await s.cargar();
      for (let nota = 0; nota < 36; nota += 1) {
        s.tocar('C4', undefined, 1, 0.33);
        // Y un clic por cada toque del niño, que es lo que se añadió el 2026-09-14.
        clicYa(false);
      }
      // El navegador va avisando del final de cada sonido.
      for (const f of fuentes) f.terminar();
      motor.pararTodo();
    }

    // Seis actividades × 36 notas × (fuente + envolvente) + otros tantos clics: si algo no
    // se desconectara, aquí habría cientos.
    expect(enchufados()).toBe(permanentes);
    expect(motor.nodosEnchufados()).toBe(0);
    expect(motor.fuentesVivas()).toBe(0);
  });

  it('el número de salidas no depende de cuántas actividades se abran', async () => {
    const motor = await import('@/audio/AudioEngine');
    const { samplerPara } = await import('@/audio/instrumentos');
    motor.obtenerContexto();

    for (let i = 0; i < 20; i += 1) {
      const s = samplerPara('marimba');
      await s.cargar();
      s.tocar('C4');
    }
    // Una para los samplers, y ya. Antes era una por cada `cargar()`.
    expect(motor.salidasVivas()).toBe(1);
  });

  it('las muestras se descargan una sola vez por instrumento', async () => {
    // No mata el sonido, pero eran seis descargas y seis decodificados por actividad, con
    // un AudioBuffer de un cuarto de mega por muestra.
    const descargas = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal('fetch', descargas);
    const motor = await import('@/audio/AudioEngine');
    const { samplerPara } = await import('@/audio/instrumentos');
    motor.obtenerContexto();

    for (let i = 0; i < 10; i += 1) await samplerPara('marimba').cargar();
    expect(descargas).toHaveBeenCalledTimes(6);
  });
});
