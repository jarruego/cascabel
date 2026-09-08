import type { TipoActividad } from './tipos';

/**
 * Qué actividades no se terminan, porque no tienen final.
 *
 * **El problema.** En el piano, la caja de sonidos o el kit de percusión no existe el
 * momento «ya está»: se toca hasta que se deja de tocar. Aun así todas tenían un botón de
 * «Terminar» que hacía dos cosas raras — abría la modal de celebración, que felicitaba al
 * niño por dejar de tocar el piano, y competía con «Volver», que está siempre abajo a la
 * izquierda y hace lo que uno espera. Dos salidas para una pantalla de la que solo se puede
 * salir de una manera.
 *
 * **La regla, que la puso el autor.** El botón se va y se sale por «Volver». Y estas
 * actividades **se marcan como hechas al abrirlas**: en una actividad sin solución, haberla
 * visto es haberla hecho, y no hay ningún otro instante en el que se pueda decir que se ha
 * completado.
 *
 * Vive aquí y no dentro de cada componente porque es una regla de producto, con su test:
 * mañana se añade un tipo libre y lo que hay que tocar es esta lista, no diez ficheros.
 *
 * El criterio para entrar en la lista es objetivo y se puede comprobar leyendo el
 * componente: **no evalúa nada**. Si un tipo llama a `alTerminar` con un resultado que
 * depende de lo que ha hecho el niño —aciertos, desvío, afinación—, tiene final y no es
 * libre.
 */
export const TIPOS_LIBRES = [
  'lienzo',
  'teclado',
  'pads',
  'pistas',
  'acompanamientos',
  'referencia',
  'paisaje',
  'cuerpo',
  'eco',
  'guia-aula',
] as const satisfies readonly TipoActividad[];

export function esLibre(tipo: TipoActividad): boolean {
  return (TIPOS_LIBRES as readonly string[]).includes(tipo);
}

/**
 * ¿Se celebra al terminar esta actividad?
 *
 * **Solo si tiene un final que el niño alcanza.** Es la misma idea que dejó sin botón de
 * «Terminar» a las libres, aplicada un paso más allá: un tipo puede tener final en general
 * y no tenerlo en una actividad concreta.
 *
 * El caso es el musicograma en bucle. `seguir` acaba cuando acaba la pieza, y ahí la
 * celebración está bien; pero tres de sus cuatro actividades —«Ta y ti-ti» entre ellas— van
 * en bucle a propósito, porque un patrón de cuatro pulsos dura tres segundos y se acaba
 * antes de que un niño se haya enterado. Ésas no acaban: dan vueltas hasta que alguien las
 * para. Sacarles la modal de «¡Muy bien!» encima con la música sonando es la misma rareza
 * que felicitar a alguien por dejar de tocar el piano.
 *
 * Que se **anoten** sí, y lo hacen: al completar la primera vuelta. Hecha y terminada dejan
 * de ser lo mismo, y esta función es la que las separa.
 */
export function hayCelebracion(actividad: {
  tipo: TipoActividad;
  contenido: Record<string, unknown>;
}): boolean {
  if (esLibre(actividad.tipo)) return false;
  if (actividad.tipo === 'seguir' && actividad.contenido.bucle === true) return false;
  return true;
}
