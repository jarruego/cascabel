import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El detector de palmadas, contra silencio y contra palmadas.
 *
 * Salió de una queja concreta del autor: «el micrófono es muy sensible para actividades de
 * dar palmadas o golpes, sin hacer nada se activan». Se arreglaron tres cosas —la media del
 * ruido arrancaba en cero, el suelo absoluto estaba cuarenta decibelios por debajo de donde
 * tenía que estar, y el factor era 4 cuando una palmada está veinte o cincuenta veces por
 * encima de la sala— y no había forma de saber si volvían a torcerse.
 *
 * **Se prueba el fichero de verdad**, el que carga el navegador, no una copia. Vive en
 * `public/worklets/` porque se carga por URL y no por import, así que aquí se le monta el
 * entorno que le falta —`AudioWorkletProcessor`, `sampleRate`, `registerProcessor`— y se le
 * dan bloques de 128 muestras como haría el hilo de audio. Es feo y es lo correcto: una
 * copia en TypeScript probaría la copia.
 *
 * Las señales son sintéticas y a propósito: ruido blanco flojo para la sala, y para la
 * palmada un golpe de banda ancha que decae en unos milisegundos, que es lo que es una
 * palmada. Lo que esto NO prueba es una sala de verdad con veinticinco niños; eso hay que
 * probarlo con el aparato delante.
 */

const RUTA = join(__dirname, '..', 'public', 'worklets', 'onset-processor.js');
const TASA = 48000;
const BLOQUE = 128;

interface Onset {
  tiempo: number;
  energia: number;
}

/** Carga el worklet con el entorno del hilo de audio simulado alrededor. */
function cargar(opciones: Record<string, unknown> = {}) {
  const onsets: Onset[] = [];
  let reloj = 0;
  let Clase: new (o: unknown) => { process(e: Float32Array[][]): boolean };

  const contexto = {
    AudioWorkletProcessor: class {
      port = { postMessage: (m: Onset) => onsets.push(m) };
    },
    sampleRate: TASA,
    get currentTime() {
      return reloj;
    },
    registerProcessor: (_n: string, c: never) => {
      Clase = c;
    },
  };

  const fuente = readFileSync(RUTA, 'utf8');
  // `new Function` y no `eval`: el worklet declara una clase en el ámbito global del hilo de
  // audio, y así se le puede dar ese ámbito sin ensuciar el de los tests.
  new Function(
    'AudioWorkletProcessor',
    'sampleRate',
    'registerProcessor',
    'contexto',
    `${fuente.replace(/currentTime/g, 'contexto.currentTime')}`,
  )(contexto.AudioWorkletProcessor, TASA, contexto.registerProcessor, contexto);

  const procesador = new Clase!({ processorOptions: opciones });

  return {
    onsets,
    /** Le mete `muestras` al detector, en bloques de 128 como hace el navegador. */
    dar(muestras: Float32Array) {
      for (let i = 0; i + BLOQUE <= muestras.length; i += BLOQUE) {
        procesador.process([[muestras.subarray(i, i + BLOQUE)]]);
        reloj += BLOQUE / TASA;
      }
    },
  };
}

/** Ruido de sala: muy flojo y sin estructura. Es lo que hay cuando no pasa nada. */
function sala(segundos: number, amplitud = 0.002): Float32Array {
  const x = new Float32Array(Math.round(segundos * TASA));
  // Generador propio y con semilla: `Math.random()` haría que el test fallara uno de cada
  // tantos, y un test que falla a veces se acaba borrando.
  let s = 12345;
  for (let i = 0; i < x.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    x[i] = ((s / 0x7fffffff) * 2 - 1) * amplitud;
  }
  return x;
}

/** Una palmada: banda ancha, ataque instantáneo y unos 8 ms de caída. */
function palmada(x: Float32Array, enSegundos: number, amplitud = 0.5): void {
  const inicio = Math.round(enSegundos * TASA);
  const largo = Math.round(0.008 * TASA);
  let s = 999;
  for (let i = 0; i < largo && inicio + i < x.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const ruido = (s / 0x7fffffff) * 2 - 1;
    x[inicio + i] = x[inicio + i]! + ruido * amplitud * Math.exp(-i / (largo / 4));
  }
}

/**
 * Una palmada en un aula de verdad: el golpe y después la cola difusa de la sala, que cae
 * sesenta decibelios en `rt60` segundos. Es lo que el test de arriba no tenía, y lo que
 * hacía que cada palmada diera dos onsets.
 */
function palmadaConCola(x: Float32Array, enSegundos: number, rt60 = 0.5, amplitud = 0.5): void {
  palmada(x, enSegundos, amplitud);
  const inicio = Math.round(enSegundos * TASA);
  const largo = Math.round(rt60 * 1.5 * TASA);
  let s = 4242 + inicio;
  for (let i = 0; i < largo && inicio + i < x.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const ruido = (s / 0x7fffffff) * 2 - 1;
    x[inicio + i] = x[inicio + i]! + ruido * amplitud * 0.25 * Math.exp((-6.91 * i) / (rt60 * TASA));
  }
}

describe('el detector de palmadas', () => {
  let det: ReturnType<typeof cargar>;

  beforeEach(() => {
    det = cargar();
  });

  it('en silencio no detecta nada', () => {
    // Éste es el fallo que denunció el autor: la actividad empezaba a contar golpes en una
    // habitación en silencio.
    det.dar(sala(3));
    expect(det.onsets, `${det.onsets.length} palmadas fantasma en tres segundos`).toEqual([]);
  });

  it('durante el calentamiento no detecta nada, ni siquiera una palmada', () => {
    // Los primeros 400 ms se dedican a aprender cómo suena esta habitación. Detectar algo
    // ahí sería detectarlo con un umbral que aún no significa nada.
    const x = sala(0.3);
    palmada(x, 0.15);
    det.dar(x);
    expect(det.onsets).toEqual([]);
  });

  it('cuenta cuatro palmadas cuando se dan cuatro', () => {
    const x = sala(3);
    const cuando = [1.0, 1.5, 2.0, 2.5];
    for (const t of cuando) palmada(x, t);
    det.dar(x);
    expect(det.onsets.length, 'no ha contado exactamente cuatro').toBe(4);
  });

  it('una palmada es una, no tres: el refractario se come las reflexiones', () => {
    /*
      Sin periodo refractario, UNA palmada genera tres o cuatro onsets por las reflexiones
      de la sala. Aquí se simulan como dos ecos flojos a 30 y 60 ms, que es el orden de un
      aula con paredes duras.
    */
    const x = sala(2);
    palmada(x, 1.0, 0.5);
    palmada(x, 1.03, 0.15);
    palmada(x, 1.06, 0.08);
    det.dar(x);
    expect(det.onsets.length).toBe(1);
  });

  it('el fallo que hubo: una palmada con cola de sala es UNA, no dos', () => {
    /*
      Con RT60 de medio segundo, a los 110 ms —al salir del refractario— la cola sigue muy
      por encima del umbral, y el detector volvía a disparar a los 112 ms. Ese segundo onset
      llegaba seiscientos milisegundos antes del hueco siguiente y lo quemaba: «con palmas es
      difícil acertar», dijo el autor el 2026-09-12. Ahora solo dispara la SUBIDA.
    */
    for (const rt60 of [0.3, 0.5, 0.8]) {
      const d = cargar();
      const x = sala(4);
      palmadaConCola(x, 1.0, rt60);
      d.dar(x);
      expect(d.onsets.length, `rt60 ${rt60}`).toBe(1);
    }
  });

  it('cuatro negras a 84 con cola de sala son cuatro, y cuatro corcheas a 120 también', () => {
    const negras = cargar();
    const x = sala(6);
    for (let k = 0; k < 4; k++) palmadaConCola(x, 1.0 + k * (60 / 84));
    negras.dar(x);
    expect(negras.onsets.length).toBe(4);

    // Las corcheas a 120 ppm van a 250 ms: la segunda cae ENCIMA de la cola de la primera
    // y tiene que contarse igual. Es lo que impide arreglar la cola alargando el refractario.
    const corcheas = cargar();
    const y = sala(4);
    for (let k = 0; k < 4; k++) palmadaConCola(y, 1.0 + k * 0.25);
    corcheas.dar(y);
    expect(corcheas.onsets.length).toBe(4);
    expect(corcheas.onsets.map((o) => Math.round((o.tiempo - 1) * 100))).toEqual([0, 25, 50, 75]);
  });

  it('el instante que reporta es el de la palmada, no el del bloque', () => {
    // La actividad compara ese instante con una rejilla, así que un error aquí es un error
    // en la evaluación de todos los niños. Un bloque dura 2,7 ms a 48 kHz: se pide que
    // acierte dentro de una ventana de 10 ms.
    const x = sala(2);
    palmada(x, 1.234);
    det.dar(x);
    expect(det.onsets.length).toBe(1);
    expect(Math.abs(det.onsets[0]!.tiempo - 1.234)).toBeLessThan(0.01);
  });

  it('no dispara con ruido de sala alto, que es un aula con veinticinco niños', () => {
    // Diez veces el ruido de la primera prueba. El umbral es relativo a la sala, así que
    // subir el suelo de ruido no debe convertirlo en un detector de nada.
    det.dar(sala(3, 0.02));
    expect(det.onsets).toEqual([]);
  });
});
