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
import Paisaje from './tipos/Paisaje';
import Pistas from './tipos/Pistas';
import Cuerpo from './tipos/Cuerpo';
import Pads from './tipos/Pads';
import Referencia from './tipos/Referencia';
import Acompanamientos from './tipos/Acompanamientos';
import Eco from './tipos/Eco';
import Memoria from './tipos/Memoria';
import Presentacion from './tipos/Presentacion';
import { conSerie } from './tipos/Serie';

/**
 * Mapa tipo de actividad -> componente.
 *
 * ESTA ES LA IDEA CENTRAL DEL PROYECTO: no hay un componente por actividad, hay uno
 * por TIPO. Añadir una actividad es escribir un JSON, no programar. Antes de crear
 * una entrada nueva aquí, comprueba si el caso ya cabe en un tipo existente.
 */
export const REGISTRO: Partial<Record<TipoActividad, ComponentType<PropsActividad>>> = {
  eleccion: Eleccion,
  emparejar: conSerie(Emparejar, 'emparejar'),
  memoria: Memoria,
  ordenar: conSerie(Ordenar, 'ordenar'),
  'guia-aula': GuiaAula,
  'tocar-a-tiempo': conSerie(TocarATiempo, 'tocar-a-tiempo'),
  pentagrama: Pentagrama,
  rejilla: conSerie(Rejilla, 'rejilla'),
  cantar: Cantar,
  seguir: conSerie(Seguir, 'seguir'),
  lienzo: Lienzo,
  teclado: Teclado,
  karaoke: conSerie(Karaoke, 'karaoke'),
  compases: conSerie(Compases, 'compases'),
  escala: Escala,
  paisaje: Paisaje,
  pistas: Pistas,
  cuerpo: Cuerpo,
  pads: Pads,
  referencia: Referencia,
  acompanamientos: Acompanamientos,
  eco: Eco,
  presentacion: Presentacion,
  // Los diez tipos de docs/01-ARQUITECTURA.md están implementados.
  // Añadir una actividad NO toca este fichero: se escribe un JSON.
  // rejilla, pentagrama, seguir, 'tocar-a-tiempo' -> fase 2
  // cantar, lienzo -> fase 2/3
};

export function componenteDe(tipo: TipoActividad) {
  return REGISTRO[tipo] ?? null;
}
