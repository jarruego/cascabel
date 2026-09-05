/**
 * Identidad del producto. Cambiarla aquí la cambia en toda la app.
 *
 * `Cascabel` es la aplicación; `cocomusic` es el proyecto pedagógico del que forma
 * parte. Son dos marcas distintas y ninguna de las dos está cubierta por las licencias
 * del código ni de los contenidos: ver TRADEMARK.md.
 */
export const APP = {
  nombre: 'Cascabel',
  proyecto: 'cocomusic',
  idiomaPorDefecto: 'es',
  versionEsquemaActividad: 1,
  /** Rutas relativas siempre: la CSP prohíbe cualquier origen que no sea el nuestro. */
  rutaContenido: '/content',
} as const;

export type Etapa = 'infantil' | 'primaria-c1' | 'primaria-c2' | 'primaria-c3';

/** Tamaño mínimo del objetivo táctil, en píxeles CSS. WCAG 2.2 AA pide 24; con niños es un suelo. */
export const OBJETIVO_TACTIL: Record<Etapa, number> = {
  infantil: 75,
  'primaria-c1': 60,
  'primaria-c2': 60,
  'primaria-c3': 48,
};

/** Máximo de elementos interactivos simultáneos. Fuente: investigación de UX infantil (NN/g). */
export const MAX_OBJETOS: Record<Etapa, number> = {
  infantil: 4,
  'primaria-c1': 6,
  'primaria-c2': 8,
  'primaria-c3': 9,
};

/** Ventanas de acierto rítmico en milisegundos. Un adulto entrenado acierta a ±30 ms; un niño no. */
export const TOLERANCIA_MS: Record<Etapa, { perfecto: number; bien: number; casi: number }> = {
  infantil: { perfecto: 150, bien: 250, casi: 400 },
  'primaria-c1': { perfecto: 100, bien: 180, casi: 300 },
  'primaria-c2': { perfecto: 100, bien: 180, casi: 300 },
  'primaria-c3': { perfecto: 70, bien: 130, casi: 220 },
};
