/**
 * Un único AudioContext para toda la app.
 *
 * Tres cosas que parecen detalles y no lo son:
 *  - El contexto nace suspendido: hay que reanudarlo DENTRO de un gesto del usuario.
 *    Por eso existe el botón grande de «¡Empezar!» en la pantalla inicial.
 *  - La sampleRate cambia al abrir el micrófono. Nunca fijes 44100 en el código.
 *  - outputLatency + baseLatency hay que restarlos antes de comparar el golpe de un
 *    niño con la rejilla esperada, o toda la evaluación rítmica miente.
 */

let ctx: AudioContext | null = null;
let calibracionMs = 0;

const CLAVE_CALIBRACION = 'cascabel.calibracion.ms';

export function obtenerContexto(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    vigilarElContexto(ctx);
    try {
      const guardada = localStorage.getItem(CLAVE_CALIBRACION);
      if (guardada) calibracionMs = Number(guardada) || 0;
    } catch {
      // Modo privado o almacenamiento bloqueado: seguimos sin calibración.
    }
  }
  return ctx;
}

/**
 * El contexto se puede suspender **solo**, y hay que reanudarlo en el toque siguiente.
 *
 * No es un caso raro ni un fallo nuestro: en Android basta con que otra aplicación pida el
 * foco de audio, que el móvil se bloquee, o que la pestaña pase a segundo plano un rato.
 * El `AudioContext` se queda en `suspended` o `interrupted` y **todo lo que se programe a
 * partir de ahí es silencio**, sin dar ni un error. Los dibujos siguen moviéndose, porque
 * `requestAnimationFrame` no depende del audio, así que por fuera parece que la actividad
 * funciona y simplemente «no suena». Y solo se arreglaba recargando, porque eso construye
 * un contexto nuevo.
 *
 * Un `resume()` hay que pedirlo desde un gesto del usuario, así que se engancha a los
 * gestos: en una actividad el niño está tocando la pantalla todo el rato, de modo que la
 * recuperación es inmediata y nadie se entera. Se queda puesto para siempre —no es de una
 * sola vez— porque se puede volver a suspender las veces que haga falta.
 */
function vigilarElContexto(c: AudioContext): void {
  if (typeof document === 'undefined') return;
  const reanudar = () => {
    if (c.state !== 'running') void c.resume().catch(() => {});
  };
  for (const evento of ['pointerdown', 'touchend', 'keydown']) {
    document.addEventListener(evento, reanudar, { capture: true, passive: true });
  }
}

/*
  Todo lo que suena pasa por una salida maestra y deja apuntada su fuente.

  Hasta el 2026-09-10 cada sampler, el kit y el clic iban directos a `destination`, y una
  fuente de Web Audio no se puede cancelar desde fuera una vez programada: al pulsar
  «parar» en el constructor de ritmos se paraba el reloj que programaba vueltas nuevas, pero
  la vuelta entera ya estaba en cola y seguía sonando hasta el final. El autor lo oyó, y lo
  mismo pasaba al salir de la actividad a mitad.

  Con las fuentes apuntadas, `pararTodo()` las detiene una a una —también las que todavía
  no han empezado, que es lo que cancela lo programado hacia el futuro— y la salida maestra
  baja a cero un instante para que ninguna se corte con un chasquido.
*/
let maestra: GainNode | null = null;
const fuentes = new Set<AudioScheduledSourceNode>();

/** La salida a la que se conecta todo. Se crea con el contexto y se reutiliza. */
export function salidaMaestra(): GainNode {
  const c = obtenerContexto();
  if (!maestra) {
    maestra = c.createGain();
    maestra.gain.value = 1;
    maestra.connect(c.destination);
  }
  return maestra;
}

/**
 * Apunta una fuente para poder pararla, y **desconecta su cadena cuando termina**.
 *
 * Lo segundo no es limpieza opcional: es la diferencia entre que la app siga sonando o no
 * al cabo de un rato. Un nodo de Web Audio que sigue **conectado** a la salida es alcanzable
 * desde el destino, así que el recolector de basura no puede llevárselo por mucho que en
 * JavaScript no queden referencias. Cada nota crea su nodo de envolvente y cada golpe su
 * nodo de volumen; sin desconectarlos, el grafo crece nota a nota **para siempre**, el hilo
 * de audio tiene que recorrerlo entero en cada bloque de muestras, y acaba sin dar abasto:
 * el sonido se corta y solo vuelve recargando la app.
 *
 * Lo describió el autor el 2026-09-14: «al ejecutar varias actividades de karaoke acaba
 * fallando el sonido y no se oye nada; reinicio la app y ya se oye».
 *
 * @param encadenados los nodos por los que pasa esa fuente, para soltarlos con ella.
 */
export function registrarFuente(
  fuente: AudioScheduledSourceNode,
  ...encadenados: AudioNode[]
): void {
  fuentes.add(fuente);
  enchufados += 1 + encadenados.length;
  let soltados = false;
  fuente.addEventListener('ended', () => {
    fuentes.delete(fuente);
    // Puede llegar dos veces —`pararTodo()` para la fuente y el navegador avisa igual—, y
    // descontar dos veces dejaría el contador mintiendo justo donde se mira si hay fuga.
    if (soltados) return;
    soltados = true;
    enchufados -= 1 + encadenados.length;
    for (const nodo of [fuente as AudioNode, ...encadenados]) {
      try {
        nodo.disconnect();
      } catch {
        // Ya desconectado: da igual, lo que importa es que no quede enganchado.
      }
    }
  });
}

/**
 * Nodos que siguen enchufados al grafo por haber sonado algo.
 *
 * **Es el número que delata la fuga**, y sale en `/diagnostico`. Baja a cero en cuanto se
 * acaba lo que está sonando; si sube y no vuelve a bajar, hay algo que no se desconecta y
 * el sonido acabará muriendo. Sin esto hay que esperar a que se muera para enterarse.
 */
let enchufados = 0;

export function nodosEnchufados(): number {
  return enchufados;
}

/**
 * La salida de una familia de instrumentos: **una sola, compartida**.
 *
 * Antes cada `Sampler`, cada `Percusion` y cada `Cuerpo` creaba la suya en `cargar()` y la
 * conectaba a la maestra. Como nadie la desconectaba nunca, **cada actividad que se abría
 * dejaba uno o dos nodos colgando del grafo para el resto de la sesión**, y con ellos todo
 * lo que tuvieran enganchado. Un nodo conectado al destino no lo puede recoger el
 * recolector, así que la cuenta solo subía.
 *
 * Con una por familia el número está acotado para siempre y no hay nada que soltar al salir
 * de una actividad, que es mejor que acordarse de soltarlo en cada tipo de motor.
 */
const salidas = new Map<string, GainNode>();

export function salidaDe(familia: string, volumen: number): GainNode {
  const c = obtenerContexto();
  let nodo = salidas.get(familia);
  if (!nodo) {
    nodo = c.createGain();
    nodo.gain.value = volumen;
    nodo.connect(salidaMaestra());
    salidas.set(familia, nodo);
  }
  return nodo;
}

/** Cuántas fuentes hay vivas o programadas. Para los tests y para el diagnóstico. */
export function fuentesVivas(): number {
  return fuentes.size;
}

/** Cuántas salidas de familia hay. Nunca debería crecer con el uso: ver `salidaDe`. */
export function salidasVivas(): number {
  return salidas.size;
}

/**
 * Para todo lo que suena y todo lo que está programado, ya.
 *
 * No lanza nunca: una fuente que ya terminó no se puede parar dos veces y no importa.
 */
export function pararTodo(): void {
  if (!ctx) return;
  const ahora = ctx.currentTime;
  const salida = salidaMaestra();
  // Bajar un instante y volver: lo que se corta, se corta sin clic, y lo que venga
  // después suena con normalidad. Veinte milisegundos no se notan como silencio.
  salida.gain.cancelScheduledValues(ahora);
  salida.gain.setValueAtTime(salida.gain.value, ahora);
  salida.gain.linearRampToValueAtTime(0.0001, ahora + 0.02);
  salida.gain.setValueAtTime(1, ahora + 0.06);
  for (const f of fuentes) {
    try {
      f.stop(ahora + 0.03);
    } catch {
      // Ya parada, o nunca arrancó: da igual.
    }
  }
  fuentes.clear();
}

/** Llamar SIEMPRE desde un handler de gesto (click, touchend, keydown). */
export async function despertarAudio(): Promise<void> {
  const c = obtenerContexto();
  if (c.state !== 'running') await c.resume();
  /*
    Y la salida maestra, a tope.

    `pararTodo()` la baja un instante y la sube 60 ms después con un evento programado. Si
    entre medias pasa cualquier cosa que deje ese evento sin aplicar —el contexto se
    suspende justo ahí y el reloj de audio deja de avanzar, o una segunda llamada cancela lo
    programado en el momento exacto—, **la salida se queda en 0,0001 y no se oye nada en
    toda la sesión**, que es uno de los dos caminos que llevaban a «no suena y al reiniciar
    ya va». Aquí se fuerza al valor bueno al empezar cada actividad, que es gratis y cierra
    el caso.
  */
  const m = salidaMaestra();
  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(1, c.currentTime);
}

/** Latencia total a compensar, en milisegundos. */
export function latenciaMs(): number {
  const c = obtenerContexto();
  const salida = (c.outputLatency || 0) + (c.baseLatency || 0);
  return salida * 1000 + calibracionMs;
}

/** Ajuste manual del usuario tras la actividad «da tres palmadas al ritmo». */
export function guardarCalibracion(ms: number): void {
  calibracionMs = Math.max(-300, Math.min(300, ms));
  try {
    localStorage.setItem(CLAVE_CALIBRACION, String(calibracionMs));
  } catch {
    // Sin persistencia: la calibración vale para esta sesión.
  }
}

export function calibracionActualMs(): number {
  return calibracionMs;
}

/** Convierte un instante del reloj de audio a milisegundos de rendimiento comparables. */
export function aMilisegundos(tiempoAudio: number): number {
  return tiempoAudio * 1000;
}
