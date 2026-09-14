import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Que el grafo de audio no crezca con el uso.
 *
 * Salió de una avería que solo aparecía **después de un rato**: «al ejecutar varias
 * actividades de karaoke acaba fallando el sonido y no se oye nada; reinicio la app y ya se
 * oye» (el autor, 2026-09-14). No era un fallo de ninguna actividad: era el grafo.
 *
 * **Un nodo de Web Audio conectado a la salida no lo puede recoger el recolector de
 * basura**, por mucho que en JavaScript no quede ni una referencia a él: mientras esté
 * enchufado es alcanzable desde el destino y el motor tiene que recorrerlo en cada bloque de
 * muestras. Y aquí se creaban dos clases de nodo que no se desconectaban nunca:
 *
 *  - uno de envolvente **por cada nota** y uno de volumen por cada golpe;
 *  - uno de salida **por cada `Sampler`, `Percusion` o `Cuerpo`**, o sea uno o dos por cada
 *    actividad que se abría.
 *
 * Con unas cuantas actividades seguidas son miles, y el hilo de audio deja de dar abasto. Es
 * el tipo de fallo que no se ve probando una pantalla: hay que probar seis.
 *
 * Se prueba con un `AudioContext` fingido, que es lo único que hace falta para comprobar
 * quién se desconecta y cuándo. jsdom no trae ninguno.
 */

interface NodoFalso {
  conexiones: number;
  desconexiones: number;
  connect(destino?: unknown): unknown;
  disconnect(): void;
}

function nodoFalso(): NodoFalso {
  const n: NodoFalso = {
    conexiones: 0,
    desconexiones: 0,
    connect(destino?: unknown) {
      n.conexiones += 1;
      return destino;
    },
    disconnect() {
      n.desconexiones += 1;
    },
  };
  return n;
}

function parametro() {
  return {
    value: 1,
    cancelScheduledValues() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

/** Todas las ganancias creadas, para contar cuántas se quedan enchufadas. */
const ganancias: Array<NodoFalso & { gain: ReturnType<typeof parametro> }> = [];

function contextoFalso() {
  return class {
    currentTime = 10;
    state = 'running';
    destination = {};
    createGain() {
      const g = Object.assign(nodoFalso(), { gain: parametro() });
      ganancias.push(g);
      return g;
    }
    resume = async () => {};
  };
}

function fuenteFalsa() {
  const oyentes = new Map<string, () => void>();
  const f = Object.assign(nodoFalso(), {
    oyentes,
    stop() {},
    addEventListener(evento: string, cb: () => void) {
      oyentes.set(evento, cb);
    },
    /** Lo que hace el navegador cuando la fuente llega a su final. */
    terminar() {
      oyentes.get('ended')?.();
    },
  });
  return f as unknown as AudioScheduledSourceNode & typeof f;
}

beforeEach(() => {
  ganancias.length = 0;
  vi.resetModules();
  vi.stubGlobal('AudioContext', contextoFalso());
});
afterEach(() => vi.unstubAllGlobals());

describe('las notas no dejan nodos colgando', () => {
  it('al terminar una fuente se desconecta ella y toda su cadena', async () => {
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    const envolvente = motor.salidaDe('prueba', 1) as unknown as NodoFalso;
    const fuente = fuenteFalsa();

    motor.registrarFuente(fuente, envolvente as unknown as AudioNode);
    expect(envolvente.desconexiones).toBe(0);

    fuente.terminar();
    // La fuente y su envolvente, las dos: si se queda una, el grafo crece nota a nota.
    expect(fuente.desconexiones).toBe(1);
    expect(envolvente.desconexiones).toBe(1);
    expect(motor.fuentesVivas()).toBe(0);
  });

  it('desconectar dos veces no rompe nada', async () => {
    // Puede pasar: `pararTodo()` para la fuente y el navegador dispara «ended» igual.
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    const fuente = fuenteFalsa();
    motor.registrarFuente(fuente);
    expect(() => {
      fuente.terminar();
      fuente.terminar();
    }).not.toThrow();
  });
});

describe('la salida de cada familia es una sola', () => {
  it('pedirla muchas veces no crea nodos nuevos', async () => {
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();

    const primera = motor.salidaDe('sampler', 0.8);
    for (let i = 0; i < 50; i += 1) {
      expect(motor.salidaDe('sampler', 0.8)).toBe(primera);
    }
    // Es lo que impide que cada actividad que se abre deje su nodo colgado para siempre.
    expect(motor.salidasVivas()).toBe(1);
  });

  it('cada familia tiene la suya, y no más', async () => {
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    motor.salidaDe('sampler', 0.8);
    motor.salidaDe('percusion', 0.85);
    motor.salidaDe('cuerpo', 0.7);
    motor.salidaDe('sampler', 0.8);
    expect(motor.salidasVivas()).toBe(3);
  });

  it('abrir cien actividades no añade ni una salida', async () => {
    // La simulación de lo que pasaba: cada `cargar()` creaba la suya y nadie la soltaba.
    const motor = await import('@/audio/AudioEngine');
    motor.obtenerContexto();
    const antes = motor.salidasVivas();
    for (let i = 0; i < 100; i += 1) motor.salidaDe('sampler', 0.8);
    expect(motor.salidasVivas()).toBe(antes + 1);
  });
});
