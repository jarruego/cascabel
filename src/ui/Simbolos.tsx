/**
 * Los símbolos de la interfaz, dibujados aquí.
 *
 * **No son ilustraciones, son señales.** Los cuarenta y ocho iconos de `Icono.tsx` vienen de
 * OpenMoji y dibujan *cosas* —un tambor, un pájaro, una flauta—: son contenido, y un niño los
 * mira. Éstos son otra familia: un triángulo, un cuadrado, una papelera, un tic. Los reconoce
 * cualquiera que haya visto un reproductor —y un niño de seis años ha visto muchos— y lo que
 * necesitan es exactamente el mismo tamaño, el mismo grosor y el mismo centro óptico para
 * leerse como un juego. Un emoji de cada cosa no daría eso.
 *
 * Además pesan cero, no entran en el precache y heredan el color del texto, así que se ven
 * igual sobre un botón claro y sobre uno relleno.
 *
 * ## El vocabulario, y no hay más
 *
 * Cada acción tiene **un** símbolo y siempre el mismo, en las veintiuna pantallas. Esto es la
 * mitad visual de lo que `docs/04-DISENO-UI.md` llama textos comunes: si «Escuchar» lleva
 * triángulo en el piano, lo lleva también en el dictado.
 *
 * | Acción | Símbolo | Dónde sale |
 * |---|---|---|
 * | empezar, escuchar, reproducir, poner la música | triángulo | casi todas |
 * | parar | cuadrado | las que suenan |
 * | grabar | círculo | teclado, pads, paisaje |
 * | otra vez, bucle, repetir | flecha en círculo | resultados y editores |
 * | comprobar | tic | ordenar, rejilla, compases |
 * | siguiente | punta de flecha | series de rondas |
 * | limpiar, borrar | papelera | editores |
 * | descargar (MIDI, MusicXML) | flecha a bandeja | los dos exportables |
 * | anterior | punta de flecha al revés | guía de aula |
 * | imprimir | impresora | guía de aula y ficha |
 * | idea | bombilla | instrumentos abiertos |
 * | más agudo / más grave | más y menos | acompañamientos, octavas |
 *
 * Lo que **no** lleva símbolo: nada. Todo botón de la botonera lleva el suyo, porque media
 * botonera con icono y media sin él es justo lo que el autor describió como «no existe
 * ningún criterio común».
 */

interface Props {
  tamano?: number;
}

/** Círculo relleno. Rojo siempre: es el código de «grabando» desde antes que la informática. */
export function IconoGrabar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  );
}

/** Cuadrado relleno: parar. */
export function IconoParar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Triángulo hacia la derecha: reproducir, escuchar, empezar. */
export function IconoTocar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.5 20 12 7 19.5Z" fill="currentColor" />
    </svg>
  );
}

/** Flecha que da la vuelta: otra vez, y también el bucle. Son la misma idea. */
/** La rueda dentada de ajustes, la de siempre: un aro con ocho dientes y el eje. */
export function IconoAjustes({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="3.4" />
      <line x1="19.20" y1="12.00" x2="22.80" y2="12.00" stroke="currentColor" strokeWidth="3.2" />
      <line x1="17.09" y1="17.09" x2="19.64" y2="19.64" stroke="currentColor" strokeWidth="3.2" />
      <line x1="12.00" y1="19.20" x2="12.00" y2="22.80" stroke="currentColor" strokeWidth="3.2" />
      <line x1="6.91" y1="17.09" x2="4.36" y2="19.64" stroke="currentColor" strokeWidth="3.2" />
      <line x1="4.80" y1="12.00" x2="1.20" y2="12.00" stroke="currentColor" strokeWidth="3.2" />
      <line x1="6.91" y1="6.91" x2="4.36" y2="4.36" stroke="currentColor" strokeWidth="3.2" />
      <line x1="12.00" y1="4.80" x2="12.00" y2="1.20" stroke="currentColor" strokeWidth="3.2" />
      <line x1="17.09" y1="6.91" x2="19.64" y2="4.36" stroke="currentColor" strokeWidth="3.2" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function IconoRepetir({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20 11a8 8 0 1 0-2.3 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M20 4v7h-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Tic: comprobar. Nunca una cruz — aquí no se marca lo que está mal (§4). */
export function IconoComprobar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 12.5 9.5 18 20 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Punta de flecha: seguir a lo siguiente. */
export function IconoSiguiente({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Punta de flecha al revés: volver al paso anterior. */
export function IconoAnterior({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Impresora: sacar la hoja. Solo sale en la guía de aula y en la ficha. */
export function IconoImprimir({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 9V3.5h10V9M7 18H4.5v-7h15v7H17M7 14.5h10V21H7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Papelera: limpiar lo puesto. */
export function IconoLimpiar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flecha que baja a una bandeja: descargar el fichero. */
export function IconoDescargar({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4M4 19h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Bombilla: una idea.
 *
 * Dibujada aquí y no traída de `Icono.tsx` aunque exista `bombilla.svg`: en la botonera
 * tiene que pesar y medir lo mismo que el triángulo y la papelera que lleva al lado, y un
 * OpenMoji de colores al lado de cinco símbolos de una línea se ve como un cuerpo extraño.
 * El SVG de color sigue usándose dentro del modal, que es donde sí es una ilustración.
 */
export function IconoIdea({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9v.2h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Más: subir el tono, añadir una octava. */
export function IconoMas({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

/** Menos: bajar el tono, quitar una octava. */
export function IconoMenos({ tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
