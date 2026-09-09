/**
 * Con qué se hace la actividad que está abierta: micrófono o pantalla. Y si el navegador
 * ha dicho que no.
 *
 * `CLAUDE.md` §8: «no se pide el permiso al entrar; se pide cuando hace falta, tras la
 * pantalla ilustrada, y si se deniega no se vuelve a insistir en esa sesión». La pantalla
 * ilustrada es la explicación de la actividad, que desde el 2026-09-12 ofrece las dos
 * salidas en una sola modal: «con palmas» o «tocar en la pantalla». Había dos modales
 * seguidas con dos «empezar», y la elección solo se hacía la primera vez de la sesión: «la
 * segunda vez que entro ya no me deja cambiar», dijo el autor.
 *
 * **Lo que se recuerda, y lo que no.**
 *  - La elección del niño vale para la actividad abierta y nada más: al entrar en otra —o
 *    en la misma otra vez— se vuelve a elegir. `nuevaActividad()` lo olvida.
 *  - El «no» del navegador —permiso denegado, sin `getUserMedia`— sí dura toda la sesión:
 *    eso es lo que no se vuelve a pedir. Con él, la explicación ofrece solo la pantalla.
 *
 * **Vive en memoria y no en IndexedDB, a propósito.** Al recargar vuelve a estar todo por
 * decidir, que es lo que espera cualquiera. Y de paso no guardamos ni un dato más de los
 * que ya no guardamos (regla 3).
 *
 * Rechazar **no rompe nada**: el micrófono es un accesorio, nunca un requisito. Toda
 * actividad de palmadas tiene su vía por toque terminada antes de que se escriba el
 * detector. En las de voz no hay nada que tocar: «ahora no puedo hacer ruido» no entra y
 * la deja para luego; y si es el navegador el que dice que no, se canta sin que se mida.
 */

type Estado = 'sin-elegir' | 'microfono' | 'toque' | 'denegado';

let estado: Estado = 'sin-elegir';

/** ¿El navegador ha denegado el micrófono en esta sesión? Entonces no se vuelve a ofrecer. */
export function microfonoDenegado(): boolean {
  return estado === 'denegado';
}

/** ¿Se intenta abrir el micrófono en la actividad abierta? Solo si se ha elegido. */
export function seUsaMicrofono(): boolean {
  return estado === 'microfono';
}

export function aceptarMicrofono(): void {
  if (estado !== 'denegado') estado = 'microfono';
}

/** Esta vez, en la pantalla. No se recuerda para la siguiente. */
export function elegirToque(): void {
  if (estado !== 'denegado') estado = 'toque';
}

/** El navegador ha dicho que no: vale para toda la sesión. */
export function rechazarMicrofono(): void {
  estado = 'denegado';
}

/** Al entrar en una actividad se vuelve a elegir, salvo que el navegador haya dicho que no. */
export function nuevaActividad(): void {
  if (estado !== 'denegado') estado = 'sin-elegir';
}

/** Solo para los tests: devolver la sesión a como estaba al arrancar. */
export function olvidarPermiso(): void {
  estado = 'sin-elegir';
}
