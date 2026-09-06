/**
 * Máquina de estados del tipo «emparejar»: dos conjuntos, se tocan de dos en dos.
 *
 * **Toque sucesivo, nunca arrastre.** No es una preferencia: WCAG 2.5.7 exige alternativa
 * a todo lo arrastrable, y por debajo de 6 años el arrastre directamente no funciona —la
 * motricidad fina no da. Tocar A, tocar B, y suenan los dos. Ver docs/04-DISENO-UI.md.
 *
 * La autocorrección es por el oído, no por un aspa roja: al tocar dos elementos suenan los
 * dos seguidos, y el niño oye por sí mismo si van juntos. Si no lo son, se quedan donde
 * estaban y no pasa nada más.
 */

export interface ParejaResuelta {
  izquierda: string;
  derecha: string;
}

export type FaseEmparejar = 'eligiendo' | 'comprobando' | 'completada';

export interface EstadoEmparejar {
  fase: FaseEmparejar;
  /** Clave del elemento tocado primero, o null si no hay ninguno seleccionado. */
  seleccion: string | null;
  /** Última comprobación, para que la interfaz sepa qué animar y qué sonar. */
  ultima: { izquierda: string; derecha: string; acierto: boolean } | null;
  resueltas: string[];
  intentos: number;
  fallosAqui: number;
}

export type AccionEmparejar =
  | { tipo: 'tocar'; clave: string; lado: 'izquierda' | 'derecha' }
  | { tipo: 'seguir' };

export const INICIAL_EMPAREJAR: EstadoEmparejar = {
  fase: 'eligiendo',
  seleccion: null,
  ultima: null,
  resueltas: [],
  intentos: 0,
  fallosAqui: 0,
};

/**
 * @param parejas       las asociaciones correctas del JSON
 * @param ladoDe        de qué lado está cada clave, para no emparejar dos del mismo lado
 */
export function reducirEmparejar(
  estado: EstadoEmparejar,
  accion: AccionEmparejar,
  parejas: ParejaResuelta[],
): EstadoEmparejar {
  switch (accion.tipo) {
    case 'tocar': {
      // Mientras suena la comprobación no se aceptan toques: un niño encadena tres.
      if (estado.fase !== 'eligiendo') return estado;
      if (estado.resueltas.includes(accion.clave)) return estado;

      // Primer toque: solo selecciona. Tocar otra vez el mismo deselecciona, que es lo
      // que un niño intenta cuando se arrepiente, y no debe costarle un intento.
      if (estado.seleccion === null) {
        return { ...estado, seleccion: accion.clave };
      }
      if (estado.seleccion === accion.clave) {
        return { ...estado, seleccion: null };
      }

      // Dos del mismo lado: se entiende como cambio de idea, no como error.
      const yaEsIzquierda = parejas.some((p) => p.izquierda === estado.seleccion);
      const nuevaEsIzquierda = accion.lado === 'izquierda';
      if (yaEsIzquierda === nuevaEsIzquierda) {
        return { ...estado, seleccion: accion.clave };
      }

      const izquierda = yaEsIzquierda ? estado.seleccion : accion.clave;
      const derecha = yaEsIzquierda ? accion.clave : estado.seleccion;
      const acierto = parejas.some((p) => p.izquierda === izquierda && p.derecha === derecha);

      return {
        ...estado,
        fase: 'comprobando',
        seleccion: null,
        ultima: { izquierda, derecha, acierto },
        intentos: estado.intentos + 1,
        fallosAqui: acierto ? estado.fallosAqui : estado.fallosAqui + 1,
        resueltas: acierto ? [...estado.resueltas, izquierda, derecha] : estado.resueltas,
      };
    }

    case 'seguir': {
      if (estado.fase !== 'comprobando') return estado;
      const completada = estado.resueltas.length >= parejas.length * 2;
      return {
        ...estado,
        fase: completada ? 'completada' : 'eligiendo',
        ultima: null,
        fallosAqui: estado.ultima?.acierto ? 0 : estado.fallosAqui,
      };
    }
  }
}
