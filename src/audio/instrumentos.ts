import { MARIMBA, type Muestra } from './sampler';

/**
 * Qué instrumento suena en una actividad.
 *
 * **Cambiar de instrumento es cambiar de muestras y nada más.** El `Sampler` interpola con
 * `playbackRate` desde las notas que le des, así que un instrumento nuevo son unas cuantas
 * muestras y una entrada en el mapa de abajo: ni una línea en los componentes.
 *
 * ## De dónde salen
 *
 * De **FluidR3_GM**, el soundfont General MIDI de Frank Wen (2000-2008), **licencia MIT** —
 * una de las cuatro que admite `CLAUDE.md` §3 —, servido nota a nota por
 * `gleitz/midi-js-soundfonts`, también MIT. `tools/muestras-gm.py` los descarga, normaliza
 * a −3 dBFS y codifica a Opus.
 *
 * La búsqueda anterior se había quedado corta porque miró bancos *orquestales* —VCSL,
 * VSCO 2, Iowa— cuando el sitio donde está todo son los soundfonts GM, que llevan veinte
 * años siendo con lo que suena cualquier reproductor de MIDI.
 *
 * ## Una muestra cada tres semitonos, y por qué
 *
 * La marimba de VCSL tiene seis muestras en tres octavas porque es percusiva y aguanta el
 * estirado. **Un sostenido no**: `playbackRate` cambia la altura y la duración a la vez, así
 * que una flauta estirada tres semitonos suena a flauta acelerada. Con una muestra cada tres
 * semitonos el estirado máximo es de semitono y medio, que no delata en ningún timbre.
 *
 * ## Peso: por eso no están en el precache
 *
 * Son 1,9 MB entre los seis. Meterlos en el precache multiplicaría por tres la primera
 * descarga de un colegio entero para bajar cinco instrumentos que ese niño no va a abrir.
 * `vite.config.ts` los excluye y los cachea al usarlos: el primer día que se abre la
 * actividad del piano se bajan sus muestras, y a partir de ahí funciona sin conexión.
 */

const FLAUTA: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/flauta/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/flauta/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/flauta/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/flauta/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/flauta/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/flauta/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/flauta/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/flauta/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/flauta/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/flauta/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/flauta/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/flauta/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/flauta/c6.opus' },
];

const GUITARRA: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/guitarra/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/guitarra/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/guitarra/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/guitarra/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/guitarra/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/guitarra/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/guitarra/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/guitarra/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/guitarra/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/guitarra/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/guitarra/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/guitarra/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/guitarra/c6.opus' },
];

const PIANO: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/piano/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/piano/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/piano/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/piano/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/piano/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/piano/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/piano/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/piano/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/piano/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/piano/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/piano/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/piano/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/piano/c6.opus' },
];

const VIOLIN: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/violin/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/violin/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/violin/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/violin/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/violin/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/violin/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/violin/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/violin/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/violin/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/violin/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/violin/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/violin/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/violin/c6.opus' },
];

const VOZ: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/voz/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/voz/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/voz/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/voz/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/voz/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/voz/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/voz/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/voz/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/voz/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/voz/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/voz/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/voz/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/voz/c6.opus' },
];

const XILOFONO: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/xilofono/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/xilofono/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/xilofono/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/xilofono/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/xilofono/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/xilofono/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/xilofono/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/xilofono/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/xilofono/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/xilofono/ds5.opus' },
  { nota: 'F#5', url: '/audio/muestras/xilofono/fs5.opus' },
  { nota: 'A5', url: '/audio/muestras/xilofono/a5.opus' },
  { nota: 'C6', url: '/audio/muestras/xilofono/c6.opus' },
];

/**
 * Los instrumentos disponibles.
 *
 * `marimba` sigue siendo el de por defecto y el único que va en el precache: es el que suena
 * en casi todas las actividades y el que tiene que estar disponible sin conexión desde el
 * primer momento.
 */
export const INSTRUMENTOS: Record<string, Muestra[]> = {
  marimba: MARIMBA,
  piano: PIANO,
  xilofono: XILOFONO,
  flauta: FLAUTA,
  guitarra: GUITARRA,
  violin: VIOLIN,
  /**
   * Voz humana muestreada: el programa 53 de General MIDI, «Voice Oohs».
   *
   * Sustituye a la síntesis de formantes de `muestras-provisionales.py`, que era lo único
   * del banco que no era una grabación. Se comprobó midiendo el espectro de su la4 antes de
   * darla por buena: fundamental en 438,7 Hz y **un pico secundario hacia 1,2 kHz después de
   * un valle**, que es la firma de un formante. Un tono sintetizado decae de forma monótona
   * y no hace eso.
   *
   * Sigue sin ser lo que pide `CLAUDE.md` §6 para las LOCUCIONES —«voz humana grabada»
   * significa alguien diciendo la consigna, y eso hay que grabarlo—, pero para reconocer
   * *el timbre de una voz*, que es lo que piden tres actividades, esto sí lo es.
   */
  voz: VOZ,
};

/** Las muestras de un instrumento. Si no existe, marimba: la actividad tiene que sonar. */
export function muestrasDe(nombre: string | undefined): Muestra[] {
  return (nombre && INSTRUMENTOS[nombre]) || MARIMBA;
}

/** Los nombres disponibles, para que una pantalla de ajustes pueda ofrecerlos. */
export function instrumentosDisponibles(): string[] {
  return Object.keys(INSTRUMENTOS);
}
