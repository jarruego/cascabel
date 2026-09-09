/**
 * El pulso, en la mano.
 *
 * `docs/04-DISENO-UI.md` lo pide por su nombre desde el principio, contra el criterio WCAG
 * 1.2: **toda actividad de ritmo tiene que poder hacerse mirando**, con pulso visual y
 * `navigator.vibrate()`, «un alumno sordo tiene que poder participar». El pulso visual
 * estaba desde el primer día; la vibración no estaba en ninguna parte.
 *
 * Tres decisiones, y las tres tienen motivo:
 *
 *  - **Va donde late lo visual, no donde suena.** El sonido se programa 100 ms hacia el
 *    futuro con el reloj del audio (§7); si se vibrara ahí, la mano iría por delante del
 *    dibujo. Se llama desde el mismo sitio que pinta, que es un `requestAnimationFrame` o el
 *    temporizador que mueve el cursor.
 *  - **Golpes cortos y distintos entre sí.** 30 ms el pulso y 55 el primero del compás: lo
 *    justo para notarlo sin que se convierta en un zumbido. Un móvil no tiene intensidad,
 *    solo duración, así que acentuar es durar un poco más.
 *  - **No se cuenta si funciona.** `navigator.vibrate` no existe en iOS y devuelve `false`
 *    en escritorio; se intenta y se calla, igual que el micrófono (§8). Nada de mirar el
 *    navegador para decidir: los user agents mienten.
 *
 * El interruptor está en Ajustes y viene **encendido**. Es lo que hace que un niño sordo no
 * dependa de que un adulto sepa que existe la opción; y quien no lo quiera —una tablet en
 * una mesa que zumba— lo apaga una vez.
 */

let encendida = true;

/** Lo enciende y lo apaga el interruptor de Ajustes. */
export function ponerVibracion(valor: boolean): void {
  encendida = valor;
}

export function hayVibracion(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Un golpecito. `acentuado` es el primero del compás, y dura algo más. */
export function vibrarPulso(acentuado = false): void {
  if (!encendida || !hayVibracion()) return;
  try {
    navigator.vibrate(acentuado ? 55 : 30);
  } catch {
    // Un navegador que la tiene pero la bloquea (pestaña en segundo plano, ahorro de
    // energía) no puede tumbar una actividad de ritmo por un golpecito.
  }
}
