/**
 * Dónde va una nota en un pentagrama que se dibuja con posiciones absolutas, **incluidas las
 * notas que se salen de las cinco líneas**.
 *
 * `pentagramaPosiciones.ts` hace el camino contrario —de «línea 2» a la nota que suena ahí— y
 * está deliberadamente acotado a las cinco líneas y los cuatro espacios, porque ahí colocar
 * algo fuera es un error. Aquí hace falta lo otro: dada una nota, su altura, y la melodía
 * puede bajar del pentagrama. El tema de la Novena baja hasta do4, que en clave de sol va en
 * la primera línea adicional inferior.
 *
 * Una nota dibujada a la altura equivocada enseña algo falso, y no da ningún síntoma: se ve
 * bien, suena bien y es mentira. Por eso esto vive aparte y con test.
 */

const LETRAS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

export type Clave = 'sol' | 'fa';

/** Índice diatónico absoluto de una nota: cada octava son siete grados, no doce. */
export function gradoDiatonico(nota: string): number {
  const letra = nota[0]!.toLowerCase();
  const indice = LETRAS.indexOf(letra);
  if (indice === -1) throw new Error(`Nota no reconocida: ${nota}`);
  const octava = Number(nota.replace(/[^0-9]/g, '') || '4');
  return octava * 7 + indice;
}

/**
 * Grado de la primera línea (la de abajo) de cada clave.
 * Clave de sol: mi4 en la primera línea —de ahí que la segunda sea sol, que da nombre a la
 * clave—. Clave de fa en cuarta: sol2 en la primera.
 */
const PRIMERA_LINEA: Record<Clave, number> = {
  sol: gradoDiatonico('E4'),
  fa: gradoDiatonico('G2'),
};

/** Grados por encima de la primera línea. Negativo = por debajo del pentagrama. */
export function gradosSobrePauta(nota: string, clave: Clave = 'sol'): number {
  return gradoDiatonico(nota) - PRIMERA_LINEA[clave];
}

export interface AlturaEnPauta {
  /** Y del centro de la cabeza de nota, desde el borde superior del recuadro. */
  y: number;
  /** Y de cada línea adicional que hay que dibujar. Vacío si la nota cabe en la pauta. */
  adicionales: number[];
}

/**
 * @param margenArriba hueco libre por encima de la quinta línea, en píxeles
 * @param separacion   distancia entre líneas, en píxeles
 */
export function alturaEnPauta(
  nota: string,
  clave: Clave,
  separacion: number,
  margenArriba: number,
): AlturaEnPauta {
  const y = (grados: number) => margenArriba + ((8 - grados) * separacion) / 2;
  const g = gradosSobrePauta(nota, clave);

  // Las líneas adicionales van de dos en dos grados a partir del pentagrama, y solo hasta la
  // nota: una nota en el espacio de debajo del do4 no lleva línea propia, lleva la del do.
  const adicionales: number[] = [];
  for (let x = -2; x >= g; x -= 2) adicionales.push(y(x));
  for (let x = 10; x <= g; x += 2) adicionales.push(y(x));

  return { y: y(g), adicionales };
}

/** Y de cada una de las cinco líneas del pentagrama, de abajo arriba. */
export function yDeLinea(linea: number, separacion: number, margenArriba: number): number {
  return margenArriba + ((8 - (linea - 1) * 2) * separacion) / 2;
}
