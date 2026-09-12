/**
 * Los iconos que son un número no se dibujan: se escriben. Un «2» en una tecla de emoji
 * era un dibujo de un dibujo; el autor pidió «directamente el número con una fuente chula»
 * (2026-09-13). La fuente es Bravura, que ya va en la app: sus cifras de compás (SMuFL
 * timeSig0–9, U+E080–E089) son gruesas, redondas y musicales, y son literalmente las que
 * se leen en un 2/4 o un 3/4.
 */
export const CIFRAS: Record<string, string> = {
  uno: '\uE081',
  dos: '\uE082',
  tres: '\uE083',
  cuatro: '\uE084',
};

export function esCifra(nombre: string): boolean {
  return Object.prototype.hasOwnProperty.call(CIFRAS, nombre);
}
