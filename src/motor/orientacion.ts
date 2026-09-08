import type { Actividad, TipoActividad } from './tipos';

/**
 * En qué postura se ve mejor cada actividad a pantalla completa.
 *
 * ## El problema
 *
 * Ampliar pedía **apaisado siempre**, y eso está bien para un piano y muy mal para un
 * musicograma donde las notas caen de arriba abajo. Cinco de las siete actividades de
 * karaoke son de ésas: al ampliarlas se giraba la pantalla justo al revés de lo que les
 * conviene, y el recorrido de caída —que es toda la actividad— se quedaba en nada.
 *
 * ## La idea
 *
 * **La orientación no es una preferencia de la aplicación, es una propiedad de la
 * actividad**, y en casi todos los casos ya está declarada o se deduce: el karaoke dice su
 * `orientacion`, el musicograma dice si es una tira o si cae, la rejilla dice cuántas
 * columnas tiene. No hace falta adivinar nada ni preguntar nada.
 *
 * Tres respuestas, y la tercera es la importante:
 *
 *  - **`apaisado`** — se necesita ancho: un teclado, una tira que avanza de lado, dieciséis
 *    columnas, un pentagrama.
 *  - **`vertical`** — se necesita alto: lo que cae. El recorrido de caída ES la actividad.
 *  - **`cualquiera`** — da igual, y entonces **no se toca la pantalla**. Ésta es la que
 *    faltaba: forzar un giro que no aporta nada es peor que no girar, porque sorprende y
 *    porque deja al niño con el aparato en una postura que no eligió.
 *
 * ## Lo que NO se hace
 *
 * **Detectar el aparato.** `CLAUDE.md` §8 lo prohíbe con razón —los *user agents* mienten y
 * las versiones cambian— y aquí ni hace falta. Lo único que se mira es lo que se puede
 * comprobar de verdad: si el navegador sabe girar la pantalla, qué forma tiene ahora mismo,
 * y si el maestro ha dicho que esto es una pizarra. Lo tercero es una preferencia declarada
 * en ajustes, no una adivinanza, y una pizarra no gira: ahí no se bloquea nunca.
 *
 * Y donde no se pueda girar —Safari de iOS, escritorio— no pasa nada: la actividad ya ha
 * ganado la pantalla completa, que era la mitad del objetivo. Si además la forma no es la
 * buena, se dice con una línea y se sigue. Misma regla que el micrófono: se intenta y se cae
 * con elegancia.
 */
export type Orientacion = 'apaisado' | 'vertical' | 'cualquiera';

type Regla = Orientacion | ((actividad: Actividad) => Orientacion);

const POR_TIPO: Partial<Record<TipoActividad, Regla>> = {
  /* Un piano es ancho por definición: en vertical, un móvil no da para dos octavas por mucho
     que se ajusten los tamaños. Girar es lo que convierte «cabe una octava» en «caben dos». */
  teclado: 'apaisado',
  /* Un pentagrama es una línea, y una línea quiere ancho. */
  pentagrama: 'apaisado',
  compases: 'apaisado',
  /* Teclado y pauta a la vez, uno debajo del otro pero los dos anchos. */
  escala: 'apaisado',
  /* El patrón avanza de lado, y con silencios largos se hace largo. */
  cuerpo: 'apaisado',
  /* Cuatro voces por dieciséis casillas. Sin ancho no es una rejilla, es una tira. */
  pistas: 'apaisado',
  /* La pantalla del maestro, casi siempre proyectada. */
  'guia-aula': 'apaisado',

  /*
    El karaoke lo dice él. Y es el caso que destapó todo esto: cinco de sus siete actividades
    son de notas que caen, y se estaban girando a apaisado, o sea justo al revés.

    El valor por defecto se calcula igual que en el componente —pentagrama es horizontal,
    lo demás cae— porque si los dos no coincidieran, la pantalla giraría hacia un lado y la
    actividad se dibujaría hacia el otro.
  */
  karaoke: (a) => {
    const c = a.contenido as { orientacion?: string; representacion?: string };
    const orientacion =
      c.orientacion ?? ((c.representacion ?? 'pentagrama') === 'pentagrama' ? 'horizontal' : 'vertical');
    return orientacion === 'vertical' ? 'vertical' : 'apaisado';
  },

  /* Una tira avanza de lado; en modo «cae», de arriba abajo. Lo mismo del karaoke. */
  seguir: (a) => ((a.contenido as { modo?: string }).modo === 'cae' ? 'vertical' : 'apaisado'),

  /*
    La rejilla depende de cuánto mida. Con cuatro columnas cabe en cualquier postura y
    girarla sería marear por nada; con ocho o más, en vertical las casillas se quedan tan
    estrechas que dejan de ser un objetivo táctil.
  */
  rejilla: (a) => ((a.contenido as { columnas?: number }).columnas ?? 8) >= 8 ? 'apaisado' : 'cualquiera',
};

export function orientacionDe(actividad: Actividad): Orientacion {
  const regla = POR_TIPO[actividad.tipo];
  if (!regla) return 'cualquiera';
  return typeof regla === 'function' ? regla(actividad) : regla;
}
