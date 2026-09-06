import type { ComponentType } from 'react';
import type { PropsActividad, TipoActividad } from './tipos';
import Eleccion from './tipos/Eleccion';
import Emparejar from './tipos/Emparejar';
import Ordenar from './tipos/Ordenar';
import GuiaAula from './tipos/GuiaAula';
import TocarATiempo from './tipos/TocarATiempo';
import Pentagrama from './tipos/Pentagrama';
import Rejilla from './tipos/Rejilla';
import Cantar from './tipos/Cantar';
import Seguir from './tipos/Seguir';
import Lienzo from './tipos/Lienzo';
import Teclado from './tipos/Teclado';
import Karaoke from './tipos/Karaoke';
import Compases from './tipos/Compases';
import Escala from './tipos/Escala';

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
  cantar: Cantar,
  seguir: Seguir,
  lienzo: Lienzo,
  teclado: Teclado,
  karaoke: Karaoke,
  compases: Compases,
  escala: Escala,
  // Los diez tipos de docs/01-ARQUITECTURA.md están implementados.
  // Añadir una actividad NO toca este fichero: se escribe un JSON.
  // rejilla, pentagrama, seguir, 'tocar-a-tiempo' -> fase 2
  // cantar, lienzo -> fase 2/3
};

export function componenteDe(tipo: TipoActividad) {
  return REGISTRO[tipo] ?? null;
}
