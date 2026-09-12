import { MARIMBA, Sampler, type Muestra } from './sampler';

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
  { nota: 'C4', url: '/audio/muestras/flauta/c4.opus' },
  { nota: 'E4', url: '/audio/muestras/flauta/e4.opus' },
  { nota: 'A4', url: '/audio/muestras/flauta/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/flauta/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/flauta/e5.opus' },
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
  { nota: 'C2', url: '/audio/muestras/piano/c2.opus' },
  { nota: 'D2', url: '/audio/muestras/piano/d2.opus' },
  { nota: 'F#2', url: '/audio/muestras/piano/fs2.opus' },
  { nota: 'A#2', url: '/audio/muestras/piano/as2.opus' },
  { nota: 'C3', url: '/audio/muestras/piano/c3.opus' },
  { nota: 'E3', url: '/audio/muestras/piano/e3.opus' },
  { nota: 'G#3', url: '/audio/muestras/piano/gs3.opus' },
  { nota: 'C4', url: '/audio/muestras/piano/c4.opus' },
  { nota: 'E4', url: '/audio/muestras/piano/e4.opus' },
  { nota: 'G#4', url: '/audio/muestras/piano/gs4.opus' },
  { nota: 'C5', url: '/audio/muestras/piano/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/piano/e5.opus' },
  { nota: 'G#5', url: '/audio/muestras/piano/gs5.opus' },
  { nota: 'C6', url: '/audio/muestras/piano/c6.opus' },
  { nota: 'E6', url: '/audio/muestras/piano/e6.opus' },
  { nota: 'G#6', url: '/audio/muestras/piano/gs6.opus' },
  { nota: 'C7', url: '/audio/muestras/piano/c7.opus' },
];

const VIOLIN: Muestra[] = [
  { nota: 'G3', url: '/audio/muestras/violin/g3.opus' },
  { nota: 'A3', url: '/audio/muestras/violin/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/violin/c4.opus' },
  { nota: 'E4', url: '/audio/muestras/violin/e4.opus' },
  { nota: 'G4', url: '/audio/muestras/violin/g4.opus' },
  { nota: 'A4', url: '/audio/muestras/violin/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/violin/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/violin/e5.opus' },
  { nota: 'G5', url: '/audio/muestras/violin/g5.opus' },
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
  { nota: 'G3', url: '/audio/muestras/xilofono/g3.opus' },
  { nota: 'C4', url: '/audio/muestras/xilofono/c4.opus' },
  { nota: 'G4', url: '/audio/muestras/xilofono/g4.opus' },
  { nota: 'C5', url: '/audio/muestras/xilofono/c5.opus' },
  { nota: 'G5', url: '/audio/muestras/xilofono/g5.opus' },
  { nota: 'C6', url: '/audio/muestras/xilofono/c6.opus' },
  { nota: 'G6', url: '/audio/muestras/xilofono/g6.opus' },
  { nota: 'C7', url: '/audio/muestras/xilofono/c7.opus' },
];

/**
 * Los instrumentos disponibles.
 *
 * `marimba` sigue siendo el de por defecto y el único que va en el precache: es el que suena
 * en casi todas las actividades y el que tiene que estar disponible sin conexión desde el
 * primer momento.
 */
/**
 * Los seis del mundo, con las dos notas que tienen (do y la de la octava central). Sirven
 * para sonar una escala corta en la referencia de instrumentos: con dos muestras a una sexta
 * el sampler estira poco, y estirar poco es lo que un instrumento de timbre raro aguanta.
 */
const GAITA: Muestra[] = [
  { nota: 'C4', url: '/audio/muestras/gaita/c4.opus' },
  { nota: 'A4', url: '/audio/muestras/gaita/a4.opus' },
];

/*
  Instrumentos de verdad, del 2026-09-10.

  Piano, xilófono, flauta y violín sonaban con el soundfont General MIDI de 2008 y ahora son
  grabaciones: el Steinway B y el xilófono de VCSL, la flauta y el violín de VSCO 2 CE. Y
  entran dieciséis que no había —de la flauta dulce del colegio a la tuba— de las mismas dos
  bibliotecas, las dos CC0. Las notas van cada tres o cuatro semitonos, que es lo que
  `docs/10` fija para que el estirado del sampler no se oiga. Las baja `tools/muestras-vcsl.py`.
*/
const GLOCKENSPIEL: Muestra[] = [
  { nota: 'G4', url: '/audio/muestras/glockenspiel/g4.opus' },
  { nota: 'C5', url: '/audio/muestras/glockenspiel/c5.opus' },
  { nota: 'G5', url: '/audio/muestras/glockenspiel/g5.opus' },
  { nota: 'C6', url: '/audio/muestras/glockenspiel/c6.opus' },
  { nota: 'G6', url: '/audio/muestras/glockenspiel/g6.opus' },
  { nota: 'C7', url: '/audio/muestras/glockenspiel/c7.opus' },
];

const VIBRAFONO: Muestra[] = [
  { nota: 'F2', url: '/audio/muestras/vibrafono/f2.opus' },
  { nota: 'A2', url: '/audio/muestras/vibrafono/a2.opus' },
  { nota: 'C3', url: '/audio/muestras/vibrafono/c3.opus' },
  { nota: 'E3', url: '/audio/muestras/vibrafono/e3.opus' },
  { nota: 'G3', url: '/audio/muestras/vibrafono/g3.opus' },
  { nota: 'B3', url: '/audio/muestras/vibrafono/b3.opus' },
  { nota: 'D4', url: '/audio/muestras/vibrafono/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/vibrafono/f4.opus' },
  { nota: 'A4', url: '/audio/muestras/vibrafono/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/vibrafono/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/vibrafono/e5.opus' },
];

const ARPA: Muestra[] = [
  { nota: 'D2', url: '/audio/muestras/arpa/d2.opus' },
  { nota: 'F2', url: '/audio/muestras/arpa/f2.opus' },
  { nota: 'A2', url: '/audio/muestras/arpa/a2.opus' },
  { nota: 'E3', url: '/audio/muestras/arpa/e3.opus' },
  { nota: 'G3', url: '/audio/muestras/arpa/g3.opus' },
  { nota: 'B3', url: '/audio/muestras/arpa/b3.opus' },
  { nota: 'D4', url: '/audio/muestras/arpa/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/arpa/f4.opus' },
  { nota: 'A4', url: '/audio/muestras/arpa/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/arpa/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/arpa/e5.opus' },
  { nota: 'G5', url: '/audio/muestras/arpa/g5.opus' },
  { nota: 'B5', url: '/audio/muestras/arpa/b5.opus' },
];

const FLAUTA_DULCE: Muestra[] = [
  { nota: 'C4', url: '/audio/muestras/flauta-dulce/c4.opus' },
  { nota: 'D4', url: '/audio/muestras/flauta-dulce/d4.opus' },
  { nota: 'E4', url: '/audio/muestras/flauta-dulce/e4.opus' },
  { nota: 'F#4', url: '/audio/muestras/flauta-dulce/fs4.opus' },
  { nota: 'G#4', url: '/audio/muestras/flauta-dulce/gs4.opus' },
  { nota: 'A#4', url: '/audio/muestras/flauta-dulce/as4.opus' },
  { nota: 'C5', url: '/audio/muestras/flauta-dulce/c5.opus' },
  { nota: 'D5', url: '/audio/muestras/flauta-dulce/d5.opus' },
  { nota: 'E5', url: '/audio/muestras/flauta-dulce/e5.opus' },
  { nota: 'F#5', url: '/audio/muestras/flauta-dulce/fs5.opus' },
  { nota: 'G5', url: '/audio/muestras/flauta-dulce/g5.opus' },
  { nota: 'A#5', url: '/audio/muestras/flauta-dulce/as5.opus' },
  { nota: 'C6', url: '/audio/muestras/flauta-dulce/c6.opus' },
];

const SAXOFON: Muestra[] = [
  { nota: 'C2', url: '/audio/muestras/saxofon/c2.opus' },
  { nota: 'E2', url: '/audio/muestras/saxofon/e2.opus' },
  { nota: 'A#2', url: '/audio/muestras/saxofon/as2.opus' },
  { nota: 'D3', url: '/audio/muestras/saxofon/d3.opus' },
  { nota: 'F#3', url: '/audio/muestras/saxofon/fs3.opus' },
  { nota: 'A#3', url: '/audio/muestras/saxofon/as3.opus' },
  { nota: 'D4', url: '/audio/muestras/saxofon/d4.opus' },
  { nota: 'F#4', url: '/audio/muestras/saxofon/fs4.opus' },
  { nota: 'A#4', url: '/audio/muestras/saxofon/as4.opus' },
];

const ARMONICA: Muestra[] = [
  { nota: 'C3', url: '/audio/muestras/armonica/c3.opus' },
  { nota: 'E3', url: '/audio/muestras/armonica/e3.opus' },
  { nota: 'C4', url: '/audio/muestras/armonica/c4.opus' },
  { nota: 'E4', url: '/audio/muestras/armonica/e4.opus' },
  { nota: 'G4', url: '/audio/muestras/armonica/g4.opus' },
  { nota: 'C5', url: '/audio/muestras/armonica/c5.opus' },
  { nota: 'E5', url: '/audio/muestras/armonica/e5.opus' },
  { nota: 'G5', url: '/audio/muestras/armonica/g5.opus' },
  { nota: 'C6', url: '/audio/muestras/armonica/c6.opus' },
];

const ORGANO: Muestra[] = [
  { nota: 'C2', url: '/audio/muestras/organo/c2.opus' },
  { nota: 'D#2', url: '/audio/muestras/organo/ds2.opus' },
  { nota: 'F#2', url: '/audio/muestras/organo/fs2.opus' },
  { nota: 'A2', url: '/audio/muestras/organo/a2.opus' },
  { nota: 'C3', url: '/audio/muestras/organo/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/organo/ds3.opus' },
  { nota: 'F#3', url: '/audio/muestras/organo/fs3.opus' },
  { nota: 'A3', url: '/audio/muestras/organo/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/organo/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/organo/ds4.opus' },
  { nota: 'F#4', url: '/audio/muestras/organo/fs4.opus' },
  { nota: 'A4', url: '/audio/muestras/organo/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/organo/c5.opus' },
  { nota: 'D#5', url: '/audio/muestras/organo/ds5.opus' },
];

const VIOLONCHELO: Muestra[] = [
  { nota: 'G1', url: '/audio/muestras/violonchelo/g1.opus' },
  { nota: 'B1', url: '/audio/muestras/violonchelo/b1.opus' },
  { nota: 'D2', url: '/audio/muestras/violonchelo/d2.opus' },
  { nota: 'F2', url: '/audio/muestras/violonchelo/f2.opus' },
  { nota: 'A2', url: '/audio/muestras/violonchelo/a2.opus' },
  { nota: 'C3', url: '/audio/muestras/violonchelo/c3.opus' },
  { nota: 'E3', url: '/audio/muestras/violonchelo/e3.opus' },
  { nota: 'G3', url: '/audio/muestras/violonchelo/g3.opus' },
  { nota: 'B3', url: '/audio/muestras/violonchelo/b3.opus' },
  { nota: 'D4', url: '/audio/muestras/violonchelo/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/violonchelo/f4.opus' },
];

const CONTRABAJO: Muestra[] = [
  { nota: 'C1', url: '/audio/muestras/contrabajo/c1.opus' },
  { nota: 'E1', url: '/audio/muestras/contrabajo/e1.opus' },
  { nota: 'G#1', url: '/audio/muestras/contrabajo/gs1.opus' },
  { nota: 'C#2', url: '/audio/muestras/contrabajo/cs2.opus' },
  { nota: 'E2', url: '/audio/muestras/contrabajo/e2.opus' },
  { nota: 'G#2', url: '/audio/muestras/contrabajo/gs2.opus' },
  { nota: 'B2', url: '/audio/muestras/contrabajo/b2.opus' },
];

const TROMPETA: Muestra[] = [
  { nota: 'A2', url: '/audio/muestras/trompeta/a2.opus' },
  { nota: 'C3', url: '/audio/muestras/trompeta/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/trompeta/ds3.opus' },
  { nota: 'G3', url: '/audio/muestras/trompeta/g3.opus' },
  { nota: 'A#3', url: '/audio/muestras/trompeta/as3.opus' },
  { nota: 'D4', url: '/audio/muestras/trompeta/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/trompeta/f4.opus' },
  { nota: 'A4', url: '/audio/muestras/trompeta/a4.opus' },
  { nota: 'C5', url: '/audio/muestras/trompeta/c5.opus' },
];

const TROMPA: Muestra[] = [
  { nota: 'G1', url: '/audio/muestras/trompa/g1.opus' },
  { nota: 'A#1', url: '/audio/muestras/trompa/as1.opus' },
  { nota: 'D2', url: '/audio/muestras/trompa/d2.opus' },
  { nota: 'F2', url: '/audio/muestras/trompa/f2.opus' },
  { nota: 'A2', url: '/audio/muestras/trompa/a2.opus' },
  { nota: 'C3', url: '/audio/muestras/trompa/c3.opus' },
  { nota: 'D4', url: '/audio/muestras/trompa/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/trompa/f4.opus' },
];

const TROMBON: Muestra[] = [
  { nota: 'D#1', url: '/audio/muestras/trombon/ds1.opus' },
  { nota: 'F1', url: '/audio/muestras/trombon/f1.opus' },
  { nota: 'A#1', url: '/audio/muestras/trombon/as1.opus' },
  { nota: 'D2', url: '/audio/muestras/trombon/d2.opus' },
  { nota: 'F2', url: '/audio/muestras/trombon/f2.opus' },
  { nota: 'C3', url: '/audio/muestras/trombon/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/trombon/ds3.opus' },
  { nota: 'F3', url: '/audio/muestras/trombon/f3.opus' },
];

const TUBA: Muestra[] = [
  { nota: 'A#0', url: '/audio/muestras/tuba/as0.opus' },
  { nota: 'D#1', url: '/audio/muestras/tuba/ds1.opus' },
  { nota: 'F1', url: '/audio/muestras/tuba/f1.opus' },
  { nota: 'A#1', url: '/audio/muestras/tuba/as1.opus' },
  { nota: 'D2', url: '/audio/muestras/tuba/d2.opus' },
  { nota: 'F2', url: '/audio/muestras/tuba/f2.opus' },
  { nota: 'A#2', url: '/audio/muestras/tuba/as2.opus' },
  { nota: 'D3', url: '/audio/muestras/tuba/d3.opus' },
];

const CLARINETE: Muestra[] = [
  { nota: 'F2', url: '/audio/muestras/clarinete/f2.opus' },
  { nota: 'A#2', url: '/audio/muestras/clarinete/as2.opus' },
  { nota: 'D3', url: '/audio/muestras/clarinete/d3.opus' },
  { nota: 'F3', url: '/audio/muestras/clarinete/f3.opus' },
  { nota: 'A#3', url: '/audio/muestras/clarinete/as3.opus' },
  { nota: 'D4', url: '/audio/muestras/clarinete/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/clarinete/f4.opus' },
  { nota: 'A#4', url: '/audio/muestras/clarinete/as4.opus' },
  { nota: 'D5', url: '/audio/muestras/clarinete/d5.opus' },
  { nota: 'F#5', url: '/audio/muestras/clarinete/fs5.opus' },
];

const OBOE: Muestra[] = [
  { nota: 'A#3', url: '/audio/muestras/oboe/as3.opus' },
  { nota: 'D4', url: '/audio/muestras/oboe/d4.opus' },
  { nota: 'F4', url: '/audio/muestras/oboe/f4.opus' },
  { nota: 'A#4', url: '/audio/muestras/oboe/as4.opus' },
  { nota: 'D5', url: '/audio/muestras/oboe/d5.opus' },
  { nota: 'F5', url: '/audio/muestras/oboe/f5.opus' },
];

const FAGOT: Muestra[] = [
  { nota: 'A#1', url: '/audio/muestras/fagot/as1.opus' },
  { nota: 'C2', url: '/audio/muestras/fagot/c2.opus' },
  { nota: 'G2', url: '/audio/muestras/fagot/g2.opus' },
  { nota: 'C3', url: '/audio/muestras/fagot/c3.opus' },
  { nota: 'D#3', url: '/audio/muestras/fagot/ds3.opus' },
  { nota: 'G#3', url: '/audio/muestras/fagot/gs3.opus' },
  { nota: 'A3', url: '/audio/muestras/fagot/a3.opus' },
  { nota: 'C4', url: '/audio/muestras/fagot/c4.opus' },
  { nota: 'D#4', url: '/audio/muestras/fagot/ds4.opus' },
];

export const INSTRUMENTOS: Record<string, Muestra[]> = {
  marimba: MARIMBA,
  gaita: GAITA,
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
  glockenspiel: GLOCKENSPIEL,
  vibrafono: VIBRAFONO,
  arpa: ARPA,
  'flauta-dulce': FLAUTA_DULCE,
  saxofon: SAXOFON,
  armonica: ARMONICA,
  organo: ORGANO,
  violonchelo: VIOLONCHELO,
  contrabajo: CONTRABAJO,
  trompeta: TROMPETA,
  trompa: TROMPA,
  trombon: TROMBON,
  tuba: TUBA,
  clarinete: CLARINETE,
  oboe: OBOE,
  fagot: FAGOT,
};

/**
 * Qué instrumentos sostienen una nota y cuáles se apagan solos.
 *
 * No es un detalle técnico: es **la diferencia entre un instrumento de percusión y uno de
 * aire o de cuerda frotada**, y decide qué se puede hacer con él. Una marimba no puede
 * mantener una nota —se golpea y se apaga—, así que para sostenerla se repite el golpe, que
 * es el trémolo y es lo que hace un niño con una lámina Orff. Una flauta sí la mantiene, y
 * ahí repetir el ataque suena a error.
 */
export const SOSTIENEN = new Set([
  'flauta', 'violin', 'voz', 'coro', 'gaita', 'flauta-dulce', 'saxofon', 'armonica', 'organo', 'violonchelo', 'contrabajo', 'trompeta', 'trompa', 'trombon', 'tuba', 'clarinete', 'oboe', 'fagot',
]);

export function sostiene(nombre: string | undefined): boolean {
  return SOSTIENEN.has(nombre ?? 'marimba');
}

/** Las muestras de un instrumento. Si no existe, marimba: la actividad tiene que sonar. */
export function muestrasDe(nombre: string | undefined): Muestra[] {
  return (nombre && INSTRUMENTOS[nombre]) || MARIMBA;
}

/**
 * El sampler de un instrumento, sabiendo si sostiene: es el único sitio donde se
 * construye uno, para que ningún tipo se olvide de decírselo (2026-09-12).
 */
export function samplerPara(nombre: string | undefined): Sampler {
  return new Sampler(muestrasDe(nombre), sostiene(nombre));
}

/** Los nombres disponibles, para que una pantalla de ajustes pueda ofrecerlos. */
export function instrumentosDisponibles(): string[] {
  return Object.keys(INSTRUMENTOS);
}
