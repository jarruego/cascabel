import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio } from '@/audio/AudioEngine';
import { MARIMBA, Sampler, aMidi } from '@/audio/sampler';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { letraDeNota, notaDeTecla, type Disposicion } from '@/ui/tecladoQwerty';
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

export default function Teclado({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Octava más grave que se muestra. */
    desde?: number;
    octavas?: number;
    soloBlancas?: boolean;
    /** Nombres bajo cada tecla: 'latino' (do re mi), 'ingles' (C D E) o 'ninguno'. */
    nombres?: 'latino' | 'ingles' | 'ninguno';
    /** Enseñar qué tecla del ordenador toca cada nota. Estorba donde no hay teclado. */
    letrasQwerty?: boolean;
    /** 'horizontal' imita el piano; 'apilada' da dos octavas partidas en dos filas. */
    disposicionTeclado?: Disposicion;
  };

  const carril = useCarril(actividad.etapa);
  const desde = contenido.desde ?? 4;
  const octavas = contenido.octavas ?? (carril === 'infantil' ? 1 : 2);
  const soloBlancas = contenido.soloBlancas ?? carril === 'infantil';
  const nombres = contenido.nombres ?? (carril === 'autonomos' ? 'ingles' : 'latino');
  // En Infantil no se enseñan: se toca con el dedo, y una letra más en cada tecla es ruido.
  const letrasQwerty = contenido.letrasQwerty ?? carril !== 'infantil';
  const disposicion = contenido.disposicionTeclado ?? 'horizontal';

  const sampler = useRef<Sampler | null>(null);
  const deslizando = useRef(false);
  const ultima = useRef<string | null>(null);
  const [sonando, setSonando] = useState<Set<string>>(new Set());
  /** Nota que se acaba de tocar, para enseñarla grande encima del teclado. */
  const [ultimaTocada, setUltimaTocada] = useState<string | null>(null);

  const sonar = useCallback(async (nota: string) => {
    setSonando((s) => new Set(s).add(nota));
    setUltimaTocada(nota);
    window.setTimeout(() => setSonando((s) => {
      const n = new Set(s);
      n.delete(nota);
      return n;
    }), 260);
    try {
      await despertarAudio();
      if (!sampler.current) {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      }
      sampler.current.tocar(nota, undefined, 1.1);
    } catch {
      // Sin muestras el teclado sigue respondiendo visualmente. No se cierra nada.
    }
  }, []);

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

  /** Ancho ideal de tecla, del contrato táctil del carril. */
  const anchoIdeal = Math.max(36, Math.round(OBJETIVO_TACTIL[carril] * 0.85));
  /** Suelo por debajo del cual una tecla deja de ser acertable con un dedo. */
  const anchoMinimo = 30;

  const octavasVisibles = (() => {
    if (!anchoCaja) return octavas;
    // Se van quitando octavas hasta que las teclas caben por encima del suelo.
    for (let o = octavas; o > 1; o--) {
      if (anchoCaja / (7 * o) >= anchoMinimo) return o;
    }
    return 1;
  })();

  const blancas = 7 * octavasVisibles;
  const anchoBlanca = anchoCaja
    ? Math.max(anchoMinimo, Math.min(anchoIdeal, Math.floor(anchoCaja / blancas)))
    : anchoIdeal;
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

  const teclas: Array<{ nota: string; negra: boolean; indice: number }> = [];
  for (let o = 0; o < octavasVisibles; o++) {
    BLANCAS.forEach((letra, i) => {
      teclas.push({ nota: `${letra}${desde + o}`, negra: false, indice: o * 7 + i });
      if (!soloBlancas && CON_NEGRA[i]) {
        teclas.push({ nota: `${letra}#${desde + o}`, negra: true, indice: o * 7 + i });
      }
    });
  }

  return (
    <section className="actividad teclado" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      {/* La nota que suena, grande. Es lo que convierte el piano en algo de lo que se
          aprende: se toca, suena y se ve cómo se llama. */}
      <p
        className="teclado__ultima"
        aria-live="polite"
        style={ultimaTocada ? { color: colorDe(ultimaTocada) } : undefined}
      >
        {ultimaTocada ? nombreDe(ultimaTocada, nombres === 'ingles' ? 'ingles' : 'latino') : ''}
      </p>

      <div
        ref={caja}
        className="teclado__caja"
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
                {!k.negra && (etiqueta || qwerty) && (
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

      <p className="pista-fija">
        {t('teclado.libre')}
        {letrasQwerty && ` ${t('teclado.qwerty')}`}
      </p>

      <button
        type="button"
        className="boton-repetir"
        onClick={() => alTerminar({ actividadId: actividad.id, completada: true })}
      >
        {t('lienzo.terminar')}
      </button>
    </section>
  );
}
