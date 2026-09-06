import { analizarNsdf, señalSintetica } from './nsdf';

/**
 * Cuánto cuesta un análisis de tono, medido en el hilo principal.
 *
 * **Es una estimación, y hay que decirlo cada vez que se enseñe.** El detector real corre
 * en el hilo de audio, que tiene otra prioridad de planificación y otro presupuesto; aquí
 * se mide el mismo algoritmo sobre la misma CPU, que es lo más cerca que podemos estar sin
 * un reloj dentro del worklet. Ningún navegador expone `performance` en el
 * `AudioWorkletGlobalScope` — comprobado en Chrome 152, Edge 152 y Firefox 146.
 *
 * Lo que buscamos no es el número en sí, es la fracción: el NSDF es O(N²) y si comerse un
 * cuarto de núcleo en una tablet de aula, T2.5 (cantar) no es viable como está.
 */

export interface CosteNsdf {
  /** Mediana de milisegundos por análisis. La mediana, no la media: el hilo principal
   *  tiene interrupciones y la media se va con un solo pico. */
  msPorAnalisis: number;
  /** Milisegundos disponibles entre análisis con la ventana y el solape reales. */
  presupuestoMs: number;
  /** Fracción de un núcleo que consumiría el detector. Es el número que decide. */
  fraccionNucleo: number;
  iteraciones: number;
}

const VENTANA = 1024;
const SOLAPE = 0.5;

export function medirCosteNsdf(
  frecuenciaMuestreo: number,
  iteraciones = 40,
): CosteNsdf | null {
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') return null;

  // Varias frecuencias: el algoritmo sale antes del bucle cuando encuentra un pico
  // claro, así que medir solo un 440 Hz limpio daría un coste optimista.
  const señales = [220, 330, 440, 587].map((hz) => señalSintetica(hz, frecuenciaMuestreo, VENTANA));

  // Calentar: sin esto se mide el intérprete antes de compilar, no el algoritmo.
  for (let i = 0; i < 8; i++) analizarNsdf(señales[i % señales.length]!, frecuenciaMuestreo);

  const muestras: number[] = [];
  for (let i = 0; i < iteraciones; i++) {
    const señal = señales[i % señales.length]!;
    const t0 = performance.now();
    analizarNsdf(señal, frecuenciaMuestreo);
    muestras.push(performance.now() - t0);
  }

  muestras.sort((a, b) => a - b);
  const mitad = Math.floor(muestras.length / 2);
  const msPorAnalisis =
    muestras.length % 2 ? muestras[mitad]! : (muestras[mitad - 1]! + muestras[mitad]!) / 2;

  // Con ventana de 1024 y solape del 50 %, toca analizar cada 512 muestras.
  const presupuestoMs = ((VENTANA * (1 - SOLAPE)) / frecuenciaMuestreo) * 1000;

  return {
    msPorAnalisis,
    presupuestoMs,
    fraccionNucleo: msPorAnalisis / presupuestoMs,
    iteraciones,
  };
}
