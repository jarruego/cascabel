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
 *
 * ## Por qué saltaba sin que nadie hiciera nada
 *
 * Corregido el 2026-09-08, después de que el autor lo probara: la actividad de palmear
 * empezaba a contar golpes en una habitación en silencio. Eran tres cosas a la vez, y
 * cada una bastaba para romperlo:
 *
 *  1. **La media del ruido arrancaba en cero.** El umbral es «unas cuantas veces la media
 *     reciente», y multiplicar cero por lo que sea da cero: los primeros bloques después de
 *     abrir el micrófono superaban el umbral **siempre**. La media tarda unos 200 ms en
 *     acercarse al ruido real, y en 200 ms caben diez bloques de audio: diez palmadas
 *     fantasma nada más empezar.
 *
 *  2. **El suelo absoluto estaba en 1e-6**, que en energía media son unos −60 dBFS. El
 *     ruido propio de cualquier micrófono de portátil ya anda por ahí, así que ese suelo no
 *     filtraba nada. Una palmada a medio metro pasa de −25 dBFS: hay cuarenta decibelios de
 *     margen para poner el listón más alto sin perder ni una.
 *
 *  3. **El factor era 4.** Para una señal de banda ancha con ataque instantáneo eso es muy
 *     poco: una silla que se arrastra o una tos lo superan. Una palmada está veinte o
 *     cincuenta veces por encima del suelo de la sala, no cuatro.
 *
 * La regla de fondo, que es la misma de `CLAUDE.md` §8: **más vale no detectar una palmada
 * floja que contar diez que nadie ha dado.** Un golpe que no se registra se repite; un
 * detector que dispara solo convierte la actividad en algo que el niño no controla, y eso
 * no se arregla insistiendo.
 */
class OnsetProcessor extends AudioWorkletProcessor {
  constructor(opciones) {
    super();
    const {
      refractarioMs = 110,
      factorUmbral = 12,
      // Energía media mínima para considerar siquiera que ha sonado algo. Equivale a unos
      // −45 dBFS: por debajo de eso no hay palmada, hay sala.
      sueloAbsoluto = 3e-5,
      // Lo que se tarda en saber cómo suena el silencio de esta habitación. Mientras tanto
      // se escucha y no se detecta nada.
      calentamientoMs = 400,
    } = opciones.processorOptions || {};

    this.refractario = (refractarioMs / 1000) * sampleRate;
    this.factorUmbral = factorUmbral;
    this.sueloAbsoluto = sueloAbsoluto;
    this.calentamiento = (calentamientoMs / 1000) * sampleRate;
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

    /*
      Mientras se calienta, la media se aprende y no se detecta nada.

      Y se aprende deprisa: el primer bloque **fija** la media en vez de arrastrarla desde
      cero. Con la media a cero, el umbral adaptativo vale cero y cualquier cosa lo supera;
      ese era el fallo.
    */
    if (posicion === 0) this.media = energia;
    if (posicion < this.calentamiento) {
      this.media = this.media + this.alfa * (energia - this.media);
      return true;
    }

    const superaUmbral =
      energia > this.factorUmbral * this.media && energia > this.sueloAbsoluto;
    const fueraDeRefractario = posicion - this.ultimoOnset > this.refractario;

    if (superaUmbral && fueraDeRefractario) {
      this.ultimoOnset = posicion;
      this.port.postMessage({
        tiempo: currentTime + picoIndice / sampleRate,
        energia,
      });
    }

    /*
      La media solo sube con lo que NO es un golpe.

      Si se actualizara también con la energía de la palmada, el umbral se dispararía justo
      después de cada una y la siguiente pasaría desapercibida. Es lo que hace que un
      redoble se detecte entero y no solo el primer golpe.
    */
    if (!superaUmbral) {
      this.media = this.media + this.alfa * (energia - this.media);
    }
    return true;
  }
}

registerProcessor('onset-processor', OnsetProcessor);
