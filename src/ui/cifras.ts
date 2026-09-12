/**
 * Los iconos que son un número no se dibujan: se escriben. Un «2» en una tecla de emoji
 * era un dibujo de un dibujo; el autor pidió «directamente el número con una fuente chula»
 * (2026-09-13). La fuente es Bravura, que ya va en la app: sus cifras de compás (SMuFL
 * timeSig, `glifos.ts`) son gruesas, redondas y musicales, y son literalmente las que se
 * leen en un 2/4 o un 3/4.
 */
const CIFRAS = new Set(['uno', 'dos', 'tres', 'cuatro'] as const);

export type Cifra = 'uno' | 'dos' | 'tres' | 'cuatro';

export function esCifra(nombre: string): nombre is Cifra {
  return (CIFRAS as Set<string>).has(nombre);
}
