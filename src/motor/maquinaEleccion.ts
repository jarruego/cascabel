import { REFRACTARIO_MS, TRAS_ACIERTO_MS } from './maquinaReaccion';

/**
 * Máquina de estados del tipo «elección».
 *
 * Vive fuera del componente por dos motivos. Uno, que así se puede probar sin montar
 * React ni añadir dependencias de test. Y dos, más importante: **las reglas de producto
 * de `CLAUDE.md` §4 son invariantes, no detalles de pintado**. Que un fallo no termine la
 * actividad tiene que ser demostrable, no una promesa repartida por los manejadores.
 *
 * Reglas que se codifican aquí, y que `tests/eleccion.test.ts` vigila:
 *
 *  - Un fallo NUNCA avanza, NUNCA resta y NUNCA termina. Repite el estímulo y da pista.
 *  - No hay vidas, ni cronómetro, ni puntuación durante el juego.
 *  - Tras una respuesta hay un instante en que no se acepta otra. Un niño de cuatro años
 *    da tres toques seguidos por costumbre, y sin esto contaríamos tres intentos y
 *    encadenaríamos tres avances. Tras un fallo ese instante es solo el refractario: la
 *    pista se queda encima sin bloquear y se puede corregir al momento.
 */

export type FaseEleccion = 'estimulo' | 'bien' | 'casi' | 'completada';

export interface EstadoEleccion {
  fase: FaseEleccion;
  indice: number;
  aciertos: number;
  intentos: number;
  /** Fallos en el estímulo actual. Sirve para dar pistas cada vez más concretas. */
  fallosAqui: number;
}

export type AccionEleccion =
  | { tipo: 'elegir'; clave: string; respuesta: string }
  /** Lo dispara el temporizador cuando el feedback ha terminado de mostrarse. */
  | { tipo: 'seguir' };

export const ESTADO_INICIAL: EstadoEleccion = {
  fase: 'estimulo',
  indice: 0,
  aciertos: 0,
  intentos: 0,
  fallosAqui: 0,
};

export function reducir(
  estado: EstadoEleccion,
  accion: AccionEleccion,
  totalEstimulos: number,
): EstadoEleccion {
  switch (accion.tipo) {
    case 'elegir': {
      // El bloqueo: fuera de la fase de estímulo, una respuesta no cuenta para nada.
      if (estado.fase !== 'estimulo') return estado;

      if (accion.clave === accion.respuesta) {
        return {
          ...estado,
          fase: 'bien',
          aciertos: estado.aciertos + 1,
          intentos: estado.intentos + 1,
        };
      }
      // Fallo: se cuenta el intento y se ofrece pista. Ni se avanza ni se termina.
      return {
        ...estado,
        fase: 'casi',
        intentos: estado.intentos + 1,
        fallosAqui: estado.fallosAqui + 1,
      };
    }

    case 'seguir': {
      if (estado.fase === 'bien') {
        const esElUltimo = estado.indice + 1 >= totalEstimulos;
        if (esElUltimo) return { ...estado, fase: 'completada' };
        return { ...estado, fase: 'estimulo', indice: estado.indice + 1, fallosAqui: 0 };
      }
      if (estado.fase === 'casi') {
        // Se vuelve al MISMO estímulo. El índice no se toca.
        return { ...estado, fase: 'estimulo' };
      }
      return estado;
    }
  }
}

/**
 * Milisegundos hasta que se vuelve a admitir respuesta. Tras un acierto, lo que dura el
 * «¡bien!»; tras un fallo, solo el refractario: la pista no se va con la fase —el componente
 * la deja lo que tarda en leerse— y el niño corrige cuando quiere.
 */
export function esperaMs(fase: FaseEleccion): number {
  return fase === 'casi' ? REFRACTARIO_MS : TRAS_ACIERTO_MS;
}

/**
 * Pista para el intento actual: cada fallo trae la siguiente, y a partir de ahí se
 * repite la última. Nunca se queda sin pista, y nunca dice «has fallado».
 */
export function pistaPara(pistas: string[] | undefined, fallosAqui: number): string | null {
  if (!pistas || pistas.length === 0 || fallosAqui === 0) return null;
  return pistas[Math.min(fallosAqui - 1, pistas.length - 1)]!;
}
