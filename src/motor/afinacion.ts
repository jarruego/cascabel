/**
 * Evaluación de afinación: convierte una nube de lecturas del detector de tono en algo
 * que se le pueda decir a un niño.
 *
 * La idea central es la misma que en la evaluación rítmica: **el promedio y la estabilidad
 * son dos cosas distintas y hay que separarlas**. Un niño que canta 40 cents bajo pero
 * quietísimo tiene un oído estupendo y solo está transportando; uno que oscila 60 cents
 * arriba y abajo acierta la media y no sostiene la nota. Decirles lo mismo a los dos es
 * mentirles a los dos.
 */

export type CalidadAfinacion = 'afinado' | 'casi' | 'lejos' | 'sin-senal';

export interface EvaluacionAfinacion {
  /** Desviación media respecto a la nota objetivo, con signo. Positivo = alto. */
  centsMedios: number;
  /** Cuánto oscila. Es lo que distingue «desafina» de «no sostiene». */
  desviacionCents: number;
  /** Fracción del tiempo con señal utilizable, de 0 a 1. */
  cobertura: number;
  calidad: CalidadAfinacion;
  /** true cuando canta estable pero transportado: hay que felicitarle, no corregirle. */
  establePeroTransportado: boolean;
}

/** Un semitono son 100 cents. Estas ventanas salen de práctica coral infantil. */
export const VENTANAS_CENTS = {
  /** Dentro de esto, para un niño, está afinado. Un adulto entrenado afina a ±10. */
  afinado: 50,
  casi: 100,
} as const;

/** Por debajo de esto no cantó lo suficiente como para evaluar nada. */
const COBERTURA_MINIMA = 0.35;
/** Por encima de esto no sostiene la nota, aunque la media salga bien. */
const DESVIACION_MAXIMA = 45;

/**
 * @param lecturas cents respecto a la nota objetivo; `null` donde no había señal
 */
export function evaluarAfinacion(lecturas: Array<number | null>): EvaluacionAfinacion {
  const validas = lecturas.filter((c): c is number => c !== null);
  const cobertura = lecturas.length ? validas.length / lecturas.length : 0;

  if (validas.length === 0 || cobertura < COBERTURA_MINIMA) {
    return {
      centsMedios: 0,
      desviacionCents: 0,
      cobertura,
      calidad: 'sin-senal',
      establePeroTransportado: false,
    };
  }

  // Mediana y no media: una sola lectura disparatada —un error de octava, una silla que
  // chirría— arrastraría la media entera y no debe.
  const orden = [...validas].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  const centsMedios =
    orden.length % 2 ? orden[mitad]! : (orden[mitad - 1]! + orden[mitad]!) / 2;

  const varianza =
    validas.reduce((a, c) => a + (c - centsMedios) ** 2, 0) / validas.length;
  const desviacionCents = Math.sqrt(varianza);

  const abs = Math.abs(centsMedios);
  const estable = desviacionCents <= DESVIACION_MAXIMA;

  const calidad: CalidadAfinacion =
    abs <= VENTANAS_CENTS.afinado && estable
      ? 'afinado'
      : abs <= VENTANAS_CENTS.casi || estable
        ? 'casi'
        : 'lejos';

  return {
    centsMedios,
    desviacionCents,
    cobertura,
    calidad,
    // Estable pero fuera de la ventana: sabe sostener y solo está transportando.
    establePeroTransportado: estable && abs > VENTANAS_CENTS.afinado,
  };
}

/**
 * Clave del mensaje que ve el niño. **Nunca «has desafinado».**
 *
 * Se le dice hacia dónde moverse, que es accionable, en vez de qué ha hecho mal, que no lo
 * es. Es la regla 7 de `docs/04-DISENO-UI.md`: el mensaje repara, no juzga.
 */
export function mensajeAfinacion(e: EvaluacionAfinacion): string {
  if (e.calidad === 'sin-senal') return 'cantar.noTeOigo';
  if (e.calidad === 'afinado') return 'cantar.afinado';
  if (e.establePeroTransportado) {
    return e.centsMedios > 0 ? 'cantar.establePeroAlto' : 'cantar.establePeroBajo';
  }
  if (e.desviacionCents > DESVIACION_MAXIMA) return 'cantar.sostenLaNota';
  return e.centsMedios > 0 ? 'cantar.masBajo' : 'cantar.masAlto';
}
