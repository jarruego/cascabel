/**
 * Cuánto dura algo, dicho como lo diría una persona.
 *
 * Vive aquí y no en la pantalla del itinerario por lo de siempre: es una regla de producto
 * —cuándo se pasa de minutos a horas, y qué se hace con una hora justa— y una regla de
 * producto se prueba. En el componente sería un `if` sin test que alguien copiaría al
 * siguiente sitio que necesite lo mismo.
 *
 * **No es un marcador.** Ninguna de estas cifras dice lo que el niño ha hecho: dicen lo que
 * el maestro va a necesitar, que es planificación y no puntuación (`CLAUDE.md` §4).
 */

/** Una duración lista para `t()`: la clave del texto y sus huecos. */
export interface Duracion {
  clave: string;
  valores: Record<string, number>;
}

/**
 * Minutos → texto.
 *
 * Por debajo de la hora se dicen los minutos y ya está. Por encima, «2 h 15 min», porque
 * «135 min» obliga a dividir mentalmente justo cuando lo que se está haciendo es cuadrar una
 * clase de cuarenta y cinco. Y la hora justa se dice «2 h», sin el «0 min» que delata que
 * esto lo escribió una máquina.
 */
export function duracionLegible(minutos: number): Duracion {
  const enteros = Math.max(0, Math.round(minutos));
  if (enteros < 60) return { clave: 'duracion.minutos', valores: { n: enteros } };
  const h = Math.floor(enteros / 60);
  const m = enteros % 60;
  return m === 0
    ? { clave: 'duracion.horasJustas', valores: { h } }
    : { clave: 'duracion.horas', valores: { h, m } };
}
