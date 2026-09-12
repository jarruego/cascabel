import type { NombreGlifo } from './glifos';

/**
 * Iconos que no se dibujan: se escriben con Bravura, por `ui/Glifo`. Los números, porque un
 * «2» en una tecla de emoji era un dibujo de un dibujo y el autor pidió «directamente el
 * número con una fuente chula» (2026-09-13); y las flechas, porque las de emoji van dentro
 * de un recuadro azul que no pega con nada. El nombre del icono se conserva en el
 * contenido: un JSON sigue diciendo `"icono": "dos"` o `"icono": "flecha-arriba"`.
 */
export const ICONOS_ESCRITOS: Record<string, NombreGlifo> = {
  uno: 'uno',
  dos: 'dos',
  tres: 'tres',
  cuatro: 'cuatro',
  'flecha-arriba': 'flecha-arriba',
  'flecha-abajo': 'flecha-abajo',
};

export function esIconoEscrito(nombre: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICONOS_ESCRITOS, nombre);
}
