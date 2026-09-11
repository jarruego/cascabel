/**
 * Posiciones del pentagrama: de «línea 2» a la nota que suena ahí.
 *
 * Esto no es criterio, es convención fija: en clave de sol la segunda línea es SOL —de ahí
 * el nombre de la clave, que rodea justamente esa línea— y a partir de ahí todo se deduce.
 * Las líneas se cuentan **de abajo arriba**, que es como se cuentan en música y al revés
 * de como crecen las coordenadas de una pantalla. Confundir ese sentido es el error clásico.
 *
 * Los nombres van en español (do, re, mi...) porque es la nomenclatura latina que usa la
 * escuela española, y `docs/03-CURRICULO.md` la fija como capa de PRÁCTICA.
 */

export type Clave = 'sol' | 'fa';
export type Sitio = { linea: number } | { espacio: number };

const LATINO = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'] as const;
export type NombreNota = (typeof LATINO)[number];

/** Nota de la primera línea (la de abajo) de cada clave, en notación científica. */
const PRIMERA_LINEA: Record<Clave, { nombre: NombreNota; octava: number }> = {
  // Clave de sol: mi4 en la primera línea, sol4 en la segunda.
  sol: { nombre: 'mi', octava: 4 },
  // Clave de fa en cuarta: sol2 en la primera línea, fa3 en la cuarta.
  fa: { nombre: 'sol', octava: 2 },
};

/**
 * Cuántos grados de escala hay que subir desde la primera línea.
 * Cada línea sube dos grados; cada espacio, uno más que la línea de debajo.
 *
 * Las líneas adicionales siguen la misma cuenta: la **línea 0** es la primera adicional
 * por debajo (do4 en clave de sol), la **6** y la **7** son las dos primeras por arriba
 * (la5 y do6); el **espacio 0** cuelga bajo la primera línea (re4) y los espacios 5 y 6
 * van encima de la quinta y de la sexta (sol5 y si5). Es lo que hace falta para las dos
 * octavas de do a do que se leen en 3.º ciclo (2026-09-12); más allá no hay actividad que
 * lo pida, y se sigue rechazando para que un error de escritura no dibuje una nota en el
 * limbo.
 */
function gradosDesdeAbajo(sitio: Sitio): number {
  if ('linea' in sitio) {
    if (sitio.linea < 0 || sitio.linea > 7) {
      throw new Error(`Línea fuera del pentagrama: ${sitio.linea}. Son 0 a 7, de abajo arriba.`);
    }
    return (sitio.linea - 1) * 2;
  }
  if (sitio.espacio < 0 || sitio.espacio > 6) {
    throw new Error(`Espacio fuera del pentagrama: ${sitio.espacio}. Son 0 a 6, de abajo arriba.`);
  }
  return (sitio.espacio - 1) * 2 + 1;
}

/** ¿Está dentro de las cinco líneas? Lo de fuera lleva líneas adicionales. */
export function dentroDelPentagrama(sitio: Sitio): boolean {
  const g = gradosDesdeAbajo(sitio);
  return g >= 0 && g <= 8;
}

/**
 * Las líneas adicionales que hay que dibujar para un sitio, como líneas (0 por debajo; 6 y
 * 7 por arriba). Una nota EN una adicional la lleva; una nota encima de la primera
 * adicional por arriba (si5, espacio 6) lleva la de debajo; y la que cuelga bajo la
 * primera línea (re4, espacio 0) no lleva ninguna, que es lo que se ve en cualquier
 * partitura.
 */
export function lineasAdicionales(sitio: Sitio): Sitio[] {
  const g = gradosDesdeAbajo(sitio);
  const lineas: Sitio[] = [];
  for (let n = 0; (n - 1) * 2 >= g; n--) lineas.push({ linea: n });
  for (let n = 6; (n - 1) * 2 <= g; n++) lineas.push({ linea: n });
  return lineas;
}

export interface NotaEnPentagrama {
  nombre: NombreNota;
  octava: number;
  /** Notación científica que entiende VexFlow, p. ej. «g/4». */
  vexflow: string;
}

export function notaDe(sitio: Sitio, clave: Clave = 'sol'): NotaEnPentagrama {
  const base = PRIMERA_LINEA[clave];
  const grados = gradosDesdeAbajo(sitio);
  const indiceBase = LATINO.indexOf(base.nombre);
  const total = indiceBase + grados;

  const nombre = LATINO[total % 7]!;
  const octava = base.octava + Math.floor(total / 7);

  return { nombre, octava, vexflow: `${aIngles(nombre)}/${octava}` };
}

const A_INGLES: Record<NombreNota, string> = {
  do: 'c',
  re: 'd',
  mi: 'e',
  fa: 'f',
  sol: 'g',
  la: 'a',
  si: 'b',
};

export function aIngles(nombre: NombreNota): string {
  return A_INGLES[nombre];
}

/** Todos los sitios del pentagrama, de abajo arriba. Es el orden en que se dibujan. */
export function sitiosDelPentagrama(): Sitio[] {
  const sitios: Sitio[] = [];
  for (let i = 1; i <= 5; i++) {
    sitios.push({ linea: i });
    if (i <= 4) sitios.push({ espacio: i });
  }
  return sitios.sort((a, b) => gradosDesdeAbajo(a) - gradosDesdeAbajo(b));
}

/**
 * Coordenada Y de un sitio, medida desde la línea superior del pentagrama.
 *
 * VexFlow y el DOM crecen hacia abajo; la música se cuenta hacia arriba. Aquí se hace la
 * inversión, en un solo sitio y con un test que la fija.
 *
 * @param separacion distancia entre líneas en píxeles
 */
export function desplazamientoY(sitio: Sitio, separacion: number): number {
  // La quinta línea (la de arriba) está en 0; cada grado baja media separación.
  const gradosDesdeArriba = 8 - gradosDesdeAbajo(sitio);
  return (gradosDesdeArriba * separacion) / 2;
}
