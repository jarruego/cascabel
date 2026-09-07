import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { Sampler, aMidi } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { IconoGrabar, IconoParar, IconoTocar } from '@/ui/Transporte';
import { GrabadorDeEventos, reproducir, type Grabacion } from '../grabacionEventos';
import { letraDeNota, notaDeTecla, type Disposicion } from '@/ui/tecladoQwerty';
import { Retos } from '@/ui/Retos';
import { Personaje } from '@/ui/Personaje';
import { NOMBRES, personajeDe } from '@/ui/personajes';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «teclado»: un piano en la pantalla del móvil o de la tablet.
 *
 * **No usa ninguna librería de piano.** Se miraron `x-piano`, `Open-Web-Piano` y
 * `virtual-keyboard-display` (ver `docs/11-RECURSOS-Y-REFERENTES.md`): todas traen su propia
 * gestión de audio, y eso chocaría con la regla de un solo `AudioContext` de
 * `CLAUDE.md` §7. Sobre el `Sampler` que ya existe, un teclado son cien líneas.
 *
 * Dos decisiones que no son evidentes:
 *
 *  - **Las teclas negras se pueden quitar.** En Infantil estorban: el niño busca el do y se
 *    encuentra un bosque. Con `soloBlancas` queda una escala diatónica, que es lo que hay
 *    en un metalófono Orff de aula.
 *  - **Se puede tocar deslizando** el dedo por las teclas (*glissando*), porque es lo
 *    primero que hace un niño con un piano y prohibírselo sería raro. Pero cada tecla es un
 *    `<button>`, así que el teclado entero funciona con Tab y Enter.
 */

const BLANCAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Qué blancas llevan una negra a su derecha. Mi y si no la tienen: es lo que da al piano
 *  su patrón de dos y tres, y lo que permite orientarse sin mirar. */
const CON_NEGRA = [true, true, false, true, true, true, false];

export default function Teclado({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Octava más grave que se muestra. */
    desde?: number;
    /**
     * Cuántas octavas pide la actividad.
     *
     * **Se declara por actividad porque es una decisión pedagógica, no de pantalla.** Una
     * de Infantil pide una: con más, el niño busca el do y se encuentra un bosque. Una de
     * reconocimiento de intervalos pide dos, para que quepan. El instrumento libre pide
     * tres, porque ahí lo que sobra no estorba.
     *
     * Lo que no quepa se recorta al dibujar —ver `octavasVisibles`—, así que pedir tres no
     * rompe nada en un móvil: se ven las que entren, y girando la pantalla entran más.
     */
    octavas?: number;
    soloBlancas?: boolean;
    /**
     * Cuántas teclas blancas, si lo que se quiere no cabe en octavas enteras.
     *
     * Una octava son siete blancas y va **de do a si**: el do de arriba se queda fuera. Pero
     * a veces lo que hace falta es justo el do de arriba —la escala completa, do a do— y
     * pedir dos octavas para eso da catorce teclas para enseñar ocho.
     *
     * En el piano de la pandilla es la razón de ser: son **ocho personajes**, de Dora a
     * Doby, y Doby es el do de arriba. Con octavas enteras, Doby no existiría.
     */
    blancas?: number;
    /** Nombres bajo cada tecla: 'latino' (do re mi), 'ingles' (C D E) o 'ninguno'. */
    nombres?: 'latino' | 'ingles' | 'ninguno';
    /** Enseñar qué tecla del ordenador toca cada nota. Estorba donde no hay teclado. */
    letrasQwerty?: boolean;
    /** 'horizontal' imita el piano; 'apilada' da dos octavas partidas en dos filas. */
    disposicionTeclado?: Disposicion;
    /** Timbre. Ver `audio/instrumentos.ts`. */
    instrumento?: string;
    /** Botones de grabar y reproducir. Se pueden quitar donde estorben. */
    grabable?: boolean;
    /**
     * El selector de una, dos o tres octavas.
     *
     * **Apagado salvo que la actividad lo pida.** En el instrumento libre tiene sentido —
     * quien quiere tres octavas las pide—; en una actividad concreta es una decisión que no
     * viene al caso y que además cambia lo que se ve mientras se toca.
     */
    elegirOctavas?: boolean;
    /**
     * El personaje de cocomusic en cada tecla, en vez del nombre de la nota.
     *
     * Por defecto solo en Infantil: a los cuatro años no se busca «la nota fa», se busca a
     * Fara, y el nombre escrito no dice nada a quien no lee. En los otros carriles el
     * nombre **es** lo que hay que aprender, y taparlo con un dibujo sería quitarles justo
     * lo que han venido a leer.
     */
    personajes?: boolean;
    /** Propuestas de qué hacer. Ver `ui/Retos.tsx`: son ideas, no tareas. */
    retos?: string[];
  };

  const carril = useCarril(actividad.etapa);
  const desde = contenido.desde ?? 4;
  const octavas = contenido.octavas ?? (carril === 'infantil' ? 1 : 2);
  const soloBlancas = contenido.soloBlancas ?? carril === 'infantil';
  const nombres = contenido.nombres ?? (carril === 'autonomos' ? 'ingles' : 'latino');
  // En Infantil no se enseñan: se toca con el dedo, y una letra más en cada tecla es ruido.
  const letrasQwerty = contenido.letrasQwerty ?? carril !== 'infantil';
  const disposicion = contenido.disposicionTeclado ?? 'horizontal';
  // Apagado salvo que se pida: grabar es de instrumento libre. En una actividad de
  // Infantil son dos botones más que nadie ha pedido.
  const grabable = contenido.grabable ?? false;
  const conPersonajes = contenido.personajes ?? carril === 'infantil';
  const elegirOctavas = contenido.elegirOctavas ?? false;

  /**
   * Octavas elegidas por quien está tocando, que mandan sobre lo que quepa.
   *
   * El ajuste automático de abajo quita octavas cuando las teclas quedarían demasiado
   * pequeñas, y eso está bien como valor de partida. Pero **una elección explícita no se
   * discute**: si alguien pide tres octavas en un móvil, se le dan tres y el teclado se
   * desplaza. Decidir por él «esto no te cabe» es lo que hacía que el piano se quedara en
   * una octava sin explicar por qué.
   */
  const [octavasElegidas, setOctavasElegidas] = useState<number | null>(null);

  /*
    Grabar sin grabar audio: se anota QUÉ nota y CUÁNDO, y reproducir es volver a tocarlas.
    Ver `motor/grabacionEventos.ts` para las cuatro razones de que así sea más sencillo Y
    mejor que un `MediaRecorder`. La principal, aquí: no hay micrófono, así que no hay
    permiso que pedir ni riesgo de grabar a un niño.
  */
  const grabador = useRef(new GrabadorDeEventos());
  const [grabando, setGrabando] = useState(false);
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  const sampler = useRef<Sampler | null>(null);
  const deslizando = useRef(false);
  const ultima = useRef<string | null>(null);
  const [sonando, setSonando] = useState<Set<string>>(new Set());
  /** Nota que se acaba de tocar, para enseñarla grande encima del teclado. */
  const [ultimaTocada, setUltimaTocada] = useState<string | null>(null);

  /**
   * Personajes saltando, uno por toque.
   *
   * Con un identificador propio y no con el nombre de la nota: dos toques seguidos en la
   * misma tecla compartirían clave, React reutilizaría el nodo y la animación no volvería a
   * arrancar. El segundo toque no se vería. Es la misma trampa que ya apareció con los
   * nombres de nota del karaoke.
   */
  const [saltos, setSaltos] = useState<Array<{ id: number; nota: string }>>([]);
  const siguienteSalto = useRef(0);

  const sonar = useCallback(async (nota: string) => {
    setSonando((s) => new Set(s).add(nota));
    setUltimaTocada(nota);

    // El salto del personaje. Se limpia solo al acabar la animación; si no se limpiara,
    // una sesión larga de piano acabaría con cientos de nodos invisibles en el árbol.
    if (personajeDe(nota, desde)) {
      const id = siguienteSalto.current++;
      setSaltos((s) => [...s, { id, nota }]);
      // Un poco más que la animación: si se limpiara antes, el personaje desaparecería
      // de golpe a media subida.
      window.setTimeout(() => setSaltos((s) => s.filter((x) => x.id !== id)), 1300);
    }
    if (grabador.current.grabando) {
      grabador.current.anotar(nota, obtenerContexto().currentTime * 1000);
    }
    window.setTimeout(() => setSonando((s) => {
      const n = new Set(s);
      n.delete(nota);
      return n;
    }), 260);
    try {
      await despertarAudio();
      if (!sampler.current) {
        const s = new Sampler(muestrasDe(contenido.instrumento));
        await s.cargar();
        sampler.current = s;
      }
      sampler.current.tocar(nota, undefined, 1.1);
    } catch {
      // Sin muestras el teclado sigue respondiendo visualmente. No se cierra nada.
    }
  }, [desde]);

  // Deslizar el dedo por las teclas. Se sigue con pointermove global porque el puntero
  // sale del botón donde empezó, y sin capturarlo a nivel de ventana se pierde.
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!deslizando.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nota = el?.getAttribute('data-nota');
      if (nota && nota !== ultima.current) {
        ultima.current = nota;
        void sonar(nota);
      }
    };
    const soltar = () => {
      deslizando.current = false;
      ultima.current = null;
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [sonar]);

  /*
    El teclado se adapta al ancho que hay, y si no cabe **quita octavas antes que
    encoger las teclas**.

    Encoger sin límite convierte un piano en una fila de rayas imposible de acertar: es
    peor que enseñar menos notas. Así que hay un suelo por tecla, y cuando ni con una
    octava se llega a ese suelo —una pantalla muy estrecha— se deja desbordar y la caja
    desplaza, que al menos mantiene las teclas usables.

    El ancho se MIDE, no se supone. Calcularlo de `window.innerWidth` habría fallado en
    cuanto algo más ocupara sitio al lado, y el modo lienzo cambia el espacio disponible
    sin que cambie la ventana.
  */
  const caja = useRef<HTMLDivElement | null>(null);
  const [anchoCaja, setAnchoCaja] = useState(0);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    // ResizeObserver y no el evento `resize` de la ventana: esto tiene que reaccionar
    // también cuando cambia el contenedor sin cambiar la ventana, que es justo lo que pasa
    // al entrar y salir del modo lienzo.
    if (typeof ResizeObserver === 'undefined') {
      setAnchoCaja(el.clientWidth);
      return;
    }
    const ro = new ResizeObserver(([entrada]) => {
      setAnchoCaja(entrada?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Tope de ancho por tecla, **por carril**.
   *
   * Los 88 px son lo que mide una tecla blanca de piano real (23 mm a la densidad habitual
   * de una pantalla), y por encima de eso la mano deja de poder colocarse como se coloca en
   * un piano de verdad: lo que se aprende aquí dejaría de servir allí. Es el único sitio del
   * proyecto donde un objetivo táctil tiene techo.
   *
   * **Pero ese argumento solo vale donde se está aprendiendo a tocar.** A los cuatro años no
   * se coloca ninguna mano: se acierta una tecla con un dedo, y ahí más grande es mejor. El
   * tope único dejaba el piano de Infantil en 616 px con media tablet vacía al lado,
   * defendiendo una postura de manos que a esa edad no existe.
   */
  const ANCHO_TECLA_MAXIMO = { infantil: 150, lectores: 110, autonomos: 88 }[carril];
  /** Aire a los lados para que el teclado no quede pegado al borde de la pantalla. */
  const MARGEN_LATERAL = 16;
  /**
   * Suelo por debajo del cual una tecla deja de ser acertable con un dedo, **por carril**.
   *
   * Era 30 px para todos, y eso dejaba el piano en una sola octava en cualquier móvil: dos
   * octavas son catorce blancas, que en 360 px salen a 25,7. Pero 26 px es perfectamente
   * acertable para un niño de diez años y no lo es para uno de cuatro, así que el suelo
   * tiene que ir por edad como todo lo demás aquí. Sigue siendo un suelo: por debajo se
   * quitan octavas, nunca se encoge más.
   */
  const anchoMinimo = { infantil: 42, lectores: 32, autonomos: 26 }[carril];

  const anchoUtil = Math.max(0, anchoCaja - MARGEN_LATERAL * 2);

  const octavasVisibles = (() => {
    // La elección explícita manda: se dibujan y, si no caben, la caja desplaza.
    if (octavasElegidas !== null) return octavasElegidas;
    if (!anchoUtil) return octavas;
    // Se van quitando octavas hasta que las teclas caben por encima del suelo.
    for (let o = octavas; o > 1; o--) {
      if (anchoUtil / (7 * o) >= anchoMinimo) return o;
    }
    return 1;
  })();

  /*
    Las blancas que se dibujan. Si la actividad las pide por número, mandan ellas; si no,
    salen de las octavas. Nunca menos de dos: un teclado de una tecla no es un teclado.
  */
  const blancas = contenido.blancas
    ? Math.max(2, Math.round(contenido.blancas))
    : 7 * octavasVisibles;
  /*
    Las teclas LLENAN el hueco. Antes estaban acotadas por el objetivo táctil del carril
    —unos 60 px—, y en una pantalla ancha el teclado se quedaba chico y centrado con medio
    monitor vacío al lado, cuando lo que hace fácil acertar una tecla es que sea grande.
  */
  const anchoBlanca = anchoUtil
    ? Math.max(anchoMinimo, Math.min(ANCHO_TECLA_MAXIMO, Math.floor(anchoUtil / blancas)))
    : 60;
  // `anchoMinimo` es un suelo de verdad: si las octavas pedidas no caben a ese ancho, el
  // teclado sale más ancho que la caja y ésta desplaza. Nunca teclas impracticables.
  const desplaza = anchoBlanca * blancas > anchoUtil;
  /*
   * Tocar con el teclado del ordenador.
   *
   * Se ignora `e.repeat` porque al mantener una tecla el sistema la repite decenas de veces
   * por segundo, y eso no es un trémolo: es una ametralladora. Y se ignora cuando hay una
   * tecla modificadora pulsada, para no secuestrar los atajos del navegador.
   */
  useEffect(() => {
    const pulsar = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const nota = notaDeTecla(e.code, desde, disposicion);
      if (!nota) return;
      if (soloBlancas && nota.includes('#')) return;
      // Fuera del rango dibujado no suena nada: lo que se oye es lo que se ve.
      const octavaNota = Number(nota.replace(/[^0-9]/g, ''));
      if (octavaNota < desde || octavaNota >= desde + octavasVisibles) return;
      e.preventDefault();
      void sonar(nota);
    };
    window.addEventListener('keydown', pulsar);
    return () => window.removeEventListener('keydown', pulsar);
  }, [desde, octavasVisibles, soloBlancas, sonar, disposicion]);

  /*
    Las teclas se generan contando BLANCAS, no octavas.

    Antes el bucle iba por octavas enteras, así que `blancas: 8` ensanchaba el teclado y
    seguía dibujando siete teclas: Doby, que es el do de arriba, no aparecía. Contando
    blancas, la octava se deduce de cuántas llevas —siete por vuelta— y la número ocho cae
    sola en el do siguiente.
  */
  const teclas: Array<{ nota: string; negra: boolean; indice: number }> = [];
  for (let n = 0; n < blancas; n++) {
    const octava = desde + Math.floor(n / 7);
    const i = n % 7;
    const letra = BLANCAS[i]!;
    teclas.push({ nota: `${letra}${octava}`, negra: false, indice: n });
    // La negra de la última blanca no se dibuja: quedaría colgando fuera del teclado.
    if (!soloBlancas && CON_NEGRA[i] && n < blancas - 1) {
      teclas.push({ nota: `${letra}#${octava}`, negra: true, indice: n });
    }
  }

  return (
    <section className="actividad teclado" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* La nota que suena, grande. Es lo que convierte el piano en algo de lo que se
          aprende: se toca, suena y se ve cómo se llama. */}
      <p
        className="teclado__ultima"
        aria-live="polite"
        style={ultimaTocada ? { color: colorDe(ultimaTocada) } : undefined}
      >
        {/* Con personajes, el nombre entero con su sílaba destacada: DOra, REx, MIlo. El
            nombre lleva dentro el de la nota —eso es la metodología, no una casualidad— así
            que enseñarlo así es el puente entre el dibujo y la nota, y se lo hace el niño
            solo. Sin personajes, el nombre de la nota de siempre. */}
        {ultimaTocada && conPersonajes && personajeDe(ultimaTocada, desde) ? (
          (() => {
            const quien = personajeDe(ultimaTocada, desde)!;
            const { nombre, silaba } = NOMBRES[quien];
            return (
              <>
                <span className="teclado__silaba">{nombre.slice(0, silaba)}</span>
                {nombre.slice(silaba)}
              </>
            );
          })()
        ) : ultimaTocada ? (
          nombreDe(ultimaTocada, nombres === 'ingles' ? 'ingles' : 'latino')
        ) : (
          ''
        )}
      </p>

      <div
        ref={caja}
        className="teclado__caja"
        data-desplaza={desplaza || undefined}
        role="group"
        aria-label={t('teclado.teclas')}
        onPointerDown={() => {
          deslizando.current = true;
        }}
      >
        {/*
          Contenedor interior de ancho EXACTO, y es el que se centra.

          Las teclas negras van con `position: absolute` y su `left` sale del índice de la
          blanca a la que acompañan. Si el elemento que centra las blancas no es el mismo que
          sirve de origen a las negras, al ensanchar la ventana las blancas se mueven y las
          negras no: se descolocan más cuanto más ancha es la pantalla. Con este contenedor
          los dos comparten origen y la deriva no puede ocurrir.
        */}
        <div className="teclado__teclas" style={{ width: blancas * anchoBlanca }}>
          {teclas.map((k) => {
            const letra = k.nota[0]!;
            const etiqueta = nombres === 'ninguno' ? '' : nombreDe(letra, nombres);
            const qwerty = letrasQwerty && !k.negra ? letraDeNota(k.nota, desde, disposicion) : '';
            const suena = sonando.has(k.nota);
            return (
              <button
                key={k.nota}
                type="button"
                data-nota={k.nota}
                className={k.negra ? 'teclado__negra' : 'teclado__blanca'}
                data-sonando={suena || undefined}
                style={
                  k.negra
                    ? {
                        left: (k.indice + 1) * anchoBlanca - anchoBlanca * 0.3,
                        width: anchoBlanca * 0.6,
                        // Al pulsarla, la negra también se tiñe de su color.
                        background: suena ? colorDe(letra) : undefined,
                      }
                    : {
                        width: anchoBlanca,
                        // Una franja del color del grado en la parte baja de la tecla: se
                        // ve sin que la tecla deje de parecer una tecla de piano. Al
                        // pulsarla se tiñe entera, para que el color y el sonido lleguen
                        // juntos y el niño ate uno al otro.
                        borderBottom: `10px solid ${colorDe(letra)}`,
                        background: suena ? colorDe(letra) : undefined,
                      }
                }
                aria-label={`${etiqueta || letra}${k.negra ? ' sostenido' : ''} ${aMidi(k.nota)}`}
                onPointerDown={() => {
                  ultima.current = k.nota;
                  void sonar(k.nota);
                }}
                /* onClick además de onPointerDown: es lo que hace que Enter funcione
                   desde el teclado del ordenador sin escribir nada más. */
                onClick={() => {
                  if (!deslizando.current) void sonar(k.nota);
                }}
              >
                {/* El personaje ocupa el sitio del nombre, no se añade a él: una tecla con
                    dibujo Y nombre Y letra de ordenador es una tecla ilegible. Y solo en las
                    blancas, porque en una negra no cabe sin taparla entera. */}
                {/* Los saltos de esta tecla. Van dentro del botón para heredar su
                    posición, y con `pointer-events: none` para no robarle el toque. */}
                {conPersonajes &&
                  saltos
                    .filter((x) => x.nota === k.nota)
                    .map((x) => (
                      <span key={x.id} className="teclado__salto">
                        <Personaje
                          nombre={personajeDe(k.nota, desde)!}
                          pose="celebra"
                          tamano={Math.round(anchoBlanca * 1.6)}
                        />
                      </span>
                    ))}

                {!k.negra && conPersonajes && personajeDe(k.nota, desde) && (
                  <span className="teclado__personaje">
                    <Personaje
                      nombre={personajeDe(k.nota, desde)!}
                      pose="neutro"
                      tamano={Math.round(anchoBlanca * 1.1)}
                    />
                  </span>
                )}

                {!k.negra && !conPersonajes && (etiqueta || qwerty) && (
                  <span className="teclado__nombre">
                    {etiqueta}
                    {/* La letra del ordenador va DEBAJO del nombre, no encima de la tecla, y
                        solo en las blancas: en una negra no cabe sin taparla. Las negras se
                        explican en el texto de abajo. */}
                    {qwerty && <span className="teclado__qwerty">{qwerty}</span>}
                  </span>
                )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Una sola fila con todo lo que no es el teclado: propuestas, grabadora y salir.
          En la pantalla de un instrumento, cada línea que no sea teclado es teclado que se
          pierde. */}
      <div className="teclado__barra">
        {/* Cuántas octavas. Un grupo de tres botones y no un desplegable: son tres
            opciones, se ven las tres, y a esta edad abrir un desplegable es un paso más. */}
        {elegirOctavas && (
        <div className="teclado__octavas" role="group" aria-label={t('teclado.octavas')}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className="boton-repetir"
              aria-pressed={octavasVisibles === n}
              data-elegida={octavasVisibles === n || undefined}
              onClick={() => setOctavasElegidas(n)}
            >
              {n}
            </button>
          ))}
        </div>
        )}

        {contenido.retos && <Retos retos={contenido.retos} />}

        {grabable && (
          <>
          <button
            type="button"
            className="boton-repetir"
            data-grabando={grabando || undefined}
            aria-pressed={grabando}
            onClick={() => {
              if (grabando) {
                setGrabacion(grabador.current.terminar());
                setGrabando(false);
              } else {
                grabador.current.empezar();
                setGrabacion(null);
                setGrabando(true);
              }
            }}
          >
            {grabando ? <IconoParar /> : <IconoGrabar />}
            {t(grabando ? 'teclado.parar' : 'teclado.grabar')}
          </button>

          <button
            type="button"
            className="boton-repetir"
            aria-disabled={!grabacion || grabacion.eventos.length === 0 || grabando || undefined}
            onClick={async () => {
              if (!grabacion || grabando) return;
              await despertarAudio();
              if (!sampler.current) {
                try {
                  const s = new Sampler(muestrasDe(contenido.instrumento));
                  await s.cargar();
                  sampler.current = s;
                } catch {
                  return;
                }
              }
              setReproduciendo(true);
              const ctx = obtenerContexto();
              reproducir(
                grabacion,
                (nota, cuando) => sampler.current?.tocar(nota, cuando, 1.1),
                ctx.currentTime + 0.15,
              );
              window.setTimeout(() => setReproduciendo(false), grabacion.duracionMs + 300);
            }}
          >
            <IconoTocar />
            {t(reproduciendo ? 'teclado.sonando' : 'teclado.reproducir')}
          </button>
          </>
        )}
      </div>

    </section>
  );
}
