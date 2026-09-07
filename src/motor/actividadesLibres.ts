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
