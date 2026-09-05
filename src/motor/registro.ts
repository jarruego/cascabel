import type { ComponentType } from 'react';
import type { PropsActividad, TipoActividad } from './tipos';
import Eleccion from './tipos/Eleccion';

/**
 * Mapa tipo de actividad -> componente.
 *
 * ESTA ES LA IDEA CENTRAL DEL PROYECTO: no hay un componente por actividad, hay uno
 * por TIPO. Añadir una actividad es escribir un JSON, no programar. Antes de crear
 * una entrada nueva aquí, comprueba si el caso ya cabe en un tipo existente.
 */
export const REGISTRO: Partial<Record<TipoActividad, ComponentType<PropsActividad>>> = {
  eleccion: Eleccion,
  // Pendientes, en este orden (ver docs/07-ROADMAP.md):
  // emparejar, ordenar, 'guia-aula'   -> fase 1
  // rejilla, pentagrama, seguir, 'tocar-a-tiempo' -> fase 2
  // cantar, lienzo -> fase 2/3
};

export function componenteDe(tipo: TipoActividad) {
  return REGISTRO[tipo] ?? null;
}
