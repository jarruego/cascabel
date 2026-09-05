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
