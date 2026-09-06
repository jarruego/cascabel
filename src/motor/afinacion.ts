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

/**
 * Desviación en cents respecto a la nota pedida, **plegada a la octava más cercana**.
 *
 * Esto no es un refinamiento, es corregir un fallo: sin plegar, un adulto que canta la
 * nota correcta una octava por debajo —que es lo natural en una voz masculina— daba
 * −1200 cents y la aguja se iba al tope. Musicalmente estaba cantando la nota; el código
 * decía que no.
 *
 * Y con niños pasa igual en el otro sentido: una voz infantil sube con facilidad a la
 * octava de arriba sin querer. **Cantar la nota en tu octava es cantar la nota.** Lo que
 * se evalúa aquí es la altura dentro de la octava, no en qué registro cae.
 *
 * El resultado queda siempre en [-600, +600): más de seis semitonos de distancia significa
 * que la octava de al lado está más cerca.
 */
export function desviacionEnCents(midi: number, midiObjetivo: number): number {
  const semitonos = midi - midiObjetivo;
  // Resto positivo: el % de JavaScript conserva el signo del dividendo y aquí estorba.
  const dentroDeOctava = ((semitonos % 12) + 12) % 12;
  const plegado = dentroDeOctava > 6 ? dentroDeOctava - 12 : dentroDeOctava;
  return plegado * 100;
}

/**
 * Un semitono son 100 cents. Estas ventanas salen de práctica coral infantil.
 *
 * **Y ahora van por carril**, porque el autor probó la actividad y la encontró difícil. La
 * pregunta era si acortar el tiempo que hay que mantener la nota o ensanchar la ventana, y
 * la respuesta es lo segundo, por dos motivos:
 *
 *  - **La ventana es lo que estaba mal calibrado.** Medio semitono es generoso para un
 *    adulto y estrecho para un niño: una voz infantil es inestable por construcción, y un
 *    niño de seis años que canta 70 cents bajo **ha encontrado la nota** —no está cantando
 *    otra—. Penalizarlo mide su control muscular, no su oído.
 *  - **El tiempo es lo que enseña.** Los 800 ms son ya poco más que una nota cómoda.
 *    Bajarlos dejaría que un barrido de voz que pasa por encima de la altura contara como
 *    acierto, y entonces el «¡la has cazado!» sería mentira.
 *
 * **El techo es 100 y no se toca.** A ±100 cents estás a un semitono: eso ya es otra nota,
 * y darla por buena enseñaría algo falso. Por eso ni el carril más generoso llega ahí.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: los tres números salen de que la precisión de canto
 * infantil mejora con la edad, que es lo convencional en la literatura coral, pero **dónde
 * poner cada uno lo dice una maestra oyendo a un niño**, no un desarrollador.
 */
export const VENTANAS_POR_CARRIL = {
  infantil: { afinado: 90, casi: 100 },
  lectores: { afinado: 70, casi: 100 },
  autonomos: { afinado: 50, casi: 100 },
} as const;

/** Ventana por defecto, para quien no declare carril. Es la del tramo de en medio. */
export const VENTANAS_CENTS = VENTANAS_POR_CARRIL.lectores;

export function ventanasDe(carril: keyof typeof VENTANAS_POR_CARRIL): {
  afinado: number;
  casi: number;
} {
  return VENTANAS_POR_CARRIL[carril] ?? VENTANAS_CENTS;
}

/** Por debajo de esto no cantó lo suficiente como para evaluar nada. */
const COBERTURA_MINIMA = 0.35;
/** Por encima de esto no sostiene la nota, aunque la media salga bien. */
const DESVIACION_MAXIMA = 45;

/**
 * @param lecturas cents respecto a la nota objetivo; `null` donde no había señal
 */
export function evaluarAfinacion(
  lecturas: Array<number | null>,
  /**
   * Carril del niño. **No es un detalle**: la misma desviación significa cosas distintas
   * según la edad. Setenta cents bajo y clavado es «afinado» en Infantil —la voz de un niño
   * de cuatro años no da más precisión— y es «estable pero transportado» en 5.º y 6.º, donde
   * eso ya se puede corregir. Sin el carril, la evaluación miente para dos tercios de los
   * usuarios.
   */
  carril: keyof typeof VENTANAS_POR_CARRIL = 'lectores',
): EvaluacionAfinacion {
  const ventanas = ventanasDe(carril);
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
    abs <= ventanas.afinado && estable
      ? 'afinado'
      : abs <= ventanas.casi || estable
        ? 'casi'
        : 'lejos';

  return {
    centsMedios,
    desviacionCents,
    cobertura,
    calidad,
    // Estable pero fuera de la ventana: sabe sostener y solo está transportando.
    establePeroTransportado: estable && abs > ventanas.afinado,
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
