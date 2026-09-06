/**
 * Detector de altura en el hilo de audio.
 *
 * Implementa NSDF/McLeod (la misma familia que pitchy) directamente aquí, porque un
 * AudioWorklet no puede importar módulos de npm sin empaquetarlo aparte y este
 * algoritmo son sesenta líneas. Si algún día quieres pitchy tal cual, empaquétalo
 * como worklet independiente; la interfaz del puerto es la misma.
 *
 * Corre en el hilo de audio en bloques de 128 muestras. Coste: 1-4 % de un núcleo en
 * una tablet media con ventana de 1024, que es de sobra para 250-600 Hz.
 */
class TonoProcessor extends AudioWorkletProcessor {
  constructor(opciones) {
    super();
    const { tamanoVentana = 1024 } = opciones.processorOptions || {};
    this.N = tamanoVentana;
    this.buffer = new Float32Array(this.N);
    this.escritos = 0;
    // Umbral de energía: por debajo, es silencio o ruido de sala. Evita que el
    // detector invente notas cuando el niño no está cantando.
    this.rmsMinimo = 0.01;
    // Coste de cada analisis, para T0.1. performance no esta garantizado en el
    // ambito de un AudioWorklet, asi que se usa solo si existe.
    this.reloj =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? () => performance.now()
        : null;
    this.msAnalisis = null;
  }

  process(entradas) {
    const canal = entradas[0] && entradas[0][0];
    if (!canal) return true;

    for (let i = 0; i < canal.length; i++) {
      this.buffer[this.escritos++] = canal[i];
      if (this.escritos >= this.N) {
        this.analizar();
        // Solapamos al 50 %: más resolución temporal sin doblar el coste.
        this.buffer.copyWithin(0, this.N / 2);
        this.escritos = this.N / 2;
      }
    }
    return true;
  }

  analizar() {
    const t0 = this.reloj ? this.reloj() : 0;
    this.analizarNucleo();
    if (this.reloj) this.msAnalisis = this.reloj() - t0;
  }

  analizarNucleo() {
    const x = this.buffer;
    const N = this.N;

    let suma = 0;
    for (let i = 0; i < N; i++) suma += x[i] * x[i];
    const rms = Math.sqrt(suma / N);
    if (rms < this.rmsMinimo) {
      this.port.postMessage({ hz: 0, claridad: 0, msAnalisis: this.msAnalisis });
      return;
    }

    // NSDF: función de diferencia cuadrática normalizada (McLeod).
    const maxTau = Math.floor(N / 2);
    const nsdf = new Float32Array(maxTau);
    for (let tau = 0; tau < maxTau; tau++) {
      let ac = 0;
      let m = 0;
      for (let i = 0; i < N - tau; i++) {
        ac += x[i] * x[i + tau];
        m += x[i] * x[i] + x[i + tau] * x[i + tau];
      }
      nsdf[tau] = m > 0 ? (2 * ac) / m : 0;
    }

    // Primer máximo por encima del umbral relativo: así se evita el error de octava.
    let tau = 2;
    while (tau < maxTau && nsdf[tau] > 0) tau++;   // saltar el pico en tau=0
    let mejorTau = -1;
    let mejorValor = 0;
    for (; tau < maxTau - 1; tau++) {
      if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1]) {
        if (nsdf[tau] > mejorValor) {
          mejorValor = nsdf[tau];
          mejorTau = tau;
        }
        if (mejorValor > 0.9) break;
      }
    }

    if (mejorTau < 0 || mejorValor < 0.5) {
      this.port.postMessage({ hz: 0, claridad: 0, msAnalisis: this.msAnalisis });
      return;
    }

    // Interpolación parabólica: sin ella el error es de varios cents a frecuencias agudas.
    const y0 = nsdf[mejorTau - 1];
    const y1 = nsdf[mejorTau];
    const y2 = nsdf[mejorTau + 1];
    const ajuste = (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2 || 1);
    const tauFinal = mejorTau + ajuste;

    this.port.postMessage({
      hz: sampleRate / tauFinal,
      claridad: mejorValor,
      msAnalisis: this.msAnalisis,
    });
  }
}

registerProcessor('tono-processor', TonoProcessor);
