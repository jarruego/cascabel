/**
 * La pauta de «pon las barras»: dónde va cada cosa, en espacios de pentagrama.
 *
 * Aquí no hay alturas: hay figuras en fila y huecos entre ellas. Pero desde el 2026-09-10
 * se dibujan sobre un pentagrama de verdad —clave, cifra de compás, cinco líneas y las
 * divisorias donde las pone el niño— porque es lo que va a encontrarse en cualquier
 * partitura, y aprender las barras sobre una pauta es aprenderlas donde viven.
 *
 * Todo se mide en **espacios** (la distancia entre dos líneas), que es la unidad de la
 * notación: la fuente Bravura es SMuFL y sus glifos están dibujados para que 1 em sea la
 * altura del pentagrama, cuatro espacios. Con eso, el componente solo tiene que poner el
 * tamaño de fuente igual al alto de la pauta y cada glifo cae en su sitio.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: las figuras sin altura van todas en la **tercera
 * línea, con la plica hacia abajo**. Es la convención de los cuadernos de lectura rítmica
 * sobre pentagrama (y la de la fila de percusión indeterminada de Gould, *Behind Bars*,
 * cap. de percusión); la alternativa es una pauta de una sola línea sin clave, la de
 * percusión, que aquí no se ha elegido porque la actividad quiere enseñar la pauta entera.
 */

/** Glifos SMuFL de Bravura. Las figuras, con la plica hacia abajo: van en la tercera línea. */
export const GLIFO = {
  claveSol: '',
  redonda: '',
  blancaAbajo: '',
  negraAbajo: '',
  corcheaAbajo: '',
  puntillo: '',
  cifra: ['', '', '', '', '', '', '', '', '', ''],
} as const;

/** Alto del dibujo en espacios: dos de margen, cuatro de pauta, dos de margen. */
export const ALTO = 8;
/** La primera línea está a dos espacios del borde; la tercera, en medio. */
export const LINEA_1 = 2;
export const LINEA_3 = 4;
export const LINEA_5 = 6;

/** Anchura del hueco donde va una barra. Es también el objetivo táctil: tres espacios. */
export const HUECO = 3;

export interface Figura {
  /** Borde izquierdo del glifo. */
  x: number;
  glifo: string;
  pulsos: number;
}

export interface Hueco {
  /** Dónde empieza y acaba la zona que se pulsa. */
  x0: number;
  x1: number;
  /** Dónde se dibuja la barra, en medio. */
  xBarra: number;
}

export interface Pauta {
  ancho: number;
  clave: { x: number };
  cifra: { x: number; arriba: string; abajo: string };
  figuras: Figura[];
  huecos: Hueco[];
  /** La doble barra final: la fina y la gruesa. */
  final: { xFina: number; xGruesa: number };
}

/** El glifo de una duración en pulsos, con la plica hacia abajo. */
export function glifoDe(pulsos: number): string {
  if (pulsos >= 4) return GLIFO.redonda;
  if (pulsos >= 2) return GLIFO.blancaAbajo;
  if (pulsos >= 1.5) return GLIFO.negraAbajo + GLIFO.puntillo;
  if (pulsos >= 1) return GLIFO.negraAbajo;
  return GLIFO.corcheaAbajo;
}

/**
 * Cuánto sitio ocupa una figura, en espacios: la cabeza (1,3) más el aire que le sigue.
 * El aire crece con la duración, como en una partitura grabada: una blanca respira más
 * que una negra. No es proporcional del todo —una redonda no ocupa cuatro negras— porque
 * tampoco lo es en la imprenta musical, que usa una progresión más suave.
 */
export function anchoDe(pulsos: number): number {
  if (pulsos >= 4) return 7;
  if (pulsos >= 2) return 5.5;
  if (pulsos >= 1) return 4;
  return 3;
}

export function disponerPauta(duraciones: number[], pulsosPorCompas: number, figuraDelCompas: number): Pauta {
  let x = 1;
  const clave = { x };
  x += 3.7; // la clave de sol mide 2,7 espacios de ancho, y un espacio de aire
  const cifra = {
    x,
    arriba: String(pulsosPorCompas).split('').map((c) => GLIFO.cifra[Number(c)]!).join(''),
    abajo: String(figuraDelCompas).split('').map((c) => GLIFO.cifra[Number(c)]!).join(''),
  };
  x += 1.8 * Math.max(String(pulsosPorCompas).length, String(figuraDelCompas).length) + 1.5;

  const figuras: Figura[] = [];
  const huecos: Hueco[] = [];
  duraciones.forEach((pulsos, i) => {
    figuras.push({ x, glifo: glifoDe(pulsos), pulsos });
    x += anchoDe(pulsos);
    if (i < duraciones.length - 1) {
      huecos.push({ x0: x, x1: x + HUECO, xBarra: x + HUECO / 2 });
      x += HUECO;
    }
  });

  x += 0.8;
  const final = { xFina: x, xGruesa: x + 0.9 };
  x += 0.9 + 0.5 + 1; // la gruesa, su grosor y el margen derecho
  return { ancho: x, clave, cifra, figuras, huecos, final };
}
