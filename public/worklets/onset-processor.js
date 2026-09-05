/**
 * Detector de palmadas.
 *
 * Una palmada es un transitorio de banda ancha con ataque brutal: la señal más fácil
 * que hay. Filtro paso-alto, energía, umbral adaptativo al ruido de la sala y un
 * periodo refractario. Sin el refractario, UNA palmada genera tres o cuatro onsets
 * por las reflexiones del aula: es el fallo número uno de este tipo de detectores.
 *
 * El timestamp se calcula DENTRO del worklet, con precisión de muestra. Si lo tomaras
 * en el hilo principal al recibir el mensaje perderías entre 10 y 30 ms impredecibles,
 * que es justo el orden de magnitud que estamos midiendo.
 */
class OnsetProcessor extends AudioWorkletProcessor {
  constructor(opciones) {
    super();
    const { refractarioMs = 110, factorUmbral = 4 } = opciones.processorOptions || {};
    this.refractario = (refractarioMs / 1000) * sampleRate;
    this.factorUmbral = factorUmbral;
    this.ultimoOnset = -Infinity;
    this.media = 0;
    // Media móvil de ~200 ms: es el umbral que se adapta al ruido de fondo.
    this.alfa = 1 - Math.exp(-128 / (0.2 * sampleRate));
    // Estado del paso-alto de un polo (~2 kHz): quita voz, retumbe y ruido grave.
    this.xAnterior = 0;
    this.yAnterior = 0;
    const rc = 1 / (2 * Math.PI * 2000);
    const dt = 1 / sampleRate;
    this.a = rc / (rc + dt);
    this.muestrasVistas = 0;
  }

  process(entradas) {
    const canal = entradas[0] && entradas[0][0];
    if (!canal) return true;

    let energia = 0;
    let picoIndice = 0;
    let pico = 0;

    for (let i = 0; i < canal.length; i++) {
      const y = this.a * (this.yAnterior + canal[i] - this.xAnterior);
      this.xAnterior = canal[i];
      this.yAnterior = y;
      const e = y * y;
      energia += e;
      if (e > pico) {
        pico = e;
        picoIndice = i;
      }
    }
    energia /= canal.length;

    const posicion = this.muestrasVistas;
    this.muestrasVistas += canal.length;

    const superaUmbral = energia > this.factorUmbral * this.media && energia > 1e-6;
    const fueraDeRefractario = posicion - this.ultimoOnset > this.refractario;

    if (superaUmbral && fueraDeRefractario) {
      this.ultimoOnset = posicion;
      this.port.postMessage({
        tiempo: currentTime + picoIndice / sampleRate,
        energia,
      });
    }

    this.media = this.media + this.alfa * (energia - this.media);
    return true;
  }
}

registerProcessor('onset-processor', OnsetProcessor);
