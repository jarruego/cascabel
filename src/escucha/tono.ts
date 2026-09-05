import { obtenerContexto } from '@/audio/AudioEngine';
import { abrirMicrofono, type SesionMicrofono } from './microfono';

/**
 * Detección de altura en tiempo real.
 *
 * Buena noticia contraintuitiva: la voz infantil (250-600 Hz) es el caso FÁCIL para
 * los métodos temporales. Con una ventana de 1024 muestras ya hay entre 5 y 12
 * periodos completos, así que se puede actualizar cada ~20 ms con poca CPU.
 *
 * El problema real no es el algoritmo: es que los niños cantan flojo, se alejan del
 * micro y el aula es ruidosa. De ahí el gating por energía, el umbral de claridad y
 * la mediana. Sin esos tres filtros, la lectura salta como loca.
 */

export interface LecturaTono {
  hz: number;
  claridad: number;
  midi: number;
  cents: number; // desviación respecto a la nota temperada más próxima
}

const CLARIDAD_MINIMA = 0.85;
const VENTANA_MEDIANA = 5;

export function hzAMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export class DetectorDeTono {
  private sesion: SesionMicrofono | null = null;
  private nodo: AudioWorkletNode | null = null;
  private historico: number[] = [];

  async arrancar(alLeer: (lectura: LecturaTono | null) => void): Promise<void> {
    const ctx = obtenerContexto();
    await ctx.audioWorklet.addModule('/worklets/tono-processor.js');

    this.sesion = await abrirMicrofono();
    this.nodo = new AudioWorkletNode(ctx, 'tono-processor', {
      processorOptions: { tamanoVentana: 1024 },
    });

    this.nodo.port.onmessage = (ev: MessageEvent) => {
      const { hz, claridad } = ev.data as { hz: number; claridad: number };
      if (!hz || claridad < CLARIDAD_MINIMA) {
        this.historico = [];
        alLeer(null);
        return;
      }
      this.historico.push(hz);
      if (this.historico.length > VENTANA_MEDIANA) this.historico.shift();
      const suavizado = mediana(this.historico);
      const midi = hzAMidi(suavizado);
      alLeer({
        hz: suavizado,
        claridad,
        midi,
        cents: (midi - Math.round(midi)) * 100,
      });
    };

    this.sesion.fuente.connect(this.nodo);
    // No conectamos a destination: no queremos oír al niño por el altavoz (realimentación).
  }

  parar(): void {
    this.nodo?.port.close();
    this.nodo?.disconnect();
    this.nodo = null;
    this.sesion?.cerrar();
    this.sesion = null;
    this.historico = [];
  }
}

function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[mitad]! : (orden[mitad - 1]! + orden[mitad]!) / 2;
}
