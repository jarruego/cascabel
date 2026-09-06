/**
 * Cómo se toca un piano con el teclado del ordenador.
 *
 * Hay **dos convenciones**, y no son intercambiables.
 *
 * ## Horizontal (la que usamos por defecto)
 *
 * Las blancas corren seguidas por la fila central —`A S D F G H J K L Ñ ´`— y las negras van
 * por encima, en la fila de `Q W E R T Y U I O P`. Y encajan **exactamente**: la `W` cae
 * físicamente entre la `A` y la `S`, igual que el do sostenido cae entre el do y el re; y la
 * `R` y la `I` no tocan nada, que es justo donde el piano tampoco tiene negra (mi-fa y
 * si-do). El teclado del ordenador *dibuja* el piano.
 *
 * **Llega a do–fa′, una octava y media.** No a dos octavas, y no por pereza: catorce blancas
 * seguidas necesitarían catorce letras contiguas en una sola fila, y la fila central tiene
 * once. Es el límite físico del teclado, no una decisión.
 *
 * ## Apilada (la de los secuenciadores)
 *
 * Dos octavas partidas en dos mitades: `ZXCVBNM` abajo y `QWERTYU` arriba. Es la de Ableton
 * Live, FL Studio y GarageBand, y da dos octavas completas a cambio de que la segunda esté
 * encima de la primera en vez de a su derecha, que es antinatural para quien piensa en un
 * piano y no en un secuenciador. Se puede pedir desde el JSON con
 * `disposicionTeclado: 'apilada'`.
 *
 * **En las dos se indexa por `KeyboardEvent.code`, nunca por `key`.** `code` es la posición
 * física: `KeyA` es la tecla de la izquierda de la fila central en un teclado español, en uno
 * inglés y en un AZERTY francés, donde la letra impresa es una «Q». Usar `key` habría atado
 * el piano a un idioma de teclado, y ese es el error clásico de este tipo de mapeo. Es
 * también lo que hace que la fila «A S D F» funcione en un AZERTY sin cambiar nada.
 */

export type Disposicion = 'horizontal' | 'apilada';

/** Semitonos por encima del do de la octava base. */
const HORIZONTAL: Record<string, number> = {
  // Blancas: la fila central entera, do a fa de la octava siguiente.
  KeyA: 0, KeyS: 2, KeyD: 4, KeyF: 5, KeyG: 7, KeyH: 9, KeyJ: 11,
  KeyK: 12, KeyL: 14, Semicolon: 16, Quote: 17,
  // Negras: la fila de arriba. Faltan R e I a propósito: es el hueco de mi-fa y si-do.
  KeyW: 1, KeyE: 3, KeyT: 6, KeyY: 8, KeyU: 10, KeyO: 13, KeyP: 15,
};

const APILADA: Record<string, number> = {
  // Octava grave: blancas en la fila de abajo, negras en la de en medio.
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4,
  KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  // Octava aguda: blancas en la fila de las letras, negras en la de los números.
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16,
  KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
  KeyI: 24,
};

export function mapaDe(disposicion: Disposicion): Record<string, number> {
  return disposicion === 'apilada' ? APILADA : HORIZONTAL;
}

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Nota que corresponde a una tecla física, o `null` si esa tecla no toca nada.
 *
 * @param code   `KeyboardEvent.code`
 * @param octava octava del do más grave que se muestra
 */
export function notaDeTecla(
  code: string,
  octava: number,
  disposicion: Disposicion = 'horizontal',
): string | null {
  const semitonos = mapaDe(disposicion)[code];
  if (semitonos === undefined) return null;
  return `${NOMBRES[semitonos % 12]}${octava + Math.floor(semitonos / 12)}`;
}

/**
 * La letra impresa de la tecla que toca una nota, o `''` si ninguna la toca.
 *
 * Devuelve la letra **de un teclado inglés**, que es lo que está serigrafiado en la mayoría
 * de teclados españoles para estas posiciones. Las dos excepciones se traducen a mano: la
 * tecla `Semicolon` lleva impresa una «Ñ» en un teclado español, y `Quote` un acento.
 */
export function letraDeNota(
  nota: string,
  octava: number,
  disposicion: Disposicion = 'horizontal',
): string {
  for (const code of Object.keys(mapaDe(disposicion))) {
    if (notaDeTecla(code, octava, disposicion) === nota) {
      if (code === 'Semicolon') return 'Ñ';
      if (code === 'Quote') return '´';
      return code.replace('Key', '').replace('Digit', '');
    }
  }
  return '';
}
