/**
 * Repartir N elementos iguales por la pantalla.
 *
 * La regla la dio el autor el 2026-09-10: los elementos se reparten de forma equitativa,
 * en filas iguales, con la última centrada si queda corta, y el hueco sobrante se reparte
 * entre ellos (`space-evenly`). Cuatro son dos y dos; cinco, tres y dos; seis, tres a la
 * izquierda y tres a la derecha en vertical y tres arriba y tres abajo en apaisado.
 *
 * Es un módulo puro: dice cuántas columnas y de qué lado, y el componente pinta.
 */

/** Cuántas columnas para N elementos, según la orientación de la pantalla. */
export function columnasPara(n: number, apaisado: boolean): number {
  if (n <= 0) return 1;
  if (n <= 3) return n;
  if (n === 4) return 2;
  if (n === 5) return 3;
  if (apaisado) {
    if (n <= 6) return 3;
    if (n <= 8) return 4;
    return 5;
  }
  // En vertical la pantalla es estrecha: dos columnas si N es par, tres si es impar, para
  // que todas las filas salgan enteras o la última quede centrada con una sola de menos.
  return n % 2 === 0 ? 2 : 3;
}

export interface Reparto {
  columnas: number;
  filas: number;
  /** El lado de cada elemento, en píxeles enteros. */
  lado: number;
}

/**
 * Cuántas columnas, cuántas filas y de qué lado, para que N cuadrados quepan en un hueco de
 * `ancho` × `alto` con `hueco` píxeles entre ellos y alrededor, sin pasar de `maximo`.
 */
export function repartir(
  n: number,
  ancho: number,
  alto: number,
  opciones: { hueco?: number; maximo?: number; minimo?: number } = {},
): Reparto {
  const { hueco = 16, maximo = 220, minimo = 48 } = opciones;
  const columnas = columnasPara(n, ancho > alto);
  const filas = Math.max(1, Math.ceil(n / columnas));
  const porAncho = (ancho - (columnas + 1) * hueco) / columnas;
  const porAlto = (alto - (filas + 1) * hueco) / filas;
  const lado = Math.floor(Math.max(minimo, Math.min(porAncho, porAlto, maximo)));
  return { columnas, filas, lado };
}
