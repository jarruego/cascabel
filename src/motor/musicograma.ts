/**
 * Geometría y reglas de un musicograma que avanza.
 *
 * Vive aparte del componente porque **la elección de representación no es estética**: decide
 * qué puede significar el eje transversal, y equivocarse ahí enseña algo falso sin dar
 * ningún síntoma.
 *
 * ## La regla que importa
 *
 * Un musicograma tiene dos ejes: el del **tiempo**, que siempre es el del avance, y el
 * **transversal**. Lo que se puede poner en el transversal depende de lo que represente
 * cada figura:
 *
 * | Representación | Qué enseña | Eje transversal | Edad orientativa |
 * |---|---|---|---|
 * | `icono` | que un sonido tiene un referente concreto | **ninguno** | Infantil |
 * | `color` | altura relativa, sin leer | **altura**, en carriles de color | Infantil y 1.º–2.º |
 * | `silaba` | duración (ta, ti-ti) | **ninguno** | 1.º–3.º |
 * | `figura` | duración escrita (♩ ♫) | **ninguno** | 3.º–4.º |
 * | `pentagrama` | altura y duración escritas | **la pauta** | 4.º–6.º |
 *
 * **Las representaciones de duración van en un solo carril, y eso no es negociable.** Una
 * sílaba rítmica o una negra no dicen nada de la altura; colocarlas a distintas alturas le
 * enseñaría al niño una relación que no existe, y encima lo haría de la forma más difícil de
 * desaprender, que es sin decirlo. Es la única regla de este fichero que no admite matiz.
 *
 * ## Y la orientación
 *
 * `vertical` —las figuras caen— no exige ningún sentido de lectura, así que sirve antes de
 * saber leer y es la natural para el ritmo. `horizontal` —las figuras vienen de la derecha—
 * reproduce cómo se recorre una partitura, así que es la que corresponde cuando lo que se
 * está aprendiendo es a leer. **PENDIENTE DE REVISIÓN PEDAGÓGICA**: la correspondencia entre
 * edades y representaciones de la tabla es la convención habitual (Kodály para las sílabas,
 * código Boomwhacker para los colores), pero dónde está el salto de una a otra lo dice una
 * maestra, no un desarrollador.
 */

import { alturaEnPauta, type Clave } from './alturaEnPauta';

export type Representacion = 'pentagrama' | 'color' | 'silaba' | 'figura' | 'icono';
export type Orientacion = 'horizontal' | 'vertical';

export interface NotaMusicograma {
  /** Notación científica, p. ej. «E4». Obligatoria: es lo que suena. */
  nota: string;
  /** Duración en pulsos. */
  pulsos: number;
  /** Sílaba rítmica, para `representacion: 'silaba'`. */
  silaba?: string;
  /** Nombre de icono, para `representacion: 'icono'`. */
  icono?: string;
}

/**
 * ¿Esta representación dice algo de la altura?
 *
 * Es la pregunta de la que cuelga todo lo demás. Si la respuesta es no, hay un solo carril.
 */
export function representaAltura(r: Representacion): boolean {
  return r === 'pentagrama' || r === 'color';
}

/** Los grados distintos que aparecen, de grave a agudo. Son los carriles de `color`. */
export function carrilesDe(notas: NotaMusicograma[]): string[] {
  const vistos = new Map<string, number>();
  for (const n of notas) {
    const letra = n.nota[0]!.toUpperCase();
    const octava = Number(n.nota.replace(/[^0-9]/g, '') || '4');
    const orden = octava * 12 + 'C D EF G A B'.indexOf(letra);
    vistos.set(n.nota.replace('#', ''), orden);
  }
  return [...vistos.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
}

export interface Geometria {
  /** Cuánto ha avanzado por el eje del tiempo, en porcentaje del recuadro. */
  avance: number;
  /** Posición en el eje transversal, en píxeles desde el borde. */
  cruce: number;
}

export interface OpcionesGeometria {
  representacion: Representacion;
  orientacion: Orientacion;
  clave: Clave;
  /** Dónde está la línea del presente, en porcentaje. */
  lineaPct: number;
  /** Segundos visibles por delante de la línea. */
  anticipacionS: number;
  /** Tamaño del recuadro en el eje transversal, en píxeles. */
  transversalPx: number;
  /** Separación entre líneas del pentagrama, en píxeles. */
  separacion: number;
  /** Margen antes de la primera línea de la pauta. */
  margen: number;
}

/**
 * Dónde se dibuja una figura que suena dentro de `faltaS` segundos.
 *
 * `avance` va de `lineaPct` (está en la línea, ahora) a 100 (acaba de entrar por el fondo).
 * Quien dibuja decide si eso es `left` o `top`: la geometría es la misma y solo cambia el eje,
 * que es justamente por lo que las dos orientaciones pueden compartir este código.
 */
export function geometriaDe(
  nota: NotaMusicograma,
  faltaS: number,
  indiceCarril: number,
  totalCarriles: number,
  o: OpcionesGeometria,
): Geometria {
  const avance = o.lineaPct + (faltaS / o.anticipacionS) * (100 - o.lineaPct);

  if (!representaAltura(o.representacion)) {
    // Un solo carril, centrado. Ver la regla de arriba.
    return { avance, cruce: o.transversalPx / 2 };
  }

  if (o.representacion === 'pentagrama') {
    const { y } = alturaEnPauta(nota.nota, o.clave, o.separacion, o.margen);
    // En vertical la pauta se pone de lado y lo agudo va a la DERECHA, como en un piano:
    // hay que invertir, porque `alturaEnPauta` mide hacia abajo y allí lo agudo estaba arriba.
    return { avance, cruce: o.orientacion === 'vertical' ? o.transversalPx - y : y };
  }

  // Carriles de color, repartidos por igual. En horizontal el grave va abajo y en vertical
  // a la izquierda: en las dos, subir de nota es subir o avanzar hacia la derecha.
  const ancho = o.transversalPx / Math.max(1, totalCarriles);
  const desdeElGrave = ancho * (indiceCarril + 0.5);
  return {
    avance,
    cruce: o.orientacion === 'vertical' ? desdeElGrave : o.transversalPx - desdeElGrave,
  };
}

/** Figura musical para una duración en pulsos, en la fuente Bravura. */
export function figuraDe(pulsos: number): string {
  if (pulsos >= 4) return '𝅝';
  if (pulsos >= 2) return '𝅗𝅥';
  if (pulsos >= 1.5) return '𝅘𝅥·';
  if (pulsos >= 1) return '𝅘𝅥';
  if (pulsos >= 0.5) return '𝅘𝅥𝅮';
  return '𝅘𝅥𝅯';
}
