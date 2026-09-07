import { obtenerContexto } from '@/audio/AudioEngine';
import { abrirMicrofono, type SesionMicrofono } from './microfono';

/**
 * Detección de palmadas (onsets).
 *
 * No hay librería JS de onsets en vivo mantenida y con licencia compatible: aubio es
 * GPL-3.0 y essentia.js es AGPL-3.0. Pero detectar una palmada es fácil: es un
 * transitorio de banda ancha con un ataque brutal, la señal más limpia que existe.
 * El detector vive en worklets/onset-processor.js y son unas cien líneas.
 */

export interface Onset {
  /** Instante en segundos del AudioContext, con precisión de muestra. */
  tiempo: number;
  energia: number;
}

export class DetectorDePalmadas {
  private sesion: SesionMicrofono | null = null;
  private nodo: AudioWorkletNode | null = null;

  async arrancar(alDetectar: (onset: Onset) => void): Promise<void> {
    const ctx = obtenerContexto();
    await ctx.audioWorklet.addModule('/worklets/onset-processor.js');

    this.sesion = await abrirMicrofono();
    this.nodo = new AudioWorkletNode(ctx, 'onset-processor', {
      /*
        El factor era 4 y saltaba solo: una silla arrastrada o una tos lo superaban, y en
        los primeros bloques —con la media del ruido todavía en cero— lo superaba cualquier
        cosa. Una palmada está veinte o cincuenta veces por encima del suelo de la sala, no
        cuatro. Ver el porqué entero en `public/worklets/onset-processor.js`.
      */
      processorOptions: { refractarioMs: 110, factorUmbral: 12 },
    });
    this.nodo.port.onmessage = (ev: MessageEvent) => alDetectar(ev.data as Onset);
    this.sesion.fuente.connect(this.nodo);
  }

  parar(): void {
    this.nodo?.port.close();
    this.nodo?.disconnect();
    this.nodo = null;
    this.sesion?.cerrar();
    this.sesion = null;
  }
}
