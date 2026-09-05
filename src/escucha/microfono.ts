import { obtenerContexto, despertarAudio } from '@/audio/AudioEngine';

/**
 * REGLA DURA DEL PROYECTO: el audio del micrófono NUNCA sale del dispositivo.
 * Aquí no hay MediaRecorder, ni fetch, ni almacenamiento. Solo un MediaStreamSource
 * que alimenta un AudioWorklet. Es lo que hace que jurídicamente no tratemos datos
 * personales de un menor. Ver docs/08-LEGAL.md.
 */

export type ErrorMicrofono = 'denegado' | 'sin-dispositivo' | 'no-soportado' | 'desconocido';

export interface SesionMicrofono {
  fuente: MediaStreamAudioSourceNode;
  cerrar: () => void;
}

export async function abrirMicrofono(): Promise<SesionMicrofono> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Sin getUserMedia'), { tipo: 'no-soportado' as ErrorMicrofono });
  }
  await despertarAudio();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // El procesado de voz del navegador está pensado para llamadas y destroza
        // la música: deforma armónicos, se come el ataque y varía el nivel.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
  } catch (e) {
    const nombre = (e as DOMException)?.name;
    const tipo: ErrorMicrofono =
      nombre === 'NotAllowedError' ? 'denegado' : nombre === 'NotFoundError' ? 'sin-dispositivo' : 'desconocido';
    throw Object.assign(new Error(`No se pudo abrir el micrófono: ${nombre}`), { tipo });
  }

  const ctx = obtenerContexto();
  const fuente = ctx.createMediaStreamSource(stream);

  return {
    fuente,
    cerrar() {
      // Parar las pistas apaga el indicador del navegador. Que se vea apagado
      // tranquiliza a familias y claustros, y en iOS devuelve la salida de audio.
      stream.getTracks().forEach((t) => t.stop());
      fuente.disconnect();
    },
  };
}
