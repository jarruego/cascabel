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

export function analizarNsdf(
  x: Float32Array,
  frecuenciaMuestreo: number,
  rmsMinimo = RMS_MINIMO,
): ResultadoNsdf {
  const N = x.length;

  let suma = 0;
  for (let i = 0; i < N; i++) suma += x[i]! * x[i]!;
  const rms = Math.sqrt(suma / N);
  if (rms < rmsMinimo) return { hz: 0, claridad: 0 };

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

  // Interpolación parabólica: sin ella el error es de varios cents en agudos.
  const y0 = nsdf[mejorTau - 1]!;
  const y1 = nsdf[mejorTau]!;
  const y2 = nsdf[mejorTau + 1]!;
  const ajuste = (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2 || 1);
  const tauFinal = mejorTau + ajuste;

  return { hz: frecuenciaMuestreo / tauFinal, claridad: mejorValor };
}

/** Señal de prueba: una nota con armónicos, que es lo que canta un niño de verdad. */
export function señalSintetica(hz: number, frecuenciaMuestreo: number, n: number): Float32Array {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / frecuenciaMuestreo;
    x[i] =
      0.6 * Math.sin(2 * Math.PI * hz * t) +
      0.25 * Math.sin(2 * Math.PI * 2 * hz * t) +
      0.1 * Math.sin(2 * Math.PI * 3 * hz * t);
  }
  return x;
}
