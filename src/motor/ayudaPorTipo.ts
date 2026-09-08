import type { Actividad, TipoActividad } from './tipos';

/**
 * Cómo se juega cada tipo, para la pantalla de explicación.
 *
 * **De dónde sale.** El enunciado de una actividad dice de qué va —«palmea solo donde hay
 * sonido»— pero no dice cómo se maneja la pantalla, y eso es igual en las seis actividades
 * de ese tipo. Antes lo resolvía cada motor imprimiendo una frase fija encima de la
 * actividad, y el autor lo señaló con nombres y apellidos: en «Ta y ti-ti» seguía saliendo
 * «Toca para empezar y sigue el dibujo» durante toda la actividad, cuando eso ya se ha
 * contado al entrar.
 *
 * Se quitaron esas frases, y con ellas se fue la información. Aquí vuelve, en el único
 * sitio donde el reparto tiene sentido:
 *
 *  - **Qué hay que hacer** — el `enunciado` de la actividad, que es distinto en cada una.
 *  - **Cómo se maneja** — esto, que es igual en todas las de su tipo.
 *  - **Nota para el adulto** — lo que un niño no necesita y un maestro sí: que el piano
 *    también se toca con el teclado del ordenador, que el eco es para dos, que la
 *    tonalidad del acompañamiento se sube hasta que la clase cante cómoda.
 *
 * Las tres se leen al entrar y se vuelven a leer pulsando al personaje. Ninguna se queda
 * en pantalla mientras se juega.
 *
 * Un tipo sin entrada aquí no es un olvido: es que su enunciado ya se basta. En «Elige la
 * opción correcta» no hay nada que explicar sobre el manejo.
 */
export interface Ayuda {
  /** Cómo se maneja, para el niño. Clave de i18n. */
  comoVa?: string;
  /** Lo que necesita saber el adulto y el niño no. Clave de i18n. */
  paraElAdulto?: string;
}

type Resolver = Ayuda | ((actividad: Actividad) => Ayuda);

const POR_TIPO: Partial<Record<TipoActividad, Resolver>> = {
  seguir: { comoVa: 'seguir.sigue' },
  ordenar: { comoVa: 'ordenar.tambienArrastrando' },
  lienzo: { comoVa: 'lienzo.libre' },
  teclado: { comoVa: 'teclado.libre', paraElAdulto: 'teclado.qwerty' },
  pads: { comoVa: 'pads.libre', paraElAdulto: 'pads.qwerty' },
  referencia: { comoVa: 'referencia.paraConsultar' },
  acompanamientos: { paraElAdulto: 'acomp.paraCantar' },
  eco: { paraElAdulto: 'eco.aDos' },

  /*
    Dos mecánicas distintas bajo el mismo tipo, y decirlas al revés desorienta más que no
    decir nada: en el karaoke por bandas hay un botón por color y en el de diana hay uno
    solo, y «toca el botón del color de la nota» delante de una diana no significa nada.
  */
  karaoke: (a) => {
    const c = a.contenido as { botonesPorCarril?: boolean };
    return { comoVa: c.botonesPorCarril ? 'karaoke.tocaBanda' : 'karaoke.toca' };
  },

  /*
    Y aquí depende de por dónde entre el niño. `entrada.modo` lo declara el JSON, y la
    diferencia es real: con micrófono el ritmo arranca con su primera palmada, tocando el
    botón no.
  */
  'tocar-a-tiempo': (a) => ({
    comoVa: a.entrada.modo === 'microfono-palmada' ? 'tocar.palmea' : 'tocar.toca',
  }),
};

export function ayudaDe(actividad: Actividad): Ayuda {
  const r = POR_TIPO[actividad.tipo];
  if (!r) return {};
  return typeof r === 'function' ? r(actividad) : r;
}
