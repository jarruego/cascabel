/**
 * Que la casilla que suena esté a la vista: desplaza la caja de lado si hace falta.
 *
 * Una cuadrícula de dieciséis columnas no cabe en un móvil y se desplaza en horizontal; al
 * reproducir, el cursor se iba por la derecha y la melodía seguía sonando en casillas que
 * nadie veía. Lo pidió el autor el 2026-09-12 para el constructor de ritmos y para las
 * pistas: «hace autoscroll horizontal para seguir la melodía».
 *
 * Solo se mueve la caja y solo de lado, y solo cuando la casilla se sale: `scrollIntoView`
 * arrastraba también el desplazamiento vertical de la página, y moverse a cada columna
 * marea. Cuando hay que moverse, la casilla queda a un tercio del borde izquierdo, con lo
 * que se ven las que vienen detrás, que es lo que se sigue con la vista.
 */
export function mantenerALaVista(contenedor: HTMLElement | null, casilla: Element | null | undefined): void {
  if (!contenedor || !(casilla instanceof HTMLElement)) return;
  const caja = contenedor.getBoundingClientRect();
  const c = casilla.getBoundingClientRect();
  const seSale = c.left < caja.left || c.right > caja.right;
  if (!seSale) return;
  const destino = contenedor.scrollLeft + (c.left - caja.left) - caja.width / 3;
  try {
    contenedor.scrollTo({ left: Math.max(0, destino), behavior: 'smooth' });
  } catch {
    contenedor.scrollLeft = Math.max(0, destino);
  }
}
