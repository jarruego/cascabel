/**
 * Grabar audio del micrófono, con todas las cautelas puestas por escrito.
 *
 * **Esto es lo único del proyecto que captura la voz de un niño**, así que va aparte del
 * resto del código de escucha —que analiza y no guarda— y con las condiciones de
 * `docs/08-LEGAL.md` incorporadas al propio objeto, no confiadas a quien lo use:
 *
 *  - **Nunca arranca solo.** Hay que llamar a `empezar()`, y quien lo llama es un botón.
 *  - **Suelta el micrófono siempre.** `parar()` hace `track.stop()`, y también lo hace
 *    `cancelar()`. Un micrófono que sigue encendido después de grabar es lo que hace que
 *    nadie vuelva a fiarse, y el indicador del navegador es lo único que el usuario ve.
 *  - **No hay ninguna ruta de red.** Lo que sale de aquí es un `Blob` en memoria.
 *
 * **Y no reutiliza el `AudioContext` del proyecto.** `MediaRecorder` trabaja directamente
 * sobre el `MediaStream`, así que grabar no interfiere con el sampler ni con el metrónomo:
 * se puede grabar mientras suena algo sin que ninguno de los dos se entere del otro.
 */

export interface ResultadoGrabacion {
  audio: Blob;
  duracionMs: number;
}

export class Grabadora {
  private stream: MediaStream | null = null;
  private grabador: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private inicio = 0;

  static get disponible(): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }

  get grabando(): boolean {
    return this.grabador?.state === 'recording';
  }

  /**
   * Pide el micrófono y empieza.
   *
   * Aquí SÍ se deja el procesado de voz del navegador activado, al revés que en el resto del
   * proyecto. En las actividades de escucha se desactiva porque destroza el análisis
   * musical; aquí lo que se graba es un paisaje sonoro del aula, y la cancelación de eco y
   * la reducción de ruido lo dejan más limpio. Son objetivos distintos y merecen ajustes
   * distintos: copiar la configuración de allí habría sido peor.
   *
   * @throws si no hay permiso o no hay micrófono. Quien llama debe caer con elegancia.
   */
  async empezar(): Promise<void> {
    if (!Grabadora.disponible) throw new Error('sin-grabadora');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.trozos = [];
    this.grabador = new MediaRecorder(this.stream);
    this.grabador.ondataavailable = (e) => {
      if (e.data.size > 0) this.trozos.push(e.data);
    };
    this.inicio = performance.now();
    this.grabador.start();
  }

  /** Para, suelta el micrófono y devuelve lo grabado. */
  async parar(): Promise<ResultadoGrabacion | null> {
    const g = this.grabador;
    if (!g || g.state === 'inactive') {
      this.soltar();
      return null;
    }
    const duracionMs = performance.now() - this.inicio;
    const audio = await new Promise<Blob>((resolver) => {
      g.onstop = () => resolver(new Blob(this.trozos, { type: g.mimeType || 'audio/webm' }));
      g.stop();
    });
    this.soltar();
    return { audio, duracionMs };
  }

  /** Corta sin quedarse con nada. Para salir de la actividad a mitad. */
  cancelar(): void {
    try {
      if (this.grabador?.state === 'recording') this.grabador.stop();
    } catch {
      // Da igual por qué falle: lo importante es lo de abajo.
    }
    this.trozos = [];
    this.soltar();
  }

  /**
   * Suelta el micrófono.
   *
   * `track.stop()` en TODAS las pistas, no solo en la primera: un dispositivo con varias
   * entradas devuelve varias, y dejarse una encendida mantiene el indicador del navegador
   * puesto, que es exactamente la señal de que algo sigue escuchando.
   */
  private soltar(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.grabador = null;
  }
}
