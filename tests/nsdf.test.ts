import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { analizarNsdf, señalSintetica } from '../src/escucha/nsdf';

/**
 * Dos cosas se comprueban aquí:
 *
 *  1. Que el detector de tono acierta. Es comportamiento musical, que es exactamente
 *     lo que CLAUDE.md §11 dice que hay que testear.
 *  2. Que `src/escucha/nsdf.ts` y `public/worklets/tono-processor.js` siguen siendo el
 *     mismo algoritmo. Hay dos copias porque el worklet se carga por URL y no puede
 *     importarse, y porque ningún navegador expone `performance` dentro del worklet, así
 *     que la medición de coste (T0.4) tiene que correr en el hilo principal. Este test es
 *     el precio de esa duplicación: si alguien toca una copia y no la otra, salta.
 */

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TASA = 48000;
const VENTANA = 1024;

/** Instancia el worklet real fuera del hilo de audio, con los globales simulados. */
async function cargarWorklet(): Promise<(x: Float32Array) => { hz: number; claridad: number }> {
  const fuente = readFileSync(join(RAIZ, 'public', 'worklets', 'tono-processor.js'), 'utf8');

  let ClaseRegistrada: unknown = null;
  const contexto = {
    AudioWorkletProcessor: class {
      port = { postMessage: () => {}, onmessage: null };
    },
    registerProcessor: (_nombre: string, clase: unknown) => {
      ClaseRegistrada = clase;
    },
    sampleRate: TASA,
  };

  // El worklet no exporta nada: se registra a sí mismo. Lo ejecutamos con los globales
  // que el navegador le daría y capturamos la clase por el registerProcessor simulado.
  const fabricar = new Function(
    'AudioWorkletProcessor',
    'registerProcessor',
    'sampleRate',
    `${fuente}\nreturn true;`,
  );
  fabricar(contexto.AudioWorkletProcessor, contexto.registerProcessor, contexto.sampleRate);

  const Clase = ClaseRegistrada as new (o: unknown) => {
    buffer: Float32Array;
    port: { postMessage: (m: unknown) => void };
    analizarNucleo: () => void;
  };

  return (x: Float32Array) => {
    const p = new Clase({ processorOptions: { tamanoVentana: x.length } });
    let salida = { hz: 0, claridad: 0 };
    p.port.postMessage = (m: unknown) => {
      salida = m as { hz: number; claridad: number };
    };
    p.buffer.set(x);
    p.analizarNucleo();
    return salida;
  };
}

let analizarEnWorklet: (x: Float32Array) => { hz: number; claridad: number };
beforeAll(async () => {
  analizarEnWorklet = await cargarWorklet();
});

describe('detección de tono (NSDF)', () => {
  // La voz infantil vive entre 250 y 600 Hz; se incluyen los extremos del rango útil.
  const casos = [220, 261.63, 392, 440, 523.25, 600];

  it.each(casos)('acierta %i Hz con menos de 5 cents de error', (hz) => {
    const x = señalSintetica(hz, TASA, VENTANA);
    const { hz: medido, claridad } = analizarNsdf(x, TASA);
    const cents = 1200 * Math.log2(medido / hz);
    expect(claridad).toBeGreaterThan(0.85);
    expect(Math.abs(cents)).toBeLessThan(5);
  });

  it('devuelve silencio por debajo del umbral de RMS', () => {
    const x = señalSintetica(440, TASA, VENTANA);
    for (let i = 0; i < x.length; i++) x[i]! *= 0.001;
    expect(analizarNsdf(x, TASA)).toEqual({ hz: 0, claridad: 0 });
  });

  it('el worklet real y la copia del hilo principal dan lo mismo', () => {
    for (const hz of casos) {
      const x = señalSintetica(hz, TASA, VENTANA);
      const principal = analizarNsdf(x, TASA);
      const worklet = analizarEnWorklet(x);
      expect(worklet.hz).toBeCloseTo(principal.hz, 6);
      expect(worklet.claridad).toBeCloseTo(principal.claridad, 6);
    }
  });
});
