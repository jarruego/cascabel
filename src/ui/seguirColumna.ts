/**
 * Que la casilla que suena esté a la vista: la caja se desplaza de lado siguiéndola.
 *
 * Una cuadrícula de dieciséis columnas o una canción de cuarenta y ocho pulsos no caben
 * en un móvil y se desplazan en horizontal; al reproducir, el cursor se iba por la derecha
 * y la música seguía en casillas que nadie veía. Lo pidió el autor el 2026-09-10 para el
 * constructor de ritmos, las pistas y la percusión corporal.
 *
 * **La casilla que suena va centrada, y la caja avanza con ella.** La primera versión solo
 * se movía cuando la casilla se salía, y entonces la siguiente se perdía de vista un
 * instante; el autor prefirió que la caja avance con el pulso, con la casilla actual en el
 * centro y las que vienen a la derecha. Solo se mueve la caja y solo de lado: `scrollIntoView`
 * arrastraba también el desplazamiento vertical de la página. Si todo cabe, no se mueve.
 */
export function mantenerALaVista(contenedor: HTMLElement | null, casilla: Element | null | undefined): void {
  if (!contenedor || !(casilla instanceof HTMLElement)) return;
  if (contenedor.scrollWidth <= contenedor.clientWidth + 1) return;
  const caja = contenedor.getBoundingClientRect();
  const c = casilla.getBoundingClientRect();
  const centroCasilla = contenedor.scrollLeft + (c.left - caja.left) + c.width / 2;
  const destino = Math.max(0, Math.min(contenedor.scrollWidth - caja.width, centroCasilla - caja.width / 2));
  if (Math.abs(destino - contenedor.scrollLeft) < 1) return;
  try {
    contenedor.scrollTo({ left: destino, behavior: 'smooth' });
  } catch {
    contenedor.scrollLeft = destino;
  }
}
