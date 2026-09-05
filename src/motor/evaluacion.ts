import { TOLERANCIA_MS, type Etapa } from '@/config';

/**
 * Evaluación rítmica.
 *
 * La idea central de todo el proyecto en una función: un niño que da TODAS las
 * palmadas 120 ms tarde pero con una desviación de 20 ms tiene un pulso excelente,
 * solo desfasado. Un porcentaje de acierto le diría que ha fallado. Por eso aquí se
 * devuelven siempre el desvío medio CON SIGNO y la desviación típica, y el mensaje
 * que ve el niño se construye a partir de esos dos números, no del porcentaje.
 */

export type Calidad = 'perfecto' | 'bien' | 'casi' | 'fuera';

export interface EvaluacionRitmica {
  emparejados: Array<{ esperadoMs: number; realMs: number | null; errorMs: number | null; calidad: Calidad }>;
  aciertos: number;
  desvioMedioMs: number;
  desviacionTipicaMs: number;
  /** true cuando el niño es regular pero va desplazado: hay que felicitarle, no corregirle. */
  regularPeroDesfasado: boolean;
}

export function calidadDe(errorMs: number, etapa: Etapa): Calidad {
  const t = TOLERANCIA_MS[etapa];
  const abs = Math.abs(errorMs);
  if (abs <= t.perfecto) return 'perfecto';
  if (abs <= t.bien) return 'bien';
  if (abs <= t.casi) return 'casi';
  return 'fuera';
}

/**
 * @param esperadosMs instantes de la rejilla, ya compensados con la latencia de salida
 * @param realesMs    instantes detectados (toque u onset del micrófono)
 */
export function evaluarRitmo(
  esperadosMs: number[],
  realesMs: number[],
  etapa: Etapa,
): EvaluacionRitmica {
  const disponibles = [...realesMs];
  const limite = TOLERANCIA_MS[etapa].casi;

  const emparejados = esperadosMs.map((esperado) => {
    let mejorIndice = -1;
    let mejorError = Infinity;
    disponibles.forEach((real, i) => {
      const error = real - esperado;
      if (Math.abs(error) < Math.abs(mejorError) && Math.abs(error) <= limite) {
        mejorError = error;
        mejorIndice = i;
      }
    });
    if (mejorIndice === -1) {
      return { esperadoMs: esperado, realMs: null, errorMs: null, calidad: 'fuera' as Calidad };
    }
    const real = disponibles.splice(mejorIndice, 1)[0]!;
    return {
      esperadoMs: esperado,
      realMs: real,
      errorMs: mejorError,
      calidad: calidadDe(mejorError, etapa),
    };
  });

  const errores = emparejados
    .map((e) => e.errorMs)
    .filter((e): e is number => e !== null);

  const desvioMedioMs = errores.length
    ? errores.reduce((a, b) => a + b, 0) / errores.length
    : 0;
  const varianza = errores.length
    ? errores.reduce((a, b) => a + (b - desvioMedioMs) ** 2, 0) / errores.length
    : 0;
  const desviacionTipicaMs = Math.sqrt(varianza);

  const t = TOLERANCIA_MS[etapa];
  return {
    emparejados,
    aciertos: emparejados.filter((e) => e.calidad === 'perfecto' || e.calidad === 'bien').length,
    desvioMedioMs,
    desviacionTipicaMs,
    regularPeroDesfasado:
      errores.length >= 3 && desviacionTipicaMs <= t.perfecto / 2 && Math.abs(desvioMedioMs) > t.perfecto,
  };
}

/** Diferencia en cents entre lo cantado y lo esperado. Positivo = el niño va alto. */
export function desviacionCents(midiCantado: number, midiObjetivo: number): number {
  return (midiCantado - midiObjetivo) * 100;
}
