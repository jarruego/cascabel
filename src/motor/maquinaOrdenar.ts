/**
 * Máquina de estados del tipo «ordenar»: colocar una secuencia por altura, duración o forma.
 *
 * **Reordenar es tocar en secuencia, no arrastrar.** El niño toca los elementos en el orden
 * que cree correcto y se van colocando en fila. Es la misma razón que en «emparejar»: WCAG
 * 2.5.7 y una motricidad fina que a los cuatro años no da para arrastrar con precisión.
 *
 * La regla que más importa está en `reducirOrdenar`: **un elemento colocado fuera de sitio
 * no se rechaza**. Se coloca igual, y al final se enseña cuáles cambiar. Rechazar el toque
 * en el momento convierte la actividad en un cerrojo que hay que adivinar, y eso castiga.
 */

export type FaseOrdenar = 'colocando' | 'revisando' | 'completada';

export interface EstadoOrdenar {
  fase: FaseOrdenar;
  /** Claves ya colocadas, en el orden en que las tocó el niño. */
  colocadas: string[];
  /** Tras comprobar: posiciones (índices de `colocadas`) que no están en su sitio. */
  fueraDeSitio: number[];
  intentos: number;
  fallosAqui: number;
}

export type AccionOrdenar =
  | { tipo: 'colocar'; clave: string }
  /** Quitar el último colocado. Arrepentirse es gratis y no cuenta como intento. */
  | { tipo: 'deshacer' }
  | { tipo: 'comprobar' }
  | { tipo: 'seguir' };

export const INICIAL_ORDENAR: EstadoOrdenar = {
  fase: 'colocando',
  colocadas: [],
  fueraDeSitio: [],
  intentos: 0,
  fallosAqui: 0,
};

export function reducirOrdenar(
  estado: EstadoOrdenar,
  accion: AccionOrdenar,
  correcto: string[],
): EstadoOrdenar {
  switch (accion.tipo) {
    case 'colocar': {
      if (estado.fase !== 'colocando') return estado;
      if (estado.colocadas.includes(accion.clave)) return estado;
      const colocadas = [...estado.colocadas, accion.clave];
      // Se coloca aunque esté mal. Comprobar es un paso aparte y explícito.
      return { ...estado, colocadas };
    }

    case 'deshacer': {
      if (estado.fase !== 'colocando' || estado.colocadas.length === 0) return estado;
      return { ...estado, colocadas: estado.colocadas.slice(0, -1) };
    }

    case 'comprobar': {
      if (estado.fase !== 'colocando') return estado;
      if (estado.colocadas.length < correcto.length) return estado;

      const fuera = estado.colocadas
        .map((clave, i) => (clave === correcto[i] ? -1 : i))
        .filter((i) => i >= 0);

      if (fuera.length === 0) {
        return { ...estado, fase: 'completada', fueraDeSitio: [], intentos: estado.intentos + 1 };
      }
      return {
        ...estado,
        fase: 'revisando',
        fueraDeSitio: fuera,
        intentos: estado.intentos + 1,
        fallosAqui: estado.fallosAqui + 1,
      };
    }

    case 'seguir': {
      if (estado.fase !== 'revisando') return estado;
      // Se conserva el PREFIJO correcto, no los elementos sueltos que acertó.
      //
      // Parece un detalle y no lo es. Conservar los aciertos sueltos les cambia el índice
      // —si acertó el segundo y falló el primero, el segundo pasa a ser el primero— y
      // convierte un acierto en un error sin que el niño haya tocado nada. Una secuencia
      // se construye de izquierda a derecha: lo que está bien desde el principio se queda,
      // y a partir del primer fallo se devuelve todo.
      let correctos = 0;
      while (
        correctos < estado.colocadas.length &&
        estado.colocadas[correctos] === correcto[correctos]
      ) {
        correctos += 1;
      }
      return {
        ...estado,
        fase: 'colocando',
        colocadas: estado.colocadas.slice(0, correctos),
        fueraDeSitio: [],
      };
    }
  }
}

/** Elementos que quedan por colocar, en el orden en que se dibujan. */
export function pendientes(todas: string[], colocadas: string[]): string[] {
  return todas.filter((c) => !colocadas.includes(c));
}
