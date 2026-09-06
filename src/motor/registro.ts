import type { ComponentType } from 'react';
import type { PropsActividad, TipoActividad } from './tipos';
import Eleccion from './tipos/Eleccion';
import Emparejar from './tipos/Emparejar';
import Ordenar from './tipos/Ordenar';
import GuiaAula from './tipos/GuiaAula';
import TocarATiempo from './tipos/TocarATiempo';
import Pentagrama from './tipos/Pentagrama';
import Rejilla from './tipos/Rejilla';

/**
 * Mapa tipo de actividad -> componente.
 *
 * ESTA ES LA IDEA CENTRAL DEL PROYECTO: no hay un componente por actividad, hay uno
 * por TIPO. Añadir una actividad es escribir un JSON, no programar. Antes de crear
 * una entrada nueva aquí, comprueba si el caso ya cabe en un tipo existente.
 */
export const REGISTRO: Partial<Record<TipoActividad, ComponentType<PropsActividad>>> = {
  eleccion: Eleccion,
  emparejar: Emparejar,
  ordenar: Ordenar,
  'guia-aula': GuiaAula,
  'tocar-a-tiempo': TocarATiempo,
  pentagrama: Pentagrama,
  rejilla: Rejilla,
  // Pendientes, en este orden (ver docs/07-ROADMAP.md):
  // rejilla, pentagrama, seguir, 'tocar-a-tiempo' -> fase 2
  // cantar, lienzo -> fase 2/3
};

export function componenteDe(tipo: TipoActividad) {
  return REGISTRO[tipo] ?? null;
}
