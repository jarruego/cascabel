/**
 * Un bucle que no pierde el pulso.
 *
 * ## El fallo que arregla
 *
 * Lo oyó el autor: «las actividades que ponen un sonido en bucle no mantienen el ritmo al
 * reiniciar». Y no era una impresión, era aritmética. Las dos actividades que dan vueltas
 * —el musicograma y la rejilla— relanzaban la reproducción al acabar cada vuelta, y el
 * relanzamiento salía **desde el instante en que ocurría**, con un margen para tener el
 * sonido cargado: medio segundo en una, 270 ms en la otra. Ese margen es correcto la primera
 * vez y es una costura todas las demás, porque no es ni un pulso ni medio: es tiempo que no
 * pertenece al compás.
 *
 * ## La regla
 *
 * **El reloj manda, no los eventos.** Hay un solo instante de salida y la vuelta número N
 * empieza exactamente en `inicio + N × duración`. Sumar, no preguntar qué hora es. Así no
 * hay hueco por construcción, y el error no se acumula por muchas vueltas que den.
 *
 * ## Por qué no se programan todas de golpe
 *
 * Porque el niño puede parar en la primera, y porque en la rejilla —que es un editor— lo que
 * cambie a mitad de vuelta tiene que sonar en la siguiente. Así que se encola poco por
 * delante, unos décimas de segundo, y se vuelve a mirar. Es el mismo *lookahead* del
 * metrónomo, que es lo que `CLAUDE.md` §7 pide para todo lo que suena.
 *
 * Estas funciones son la aritmética, sin audio y sin React, para poder probarla.
 */

export interface Vuelta {
  /** Instante de salida de la primera vuelta, en milisegundos del reloj de audio. */
  inicio: number;
  /** Lo que dura una vuelta entera, en milisegundos. */
  duracionVuelta: number;
  /** El instante actual, en milisegundos del mismo reloj. */
  ahora: number;
}

/**
 * Cuántas vueltas deberían estar ya encoladas.
 *
 * Devuelve el número total, no cuántas faltan: quien llama lleva la cuenta de las que ya
 * programó y encola la diferencia. Así una pausa larga del hilo principal —una pestaña en
 * segundo plano— no se traduce en vueltas perdidas ni repetidas.
 */
export function vueltasEncoladas(v: Vuelta, adelantoMs: number): number {
  if (v.duracionVuelta <= 0) return 0;
  const hasta = v.ahora + adelantoMs - v.inicio;
  if (hasta < 0) return 0;
  return Math.floor(hasta / v.duracionVuelta) + 1;
}

/**
 * Dónde estamos DENTRO de la vuelta, en milisegundos desde su principio.
 *
 * En bucle es el resto de la división, que es lo que hace que el cursor dé la vuelta sin
 * saltos: no se reinicia nada, se sigue contando. Antes de empezar devuelve un negativo, que
 * es lo que permite no encender ningún bloque durante la cuenta de entrada.
 */
export function posicionEnVuelta(v: Vuelta, enBucle: boolean): number {
  const transcurrido = v.ahora - v.inicio;
  if (!enBucle || transcurrido < 0 || v.duracionVuelta <= 0) return transcurrido;
  return ((transcurrido % v.duracionVuelta) + v.duracionVuelta) % v.duracionVuelta;
}

/**
 * Cuánto falta para un bloque, en milisegundos.
 *
 * En bucle, el bloque que **ya pasó** vuelve a acercarse en la vuelta siguiente, y por eso se
 * le suma una vuelta en vez de dejarlo en negativo: si no, en un musicograma de notas que
 * caen el bloque desaparecería al llegar abajo y reaparecería de golpe arriba en vez de
 * fluir. `margenMs` es cuánto se le deja seguir viéndose después de pasar.
 */
export function faltaPara(
  desfase: number,
  dentro: number,
  duracionVuelta: number,
  enBucle: boolean,
  margenMs = 900,
): number {
  const falta = desfase - dentro;
  if (enBucle && falta < -margenMs) return falta + duracionVuelta;
  return falta;
}
