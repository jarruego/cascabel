import { obtenerContexto, latenciaMs, calibracionActualMs } from '@/audio/AudioEngine';
import { APP } from '@/config';
import type { CosteNsdf } from '@/escucha/banco';

/**
 * Recoge el estado del entorno para /diagnostico.
 *
 * Existe porque no tenemos ningún dispositivo iOS y el bug 185448 de WebKit rompe
 * getUserMedia en PWA instalada. No podemos medirlo nosotros, así que preparamos el
 * sitio donde ese dato aterrizará cuando un maestro con iPad abra la app.
 * Ver T0.1 en docs/07-ROADMAP.md y docs/adr/0004-pwa-primero.md.
 *
 * Sale de navigator y de AudioContext, y no viaja a ningún sitio: se pinta y se
 * copia al portapapeles. Que el usuario decida si lo pega en una incidencia.
 */

export type EstadoMicrofono =
  | { fase: 'sin-pedir' }
  | { fase: 'escuchando' }
  | { fase: 'denegado'; detalle: string }
  | { fase: 'error'; detalle: string };

export interface Informe {
  app: string;
  proyecto: string;
  fecha: string;
  userAgent: string;
  plataforma: string;
  idioma: string;
  modoVisualizacion: string;
  contextoSeguro: boolean;
  soportaGetUserMedia: boolean;
  soportaAudioWorklet: boolean;
  sampleRate: number | null;
  estadoContexto: string | null;
  baseLatencyMs: number | null;
  outputLatencyMs: number | null;
  latenciaTotalMs: number | null;
  calibracionMs: number;
  microfono: EstadoMicrofono;
  /** Medido DENTRO del worklet. Null en todo navegador conocido: ninguno expone
   *  `performance` en el AudioWorkletGlobalScope. */
  costeAnalisisMs: number | null;
  /** Estimación en el hilo principal. No es lo mismo, y el informe lo dice. */
  costeEstimado: CosteNsdf | null;
}

/** Pestaña, instalada en la pantalla de inicio, o presentación. */
export function modoVisualizacion(): string {
  const modos = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay', 'browser'];
  for (const m of modos) {
    if (window.matchMedia?.(`(display-mode: ${m})`).matches) return m;
  }
  // Safari de iOS no implementó display-mode durante años; esto es su vía.
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
    return 'standalone (navigator.standalone)';
  }
  return 'desconocido';
}

export function recoger(
  micro: EstadoMicrofono,
  costeAnalisisMs: number | null,
  costeEstimado: CosteNsdf | null = null,
): Informe {
  // Si el contexto no existe todavía no lo creamos solo para medir: nacería
  // suspendido y con una sampleRate que cambia al abrir el micrófono.
  let ctx: AudioContext | null = null;
  try {
    ctx = obtenerContexto();
  } catch {
    ctx = null;
  }

  return {
    app: APP.nombre,
    proyecto: APP.proyecto,
    fecha: new Date().toISOString(),
    userAgent: navigator.userAgent,
    plataforma: (navigator as { platform?: string }).platform ?? 'desconocida',
    idioma: navigator.language,
    modoVisualizacion: modoVisualizacion(),
    contextoSeguro: window.isSecureContext,
    soportaGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    soportaAudioWorklet: typeof AudioWorkletNode !== 'undefined',
    sampleRate: ctx?.sampleRate ?? null,
    estadoContexto: ctx?.state ?? null,
    baseLatencyMs: ctx ? Math.round((ctx.baseLatency || 0) * 1000 * 100) / 100 : null,
    outputLatencyMs: ctx ? Math.round((ctx.outputLatency || 0) * 1000 * 100) / 100 : null,
    latenciaTotalMs: ctx ? Math.round(latenciaMs() * 100) / 100 : null,
    calibracionMs: calibracionActualMs(),
    microfono: micro,
    costeAnalisisMs,
    costeEstimado,
  };
}

/**
 * Texto plano para pegar en una incidencia de GitHub. Deliberadamente NO pasa por
 * t(): no es interfaz, es un volcado técnico que lee un adulto desarrollador, y
 * traducirlo lo haría inútil para quien tiene que interpretarlo.
 */
export function aTexto(i: Informe): string {
  const si = (b: boolean) => (b ? 'sí' : 'NO');
  const ms = (n: number | null) => (n === null ? '—' : `${n} ms`);
  const micro =
    i.microfono.fase === 'escuchando'
      ? 'concedido, escuchando'
      : i.microfono.fase === 'sin-pedir'
        ? 'sin pedir todavía'
        : `${i.microfono.fase}: ${i.microfono.detalle}`;

  return [
    `${i.app} (${i.proyecto}) · informe de diagnóstico`,
    `fecha              ${i.fecha}`,
    '',
    `userAgent          ${i.userAgent}`,
    `plataforma         ${i.plataforma}`,
    `idioma             ${i.idioma}`,
    `modo               ${i.modoVisualizacion}`,
    `contexto seguro    ${si(i.contextoSeguro)}`,
    '',
    `getUserMedia       ${si(i.soportaGetUserMedia)}`,
    `AudioWorklet       ${si(i.soportaAudioWorklet)}`,
    `micrófono          ${micro}`,
    '',
    `sampleRate         ${i.sampleRate ?? '—'} Hz`,
    `estado contexto    ${i.estadoContexto ?? '—'}`,
    `baseLatency        ${ms(i.baseLatencyMs)}`,
    `outputLatency      ${ms(i.outputLatencyMs)}`,
    `latencia total     ${ms(i.latenciaTotalMs)}`,
    `calibración        ${i.calibracionMs} ms`,
    `coste del análisis ${i.costeAnalisisMs === null ? 'no medible' : `${i.costeAnalisisMs.toFixed(2)} ms`}`,
  ].join('\n');
}
