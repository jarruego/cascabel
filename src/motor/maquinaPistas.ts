/**
 * Máquina de estados del editor por pistas.
 *
 * **Qué añade sobre `rejilla`, que ya es un secuenciador.** La rejilla es una voz: una
 * cuadrícula de altura por tiempo donde suena una nota por casilla. Aquí hay **varias voces
 * a la vez**, y eso cambia lo que se puede enseñar, no solo cuánto cabe:
 *
 *  - **Textura.** Que dos cosas suenen a la vez y sigan siendo dos cosas es una idea que no
 *    se puede tener con una sola pista. Es el salto de melodía a música.
 *  - **Función.** Una pista de percusión no hace lo mismo que una de melodía aunque las dos
 *    sean casillas: una sostiene y la otra canta. Con las dos delante, eso se ve.
 *  - **Silenciar y aislar.** Poder quitar una pista y volver a ponerla es la forma más
 *    directa de oír qué aporta cada una, y no existe si solo hay una.
 *
 * Por eso es un tipo aparte y no una `rejilla` con más filas: una rejilla de veinte filas
 * seguiría siendo una voz con muchas notas posibles.
 *
 * **Lo que NO hace, y es deliberado**: no hay volumen por pista, ni paneo, ni efectos. Eso
 * es un DAW, y un DAW en Primaria es una pantalla llena de botones que no enseñan música.
 * Encender, apagar y silenciar es todo lo que hace falta para entender qué es una textura.
 */

export type ClasePista = 'melodica' | 'percusion';

export interface Pista {
  /** Identificador estable dentro de la actividad. */
  clave: string;
  clase: ClasePista;
  /** Melódica: notas de cada fila, de aguda a grave. Percusión: nombres de golpe. */
  filas: string[];
  /** Instrumento con el que suena. Ver `audio/instrumentos.ts`. */
  instrumento?: string;
}

export interface EstadoPistas {
  /** Celdas encendidas, como «pista:fila,columna». */
  encendidas: ReadonlySet<string>;
  /** Pistas silenciadas. Silenciar no borra: es lo que permite comparar. */
  silenciadas: ReadonlySet<string>;
  sonando: boolean;
  /** Columna que suena ahora, o -1. */
  columna: number;
}

export type AccionPistas =
  | { tipo: 'alternar'; pista: string; fila: number; columna: number }
  | { tipo: 'silenciar'; pista: string }
  | { tipo: 'limpiarPista'; pista: string }
  | { tipo: 'limpiarTodo' }
  | { tipo: 'sonando'; valor: boolean }
  | { tipo: 'columna'; valor: number };

export const INICIAL_PISTAS: EstadoPistas = {
  encendidas: new Set<string>(),
  silenciadas: new Set<string>(),
  sonando: false,
  columna: -1,
};

export const clavePista = (pista: string, fila: number, columna: number) =>
  `${pista}:${fila},${columna}`;

export function reducirPistas(estado: EstadoPistas, accion: AccionPistas): EstadoPistas {
  switch (accion.tipo) {
    case 'alternar': {
      const k = clavePista(accion.pista, accion.fila, accion.columna);
      const encendidas = new Set(estado.encendidas);
      if (encendidas.has(k)) encendidas.delete(k);
      else encendidas.add(k);
      return { ...estado, encendidas };
    }

    case 'silenciar': {
      const silenciadas = new Set(estado.silenciadas);
      if (silenciadas.has(accion.pista)) silenciadas.delete(accion.pista);
      else silenciadas.add(accion.pista);
      return { ...estado, silenciadas };
    }

    case 'limpiarPista': {
      // Borra solo lo de esa pista. Es lo que permite rehacer una sin perder las otras, que
      // es justo lo que se hace cuando algo no encaja: se rehace la que estorba.
      const encendidas = new Set(
        [...estado.encendidas].filter((k) => !k.startsWith(`${accion.pista}:`)),
      );
      return { ...estado, encendidas };
    }

    case 'limpiarTodo':
      return { ...estado, encendidas: new Set<string>() };

    case 'sonando':
      return { ...estado, sonando: accion.valor, columna: accion.valor ? estado.columna : -1 };

    case 'columna':
      return { ...estado, columna: accion.valor };
  }
}

/**
 * Qué suena en una columna, saltándose las pistas silenciadas.
 *
 * **El silencio se aplica aquí y no al dibujar.** Una pista silenciada tiene que seguir
 * viéndose con sus casillas puestas: si desapareciera, silenciar sería borrar, y entonces no
 * serviría para lo único que sirve, que es comparar cómo suena con ella y sin ella.
 */
export function loQueSuena(
  estado: EstadoPistas,
  pistas: Pista[],
  columna: number,
): Array<{ pista: Pista; fila: number }> {
  const salida: Array<{ pista: Pista; fila: number }> = [];
  for (const p of pistas) {
    if (estado.silenciadas.has(p.clave)) continue;
    for (let fila = 0; fila < p.filas.length; fila++) {
      if (estado.encendidas.has(clavePista(p.clave, fila, columna))) {
        salida.push({ pista: p, fila });
      }
    }
  }
  return salida;
}

/** ¿Hay algo escrito en esta pista? Para saber si el botón de limpiarla sirve de algo. */
export function tieneAlgo(estado: EstadoPistas, pista: string): boolean {
  for (const k of estado.encendidas) if (k.startsWith(`${pista}:`)) return true;
  return false;
}
