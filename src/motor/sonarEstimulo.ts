import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { clic } from '@/audio/clic';
import { muestrasDe } from '@/audio/instrumentos';
import { KIT, Percusion, type Golpe } from '@/audio/percusion';
import { Sampler } from '@/audio/sampler';
import { eventosDe, type Estimulo } from './estimulo';

/**
 * Hace sonar un estímulo descrito en el JSON. La descripción y sus instantes salen de
 * `estimulo.ts`, que es puro; aquí solo se programa contra el reloj del audio.
 *
 * Todo se programa de golpe, con `cuando` sobre `AudioContext.currentTime`, y nunca con
 * `setTimeout` (§7): un intervalo de dos notas con veinte milisegundos de baile ya no suena
 * a intervalo, suena a dos notas sueltas.
 *
 * Los samplers se guardan por instrumento, como en `sonarMuestra.ts` y por el mismo fallo:
 * uno solo para todos hacía que la segunda actividad sonara con el timbre de la primera.
 */
const samplers = new Map<string, { sampler: Sampler; cargando: Promise<void> }>();
let percusion: { kit: Percusion; cargando: Promise<void> } | null = null;

async function samplerDe(instrumento?: string): Promise<Sampler> {
  const clave = instrumento ?? 'por-defecto';
  let entrada = samplers.get(clave);
  if (!entrada) {
    const sampler = new Sampler(muestrasDe(instrumento));
    entrada = { sampler, cargando: sampler.cargar() };
    samplers.set(clave, entrada);
  }
  await entrada.cargando;
  return entrada.sampler;
}

async function kitDePercusion(): Promise<Percusion> {
  if (!percusion) {
    const kit = new Percusion();
    percusion = { kit, cargando: kit.cargar() };
  }
  await percusion.cargando;
  return percusion.kit;
}

/**
 * @returns cuándo termina, en segundos del reloj de audio; o `null` si no ha podido sonar.
 * Nunca lanza: sin audio, la actividad sigue por la vía visual.
 */
export async function sonarEstimulo(
  e: Estimulo,
  opciones: {
    instrumento?: string;
    tempo?: number;
    pulsosPorCompas?: number;
    /**
     * Instante del reloj de audio en que empieza, para encadenar vueltas sin hueco: un
     * bucle que arranca «ahora» cada vez cojea lo que tarde el temporizador. Si no se da,
     * empieza enseguida.
     */
    desde?: number;
  } = {},
): Promise<number | null> {
  try {
    await despertarAudio();
    const eventos = eventosDe(e, opciones.tempo, opciones.pulsosPorCompas);
    if (!eventos.length) return null;

    // Lo que haga falta se carga ANTES de fijar el instante cero: si no, la primera nota
    // saldría tarde respecto a las demás y el ritmo del estímulo sería otro.
    const necesitaSampler = eventos.some((ev) => ev.tipo === 'nota');
    const necesitaKit = eventos.some((ev) => ev.tipo === 'golpe');
    const [sampler, kit] = await Promise.all([
      necesitaSampler ? samplerDe(opciones.instrumento) : null,
      necesitaKit ? kitDePercusion() : null,
    ]);

    const ctx = obtenerContexto();
    const cero = opciones.desde ?? ctx.currentTime + 0.08;
    for (const ev of eventos) {
      const t = cero + ev.en;
      if (ev.tipo === 'nota') sampler?.tocar(ev.nota, t, ev.duracion, ev.volumen);
      else if (ev.tipo === 'clic') clic(t, ev.acentuado);
      else if (ev.tipo === 'pulso') clic(t, false, true);
      else if (KIT.includes(ev.golpe as Golpe)) {
        // El acento en percusión es volumen: no hay otra forma de acentuar un bombo.
        kit?.golpear(ev.golpe as Golpe, t, ev.acentuado ? 1 : 0.6);
      }
    }
    return cero + Math.max(...eventos.map((ev) => ev.en)) + 0.5;
  } catch {
    return null;
  }
}
