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
  'presentacion',
] as const satisfies readonly TipoActividad[];

export function esLibre(tipo: TipoActividad): boolean {
  return (TIPOS_LIBRES as readonly string[]).includes(tipo);
}

/**
 * Cuándo se da por hecha cada tipo de actividad.
 *
 * Lo pidió el autor el 2026-09-12: «todas las actividades deberían tener algún disparador
 * que las marque como completadas, sean evaluables o no». Y lo que había no lo cumplía:
 * las libres se marcaban **al abrirlas**, sin que el niño hubiera tocado nada, y el
 * constructor de ritmos —una rejilla en modo libre, que no es de la lista— no se marcaba
 * **nunca**, porque lo único que lo cerraba era comprobar una solución que no tiene.
 *
 * La regla es una por tipo y de sentido común, y es el componente quien la dispara
 * llamando a `alTerminar` **una sola vez**. Esta tabla es la documentación de esa regla,
 * y el test comprueba que todo tipo del registro tenga la suya y llame a `alTerminar`.
 *
 *  - Las que **se evalúan** se dan por hechas al hacer todos los pasos, salgan como salgan:
 *    una pregunta contestada mal es una pregunta hecha.
 *  - Las que **se escuchan** —musicograma, percusión corporal, guía— al pasar una vez por
 *    todo: la primera vuelta, el último paso.
 *  - Las que **se tocan** —piano, pads, lienzo— al hacer sonar algo. Abrir el piano y no
 *    tocarlo no es haberlo hecho.
 *  - Las que **se construyen** —constructor de ritmos, pistas— al escuchar lo primero que
 *    se ha puesto. Ahí, además, hay una reacción del personaje: es el único momento en que
 *    algo cierra, y después se sigue componiendo sin que nada más lo interrumpa.
 */
export const HECHA_CUANDO: Record<TipoActividad, string> = {
  eleccion: 'al contestar todas las preguntas, bien o mal',
  emparejar: 'al unir todas las parejas',
  memoria: 'al destapar todas las parejas',
  ordenar: 'al dejar todo en su sitio',
  pentagrama: 'al contestar todas las notas',
  rejilla: 'dictado: al acertar la solución; libre: al escuchar el primer ritmo puesto',
  cantar: 'al probar todas las notas, afinadas o no',
  compases: 'al colocar todas las barras',
  escala: 'al construir la escala',
  karaoke: 'al llegar al final de la pieza',
  'tocar-a-tiempo': 'al acabar las repeticiones',
  seguir: 'al acabar la primera vuelta, en bucle o no; la enhorabuena la da dentro, con «otra vez»',
  cuerpo: 'al acabar la primera vuelta del patrón; una canción entera se toca una vez y ofrece repetir o terminar',
  'guia-aula': 'al llegar al último paso',
  presentacion: 'al llegar a la última lámina',
  eco: 'cuando los dos han tocado y se comparan',
  lienzo: 'al hacer sonar el primer trazo',
  teclado: 'al tocar la primera tecla',
  pads: 'al dar el primer golpe',
  pistas: 'al escuchar la primera composición con algo puesto',
  acompanamientos: 'al arrancar la primera base',
  referencia: 'al escuchar la primera entrada; si ninguna suena, al abrirla',
  paisaje: 'al guardar o escuchar la primera grabación; sin micrófono, al abrirla',
};

/**
 * ¿Tiene esta actividad un final que el niño alcanza?
 *
 * Es lo que decide si al darla por hecha se celebra con la modal. Las libres no lo tienen,
 * y tampoco lo tienen dos casos de tipos que en general sí: el musicograma en bucle y la
 * rejilla en modo libre. Los dos se dan por hechos —ver `HECHA_CUANDO`— pero sacar la modal
 * de «¡Muy bien!» encima, con la música sonando o con el niño a medio componer, es la
 * misma rareza que felicitar a alguien por dejar de tocar el piano.
 */
export function sinFinal(actividad: {
  tipo: TipoActividad;
  contenido: Record<string, unknown>;
}): boolean {
  if (esLibre(actividad.tipo)) return true;
  // El musicograma no abre la modal ni en bucle ni con final: con final, la enhorabuena la
  // da dentro y ofrece repetir, que en una pieza de diez segundos es lo que se quiere.
  // Solo como ejercicio de una serie avisa al envoltorio, que pone su propio cierre.
  if (actividad.tipo === 'seguir' && !Array.isArray(actividad.contenido.ejercicios)) return true;
  if (actividad.tipo === 'rejilla') {
    const modo = actividad.contenido.modo ?? (actividad.contenido.solucion ? 'dictado' : 'libre');
    if (modo === 'libre' && !Array.isArray(actividad.contenido.ejercicios)) return true;
  }
  return false;
}

/**
 * ¿Se celebra al terminar esta actividad?
 *
 * **Solo si tiene un final que el niño alcanza.** Es la misma idea que dejó sin botón de
 * «Terminar» a las libres, aplicada un paso más allá: un tipo puede tener final en general
 * y no tenerlo en una actividad concreta. Qué actividades no lo tienen lo dice `sinFinal`.
 *
 * Hecha y terminada dejan de ser lo mismo, y esta función es la que las separa: las que no
 * tienen final se **anotan** igual, cuando toca según `HECHA_CUANDO`, pero no se celebran.
 */
export function hayCelebracion(actividad: {
  tipo: TipoActividad;
  contenido: Record<string, unknown>;
}): boolean {
  return !sinFinal(actividad);
}
