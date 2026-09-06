/**
 * Máquina de estados del tipo «compases»: poner las barras de compás.
 *
 * Se enseña una fila de figuras sin dividir y una cifra de compás, y hay que decidir dónde
 * van las divisorias. Es de las pocas cosas de lenguaje musical que **se puede comprobar
 * sola**: una barra está bien puesta o no lo está, y la respuesta no depende del gusto de
 * nadie. Eso la hace ideal para autocorregirse, que es lo que promete el proyecto.
 *
 * **La regla, y es una sola**: una divisoria va donde la suma de las figuras anteriores
 * completa un compás exacto. Ni antes ni después.
 *
 * **Lo que NO hace, a propósito.**
 *
 *  - No impide poner una barra donde no toca. Se pone, y al comprobar se dice cuáles
 *    sobran o faltan. Impedirlo convertiría esto en adivinar dónde deja el programa hacer
 *    clic, que es un cerrojo y no un ejercicio.
 *  - No exige poner la barra final. La última figura cierra el último compás y ahí la
 *    divisoria es redundante: pedirla sería pedir una formalidad, no un razonamiento.
 */

export type FaseCompases = 'colocando' | 'revisando' | 'completada';

export interface EstadoCompases {
  fase: FaseCompases;
  /** Huecos con divisoria. El hueco `i` está DESPUÉS de la figura `i`. */
  barras: ReadonlySet<number>;
  /** Tras comprobar: huecos donde sobra una barra. */
  sobran: number[];
  /** Tras comprobar: huecos donde falta una barra. */
  faltan: number[];
  intentos: number;
}

export type AccionCompases =
  /** Tocar un hueco: pone o quita la barra. */
  | { tipo: 'alternar'; hueco: number }
  | { tipo: 'comprobar' }
  | { tipo: 'seguir' };

export const INICIAL_COMPASES: EstadoCompases = {
  fase: 'colocando',
  barras: new Set<number>(),
  sobran: [],
  faltan: [],
  intentos: 0,
};

/**
 * Dónde tienen que ir las divisorias.
 *
 * @param duraciones duración de cada figura, en pulsos
 * @param pulsosPorCompas la cifra de compás: 4 en un 4/4, 3 en un 3/4
 * @returns índices de hueco. El hueco `i` está después de la figura `i`.
 *
 * **Se excluye el hueco final.** La última figura cierra el compás por sí sola y ahí la
 * barra es redundante: pedirla sería pedir una formalidad. Y se excluye también cualquier
 * barra que caiga a mitad de una figura, porque eso no puede ocurrir —una figura no se
 * parte por la mitad— y si ocurriera sería un error del contenido, no del niño.
 */
export function barrasCorrectas(duraciones: number[], pulsosPorCompas: number): number[] {
  const huecos: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < duraciones.length; i++) {
    acumulado += duraciones[i]!;
    const cierra = Math.abs(acumulado % pulsosPorCompas) < 1e-9;
    // El último hueco no cuenta: ahí la barra la pone el final de la línea.
    if (cierra && i < duraciones.length - 1) huecos.push(i);
  }
  return huecos;
}

/** ¿Las figuras suman un número entero de compases? Si no, el contenido está mal. */
export function cuadra(duraciones: number[], pulsosPorCompas: number): boolean {
  const total = duraciones.reduce((a, b) => a + b, 0);
  return Math.abs(total % pulsosPorCompas) < 1e-9;
}

export function reducirCompases(
  estado: EstadoCompases,
  accion: AccionCompases,
  duraciones: number[],
  pulsosPorCompas: number,
): EstadoCompases {
  switch (accion.tipo) {
    case 'alternar': {
      if (estado.fase !== 'colocando') return estado;
      // El último hueco no admite barra: ahí la pone el final de la línea.
      if (accion.hueco < 0 || accion.hueco >= duraciones.length - 1) return estado;
      const barras = new Set(estado.barras);
      if (barras.has(accion.hueco)) barras.delete(accion.hueco);
      else barras.add(accion.hueco);
      return { ...estado, barras };
    }

    case 'comprobar': {
      if (estado.fase !== 'colocando') return estado;
      const correctas = new Set(barrasCorrectas(duraciones, pulsosPorCompas));
      const sobran = [...estado.barras].filter((h) => !correctas.has(h)).sort((a, b) => a - b);
      const faltan = [...correctas].filter((h) => !estado.barras.has(h)).sort((a, b) => a - b);

      if (sobran.length === 0 && faltan.length === 0) {
        return { ...estado, fase: 'completada', sobran: [], faltan: [], intentos: estado.intentos + 1 };
      }
      return { ...estado, fase: 'revisando', sobran, faltan, intentos: estado.intentos + 1 };
    }

    case 'seguir': {
      if (estado.fase !== 'revisando') return estado;
      /*
        Se quitan las que sobran y **se dejan las que estaban bien**.

        Borrarlo todo y empezar de cero castigaría el acierto: quien puso tres bien y una
        mal tendría que volver a poner las tres. Aquí lo que estaba bien se queda, y lo que
        hay que pensar otra vez es solo lo que estaba mal.
      */
      const barras = new Set([...estado.barras].filter((h) => !estado.sobran.includes(h)));
      return { ...estado, fase: 'colocando', barras, sobran: [], faltan: [] };
    }
  }
}
