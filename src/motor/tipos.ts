import type { Etapa } from '@/config';

/**
 * Tipos derivados de schemas/actividad.schema.json.
 * El esquema manda: si cambias uno, cambia el otro y vuelve a ejecutar
 * `npm run contenido:validar`.
 */

export type TipoActividad =
  | 'eleccion'
  | 'emparejar'
  | 'ordenar'
  | 'rejilla'
  | 'pentagrama'
  | 'seguir'
  | 'tocar-a-tiempo'
  | 'cantar'
  | 'lienzo'
  | 'guia-aula'
  /** Piano en pantalla. Añadido tras la investigación de docs/11. */
  | 'teclado'
  /** Musicograma horizontal sobre pentagrama, con toque a tiempo. Ver Karaoke.tsx. */
  | 'karaoke'
  /** Poner las barras de compás a una línea de figuras. Ver Compases.tsx. */
  | 'compases'
  /** Construir una escala en el teclado viendo cómo se escribe. Ver Escala.tsx. */
  | 'escala';

export type Eje = 'pulso' | 'altura' | 'timbre' | 'notacion' | 'cuerpo' | 'creacion' | 'cultura';

export type ModoEntrada =
  | 'toque'
  | 'toque-secuencial'
  | 'arrastre'
  | 'microfono-voz'
  | 'microfono-palmada'
  | 'ninguna';

/** CAPA NORMATIVA: solo etiquetas literales del real decreto. Ante la duda, null. */
export interface Curriculo {
  area?: string;
  competencia: 'CE1' | 'CE2' | 'CE3' | 'CE4' | 'CE5' | null;
  criterio?: string | null;
  saber?: string | null;
}

/** CAPA DE PRÁCTICA: convención pedagógica, no currículo. El RD nunca nombra una figura. */
export interface Practica {
  figuras?: string[];
  notas?: string[];
  /** Las progresiones vocal (Kodály) y de flauta NO coinciden. No las mezcles. */
  secuencia?: 'vocal-kodaly' | 'flauta' | 'laminas' | 'ninguna';
  compas?: '2/4' | '3/4' | '4/4' | '6/8' | 'libre';
  tempo?: number;
  metodo?: Array<'orff' | 'kodaly' | 'dalcroze' | 'willems' | 'montessori' | 'bapne'>;
}

export interface Actividad {
  id: string;
  version: number;
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string;
  etapa: Etapa;
  eje: Eje;
  lugar?: 'pantalla' | 'hibrida' | 'fuera';
  duracion_min?: number;
  curriculo: Curriculo;
  practica?: Practica;
  musica?: { abc?: string; audio?: string; acompanamiento?: string };
  entrada: { modo: ModoEntrada; alternativa?: 'toque' | 'toque-secuencial' | 'ninguna' };
  contenido: Record<string, unknown>;
  evaluacion?: {
    autocorrectiva?: boolean;
    tolerancia_ms?: { perfecto: number; bien: number; casi: number };
    tolerancia_cents?: number;
    reporta?: string[];
  };
  locucion?: { enunciado: string; audio?: string };
  pistas?: string[];
  creditos?: Array<{ obra: string; autor?: string; fuente?: string; licencia: string }>;
  /**
   * Textos propios del dosier imprimible. Todo es opcional: sin esto, la ficha usa la guía
   * genérica del TIPO de actividad, que es lo que hace que las 53 tengan dosier útil sin
   * haber escrito 53 dosieres. Se rellena solo cuando una actividad concreta pide un matiz
   * que su tipo no cubre.
   */
  ficha?: {
    comoFunciona?: string;
    sinPantalla?: string;
    ampliacion?: string;
    refuerzo?: string;
    observar?: string;
    indicador1?: string;
    indicador2?: string;
    indicador3?: string;
  };
  estado?: 'borrador' | 'revision-pedagogica' | 'publicada';
}

/** Lo que devuelve cualquier actividad al terminar. Nunca contiene datos personales. */
export interface ResultadoActividad {
  actividadId: string;
  completada: boolean;
  aciertos?: number;
  intentos?: number;
  desvioMedioMs?: number;
  desviacionTipicaMs?: number;
  afinacionMediaCents?: number;
}

export interface PropsActividad {
  actividad: Actividad;
  alTerminar: (resultado: ResultadoActividad) => void;
}
