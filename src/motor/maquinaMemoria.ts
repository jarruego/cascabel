/**
 * Máquina de estados del tipo «memoria»: un tablero de cartas boca abajo, y cada pareja es
 * un dibujo y su sonido.
 *
 * Es la propuesta del autor del 2026-09-11, y es distinta de «emparejar» en lo que se
 * ejercita: en emparejar el tablero entero está a la vista y lo que se compara es un sonido
 * con un dibujo; aquí las cartas están tapadas y lo que se entrena, además del oído, es
 * **acordarse de dónde estaba cada cosa**. Un sonido que suena y desaparece es exactamente
 * lo que la música es, y recordarlo es la mitad de escucharla.
 *
 * Reglas de producto, y por eso viven aquí y no en el componente:
 *  - Se destapan dos. Si son la misma pareja —el dibujo y el sonido del mismo instrumento—
 *    se quedan destapadas. Si no, se vuelven a tapar las dos, sin más.
 *  - **No hay límite de intentos, ni tiempo, ni puntos.** Un fallo no cuesta nada: cuesta
 *    volver a tapar, que es lo que hace que la siguiente vez ya se sepa dónde estaba.
 *  - Tocar una carta ya destapada no hace nada, y tocar la misma dos veces tampoco.
 *  - **La segunda carta es siempre de la otra cara.** Con un sonido destapado solo se
 *    puede destapar un dibujo, y al revés. Lo pidió el autor al probarlo: dos sonidos
 *    seguidos, o dos dibujos, confunden y nunca pueden ser pareja, así que no se ofrecen.
 */

export type CaraDeCarta = 'imagen' | 'sonido';

export interface Carta {
  /** Única en el tablero: `perro-imagen`, `perro-sonido`. */
  id: string;
  /** La pareja a la que pertenece. Dos cartas con la misma pareja y distinta cara encajan. */
  pareja: string;
  cara: CaraDeCarta;
}

export type FaseMemoria = 'eligiendo' | 'comprobando' | 'completada';

export interface EstadoMemoria {
  fase: FaseMemoria;
  /** La primera carta destapada de este turno, si la hay. */
  primera: string | null;
  /** Las dos del turno que se está comprobando. */
  turno: { a: string; b: string; acierto: boolean } | null;
  /** Ids de las cartas que ya se quedaron destapadas. */
  resueltas: string[];
  intentos: number;
}

export type AccionMemoria = { tipo: 'destapar'; id: string } | { tipo: 'seguir' };

export const INICIAL_MEMORIA: EstadoMemoria = {
  fase: 'eligiendo',
  primera: null,
  turno: null,
  resueltas: [],
  intentos: 0,
};

export function encajan(a: Carta, b: Carta): boolean {
  return a.pareja === b.pareja && a.cara !== b.cara;
}

export function reducirMemoria(
  estado: EstadoMemoria,
  accion: AccionMemoria,
  cartas: Carta[],
): EstadoMemoria {
  switch (accion.tipo) {
    case 'destapar': {
      if (estado.fase !== 'eligiendo') return estado;
      if (estado.resueltas.includes(accion.id) || estado.primera === accion.id) return estado;
      if (!cartas.some((c) => c.id === accion.id)) return estado;

      if (estado.primera === null) return { ...estado, primera: accion.id };

      const a = cartas.find((c) => c.id === estado.primera)!;
      const b = cartas.find((c) => c.id === accion.id)!;
      // De la misma cara que la primera: no es una pareja posible, y no se acepta.
      if (a.cara === b.cara) return estado;
      const acierto = encajan(a, b);
      return {
        ...estado,
        fase: 'comprobando',
        primera: null,
        turno: { a: a.id, b: b.id, acierto },
        intentos: estado.intentos + 1,
        resueltas: acierto ? [...estado.resueltas, a.id, b.id] : estado.resueltas,
      };
    }

    case 'seguir': {
      if (estado.fase !== 'comprobando') return estado;
      const completada = estado.resueltas.length >= cartas.length;
      return { ...estado, fase: completada ? 'completada' : 'eligiendo', turno: null };
    }
  }
}

/** ¿Se puede tocar esta carta ahora? Con una destapada, solo las de la otra cara. */
export function tocable(estado: EstadoMemoria, carta: Carta, cartas: Carta[]): boolean {
  if (estado.fase !== 'eligiendo' || estado.resueltas.includes(carta.id)) return false;
  if (estado.primera === null || estado.primera === carta.id) return true;
  const primera = cartas.find((c) => c.id === estado.primera);
  return primera !== undefined && primera.cara !== carta.cara;
}

/** ¿Se ve la cara de esta carta ahora mismo? Las resueltas y las dos del turno en curso. */
export function destapada(estado: EstadoMemoria, id: string): boolean {
  return (
    estado.resueltas.includes(id) ||
    estado.primera === id ||
    estado.turno?.a === id ||
    estado.turno?.b === id
  );
}

/**
 * Baraja con una semilla, para que el tablero sea el mismo mientras dura la actividad y
 * distinto la próxima vez. Sin semilla, cada repintado de React barajaría otra vez.
 */
export function barajar<T>(lista: T[], semilla: number): T[] {
  const salida = [...lista];
  let x = semilla || 1;
  for (let i = salida.length - 1; i > 0; i--) {
    // Un generador pequeño y suficiente: no hace falta más para repartir doce cartas.
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const j = x % (i + 1);
    [salida[i], salida[j]] = [salida[j]!, salida[i]!];
  }
  return salida;
}
