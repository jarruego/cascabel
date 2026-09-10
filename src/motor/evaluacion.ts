import { TOLERANCIA_MS, toleranciaDeEtapa, type Carril, type Etapa } from '@/config';

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
  /** Golpes que no cayeron en ningún hueco: los de más. Aporrear los dispara. */
  sobrantes: number;
  desvioMedioMs: number;
  desviacionTipicaMs: number;
  /** true cuando el niño es regular pero va desplazado: hay que felicitarle, no corregirle. */
  regularPeroDesfasado: boolean;
}

/**
 * La tolerancia va por CARRIL (edad), no por etapa (ciclo LOMLOE): mide control motor.
 * Se admite una etapa por comodidad, y entonces se usa la ventana más generosa de los
 * carriles que puedan abrirla. Ver la decisión en `src/config.ts`.
 */
function ventana(quien: Carril | Etapa) {
  return quien in TOLERANCIA_MS
    ? TOLERANCIA_MS[quien as Carril]
    : toleranciaDeEtapa(quien as Etapa);
}

export function calidadDe(errorMs: number, quien: Carril | Etapa): Calidad {
  const t = ventana(quien);
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
  quien: Carril | Etapa,
): EvaluacionRitmica {
  const limite = ventana(quien).casi;

  /*
    Los golpes se reparten EN ORDEN, no «cada hueco coge el golpe más cercano».

    Con el reparto por cercanía, aporrear la pantalla sin ritmo lo acertaba todo: entre
    tantos golpes, siempre había uno dentro de cada ventana. El autor lo vio el 2026-09-10
    en «Ritmo de ocho». Ahora cada golpe se compara con el primer hueco que aún no ha
    pasado, y solo hay tres cosas que pueda ser:

     - dentro de la ventana: es su golpe, y se puntúa;
     - antes de tiempo: **quema** el hueco. Se queda en gris, sin golpe, y los golpes que
       lleguen después para ese mismo hueco sobran —no lo recuperan ni queman el siguiente,
       que sería castigar dos veces un solo adelanto—;
     - cuando ya no queda hueco por venir: sobra.

    Un hueco cuya ventana pasa sin golpe se queda «fuera», como siempre.
  */
  const golpes = [...realesMs].sort((a, b) => a - b);
  type Emparejado = EvaluacionRitmica['emparejados'][number];
  const emparejados: Emparejado[] = esperadosMs.map((esperado) => ({
    esperadoMs: esperado,
    realMs: null,
    errorMs: null,
    calidad: 'fuera' as Calidad,
  }));
  const quemados = new Set<number>();
  let sobrantes = 0;
  let j = 0;
  for (const golpe of golpes) {
    // Los huecos cuya ventana ya ha pasado se quedan atrás, con lo que tuvieran.
    while (j < esperadosMs.length && golpe > esperadosMs[j]! + limite) j++;
    if (j >= esperadosMs.length || quemados.has(j)) {
      sobrantes++;
      continue;
    }
    const error = golpe - esperadosMs[j]!;
    if (error < -limite) {
      quemados.add(j);
      continue;
    }
    emparejados[j] = { esperadoMs: esperadosMs[j]!, realMs: golpe, errorMs: error, calidad: calidadDe(error, quien) };
    j++;
  }

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

  const t = ventana(quien);
  return {
    emparejados,
    aciertos: emparejados.filter((e) => e.calidad === 'perfecto' || e.calidad === 'bien').length,
    sobrantes,
    desvioMedioMs,
    desviacionTipicaMs,
    regularPeroDesfasado:
      errores.length >= 3 && desviacionTipicaMs <= t.perfecto / 2 && Math.abs(desvioMedioMs) > t.perfecto,
  };
}

/**
 * Cuántas hay que coger para que la tarjeta felicite en vez de sugerir otra vuelta.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: el número. Que tenga que haber un punto a partir del
 * cual se felicita es claro —si no, «bien» no significaría nada—; que ese punto sean seis de
 * cada diez es una elección, y quien puede decir si a los siete años eso es exigente o
 * blando es una maestra viendo a la clase, no un desarrollador.
 *
 * Vive aquí y no en el componente porque decide tres cosas a la vez —el color de la tarjeta,
 * el texto y si se añade la pista— y estaba escrito tres veces en la misma pantalla. Así es
 * como se acaba con un color que dice una cosa y un texto que dice otra, que es justo lo que
 * pasó en «Canta la nota».
 */
export const PARA_FELICITAR = 0.8;

/**
 * ¿Se felicita, o se sugiere otra vuelta?
 *
 * Ocho de cada diez desde el 2026-09-10 —eran seis—: el autor vio que «aunque falle un
 * poco» todo salía «bien» en el cierre de la serie, y «casi» no es un castigo, es el
 * ejercicio que conviene repetir. Y los golpes de más cuentan en contra: quien acierta
 * ocho de diez huecos aporreando veinte veces no ha seguido el ritmo.
 */
export function bastanteBien(aciertos: number, total: number, sobrantes = 0): boolean {
  return total > 0 && aciertos / total >= PARA_FELICITAR && sobrantes <= total / 2;
}

/** Diferencia en cents entre lo cantado y lo esperado. Positivo = el niño va alto. */
export function desviacionCents(midiCantado: number, midiObjetivo: number): number {
  return (midiCantado - midiObjetivo) * 100;
}
