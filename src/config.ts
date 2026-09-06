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

/**
 * Carril de presentación. NO es lo mismo que la etapa, y la diferencia es deliberada:
 * ver docs/adr/0005-una-app-tres-carriles.md.
 *
 *   `etapa`  → capa normativa. Ciclos LOMLOE, para etiquetar currículo. Coincide con el BOE.
 *   `carril` → capa de presentación. Tamaños, tipografía, iconografía y recompensa.
 *
 * El 2.º ciclo LOMLOE (3.º y 4.º) queda partido entre los dos carriles de Primaria,
 * porque la frontera la marca la lectura fluida y la motricidad fina, no el real decreto.
 *
 * Regla: **el carril manda en la presentación, la etapa manda en el currículo.**
 */
export type Carril = 'infantil' | 'lectores' | 'autonomos';

/** Lo que elige una persona: el curso en el que está el niño. */
export type Curso = 'infantil' | 1 | 2 | 3 | 4 | 5 | 6;

/** Curso -> carril. Aquí es donde se parte el 2.º ciclo: 3.º va con los pequeños. */
export function carrilDe(curso: Curso): Carril {
  if (curso === 'infantil') return 'infantil';
  return curso <= 3 ? 'lectores' : 'autonomos';
}

/** Curso -> ciclo LOMLOE, que es lo que etiqueta el currículo. */
export function etapaDe(curso: Curso): Etapa {
  if (curso === 'infantil') return 'infantil';
  if (curso <= 2) return 'primaria-c1';
  if (curso <= 4) return 'primaria-c2';
  return 'primaria-c3';
}

/**
 * En qué carriles debe aparecer una actividad de esta etapa. `primaria-c2` sale en los
 * dos precisamente porque 3.º y 4.º viven en carriles distintos.
 */
export function carrilesDe(etapa: Etapa): Carril[] {
  switch (etapa) {
    case 'infantil':
      return ['infantil'];
    case 'primaria-c1':
      return ['lectores'];
    case 'primaria-c2':
      return ['lectores', 'autonomos'];
    case 'primaria-c3':
      return ['autonomos'];
  }
}

/** Carril con el que abrir una actividad si nadie ha elegido otro. */
export function carrilPorDefecto(etapa: Etapa): Carril {
  return carrilesDe(etapa)[0]!;
}

/**
 * Tamaño mínimo del objetivo táctil, en píxeles CSS. WCAG 2.2 AA pide 24; con niños es
 * un suelo. Va indexado POR CARRIL: un niño de 4.º necesita el tamaño de su edad, no el
 * de su ciclo curricular, que comparte con 3.º.
 */
export const OBJETIVO_TACTIL: Record<Carril, number> = {
  infantil: 75,
  lectores: 60,
  autonomos: 48,
};

/** Máximo de elementos interactivos simultáneos. Fuente: investigación de UX infantil (NN/g). */
export const MAX_OBJETOS: Record<Carril, number> = {
  infantil: 4,
  lectores: 6,
  autonomos: 9,
};

/** Separación mínima entre objetivos táctiles, en píxeles CSS. */
export const SEPARACION: Record<Carril, number> = {
  infantil: 24,
  lectores: 16,
  autonomos: 12,
};

/**
 * Ventanas de acierto rítmico en milisegundos. Un adulto entrenado acierta a ±30 ms; un
 * niño no.
 *
 * Sigue indexado por ETAPA, no por carril, y es una decisión provisional: la tabla de
 * CLAUDE.md §7 está escrita por edades (3-5, 6-8, 9-12), que es forma de carril, no de
 * ciclo. Pero la tolerancia la consume `evaluacion.ts` a partir de la actividad, que solo
 * declara etapa. Reindexarlo obliga a decidir qué tolerancia aplica a una actividad de
 * `primaria-c2` abierta desde cada carril. Anotado en el roadmap; no se adivina aquí.
 */
export const TOLERANCIA_MS: Record<Etapa, { perfecto: number; bien: number; casi: number }> = {
  infantil: { perfecto: 150, bien: 250, casi: 400 },
  'primaria-c1': { perfecto: 100, bien: 180, casi: 300 },
  'primaria-c2': { perfecto: 100, bien: 180, casi: 300 },
  'primaria-c3': { perfecto: 70, bien: 130, casi: 220 },
};
