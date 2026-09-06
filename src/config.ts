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
 * Ventanas de acierto rítmico en milisegundos, POR CARRIL. Un adulto entrenado acierta a
 * ±30 ms; un niño no.
 *
 * DECISIÓN (2026-09-06, delegada por el autor). Va por carril y no por etapa porque la
 * tabla de la que sale —`CLAUDE.md` §7 y el dosier— **está escrita por edades** (3-5, 6-8,
 * 9-12), y una edad es forma de carril, no de ciclo LOMLOE. Lo que mide una tolerancia es
 * control motor, y el control motor va con la edad del niño, no con el curso en el que el
 * BOE coloca un saber básico.
 *
 * Consecuencia práctica: una misma actividad de `primaria-c2` se evalúa con 100 ms para un
 * niño de 3.º y con 70 para uno de 4.º. Eso es lo correcto: el feedback tiene que ajustarse
 * al niño que lo recibe, no al fichero. Y no incumple la regla 4 de `CLAUDE.md`, porque una
 * ventana más estrecha no castiga: cambia la pista, nunca termina la actividad.
 *
 * **Pendiente de revisión pedagógica.** Las cifras son las convencionales que ya estaban
 * documentadas; lo que se decide aquí es el eje por el que se indexan.
 */
export const TOLERANCIA_MS: Record<Carril, { perfecto: number; bien: number; casi: number }> = {
  infantil: { perfecto: 150, bien: 250, casi: 400 },
  lectores: { perfecto: 100, bien: 180, casi: 300 },
  autonomos: { perfecto: 70, bien: 130, casi: 220 },
};

/**
 * Tolerancia cuando solo se conoce la etapa y no quién está delante.
 *
 * Devuelve la MÁS GENEROSA de los carriles que pueden abrir esa etapa. Ante la duda nunca
 * se aprieta: equivocarse hacia el lado ancho hace que un niño se sienta capaz, y hacia el
 * estrecho hace que uno con buen pulso se sienta torpe. Las dos equivocaciones no cuestan
 * lo mismo.
 */
export function toleranciaDeEtapa(etapa: Etapa) {
  const candidatos = carrilesDe(etapa).map((c) => TOLERANCIA_MS[c]);
  return candidatos.reduce((a, b) => (a.perfecto >= b.perfecto ? a : b));
}
