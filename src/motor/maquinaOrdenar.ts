/**
 * Máquina de estados del tipo «ordenar»: colocar una secuencia por altura, duración o forma.
 *
 * **Elegir y luego colocar, que es el «tap-and-tap» de verdad.** El niño toca un elemento
 * —lo oye, y queda elegido—, y después toca la casilla donde quiere que vaya. Tocar otro
 * elemento antes de colocar simplemente cambia la elección, así que **escuchar todas las
 * veces que haga falta no compromete nada**. En una actividad donde hay que comparar
 * sonidos, poder oírlos sin decidir es la mitad del ejercicio.
 *
 * La versión anterior colocaba al final con un solo toque: obligaba a decidir en el mismo
 * gesto con el que escuchabas.
 *
 * **Un colocado se puede recoger.** Tocar un elemento ya puesto lo devuelve a la mano y lo
 * deja elegido. Con eso desaparece el «quitar el último», que solo dejaba corregir en orden
 * inverso: aquí se recoge cualquiera.
 *
 * Y la regla que más importa sigue igual: **un elemento colocado fuera de sitio no se
 * rechaza**. Se coloca, y al comprobar se enseña cuáles cambiar. Rechazar el toque en el
 * momento convierte la actividad en un cerrojo que hay que adivinar, y eso castiga.
 */

export type FaseOrdenar = 'colocando' | 'revisando' | 'completada';

export interface EstadoOrdenar {
  fase: FaseOrdenar;
  /**
   * Las casillas, en orden. `null` es una casilla vacía.
   *
   * Se guarda con huecos y no como una lista compacta porque el niño puede colocar la
   * tercera antes que la primera, y eso tiene que poder verse.
   */
  casillas: Array<string | null>;
  /** Elemento en la mano: elegido y sonando, pendiente de colocar. */
  elegida: string | null;
  /** Tras comprobar: índices de casilla que no están en su sitio. */
  fueraDeSitio: number[];
  intentos: number;
  fallosAqui: number;
}

export type AccionOrdenar =
  /** Tocar un elemento de la mano, o uno ya colocado (que se recoge). */
  | { tipo: 'elegir'; clave: string }
  /** Tocar una casilla. Coloca ahí lo elegido. */
  | { tipo: 'colocar'; indice: number }
  | { tipo: 'comprobar' }
  | { tipo: 'seguir' };

export function inicial(total: number): EstadoOrdenar {
  return {
    fase: 'colocando',
    casillas: Array.from({ length: total }, () => null),
    elegida: null,
    fueraDeSitio: [],
    intentos: 0,
    fallosAqui: 0,
  };
}

export function reducirOrdenar(
  estado: EstadoOrdenar,
  accion: AccionOrdenar,
  correcto: string[],
): EstadoOrdenar {
  switch (accion.tipo) {
    case 'elegir': {
      if (estado.fase !== 'colocando') return estado;
      // Tocar lo ya elegido lo suelta: es la forma de arrepentirse sin colocar nada.
      if (estado.elegida === accion.clave) return { ...estado, elegida: null };

      const donde = estado.casillas.indexOf(accion.clave);
      if (donde >= 0) {
        // Estaba colocado: se recoge. Así se reordena sin deshacer nada.
        const casillas = [...estado.casillas];
        casillas[donde] = null;
        return { ...estado, casillas, elegida: accion.clave };
      }
      return { ...estado, elegida: accion.clave };
    }

    case 'colocar': {
      if (estado.fase !== 'colocando' || !estado.elegida) return estado;
      if (accion.indice < 0 || accion.indice >= estado.casillas.length) return estado;

      const casillas = [...estado.casillas];
      // Si la casilla estaba ocupada, lo que había vuelve a la mano en vez de perderse.
      const desalojado = casillas[accion.indice];
      casillas[accion.indice] = estado.elegida;
      return { ...estado, casillas, elegida: desalojado ?? null };
    }

    case 'comprobar': {
      if (estado.fase !== 'colocando') return estado;
      if (estado.casillas.some((c) => c === null)) return estado;

      const fuera = estado.casillas
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
      /*
        Se vacían SOLO las casillas equivocadas, y las acertadas se quedan donde están.

        Aquí sí se pueden conservar los aciertos sueltos, y antes no: con la lista compacta,
        quitar el primero le cambiaba el índice al segundo y convertía un acierto en un
        error sin que el niño tocara nada. Con casillas numeradas, un acierto en la tercera
        casilla sigue estando en la tercera pase lo que pase.
      */
      const casillas = estado.casillas.map((c, i) =>
        estado.fueraDeSitio.includes(i) ? null : c,
      );
      return { ...estado, fase: 'colocando', casillas, elegida: null, fueraDeSitio: [] };
    }
  }
}

/** Elementos que quedan en la mano, en el orden en que se dibujan. */
export function pendientes(todas: string[], casillas: Array<string | null>): string[] {
  return todas.filter((c) => !casillas.includes(c));
}
