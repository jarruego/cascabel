import { MARIMBA, type Muestra } from './sampler';

/**
 * Qué instrumento suena en una actividad.
 *
 * **Cambiar de instrumento es cambiar de muestras y nada más.** El `Sampler` ya interpola
 * con `playbackRate` desde las notas que le des, así que un instrumento nuevo son unas
 * cuantas muestras y una entrada aquí: ni una línea en los componentes. Esa es toda la razón
 * de que este fichero exista, porque hoy solo hay uno.
 *
 * **Y hoy solo hay uno, de verdad.** El banco tiene pandero, claves y campanilla, pero son
 * muestras sueltas de percusión sin altura: no sirven para tocar una melodía. Añadir un
 * instrumento afinado es trabajo de muestras —descargar de VCSL y pasarlas por
 * `tools/muestras-instrumento.py`— no de programación.
 *
 * **Qué timbres funcionan aquí.** Solo los percusivos: marimba, xilófono, glockenspiel,
 * campanas. El `Sampler` cubre el hueco entre muestras estirando la que tiene, y un timbre
 * percusivo aguanta dos o tres semitonos sin delatarse. Un piano o una cuerda frotada suenan
 * mal a la primera, así que si algún día se añaden hará falta una muestra por semitono, que
 * es otro orden de magnitud de peso. Está en `CLAUDE.md` §7.
 */

export const INSTRUMENTOS: Record<string, Muestra[]> = {
  marimba: MARIMBA,
};

/** Las muestras de un instrumento. Si no existe, marimba: la actividad tiene que sonar. */
export function muestrasDe(nombre: string | undefined): Muestra[] {
  return (nombre && INSTRUMENTOS[nombre]) || MARIMBA;
}

/** Los nombres disponibles, para que una pantalla de ajustes pueda ofrecerlos. */
export function instrumentosDisponibles(): string[] {
  return Object.keys(INSTRUMENTOS);
}
