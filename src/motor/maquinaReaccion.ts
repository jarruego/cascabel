import { isValidElement, type ReactNode } from 'react';

/**
 * Cuándo se ve la tarjeta de reacción y cuánto se queda.
 *
 * Vive fuera del componente a propósito (`CLAUDE.md` §11): `Reaccion.tsx` pinta y programa
 * temporizadores, pero **qué mensaje lleva reloj y cuál no** es una regla de producto, y las
 * reglas de producto van en un módulo puro con su test.
 *
 * ## De dónde sale la regla
 *
 * Medido el 2026-09-09 sobre las **71 pistas** que tienen texto en el catálogo: la mediana
 * son 88 caracteres y **18 palabras**. Los baremos españoles de velocidad lectora ponen a un
 * niño de 2.º de Primaria en 60 palabras por minuto, así que esa pista mediana le lleva
 * **unos veinte segundos**. La tarjeta duraba 6,2, y las 71 se quedaban cortas.
 *
 * Y no hay número que acierte: entre 2.º (60 ppm) y 6.º (134 ppm) hay más del doble, así que
 * cualquier duración buena para uno sobra o falta para el otro. La salida no es calibrar
 * mejor, es dejar de contar el tiempo donde no se puede contar:
 *
 * - **`bien`** es un aplauso. Se lee de un vistazo, no enseña nada, y quedarse estorba.
 *   Lleva reloj.
 * - **`casi`** lleva la pista concreta de la actividad, que es la que enseña. **No lleva
 *   reloj**: se queda mientras el niño está atascado —que es justo cuando sirve— y se va
 *   cuando vuelve a responder, que es la única señal fiable de que ya no hace falta.
 * - **`neutro`** no es una reacción sino una instrucción, y se queda mientras dure la
 *   actividad. Eso ya era así.
 *
 * De paso arregla el criterio 2.2.1 de WCAG, que desconfía de la información con caducidad:
 * lo único que caduca pasa a ser un elogio, y el elogio no informa de nada.
 *
 * ## Por qué basta con mirar el tono
 *
 * Porque **la pista concreta sólo aparece al fallar**. Se comprobaron los once sitios que
 * montan una reacción el 2026-09-09: en Cantar entra por encima de 50 cents, en Karaoke por
 * debajo del 60 % de aciertos, en Compases, Elección, Emparejar, Escala, Ordenar, Pentagrama
 * y Rejilla dentro de la rama de fallo, y Eco y Tocar a tiempo no tienen pista. En los once,
 * el tono de esa rama es `casi`.
 *
 * **No hay test de esa invariante, y conviene decir por qué**: comprobarla de verdad exige
 * saber qué rama de un JSX se está pintando, y lo único que se puede hacer leyendo el
 * fichero —«si el bloque nombra `pistaPara`, que nombre también `casi`»— pasaría igual
 * poniendo la pista en la rama del acierto. Un test que no puede fallar cuando debe es peor
 * que ninguno, porque se cree. Si algún día una pista se cuelga de un `bien`, lo que hay que
 * hacer no es afinar el test: es pasarle la pista a este módulo como dato.
 */

/** `neutro` para lo que no es un juicio, como «sigue el dibujo mientras suena». */
export type TonoReaccion = 'bien' | 'casi' | 'neutro';

/** Lo que dura de base un mensaje con reloj. Es tiempo de reacción, antes de leer nada. */
export const BASE_MS = 3500;

/** Lo que se le suma por carácter. */
export const POR_CARACTER_MS = 45;

/** Lo que se espera tras un acierto antes de seguir: un «¡bien!» y ya. */
export const TRAS_ACIERTO_MS = 900;

/**
 * Cuánto se espera tras una respuesta antes de que la actividad siga sola.
 *
 * **El acierto y el fallo no valen lo mismo.** Tras un acierto no hay nada que leer y se
 * sigue enseguida; tras un fallo hay una pista, y lo que dura es lo que tarda en leerse:
 * la base más lo que mida la frase, la misma cuenta que la tarjeta de elogio. Había cinco
 * tipos con cinco números fijos —900, 1400, 2200, 2600— y el autor lo vio en «pon las
 * barras»: «no da tiempo a leer el mensaje de error». Ahora es una sola regla, y sale de
 * la frase.
 */
export function esperaTrasRespuesta(acierto: boolean, texto: string): number {
  if (acierto) return TRAS_ACIERTO_MS;
  return BASE_MS + texto.length * POR_CARACTER_MS;
}

/**
 * El texto que lleva la tarjeta, venga como un hijo o como varios.
 *
 * Existe porque `children` casi nunca es una cadena: los tipos de motor escriben
 * `{condición && t('…')}` dos veces seguidas, y eso es un array con un `false` dentro. El
 * código anterior preguntaba `typeof children === 'string'`, le salía que no en seis de los
 * once sitios, y usaba un 60 de reserva: la duración quedaba clavada en 6,2 segundos
 * **justo en los seis que llevan la pista larga**. Medía bien los mensajes cortos y mal los
 * únicos que había que medir.
 */
export function textoDe(nodo: ReactNode): string {
  if (typeof nodo === 'string') return nodo;
  if (typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('');
  // Un fragmento —`<> {t('…')}</>`, que es como Compases añade su pista— sí lleva texto
  // dentro y hay que entrar a buscarlo.
  if (isValidElement(nodo)) {
    const props: unknown = nodo.props;
    if (props !== null && typeof props === 'object' && 'children' in props) {
      return textoDe((props as { children?: ReactNode }).children);
    }
  }
  return '';
}

/** Si el mensaje pide sitio en pantalla. Sin tono y sin texto no hay nada que enseñar. */
export function seVe(tono: TonoReaccion, texto: string): boolean {
  return tono !== 'neutro' || texto !== '';
}

/**
 * A partir de cuándo un toque cierra la tarjeta que está bloqueando la actividad.
 *
 * La pista de un fallo dura lo que tarda en leerse, y la actividad espera. Quien ya la ha
 * leído —o ya sabe lo que pasa— no tiene por qué esperar: desde los dos segundos, un toque
 * en cualquier sitio la cierra y la actividad sigue. Dos segundos y no cero porque el toque
 * que la cerraría en el primer instante es el mismo con el que el niño estaba haciendo la
 * actividad: cerrarla sin querer sería peor que esperar. Lo pidió el autor el 2026-09-12:
 * «a los 2 seg de aparecer, si clicas fuera se cerrará [...] para que no se cierre por
 * accidente al clicar haciendo la actividad».
 */
export const CIERRE_DESDE_MS = 2000;

/** ¿Un toque ahora cierra la tarjeta? `transcurridoMs` desde que apareció. */
export function sePuedeCerrar(transcurridoMs: number): boolean {
  return transcurridoMs >= CIERRE_DESDE_MS;
}

/**
 * Cuánto se queda en pantalla, o `null` si no se va solo.
 *
 * `null` no significa «para siempre»: significa que **lo quita el niño al responder**, no un
 * temporizador. Quien lo monta deja de pedirlo y la tarjeta se va entonces.
 */
export function duracionMs(tono: TonoReaccion, texto: string): number | null {
  if (tono !== 'bien') return null;
  return BASE_MS + texto.length * POR_CARACTER_MS;
}
