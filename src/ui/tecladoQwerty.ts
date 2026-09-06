/**
 * Cómo se toca un piano con el teclado del ordenador.
 *
 * **No hay un estándar formal**, pero sí una convención de facto que comparten Ableton Live,
 * FL Studio, GarageBand y casi todos los pianos web, y que es la que espera cualquiera que
 * haya tocado en uno: **dos octavas apiladas en las dos mitades del teclado**. La fila de
 * `ZXCVBNM` son las blancas de la octava grave y la de `SDGHJ` sus negras; la de `QWERTYU`
 * son las blancas de la octava aguda y la de `2356 7` sus negras. Las negras caen justo
 * encima y entre sus blancas, así que el dibujo del teclado del ordenador **reproduce el
 * dibujo del piano**, incluido el hueco donde no hay negra entre mi-fa y si-do.
 *
 * **Se indexa por `KeyboardEvent.code`, nunca por `key`.** `code` es la posición física de
 * la tecla: `KeyZ` es la tecla de abajo a la izquierda en un teclado español, en uno inglés
 * y en un AZERTY francés, donde la letra impresa es una «W». Usar `key` habría atado el
 * piano a un idioma de teclado, y ese es el error clásico de este tipo de mapeo.
 */

/** Semitonos por encima del do de la octava base. */
export const TECLAS: Record<string, number> = {
  // Octava grave: blancas en la fila de abajo, negras en la de en medio.
  KeyZ: 0,  KeyS: 1,  KeyX: 2,  KeyD: 3,  KeyC: 4,
  KeyV: 5,  KeyG: 6,  KeyB: 7,  KeyH: 8,  KeyN: 9,  KeyJ: 10, KeyM: 11,
  // Octava aguda: blancas en la fila de las letras, negras en la de los números.
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16,
  KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  // El do de arriba, para poder cerrar la escala sin cambiar de octava.
  KeyI: 24,
};

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Nota que corresponde a una tecla física, o `null` si esa tecla no toca nada.
 *
 * @param code    `KeyboardEvent.code`
 * @param octava  octava del do más grave que se muestra
 */
export function notaDeTecla(code: string, octava: number): string | null {
  const semitonos = TECLAS[code];
  if (semitonos === undefined) return null;
  return `${NOMBRES[semitonos % 12]}${octava + Math.floor(semitonos / 12)}`;
}

/** La letra que hay que pintar en una tecla del piano, o `''` si no le toca ninguna. */
export function letraDeNota(nota: string, octava: number): string {
  for (const code of Object.keys(TECLAS)) {
    if (notaDeTecla(code, octava) === nota) {
      // De 'KeyZ' a 'Z' y de 'Digit2' a '2'. Es lo que está impreso en un teclado inglés;
      // en otras distribuciones la posición es la misma aunque la letra impresa cambie.
      return code.replace('Key', '').replace('Digit', '');
    }
  }
  return '';
}
