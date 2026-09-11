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
    // Regular pero desfasado solo si ha dado TODOS los golpes: con uno perdido no hay
    // pulso regular que felicitar, hay un fallo. Antes bastaban tres golpes parecidos.
    regularPeroDesfasado:
      errores.length === esperadosMs.length &&
      errores.length >= 3 &&
      desviacionTipicaMs <= t.perfecto / 2 &&
      Math.abs(desvioMedioMs) > t.perfecto,
  };
}

/** Lo que ve el niño en cada hueco mientras responde. `casi`: dentro de la ventana ancha, pero no cuenta. */
export type MarcaEnVivo = 'pendiente' | 'acertado' | 'casi' | 'pasado' | 'quemado';

/**
 * Qué hace un golpe con el patrón mientras el niño responde: la misma regla que
 * `evaluarRitmo`, pero de un golpe en uno. Devuelve el hueco y lo que le pasa, o `null` si
 * el golpe sobra.
 *
 * Estaba escrita aparte en el componente y se había separado de la de arriba: encendía en
 * verde todo lo que caía en la ventana ancha (`casi`), y al final solo contaban `perfecto`
 * y `bien`. El autor lo vio el 2026-09-12 en «Palmea el ritmo»: «se marcan verdes los pulsos
 * acertados pero luego me da un feedback de que casi acierto». Ahora el verde es lo que
 * cuenta, y lo que cae en la ventana ancha se marca a medias, como lo que es.
 */
export function marcaDeGolpe(
  esperadosMs: readonly number[],
  marcas: readonly MarcaEnVivo[],
  golpeMs: number,
  quien: Carril | Etapa,
): { indice: number; marca: 'acertado' | 'casi' | 'quemado' } | null {
  const limite = ventana(quien).casi;
  // El primer hueco que no tiene ya su golpe y cuya ventana no ha pasado: es el `j` de
  // `evaluarRitmo`. Un hueco quemado sigue siendo «el siguiente» hasta que pasa su ventana.
  const indice = esperadosMs.findIndex(
    (e, i) => marcas[i] !== 'acertado' && marcas[i] !== 'casi' && golpeMs <= e + limite,
  );
  if (indice === -1 || marcas[indice] === 'quemado') return null;
  if (golpeMs < esperadosMs[indice]! - limite) return { indice, marca: 'quemado' };
  const calidad = calidadDe(golpeMs - esperadosMs[indice]!, quien);
  return { indice, marca: calidad === 'casi' ? 'casi' : 'acertado' };
}

/**
 * Qué se le dice al niño al acabar una vuelta. Es UNA regla, y la usan el mensaje del
 * personaje y la calidad que se anota en la serie: el autor vio el 2026-09-10 que en
 * «Ritmo de ocho» fallaba un pulso, el personaje decía «¡muy bien!» y el cierre de la serie
 * decía «casi». Pasaba porque el mensaje miraba solo la desviación típica —que con un golpe
 * perdido sale hasta más pequeña, porque hay un error menos que dispersa— y el cierre miraba
 * los aciertos. Ahora los dos salen de aquí.
 *
 *  - `regularTarde` / `regularPronto`: todos los golpes, muy juntos, todos desplazados.
 *    Es buen pulso: cuenta como bien y se le dice dónde está el desfase.
 *  - `faltan`: no ha llegado a los aciertos que perdona `fallosPermitidos`.
 *  - `sobran`: aciertos de sobra, pero más de la mitad de los golpes fuera de todo hueco.
 *  - `masRegular`: aciertos de sobra, pero a saltos.
 *  - `bien`: lo demás.
 */
export type MensajeRitmico = 'bien' | 'regularTarde' | 'regularPronto' | 'faltan' | 'sobran' | 'masRegular';

/** Con más dispersión que esto, aun acertando, se sugiere ir más regular. */
export const DISPERSION_MAXIMA_MS = 90;

export function mensajeRitmico(evaluacion: EvaluacionRitmica, total: number): MensajeRitmico {
  const { aciertos, sobrantes, desvioMedioMs, desviacionTipicaMs, regularPeroDesfasado } = evaluacion;
  if (regularPeroDesfasado) return desvioMedioMs > 0 ? 'regularTarde' : 'regularPronto';
  if (total <= 0 || aciertos < total - fallosPermitidos(total)) return 'faltan';
  if (!bastanteBien(aciertos, total, sobrantes)) return 'sobran';
  return desviacionTipicaMs < DISPERSION_MAXIMA_MS ? 'bien' : 'masRegular';
}

/** La calidad que se anota en la serie a partir del mensaje. El buen pulso desfasado es «bien». */
export function calidadDeMensaje(mensaje: MensajeRitmico): 'bien' | 'casi' {
  return mensaje === 'bien' || mensaje === 'regularTarde' || mensaje === 'regularPronto' ? 'bien' : 'casi';
}

/**
 * Cuánto se puede fallar para que aun así se felicite: un golpe de cada cinco.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: el número. Que tenga que haber un punto a partir del
 * cual se felicita es claro —si no, «bien» no significaría nada—; que ese punto sea un
 * fallo de cada cinco es una elección del autor (2026-09-10), y quien puede decir si a los
 * siete años eso es exigente o blando es una maestra viendo a la clase.
 *
 * **Se cuenta en fallos permitidos, no en porcentaje de aciertos**, y la diferencia se ve
 * en los patrones cortos: con cuatro pulsos, un fallo es el 25 % y no se perdona; con ocho,
 * se perdona uno; con doce, dos. La parte entera, siempre hacia abajo.
 *
 * Vive aquí y no en el componente porque decide tres cosas a la vez —el color de la tarjeta,
 * el texto y si se añade la pista— y estaba escrito tres veces en la misma pantalla.
 */
export const FALLO_MAXIMO = 0.2;

/** Cuántos golpes se pueden fallar en un patrón de `total`. */
export function fallosPermitidos(total: number): number {
  return Math.floor(total * FALLO_MAXIMO);
}

/**
 * ¿Se felicita, o se sugiere otra vuelta?
 *
 * Con un fallo de cada cinco como mucho, y los golpes de más cuentan en contra: quien
 * acierta ocho de diez huecos aporreando veinte veces no ha seguido el ritmo.
 */
export function bastanteBien(aciertos: number, total: number, sobrantes = 0): boolean {
  return total > 0 && aciertos >= total - fallosPermitidos(total) && sobrantes <= total / 2;
}

/** Diferencia en cents entre lo cantado y lo esperado. Positivo = el niño va alto. */
export function desviacionCents(midiCantado: number, midiObjetivo: number): number {
  return (midiCantado - midiObjetivo) * 100;
}
