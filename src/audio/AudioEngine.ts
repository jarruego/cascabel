/**
 * Un único AudioContext para toda la app.
 *
 * Tres cosas que parecen detalles y no lo son:
 *  - El contexto nace suspendido: hay que reanudarlo DENTRO de un gesto del usuario.
 *    Por eso existe el botón grande de «¡Empezar!» en la pantalla inicial.
 *  - La sampleRate cambia al abrir el micrófono. Nunca fijes 44100 en el código.
 *  - outputLatency + baseLatency hay que restarlos antes de comparar el golpe de un
 *    niño con la rejilla esperada, o toda la evaluación rítmica miente.
 */

let ctx: AudioContext | null = null;
let calibracionMs = 0;

const CLAVE_CALIBRACION = 'cascabel.calibracion.ms';

export function obtenerContexto(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    try {
      const guardada = localStorage.getItem(CLAVE_CALIBRACION);
      if (guardada) calibracionMs = Number(guardada) || 0;
    } catch {
      // Modo privado o almacenamiento bloqueado: seguimos sin calibración.
    }
  }
  return ctx;
}

/*
  Todo lo que suena pasa por una salida maestra y deja apuntada su fuente.

  Hasta el 2026-09-10 cada sampler, el kit y el clic iban directos a `destination`, y una
  fuente de Web Audio no se puede cancelar desde fuera una vez programada: al pulsar
  «parar» en el constructor de ritmos se paraba el reloj que programaba vueltas nuevas, pero
  la vuelta entera ya estaba en cola y seguía sonando hasta el final. El autor lo oyó, y lo
  mismo pasaba al salir de la actividad a mitad.

  Con las fuentes apuntadas, `pararTodo()` las detiene una a una —también las que todavía
  no han empezado, que es lo que cancela lo programado hacia el futuro— y la salida maestra
  baja a cero un instante para que ninguna se corte con un chasquido.
*/
let maestra: GainNode | null = null;
const fuentes = new Set<AudioScheduledSourceNode>();

/** La salida a la que se conecta todo. Se crea con el contexto y se reutiliza. */
export function salidaMaestra(): GainNode {
  const c = obtenerContexto();
  if (!maestra) {
    maestra = c.createGain();
    maestra.gain.value = 1;
    maestra.connect(c.destination);
  }
  return maestra;
}

/** Apunta una fuente para poder pararla. Se borra sola cuando termina. */
export function registrarFuente(fuente: AudioScheduledSourceNode): void {
  fuentes.add(fuente);
  fuente.addEventListener('ended', () => fuentes.delete(fuente));
}

/** Cuántas fuentes hay vivas o programadas. Para los tests y para el diagnóstico. */
export function fuentesVivas(): number {
  return fuentes.size;
}

/**
 * Para todo lo que suena y todo lo que está programado, ya.
 *
 * No lanza nunca: una fuente que ya terminó no se puede parar dos veces y no importa.
 */
export function pararTodo(): void {
  if (!ctx) return;
  const ahora = ctx.currentTime;
  const salida = salidaMaestra();
  // Bajar un instante y volver: lo que se corta, se corta sin clic, y lo que venga
  // después suena con normalidad. Veinte milisegundos no se notan como silencio.
  salida.gain.cancelScheduledValues(ahora);
  salida.gain.setValueAtTime(salida.gain.value, ahora);
  salida.gain.linearRampToValueAtTime(0.0001, ahora + 0.02);
  salida.gain.setValueAtTime(1, ahora + 0.06);
  for (const f of fuentes) {
    try {
      f.stop(ahora + 0.03);
    } catch {
      // Ya parada, o nunca arrancó: da igual.
    }
  }
  fuentes.clear();
}

/** Llamar SIEMPRE desde un handler de gesto (click, touchend, keydown). */
export async function despertarAudio(): Promise<void> {
  const c = obtenerContexto();
  if (c.state !== 'running') await c.resume();
}

/** Latencia total a compensar, en milisegundos. */
export function latenciaMs(): number {
  const c = obtenerContexto();
  const salida = (c.outputLatency || 0) + (c.baseLatency || 0);
  return salida * 1000 + calibracionMs;
}

/** Ajuste manual del usuario tras la actividad «da tres palmadas al ritmo». */
export function guardarCalibracion(ms: number): void {
  calibracionMs = Math.max(-300, Math.min(300, ms));
  try {
    localStorage.setItem(CLAVE_CALIBRACION, String(calibracionMs));
  } catch {
    // Sin persistencia: la calibración vale para esta sesión.
  }
}

export function calibracionActualMs(): number {
  return calibracionMs;
}

/** Convierte un instante del reloj de audio a milisegundos de rendimiento comparables. */
export function aMilisegundos(tiempoAudio: number): number {
  return tiempoAudio * 1000;
}
