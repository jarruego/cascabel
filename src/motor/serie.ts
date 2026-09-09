/**
 * Una actividad como pequeña serie de ejercicios de sí misma.
 *
 * Lo pidió el autor el 2026-09-11: «las actividades son muy cortas, como píldoras, y
 * repiten lo mismo tres o cuatro veces sin variación». Lo que cambia no es el tipo de
 * motor —un dictado sigue siendo un dictado— sino que **una actividad trae varios
 * ejercicios**, escritos en su JSON, cada uno un poco distinto: negras, luego con silencio,
 * luego con corcheas. Al acabar, un cierre que dice cómo ha ido cada uno.
 *
 * Reglas de producto, aquí y con test:
 *  - Los ejercicios van en orden. Al terminar uno se anota su calidad en palabras —bien,
 *    casi, hecho— y se pasa al siguiente. Nunca hay que repetir uno para avanzar.
 *  - Al final, «repetir los que costaron» rehace solo los que salieron «casi»; si no hubo
 *    ninguno, la serie entera. Y siempre hay un botón discreto para hacerla entera otra vez.
 *  - Cada vuelta lleva un número, y la vuelta decide la variación: la primera es la del
 *    JSON, la segunda la variación uno... (`variaciones.ts`). Nada se repite idéntico.
 *  - Sin puntos ni porcentajes (§4). «Casi» no es un suspenso: es el ejercicio que conviene
 *    volver a hacer.
 */

export type Calidad = 'bien' | 'casi' | 'hecho';

export type FaseSerie = 'ejercicio' | 'entre' | 'resumen';

export interface EstadoSerie {
  fase: FaseSerie;
  /** Índices de los ejercicios que se hacen en esta vuelta, en orden. */
  orden: number[];
  /** Posición dentro de `orden`. */
  posicion: number;
  /** La última calidad de cada ejercicio, por índice. */
  resultados: Record<number, Calidad>;
  /** Cuántas veces se ha arrancado la serie. La primera vuelta es la 0. */
  vuelta: number;
}

export type AccionSerie =
  | { tipo: 'terminar'; calidad: Calidad }
  | { tipo: 'seguir' }
  | { tipo: 'repetirCasi' }
  | { tipo: 'repetirTodo' };

export function inicialSerie(total: number): EstadoSerie {
  return {
    fase: 'ejercicio',
    orden: Array.from({ length: total }, (_, i) => i),
    posicion: 0,
    resultados: {},
    vuelta: 0,
  };
}

/** El ejercicio que toca ahora, por su índice en el JSON. */
export function actual(estado: EstadoSerie): number {
  return estado.orden[estado.posicion] ?? 0;
}

export function reducirSerie(estado: EstadoSerie, accion: AccionSerie, total: number): EstadoSerie {
  switch (accion.tipo) {
    case 'terminar': {
      if (estado.fase !== 'ejercicio') return estado;
      const resultados = { ...estado.resultados, [actual(estado)]: accion.calidad };
      const ultimo = estado.posicion + 1 >= estado.orden.length;
      return { ...estado, resultados, fase: ultimo ? 'resumen' : 'entre' };
    }
    case 'seguir': {
      if (estado.fase !== 'entre') return estado;
      return { ...estado, fase: 'ejercicio', posicion: estado.posicion + 1 };
    }
    case 'repetirCasi': {
      if (estado.fase !== 'resumen') return estado;
      const casi = Array.from({ length: total }, (_, i) => i).filter(
        (i) => estado.resultados[i] === 'casi',
      );
      const orden = casi.length ? casi : Array.from({ length: total }, (_, i) => i);
      return { ...estado, fase: 'ejercicio', orden, posicion: 0, vuelta: estado.vuelta + 1 };
    }
    case 'repetirTodo': {
      if (estado.fase !== 'resumen') return estado;
      return {
        ...estado,
        fase: 'ejercicio',
        orden: Array.from({ length: total }, (_, i) => i),
        posicion: 0,
        vuelta: estado.vuelta + 1,
      };
    }
  }
}

/** ¿Queda algún ejercicio que salió «casi»? Decide qué botón manda en el cierre. */
export function hayCasi(estado: EstadoSerie): boolean {
  return Object.values(estado.resultados).includes('casi');
}

/** Calidad de la serie entera, para la celebración y para el registro. */
export function calidadGlobal(estado: EstadoSerie): Calidad {
  const valores = Object.values(estado.resultados);
  if (valores.some((v) => v === 'casi')) return 'casi';
  if (valores.some((v) => v === 'bien')) return 'bien';
  return 'hecho';
}

/**
 * Los ejercicios de una actividad, normalizados.
 *
 * Una actividad puede traer `contenido.ejercicios`, y entonces cada ejercicio es el
 * contenido base con sus campos encima: lo que no cambia —consigna, tempo, instrumento— se
 * escribe una vez. Sin `ejercicios`, la actividad es un solo ejercicio y todo sigue como
 * antes: es lo que permite que las ciento cuarenta y seis de hoy no cambien de golpe.
 */
export function ejerciciosDe<T extends Record<string, unknown>>(contenido: T): T[] {
  const lista = (contenido as { ejercicios?: Array<Partial<T>> }).ejercicios;
  if (!Array.isArray(lista) || lista.length === 0) return [contenido];
  const base = { ...contenido } as T & { ejercicios?: unknown };
  delete base.ejercicios;
  return lista.map((e) => ({ ...(base as T), ...e }));
}

/**
 * Calidad de un ejercicio a partir de lo que devuelve el motor, cuando el motor no la dice.
 *
 * Lo que un motor sabe: cuántos intentos ha costado, o cuántas de cuántas. La regla es la
 * misma que la de felicitar en el karaoke: seis de cada diez. Y un ejercicio que se
 * resuelve a la primera —intentos igual a lo que había que hacer— es «bien».
 */
export function calidadDeResultado(r: {
  calidad?: Calidad;
  aciertos?: number;
  intentos?: number;
}): Calidad {
  if (r.calidad) return r.calidad;
  if (r.aciertos !== undefined && r.intentos) return r.aciertos / r.intentos >= 0.6 ? 'bien' : 'casi';
  if (r.intentos !== undefined) return r.intentos <= 1 ? 'bien' : 'casi';
  return 'hecho';
}
