/**
 * Máquina del tipo «rejilla»: una cuadrícula de altura × tiempo.
 *
 * Es la mejor interfaz que existe para escribir música sin saber notación, y por eso
 * `docs/01-ARQUITECTURA.md` le da cinco actividades del catálogo: dictado rítmico, dictado
 * melódico, constructor de ritmos. Las columnas son pulsos y las filas son alturas; tocar
 * una celda enciende o apaga una nota.
 *
 * Sirve para **dos cosas distintas** y esa diferencia manda en el diseño:
 *
 *  - `libre`: crear. No hay solución, no hay acierto, no se comprueba nada. Es un lienzo.
 *  - `dictado`: reproducir lo que se ha oído. Hay solución y se puede comprobar.
 *
 * En modo libre **no existe la noción de error**, y eso no es una simplificación: es la
 * regla de Incredibox que el dosier señala como el mejor modelo de motivación infantil del
 * sector. Si todo suena bien, explorar es lo divertido.
 */

export type ModoRejilla = 'libre' | 'dictado';
export type FaseRejilla = 'editando' | 'revisando' | 'completada';

/** Celda encendida, como «fila,columna». Un Set evita duplicados sin ordenar nada. */
export type Celdas = ReadonlySet<string>;

export interface EstadoRejilla {
  fase: FaseRejilla;
  encendidas: Celdas;
  /** En dictado: celdas que sobran y celdas que faltan, para poder señalarlas. */
  sobran: Celdas;
  faltan: Celdas;
  intentos: number;
}

export type AccionRejilla =
  | { tipo: 'alternar'; fila: number; columna: number }
  | { tipo: 'limpiar' }
  | { tipo: 'comprobar'; solucion: readonly string[] }
  | { tipo: 'seguir' };

export const clave = (fila: number, columna: number) => `${fila},${columna}`;

export const INICIAL_REJILLA: EstadoRejilla = {
  fase: 'editando',
  encendidas: new Set(),
  sobran: new Set(),
  faltan: new Set(),
  intentos: 0,
};

/**
 * En modo `libre`, `comprobar` no hace nada: no hay nada que comprobar. Devolver el estado
 * tal cual es más honesto que inventarse un acierto.
 */
export function reducirRejilla(
  estado: EstadoRejilla,
  accion: AccionRejilla,
  modo: ModoRejilla,
  filas: number,
  columnas: number,
): EstadoRejilla {
  switch (accion.tipo) {
    case 'alternar': {
      if (estado.fase === 'completada') return estado;
      if (accion.fila < 0 || accion.fila >= filas) return estado;
      if (accion.columna < 0 || accion.columna >= columnas) return estado;

      const k = clave(accion.fila, accion.columna);
      const siguiente = new Set(estado.encendidas);
      if (siguiente.has(k)) siguiente.delete(k);
      else siguiente.add(k);

      // Tocar una celda borra las marcas de la comprobación anterior: si no, el niño
      // sigue viendo señalado un error que ya ha corregido.
      return { ...estado, fase: 'editando', encendidas: siguiente, sobran: new Set(), faltan: new Set() };
    }

    case 'limpiar':
      if (estado.fase === 'completada') return estado;
      return { ...estado, fase: 'editando', encendidas: new Set(), sobran: new Set(), faltan: new Set() };

    case 'comprobar': {
      if (modo === 'libre') return estado;
      if (estado.fase === 'completada') return estado;

      const solucion = new Set(accion.solucion);
      const sobran = new Set([...estado.encendidas].filter((k) => !solucion.has(k)));
      const faltan = new Set([...solucion].filter((k) => !estado.encendidas.has(k)));
      const intentos = estado.intentos + 1;

      if (sobran.size === 0 && faltan.size === 0) {
        return { ...estado, fase: 'completada', sobran, faltan, intentos };
      }
      return { ...estado, fase: 'revisando', sobran, faltan, intentos };
    }

    case 'seguir':
      if (estado.fase !== 'revisando') return estado;
      // Se conserva lo que el niño puso: no se le borra el trabajo por fallar.
      return { ...estado, fase: 'editando' };
  }
}

/** Celdas encendidas de una columna, para saber qué suena en cada pulso. */
export function notasDeColumna(encendidas: Celdas, columna: number): number[] {
  const filas: number[] = [];
  for (const k of encendidas) {
    const [f, c] = k.split(',').map(Number);
    if (c === columna) filas.push(f!);
  }
  return filas.sort((a, b) => a - b);
}
