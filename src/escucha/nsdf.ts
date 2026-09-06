/**
 * NSDF / McLeod en el hilo principal.
 *
 * OJO: esto NO es lo que corre en producción. El detector de verdad vive en
 * `public/worklets/tono-processor.js`, en el hilo de audio, porque los worklets se
 * cargan por URL y no por import (ver docs/01-ARQUITECTURA.md).
 *
 * Esta copia existe por una razón concreta: ningún navegador —ni Chrome, ni Edge, ni
 * Firefox— expone `performance` dentro del `AudioWorkletGlobalScope`, así que el worklet
 * no puede cronometrarse a sí mismo. Para saber lo que cuesta el algoritmo hay que
 * ejecutarlo donde sí hay reloj. Ver T0.4 en docs/07-ROADMAP.md.
 *
 * Que haya dos copias del mismo algoritmo es una deuda aceptada a conciencia, y por eso
 * `tests/nsdf.test.ts` carga el worklet de verdad y comprueba que las dos dan el mismo
 * resultado sobre la misma señal. Si alguien toca una y no la otra, el test lo dice.
 */

export interface ResultadoNsdf {
  hz: number;
  claridad: number;
}

/** Por debajo de este RMS es silencio o ruido de sala, no una nota. */
export const RMS_MINIMO = 0.01;

/**
 * Se analiza a un cuarto de la frecuencia de muestreo. Dos motivos, y el segundo pesa
 * más que el primero:
 *
 *  1. El NSDF es O(N²). A 48 kHz la ventana de 1024 cuesta 1,33 ms por análisis, el
 *     12,5 % de un núcleo en un PC de sobremesa. Diezmando por 4 la ventana baja a 256
 *     para el mismo tramo de tiempo y el coste a 0,19 ms: el 1,7 %.
 *  2. **El filtro paso bajo quita ruido que confundía al detector.** Medido: con ruido
 *     blanco al 30 %, sin diezmar el error llega a 3367 cents —una nota inventada— y aun
 *     así declara claridad 0,871, por encima del umbral de 0,85 que la dejaría pasar al
 *     niño. Diezmando, el peor error es de 5 cents. En un aula ruidosa esto no es una
 *     optimización, es la diferencia entre funcionar y mentir.
 *
 * El factor 4 deja Nyquist en 6 kHz, de sobra para una fundamental infantil que no pasa
 * de 660 Hz (E5, techo de la tesitura de 3.er ciclo en tools/validar.py).
 */
export const FACTOR_DIEZMADO = 4;

const TAPS = 25;

/** Sinc enventanado con Hann, normalizado a ganancia 1 en continua. */
function coeficientes(taps: number, corte: number): Float32Array {
  const h = new Float32Array(taps);
  const medio = (taps - 1) / 2;
  let suma = 0;
  for (let i = 0; i < taps; i++) {
    const k = i - medio;
    const sinc = k === 0 ? 2 * corte : Math.sin(2 * Math.PI * corte * k) / (Math.PI * k);
    const ventana = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1));
    h[i] = sinc * ventana;
    suma += h[i]!;
  }
  for (let i = 0; i < taps; i++) h[i]! /= suma;
  return h;
}

// El 0,9 deja margen antes de Nyquist para que la banda de transición no pliegue.
const FIR = coeficientes(TAPS, (0.5 / FACTOR_DIEZMADO) * 0.9);

/** Filtra y submuestrea en una pasada: solo se calculan las salidas que se conservan. */
export function decimar(x: Float32Array, factor = FACTOR_DIEZMADO): Float32Array {
  if (factor <= 1) return x;
  const n = Math.floor(x.length / factor);
  const y = new Float32Array(n);
  const medio = (TAPS - 1) >> 1;
  for (let j = 0; j < n; j++) {
    const centro = j * factor;
    let acc = 0;
    for (let k = 0; k < TAPS; k++) {
      const idx = centro + k - medio;
      if (idx >= 0 && idx < x.length) acc += FIR[k]! * x[idx]!;
    }
    y[j] = acc;
  }
  return y;
}

export function analizarNsdf(
  entrada: Float32Array,
  frecuenciaMuestreo: number,
  rmsMinimo = RMS_MINIMO,
): ResultadoNsdf {
  // El gating va sobre la señal ORIGINAL: el filtro atenúa lo agudo y bajaría el RMS.
  let suma = 0;
  for (let i = 0; i < entrada.length; i++) suma += entrada[i]! * entrada[i]!;
  if (Math.sqrt(suma / entrada.length) < rmsMinimo) return { hz: 0, claridad: 0 };

  const x = decimar(entrada);
  const tasa = frecuenciaMuestreo / FACTOR_DIEZMADO;
  const N = x.length;

  // Función de diferencia cuadrática normalizada.
  const maxTau = Math.floor(N / 2);
  const nsdf = new Float32Array(maxTau);
  for (let tau = 0; tau < maxTau; tau++) {
    let ac = 0;
    let m = 0;
    for (let i = 0; i < N - tau; i++) {
      ac += x[i]! * x[i + tau]!;
      m += x[i]! * x[i]! + x[i + tau]! * x[i + tau]!;
    }
    nsdf[tau] = m > 0 ? (2 * ac) / m : 0;
  }

  // Primer máximo por encima del umbral relativo: así se evita el error de octava.
  let tau = 2;
  while (tau < maxTau && nsdf[tau]! > 0) tau++; // saltar el pico en tau=0
  let mejorTau = -1;
  let mejorValor = 0;
  for (; tau < maxTau - 1; tau++) {
    if (nsdf[tau]! > nsdf[tau - 1]! && nsdf[tau]! >= nsdf[tau + 1]!) {
      if (nsdf[tau]! > mejorValor) {
        mejorValor = nsdf[tau]!;
        mejorTau = tau;
      }
      if (mejorValor > 0.9) break;
    }
  }

  if (mejorTau < 0 || mejorValor < 0.5) return { hz: 0, claridad: 0 };

  // Interpolación parabólica: imprescindible aquí. Al diezmar hay menos muestras por
  // periodo, así que sin ella el error en agudos sería de decenas de cents.
  const y0 = nsdf[mejorTau - 1]!;
  const y1 = nsdf[mejorTau]!;
  const y2 = nsdf[mejorTau + 1]!;
  const ajuste = (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2 || 1);
  const tauFinal = mejorTau + ajuste;

  return { hz: tasa / tauFinal, claridad: mejorValor };
}

/**
 * Señal de prueba: una nota con armónicos, que es lo que canta un niño de verdad — un
 * seno puro no existe fuera de un laboratorio y haría que el detector pareciera mejor.
 *
 * `ruido` añade ruido blanco reproducible, para poder probar el caso real: un aula.
 */
export function señalSintetica(
  hz: number,
  frecuenciaMuestreo: number,
  n: number,
  ruido = 0,
  semilla = 1,
): Float32Array {
  // Generador propio y determinista: Math.random haría los tests irrepetibles.
  let s = semilla;
  const aleatorio = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x7fffffff) * 2 - 1;
  };
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / frecuenciaMuestreo;
    x[i] =
      0.6 * Math.sin(2 * Math.PI * hz * t) +
      0.25 * Math.sin(2 * Math.PI * 2 * hz * t) +
      0.1 * Math.sin(2 * Math.PI * 3 * hz * t) +
      ruido * aleatorio();
  }
  return x;
}
