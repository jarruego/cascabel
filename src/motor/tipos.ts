import type { Etapa } from '@/config';
import type { Personaje } from '@/ui/personajes';

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
  | 'escala'
  /** Grabar sonidos del entorno. La ÚNICA que guarda audio. Ver Paisaje.tsx. */
  | 'paisaje'
  /** Componer con varias voces a la vez. Ver Pistas.tsx. */
  | 'pistas'
  /** Percusión corporal: pitos, palmas, muslos y pies. Ver Cuerpo.tsx. */
  | 'cuerpo'
  /** Cartas boca abajo: un dibujo y su sonido. Lo propuso el autor el 2026-09-11. Ver Memoria.tsx. */
  | 'memoria'
  /** El kit de percusión, para tocarlo con el dedo. Ver Pads.tsx. */
  | 'pads'
  /** Consulta del lenguaje musical, con sonido. No es un ejercicio. Ver Referencia.tsx. */
  | 'referencia'
  /** Bases en bucle para cantar encima, con transporte. Ver Acompanamientos.tsx. */
  | 'acompanamientos'
  /** Dos niños por turnos: uno propone y otro repite. Ver Eco.tsx. */
  | 'eco';

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
  entrada: {
    modo: ModoEntrada;
    /**
     * Qué se hace sin micrófono. `sin-grabar` es para las actividades cuyo producto ES una
     * grabación: ahí no hay toque que la sustituya, pero la actividad se hace igual sin
     * grabar. `ninguna` significa que no hay salida, y solo vale sin micrófono.
     */
    alternativa?: 'toque' | 'toque-secuencial' | 'sin-grabar' | 'ninguna';
  };
  contenido: Record<string, unknown>;
  /**
   * Qué se evalúa y qué se guarda.
   *
   * **La tolerancia no está aquí a propósito.** Se pudo declarar por actividad y no la leía
   * nadie: la ventana de ritmo sale de `TOLERANCIA_MS` y la de afinación de
   * `VENTANAS_POR_CARRIL`, las dos por carril, porque miden control motor y precisión vocal
   * y eso depende de la edad del niño. Una de las dos actividades que la declaraba ya decía
   * un número distinto del que se usaba, sin que nada avisara.
   */
  evaluacion?: {
    autocorrectiva?: boolean;
    reporta?: string[];
  };
  /**
   * Clave de i18n con la frase que se le dice al niño.
   *
   * Se llamaba `locucion` y llevaba un `audio` opcional para una grabación. El 2026-09-08
   * se decidió que no va a haber grabaciones (ver `docs/adr/0006`), y un campo que promete
   * audio para algo que es texto se queda mintiendo para siempre.
   */
  enunciado?: string;
  /**
   * Qué personaje de cocomusic presenta la actividad.
   *
   * Se elige por lo que la actividad **trabaja**, no por gusto: Rex descubre, Fara calla,
   * Milo juega con el ritmo, Simón escucha. Por defecto Dora, que es la primera de la
   * progresión. Ver `docs/14-PERSONAJES.md`.
   */
  personaje?: Personaje;
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
  /**
   * Es también un instrumento o una herramienta de aula: algo que se usa libremente, sin
   * solución ni final. Sale en la pantalla de Instrumentos.
   *
   * **Y una que además tenga criterio curricular sale también en el catálogo.** No es
   * duplicar: el editor de melodías es un instrumento *y* una actividad del criterio 4.1, y
   * quien lo busca por una vía no lo busca por la otra.
   */
  herramienta?: boolean;
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
  /** Cómo ha ido, en palabras. Lo pone el motor que lo sabe; si no, se deduce de las cifras. */
  calidad?: 'bien' | 'casi' | 'hecho';
  /**
   * La actividad ya ha enseñado su propio cierre —el resumen de una serie— y el marco no
   * debe abrir la modal de celebración encima.
   */
  cerrado?: boolean;
}

export interface PropsActividad {
  actividad: Actividad;
  alTerminar: (resultado: ResultadoActividad) => void;
  /** Volver al catálogo. Lo usa el cierre de una serie; el marco lo provee. */
  alSalir?: () => void;
}
