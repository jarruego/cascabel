/**
 * Si en esta sesión se usa el micrófono, y si ya se ha preguntado.
 *
 * `CLAUDE.md` §8 lo pide con estas palabras: «no se pide el permiso al entrar; se pide
 * cuando hace falta, tras la pantalla ilustrada, y si se deniega no se vuelve a insistir en
 * esa sesión». Las tres partes necesitan que alguien se acuerde de lo que ha pasado, y ese
 * alguien es este módulo.
 *
 * **Vive en memoria y no en IndexedDB, a propósito.** Un permiso guardado sobreviviría a la
 * sesión, y entonces un niño que un martes tocó «prefiero tocar en la pantalla» se quedaría
 * sin micrófono en marzo sin saber por qué. Al recargar vuelve a estar todo por decidir,
 * que es lo que espera cualquiera. Y de paso no guardamos ni un dato más de los que ya no
 * guardamos (regla 3).
 *
 * Rechazar **no rompe nada**: el micrófono es un accesorio, nunca un requisito. Toda
 * actividad que lo usa tiene su vía por toque terminada antes de que se escriba el
 * detector, así que decir que no es una forma legítima de hacer la actividad y no un modo
 * degradado.
 *
 * **Salvo donde escuchar ES la actividad.** En las de voz —cantar la nota, la flauta, el
 * afinador— no hay nada que tocar, y el autor lo decidió el 2026-09-12: «ahora no puedo
 * hacer ruido» no entra en la actividad, la deja para luego. Por eso ese «no» no se
 * recuerda: quien vuelve más tarde tiene que poder decir que sí. Lo que sí se recuerda es
 * el «no» de las palmadas, y el del navegador; y ninguno de los dos cierra las de voz, que
 * preguntan siempre que no se haya dicho que sí.
 */

type Estado = 'sin-preguntar' | 'aceptado' | 'rechazado';

let estado: Estado = 'sin-preguntar';

/**
 * ¿Hay que enseñar la pantalla que explica para qué vamos a escuchar?
 *
 * Con palmadas, solo si nunca se ha preguntado: el «no» vale para toda la sesión. Con voz,
 * siempre que no se haya dicho que sí, porque ahí el «no» es «ahora no» y no cierra nada.
 */
export function hayQuePreguntar(modo: 'voz' | 'palmada' = 'palmada'): boolean {
  return modo === 'voz' ? estado !== 'aceptado' : estado === 'sin-preguntar';
}

/** ¿Se intenta abrir el micrófono? Falso solo si ya se dijo que no. */
export function seUsaMicrofono(): boolean {
  return estado !== 'rechazado';
}

export function aceptarMicrofono(): void {
  estado = 'aceptado';
}

/**
 * Se llama en dos sitios y por dos motivos distintos que acaban igual: cuando el niño elige
 * tocar en la pantalla, y cuando el navegador deniega el permiso. En los dos casos lo que
 * no se puede hacer es volver a preguntar en la misma sesión.
 */
export function rechazarMicrofono(): void {
  estado = 'rechazado';
}

/** Solo para los tests: devolver la sesión a como estaba al arrancar. */
export function olvidarPermiso(): void {
  estado = 'sin-preguntar';
}
