import { aMidi } from '@/audio/sampler';

/**
 * Exportar una composición a MIDI y a MusicXML.
 *
 * **Sin ninguna dependencia, y no por ahorro.** Un fichero MIDI son cabecera, eventos y
 * final; un MusicXML es XML. Escribirlos a mano son doscientas líneas que se pueden leer,
 * y la alternativa —`midi-writer-js`, `jsmidgen`— serían decenas de kilobytes en el paquete
 * de todos los niños para algo que usa una actividad de sesenta y una.
 *
 * **Y todo pasa en el dispositivo.** El fichero se construye en memoria y se descarga con
 * un enlace: no hay servidor, no hay subida y no hay nada que viaje. Es la única forma de
 * exportar que cumple la regla 1 sin excepciones.
 *
 * **Por qué estos dos formatos y no un audio.** Un MIDI y un MusicXML se abren en MuseScore,
 * en Finale, en Sibelius y en cualquier editor de partituras: lo que el niño ha compuesto se
 * puede seguir trabajando, imprimir en papel pautado o tocar con otro instrumento. Un WAV
 * sería un recuerdo; esto es material.
 *
 * El PDF no se genera aquí a propósito: lo hace el navegador al imprimir, que es lo que ya
 * decidió `docs/07-ROADMAP.md` para las fichas. Meter un generador de PDF serían trescientos
 * kilobytes para hacer peor lo que el sistema hace bien.
 */

export interface NotaExportable {
  /** Notación científica, p. ej. «C4». */
  nota: string;
  /** Momento de ataque, en negras desde el principio. */
  inicio: number;
  /** Duración en negras. */
  duracion: number;
}

/** Pulsos por negra del fichero MIDI. 480 es el valor habitual y divide bien. */
const DIVISION = 480;

/**
 * Cantidad de longitud variable, el entero de MIDI.
 *
 * Siete bits por byte, y el bit alto marca «viene otro». **Es donde se equivoca todo el
 * mundo**: si se escribe un delta mayor de 127 como un solo byte, el fichero se lee sin dar
 * error y suena a otra cosa, porque el sintetizador interpreta ese byte como un evento.
 */
export function cantidadVariable(valor: number): number[] {
  if (valor < 0) throw new Error(`Delta negativo: ${valor}`);
  const bytes = [valor & 0x7f];
  let v = Math.floor(valor / 128);
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  return bytes;
}

function texto(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}

function entero32(v: number): number[] {
  return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/**
 * Construye un fichero MIDI de una sola pista (formato 0).
 *
 * Formato 0 y no 1: una melodía es una voz, y un fichero de una pista lo abre todo sin
 * preguntar nada.
 */
export function aMidiSMF(notas: NotaExportable[], bpm: number): Uint8Array {
  // Los eventos se ordenan por instante y, a igualdad, el apagado va antes que el
  // encendido: si no, una nota repetida se apaga a sí misma justo después de sonar.
  const eventos: Array<{ tick: number; tipo: 'on' | 'off'; midi: number }> = [];
  for (const n of notas) {
    const midi = aMidi(n.nota);
    eventos.push({ tick: Math.round(n.inicio * DIVISION), tipo: 'on', midi });
    eventos.push({ tick: Math.round((n.inicio + n.duracion) * DIVISION), tipo: 'off', midi });
  }
  eventos.sort((a, b) => a.tick - b.tick || (a.tipo === 'off' ? -1 : 1));

  const pista: number[] = [];

  // Tempo, en microsegundos por negra.
  const microsegundos = Math.round(60000000 / bpm);
  pista.push(
    0x00, 0xff, 0x51, 0x03,
    (microsegundos >> 16) & 0xff,
    (microsegundos >> 8) & 0xff,
    microsegundos & 0xff,
  );

  let anterior = 0;
  for (const e of eventos) {
    pista.push(...cantidadVariable(e.tick - anterior));
    pista.push(e.tipo === 'on' ? 0x90 : 0x80, e.midi & 0x7f, e.tipo === 'on' ? 0x64 : 0x40);
    anterior = e.tick;
  }
  // Final de pista. Sin esto muchos programas se niegan a abrir el fichero.
  pista.push(0x00, 0xff, 0x2f, 0x00);

  const cabecera = [
    ...texto('MThd'), ...entero32(6),
    0x00, 0x00,          // formato 0
    0x00, 0x01,          // una pista
    (DIVISION >> 8) & 0xff, DIVISION & 0xff,
  ];
  const bloque = [...texto('MTrk'), ...entero32(pista.length), ...pista];
  return new Uint8Array([...cabecera, ...bloque]);
}

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Nombre de figura de MusicXML para una duración en negras. */
export function figuraXml(negras: number): string {
  if (negras >= 4) return 'whole';
  if (negras >= 2) return 'half';
  if (negras >= 1) return 'quarter';
  if (negras >= 0.5) return 'eighth';
  return '16th';
}

/**
 * Construye un MusicXML de una voz.
 *
 * Se generan **silencios explícitos** entre notas. MusicXML no admite huecos: un compás
 * tiene que sumar exactamente su duración, y un editor que encuentre un hueco o lo rellena
 * a su manera o se queja. Rellenarlo nosotros es lo que hace que el fichero se abra igual
 * en MuseScore que en Sibelius.
 */
export function aMusicXML(
  notas: NotaExportable[],
  bpm: number,
  titulo = 'Composición',
  pulsosPorCompas = 4,
): string {
  const ordenadas = [...notas].sort((a, b) => a.inicio - b.inicio);
  const filas: string[] = [];

  const nota = (n: NotaExportable) => {
    const midi = aMidi(n.nota);
    const nombre = NOMBRES[midi % 12]!;
    const octava = Math.floor(midi / 12) - 1;
    const alter = nombre.includes('#') ? '        <alter>1</alter>\n' : '';
    return (
      '      <note>\n' +
      '        <pitch>\n' +
      `          <step>${nombre[0]}</step>\n` +
      (alter ? `  ${alter}` : '') +
      `          <octave>${octava}</octave>\n` +
      '        </pitch>\n' +
      `        <duration>${Math.max(1, Math.round(n.duracion * DIVISION))}</duration>\n` +
      `        <type>${figuraXml(n.duracion)}</type>\n` +
      '      </note>\n'
    );
  };

  const silencio = (negras: number) =>
    '      <note>\n        <rest/>\n' +
    `        <duration>${Math.max(1, Math.round(negras * DIVISION))}</duration>\n` +
    `        <type>${figuraXml(negras)}</type>\n      </note>\n`;

  let reloj = 0;
  let compas = 1;
  filas.push(`    <measure number="${compas}">\n`);
  filas.push(
    '      <attributes>\n' +
      `        <divisions>${DIVISION}</divisions>\n` +
      '        <key><fifths>0</fifths></key>\n' +
      `        <time><beats>${pulsosPorCompas}</beats><beat-type>4</beat-type></time>\n` +
      '        <clef><sign>G</sign><line>2</line></clef>\n' +
      '      </attributes>\n' +
      /*
        El tempo va con `direction-type` dentro, no solo con `<sound tempo>`.

        Un `<direction>` sin `<direction-type>` es XML válido y MusicXML inválido: se abre
        sin protestar y **el tempo se pierde**, que es justo lo que pasaba. Lo destapó
        abrir el fichero con music21, no ninguno de nuestros tests. Comprobar un formato
        contra un lector ajeno es lo único que dice si el fichero sirve fuera de aquí.
      */
      '      <direction placement="above">\n' +
        '        <direction-type>\n' +
        '          <metronome>\n' +
        '            <beat-unit>quarter</beat-unit>\n' +
        `            <per-minute>${bpm}</per-minute>\n` +
        '          </metronome>\n' +
        '        </direction-type>\n' +
        `        <sound tempo="${bpm}"/>\n` +
        '      </direction>\n',
  );

  for (const n of ordenadas) {
    if (n.inicio > reloj) {
      filas.push(silencio(n.inicio - reloj));
      reloj = n.inicio;
    }
    filas.push(nota(n));
    reloj = n.inicio + n.duracion;
    const siguienteCompas = Math.floor(reloj / pulsosPorCompas) + 1;
    if (siguienteCompas > compas && reloj % pulsosPorCompas === 0) {
      compas = siguienteCompas;
      filas.push('    </measure>\n');
      filas.push(`    <measure number="${compas}">\n`);
    }
  }
  filas.push('    </measure>\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" ' +
    '"http://www.musicxml.org/dtds/partwise.dtd">\n' +
    '<score-partwise version="4.0">\n' +
    `  <work><work-title>${titulo}</work-title></work>\n` +
    '  <part-list>\n' +
    '    <score-part id="P1"><part-name>Melodía</part-name></score-part>\n' +
    '  </part-list>\n' +
    '  <part id="P1">\n' +
    filas.join('') +
    '  </part>\n' +
    '</score-partwise>\n'
  );
}

/**
 * Descarga un fichero generado en memoria.
 *
 * El `URL.revokeObjectURL` no es opcional: sin él, cada exportación deja el fichero entero
 * retenido en memoria hasta que se recarga la página, y en una sesión de aula eso se nota.
 */
export function descargar(nombre: string, datos: BlobPart, tipo: string): void {
  const url = URL.createObjectURL(new Blob([datos], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
