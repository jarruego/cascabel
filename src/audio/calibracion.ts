import { latenciaMs } from './AudioEngine';

/**
 * Calibración manual de latencia: «da tres palmadas al ritmo».
 *
 * Por qué hace falta, con números medidos el 2026-09-06: Chromium declara 52 ms de latencia
 * en un PC de sobremesa, y la ventana de «perfecto» de 9-12 años es de ±70 ms. Sin
 * compensar, la latencia se come el 74 % del margen y un niño con pulso excelente sale como
 * fallo. Y las cifras del navegador tampoco bastan: **Firefox declara `baseLatency = 0`**,
 * que no es una latencia buena sino un dato ausente, así que ahí compensamos de menos.
 *
 * Por eso la calibración manual es la fuente de verdad y `latenciaMs()` solo el punto de
 * partida: mide el bucle COMPLETO —salida de audio, altavoz, aire, oído, mano, pantalla—,
 * no solo lo que el navegador sabe de sí mismo.
 */

export interface ResultadoCalibracion {
  /** Desvío medio con signo. Positivo = el niño llega tarde = hay que compensar más. */
  desvioMs: number;
  desviacionTipicaMs: number;
  golpes: number;
  /** Si la desviación es alta, el ajuste no es de fiar y conviene repetir. */
  fiable: boolean;
}

/** Por debajo de esta regularidad, el usuario no marcaba el pulso: marcaba cualquier cosa. */
const DESVIACION_MAXIMA_MS = 60;
/** Ajuste máximo aceptable. Más que esto es que algo va mal, no que el equipo sea lento. */
export const AJUSTE_MAXIMO_MS = 300;

/**
 * Compara los golpes del usuario con la rejilla esperada.
 *
 * @param golpesMs    instantes en que el usuario tocó, en ms del mismo reloj
 * @param esperadosMs instantes de los pulsos, ya en ms
 */
export function calcularCalibracion(
  golpesMs: number[],
  esperadosMs: number[],
): ResultadoCalibracion {
  const n = Math.min(golpesMs.length, esperadosMs.length);
  if (n === 0) {
    return { desvioMs: 0, desviacionTipicaMs: 0, golpes: 0, fiable: false };
  }

  const errores = Array.from({ length: n }, (_, i) => golpesMs[i]! - esperadosMs[i]!);
  const media = errores.reduce((a, b) => a + b, 0) / n;
  const varianza = errores.reduce((a, e) => a + (e - media) ** 2, 0) / n;
  const desviacion = Math.sqrt(varianza);

  return {
    desvioMs: media,
    desviacionTipicaMs: desviacion,
    golpes: n,
    // Tres golpes son el mínimo para que la desviación signifique algo.
    fiable: n >= 3 && desviacion <= DESVIACION_MAXIMA_MS,
  };
}

/**
 * Ajuste que hay que guardar, a partir de la calibración y de lo que ya sabe el navegador.
 *
 * El desvío medido incluye la latencia que `latenciaMs()` ya compensa, así que el ajuste
 * es la diferencia: lo que el navegador NO sabía. En Firefox, donde `baseLatency` es 0,
 * esa diferencia sale mayor, que es exactamente lo que se busca.
 */
export function ajusteDesdeCalibracion(desvioMs: number, yaCompensadoMs = latenciaMs()): number {
  const bruto = desvioMs - yaCompensadoMs;
  return Math.max(-AJUSTE_MAXIMO_MS, Math.min(AJUSTE_MAXIMO_MS, Math.round(bruto)));
}

/**
 * Mensaje para el usuario. Nunca dice «has fallado»: la calibración no evalúa a nadie, y
 * quien la hace suele ser el maestro.
 */
export function mensajeCalibracion(r: ResultadoCalibracion): string {
  if (r.golpes < 3) return 'calibracion.pocosGolpes';
  if (!r.fiable) return 'calibracion.irregular';
  return 'calibracion.hecha';
}
