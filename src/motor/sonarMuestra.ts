import { APP } from '@/config';
import { despertarAudio, pararTodo } from '@/audio/AudioEngine';
import { Sampler } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';

/**
 * Reproduce una muestra corta de `public/audio/`.
 *
 * Usa `HTMLAudioElement` y no el `AudioContext`: son sonidos sueltos disparados por un
 * toque, sin necesidad de precisión de milisegundos. Cuando llegue T1.7 y el sampler real,
 * las actividades rítmicas pasarán por el `AudioContext`, que sí garantiza el instante;
 * esto seguirá valiendo para los estímulos de elección y emparejamiento.
 */
/**
 * Lo que está sonando ahora, si es una muestra. **Solo una a la vez.**
 *
 * Tocar una ficha con sonido mientras suena otra las superponía, y con dos animales o dos
 * instrumentos a la vez no se distingue ninguno. Lo pidió el autor el 2026-09-12: «deja de
 * sonar el que esté activo, no se deben solapar». Cada muestra nueva corta a la anterior, y
 * también a lo que estuviera programado en el `AudioContext`: una nota, un ritmo.
 */
let enCurso: HTMLAudioElement | null = null;

/** Corta la muestra que esté sonando. Lo llama el marco al salir de la actividad. */
export function pararMuestra(): void {
  if (!enCurso) return;
  enCurso.pause();
  enCurso = null;
}

export function sonarMuestra(ruta: string): HTMLAudioElement | null {
  if (!ruta) return null;
  pararMuestra();
  pararTodo();
  const a = new Audio(`${APP.rutaAudio}/${ruta}`);
  enCurso = a;
  a.addEventListener('ended', () => {
    if (enCurso === a) enCurso = null;
  });
  void a.play().catch(() => {
    // Sin gesto previo el navegador bloquea la reproducción. No es un error del niño y
    // no debe interrumpir la actividad: se sigue, y la vía visual basta.
  });
  return a;
}

/**
 * Suena una nota concreta, del instrumento que sea.
 *
 * Existe porque el banco tiene **seis muestras de marimba**, no una por nota: pedir
 * `muestras/marimba/a4.opus` devuelve un 404 y un silencio, que es exactamente el fallo que
 * se coló en la actividad de digitaciones de flauta. El `Sampler` interpola desde la muestra
 * más cercana, así que cualquier nota suena.
 *
 * El sampler se reutiliza entre llamadas: cargarlo son seis descargas y decodificarlas, y
 * hacerlo en cada toque se notaría.
 *
 * **Uno por instrumento, y esto era un fallo.** Había un solo sampler en una variable del
 * módulo, creado con el instrumento de la PRIMERA llamada. En cuanto dos actividades pedían
 * instrumentos distintos en la misma sesión, la segunda sonaba con el de la primera — sin
 * dar ningún error, que es lo que lo hacía difícil de ver.
 */
const samplers = new Map<string, { sampler: Sampler; cargando: Promise<void> }>();

export async function sonarNota(nota: string, instrumento?: string): Promise<void> {
  try {
    // Una ficha con nota corta a la muestra o a la nota anterior, igual que una muestra.
    pararMuestra();
    pararTodo();
    await despertarAudio();
    const clave = instrumento ?? 'por-defecto';
    let entrada = samplers.get(clave);
    if (!entrada) {
      const sampler = new Sampler(muestrasDe(instrumento));
      entrada = { sampler, cargando: sampler.cargar() };
      samplers.set(clave, entrada);
    }
    await entrada.cargando;
    entrada.sampler.tocar(nota, undefined, 1.4);
  } catch {
    // Sin audio la actividad sigue funcionando por la vía visual. Nunca se corta nada.
  }
}
