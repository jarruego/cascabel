/**
 * Geometría y reglas de un musicograma que avanza.
 *
 * Vive aparte del componente porque **la elección de representación no es estética**: decide
 * qué puede significar el eje transversal, y equivocarse ahí enseña algo falso sin dar
 * ningún síntoma.
 *
 * ## La regla que importa
 *
 * Un musicograma tiene dos ejes: el del **tiempo**, que siempre es el del avance, y el
 * **transversal**. Lo que se puede poner en el transversal depende de lo que represente
 * cada figura:
 *
 * | Representación | Qué enseña | Eje transversal | Edad orientativa |
 * |---|---|---|---|
 * | `icono` | que un sonido tiene un referente concreto | **ninguno** | Infantil |
 * | `color` | altura relativa, sin leer | **altura**, en carriles de color | Infantil y 1.º–2.º |
 * | `silaba` | duración (ta, ti-ti) | **ninguno** | 1.º–3.º |
 * | `figura` | duración escrita (♩ ♫) | **ninguno** | 3.º–4.º |
 * | `pentagrama` | altura y duración escritas | **la pauta** | 4.º–6.º |
 *
 * **Las representaciones de duración van en un solo carril, y eso no es negociable.** Una
 * sílaba rítmica o una negra no dicen nada de la altura; colocarlas a distintas alturas le
 * enseñaría al niño una relación que no existe, y encima lo haría de la forma más difícil de
 * desaprender, que es sin decirlo. Es la única regla de este fichero que no admite matiz.
 *
 * ## Y la orientación
 *
 * `vertical` —las figuras caen— no exige ningún sentido de lectura, así que sirve antes de
 * saber leer y es la natural para el ritmo. `horizontal` —las figuras vienen de la derecha—
 * reproduce cómo se recorre una partitura, así que es la que corresponde cuando lo que se
 * está aprendiendo es a leer. **PENDIENTE DE REVISIÓN PEDAGÓGICA**: la correspondencia entre
 * edades y representaciones de la tabla es la convención habitual (Kodály para las sílabas,
 * código Boomwhacker para los colores), pero dónde está el salto de una a otra lo dice una
 * maestra, no un desarrollador.
 */

import { aMidi } from '@/audio/sampler';
import { alturaEnPauta, type Clave } from './alturaEnPauta';

export type Representacion = 'pentagrama' | 'color' | 'silaba' | 'figura' | 'icono';
export type Orientacion = 'horizontal' | 'vertical';

export interface NotaMusicograma {
  /** Notación científica, p. ej. «E4». Obligatoria: es lo que suena. */
  nota: string;
  /** Duración en pulsos. */
  pulsos: number;
  /** Sílaba rítmica, para `representacion: 'silaba'`. */
  silaba?: string;
  /** Nombre de icono, para `representacion: 'icono'`. */
  icono?: string;
}

/**
 * ¿Esta representación dice algo de la altura?
 *
 * Es la pregunta de la que cuelga todo lo demás. Si la respuesta es no, hay un solo carril.
 */
export function representaAltura(r: Representacion): boolean {
  return r === 'pentagrama' || r === 'color';
}

/**
 * Las notas distintas que aparecen, de grave a agudo. Son los carriles de `color`.
 *
 * **Por nota exacta, no por grado.** La primera versión quitaba la alteración antes de
 * agrupar, con lo que un re sostenido caía en el mismo carril que el re: dos alturas
 * distintas compartiendo banda, y la melodía dejando de verse subir donde subía. Se destapó
 * con el motivo de la Quinta, que es re, mi bemol, fa y sol — cuatro notas de las que dos
 * comparten letra.
 *
 * Y se ordena por número MIDI en vez de por letra, que es lo que hace que un do de la octava
 * siguiente quede por encima del si de la anterior y no debajo.
 */
export function carrilesDe(notas: NotaMusicograma[]): string[] {
  const vistos = new Set(notas.map((n) => n.nota));
  return [...vistos].sort((a, b) => aMidi(a) - aMidi(b));
}

export interface Geometria {
  /** Cuánto ha avanzado por el eje del tiempo, en porcentaje del recuadro. */
  avance: number;
  /** Posición en el eje transversal, en píxeles desde el borde. */
  cruce: number;
}

export interface OpcionesGeometria {
  representacion: Representacion;
  orientacion: Orientacion;
  clave: Clave;
  /** Dónde está la línea del presente, en porcentaje. */
  lineaPct: number;
  /** Segundos visibles por delante de la línea. */
  anticipacionS: number;
  /** Tamaño del recuadro en el eje transversal, en píxeles. */
  transversalPx: number;
  /** Separación entre líneas del pentagrama, en píxeles. */
  separacion: number;
  /** Margen antes de la primera línea de la pauta. */
  margen: number;
}

/**
 * Dónde se dibuja una figura que suena dentro de `faltaS` segundos.
 *
 * `avance` va de `lineaPct` (está en la línea, ahora) a 100 (acaba de entrar por el fondo).
 * Quien dibuja decide si eso es `left` o `top`: la geometría es la misma y solo cambia el eje,
 * que es justamente por lo que las dos orientaciones pueden compartir este código.
 */
export function geometriaDe(
  nota: NotaMusicograma,
  faltaS: number,
  indiceCarril: number,
  totalCarriles: number,
  o: OpcionesGeometria,
): Geometria {
  const avance = o.lineaPct + (faltaS / o.anticipacionS) * (100 - o.lineaPct);

  if (!representaAltura(o.representacion)) {
    // Un solo carril, centrado. Ver la regla de arriba.
    return { avance, cruce: o.transversalPx / 2 };
  }

  if (o.representacion === 'pentagrama') {
    const { y } = alturaEnPauta(nota.nota, o.clave, o.separacion, o.margen);
    // En vertical la pauta se pone de lado y lo agudo va a la DERECHA, como en un piano:
    // hay que invertir, porque `alturaEnPauta` mide hacia abajo y allí lo agudo estaba arriba.
    return { avance, cruce: o.orientacion === 'vertical' ? o.transversalPx - y : y };
  }

  // Carriles de color, repartidos por igual. En horizontal el grave va abajo y en vertical
  // a la izquierda: en las dos, subir de nota es subir o avanzar hacia la derecha.
  const ancho = o.transversalPx / Math.max(1, totalCarriles);
  const desdeElGrave = ancho * (indiceCarril + 0.5);
  return {
    avance,
    cruce: o.orientacion === 'vertical' ? desdeElGrave : o.transversalPx - desdeElGrave,
  };
}

/**
 * Figura musical para una duración en pulsos, en la fuente Bravura.
 *
 * Glifos SMuFL del Área de Uso Privado —la figura entera, de una pieza—, no las secuencias
 * «cabeza + plica + corchete» del bloque Unicode: ésas se componen glifo a glifo y el
 * corchete de la semicorchea salía abajo. Es lo que hacen MuseScore y Dorico.
 */
export function figuraDe(pulsos: number): string {
  if (pulsos >= 4) return '\uE1D2'; // redonda      noteWhole
  if (pulsos >= 2) return '\uE1D3'; // blanca       noteHalfUp
  if (pulsos >= 1.5) return '\uE1D5\uE1E7'; // negra con puntillo
  if (pulsos >= 1) return '\uE1D5'; // negra        noteQuarterUp
  if (pulsos >= 0.5) return '\uE1D7'; // corchea      note8thUp
  return '\uE1D9'; // semicorchea  note16thUp
}

/** Lo más ancha que se deja crecer una banda. */
const ANCHO_MAXIMO_DE_BANDA = 170;

/**
 * Cuánto mide, en total, la tira de bandas de un musicograma por carriles.
 *
 * **Cada banda es también su botón**, así que su ancho es un objetivo táctil y no una
 * decisión estética. De ahí las dos cotas:
 *
 *  - **Por abajo, el mínimo del carril.** Si con eso no cabe, la caja desplaza en
 *    horizontal. Es mejor tener que arrastrar que tener bandas imposibles de acertar, y es
 *    lo mismo que hace el teclado cuando no caben las octavas que le piden.
 *  - **Por arriba, un tope.** Una banda de un palmo obliga al ojo a recorrerla entera para
 *    ver por dónde va a caer la nota, y entonces la anchura juega en contra.
 *
 * Antes esto era `Math.min(88 * bandas, 360)` dentro del componente, y fallaba por los dos
 * lados: en una tablet dejaba la actividad centrada y estrecha, y en un móvil de 320 px
 * cuatro bandas sumaban 352, así que el recuadro se encogía por CSS mientras las bandas
 * seguían colocadas en coordenadas de 352 y se descuadraban.
 *
 * @param bandas cuántos carriles hay
 * @param anchoDisponible ancho medido de la caja, en píxeles; 0 si aún no se ha medido
 * @param objetivoTactil mínimo por banda que exige el carril de edad
 */
export function anchoDeBandas(
  bandas: number,
  anchoDisponible: number,
  objetivoTactil: number,
): number {
  const n = Math.max(1, bandas);
  // Sin medida todavía: el valor de antes. Un fotograma con el ancho antiguo no se ve, y
  // empezar en cero dejaría el recuadro colapsado.
  if (anchoDisponible <= 0) return Math.min(88 * n, 360);
  const porBanda = Math.min(
    ANCHO_MAXIMO_DE_BANDA,
    Math.max(objetivoTactil, anchoDisponible / n),
  );
  return Math.round(porBanda * n);
}
