import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { KIT, Percusion, type Golpe } from '@/audio/percusion';
import { Metronomo } from '@/audio/metronomo';
import { IconoGrabar, IconoParar, IconoTocar } from '@/ui/Simbolos';
import { GrabadorDeEventos, reproducir, type Grabacion } from '../grabacionEventos';
import { Retos } from '@/ui/Retos';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { vibrarPulso } from '@/ui/vibracion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «pads»: el kit de percusión, para tocarlo.
 *
 * **Por qué no cabía en un tipo existente.** El kit ya estaba —`audio/percusion.ts`, diez
 * golpes con round robin—, pero solo se llegaba a él programando una secuencia en el editor
 * de pistas. Eso es componer, no tocar, y son dos cosas distintas: al piano se le puede dar
 * un golpe y oír algo, y a la percusión no se podía. `teclado` tampoco valía —un pad no
 * tiene altura, ni octavas, ni orden de graves a agudos— y forzarlo habría dejado un
 * componente con la mitad de sus opciones apagadas.
 *
 * **Las familias mandan sobre el orden y sobre la forma.** Parche, metal y madera: es la
 * clasificación que se enseña en Primaria, así que agrupar por ella no es decoración, es
 * parte de lo que la pantalla dice. Y da la forma de cada pad, que es lo que permite que el
 * color no informe solo (`CLAUDE.md` §6): círculo lleno el parche, aro el metal y
 * rectángulo la madera, además del nombre escrito en cada uno.
 *
 * **El metrónomo está aquí a propósito.** Una percusión sin pulso no enseña nada de tiempo:
 * suena a ruido y suena igual de bien vaya como vaya. Con el pulso puesto, el niño oye si
 * llega tarde sin que nadie se lo diga y sin que nada le corrija.
 */

type Familia = 'parche' | 'metal' | 'madera';

/**
 * A qué familia pertenece cada golpe del kit.
 *
 * Es organología estándar y no hay criterio propio que aportar. La pandereta va en metal por
 * las sonajas, que es lo que suena: su parche apenas se usa a estas edades.
 */
const FAMILIA: Record<Golpe, Familia> = {
  bombo: 'parche',
  caja: 'parche',
  tom: 'parche',
  bongo: 'parche',
  charles: 'metal',
  plato: 'metal',
  triangulo: 'metal',
  pandereta: 'metal',
  claves: 'madera',
  cajachina: 'madera',
};

const ORDEN: Familia[] = ['parche', 'metal', 'madera'];

/**
 * Teclas del ordenador, en el mismo orden en que se dibujan los pads.
 *
 * Dos filas seguidas y nada más: aquí no hay ningún estándar que imitar como sí lo hay en el
 * piano, así que lo único que importa es que se vea de un vistazo qué tecla es cuál, y por
 * eso la letra va escrita en el propio pad.
 */
const TECLAS = [
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
];
const LETRAS = ['1', '2', '3', '4', '5', 'Q', 'W', 'E', 'R', 'T'];

const TEMPOS = [60, 84, 108];

export default function Pads({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Qué golpes salen. Menos es más en Infantil: diez pads son diez decisiones. */
    golpes?: Golpe[];
    /** Botones de grabar y reproducir. */
    grabable?: boolean;
    /** Pulso de fondo. Sin él no hay forma de saber si se llega tarde. */
    metronomo?: boolean;
    tempo?: number;
    pulsosPorCompas?: number;
    /** Enseñar qué tecla del ordenador toca cada pad. Estorba donde no hay teclado. */
    letrasQwerty?: boolean;
    /** Propuestas de qué hacer. Ver `ui/Retos.tsx`: son ideas, no tareas. */
    retos?: string[];
  };

  const carril = useCarril(actividad.etapa);
  // En Infantil, cuatro. Diez pads a los cuatro años no son un instrumento, son un menú.
  const pedidos =
    contenido.golpes ??
    (carril === 'infantil' ? (['bombo', 'caja', 'pandereta', 'claves'] as Golpe[]) : [...KIT]);
  const ordenados = pedidos
    .filter((g) => KIT.includes(g))
    .sort((a, b) => ORDEN.indexOf(FAMILIA[a]) - ORDEN.indexOf(FAMILIA[b]));
  /** Clave estable de la lista, para las dependencias de los efectos. */
  const listaGolpes = ordenados.join(',');

  // Igual que en el teclado: se pide, no viene puesto.
  const grabable = contenido.grabable ?? false;
  const conMetronomo = contenido.metronomo ?? carril !== 'infantil';
  const letrasQwerty = contenido.letrasQwerty ?? carril !== 'infantil';

  const percusion = useRef<Percusion | null>(null);
  const [sonando, setSonando] = useState<Set<string>>(new Set());
  const deslizando = useRef(false);
  const ultimo = useRef<string | null>(null);

  const grabador = useRef(new GrabadorDeEventos());
  const [grabando, setGrabando] = useState(false);
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  const metronomo = useRef<Metronomo | null>(null);
  const [pulsando, setPulsando] = useState(false);
  const [tempo, setTempo] = useState(contenido.tempo ?? 84);
  const [acento, setAcento] = useState(false);

  const cargar = useCallback(async (): Promise<Percusion | null> => {
    await despertarAudio();
    if (!percusion.current) {
      const p = new Percusion(listaGolpes.split(',') as Golpe[]);
      await p.cargar();
      percusion.current = p;
    }
    return percusion.current;
  }, [listaGolpes]);

  /** Se da por hecha una sola vez: ver `HECHA_CUANDO` en `motor/actividadesLibres.ts`. */
  const yaHecha = useRef(false);
  const darPorHecha = useCallback(() => {
    if (yaHecha.current) return;
    yaHecha.current = true;
    alTerminar({ actividadId: actividad.id, completada: true });
  }, [actividad.id, alTerminar]);

  const golpear = useCallback(
    async (golpe: Golpe) => {
      darPorHecha();
      setSonando((s) => new Set(s).add(golpe));
      if (grabador.current.grabando) {
        grabador.current.anotar(golpe, obtenerContexto().currentTime * 1000);
      }
      window.setTimeout(
        () =>
          setSonando((s) => {
            const n = new Set(s);
            n.delete(golpe);
            return n;
          }),
        200,
      );
      try {
        (await cargar())?.golpear(golpe);
      } catch {
        // Sin muestras el pad sigue respondiendo a la vista. No se cierra nada.
      }
    },
    [cargar, darPorHecha],
  );

  /*
    Deslizar el dedo por los pads: es un redoble, y es lo primero que hace cualquiera con una
    fila de tambores delante. Se sigue con `pointermove` en la ventana porque el puntero sale
    del pad donde empezó, igual que pasa en el teclado.
  */
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!deslizando.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const golpe = el?.closest('[data-golpe]')?.getAttribute('data-golpe');
      if (golpe && golpe !== ultimo.current) {
        ultimo.current = golpe;
        void golpear(golpe as Golpe);
      }
    };
    const soltar = () => {
      deslizando.current = false;
      ultimo.current = null;
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [golpear]);

  /* Tocar con el teclado del ordenador. `code` y no `key`, para que funcione igual en un
     teclado que no sea el español, donde la letra de esa posición es otra. */
  useEffect(() => {
    if (!letrasQwerty) return;
    const lista = listaGolpes.split(',') as Golpe[];
    const pulsar = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const i = TECLAS.indexOf(e.code);
      const golpe = i >= 0 ? lista[i] : undefined;
      if (!golpe) return;
      e.preventDefault();
      void golpear(golpe);
    };
    window.addEventListener('keydown', pulsar);
    return () => window.removeEventListener('keydown', pulsar);
  }, [golpear, letrasQwerty, listaGolpes]);

  /* El pulso visual sale de la cola del metrónomo, consumida desde rAF, nunca del
     planificador: animar dentro del planificador desfasa a ojo (`CLAUDE.md` §7). */
  useEffect(() => {
    if (!pulsando) return;
    let id = 0;
    const mirar = () => {
      const pulsos = metronomo.current?.pulsosParaPintar() ?? [];
      if (pulsos.length) {
        setAcento(true);
        window.setTimeout(() => setAcento(false), 90);
        // Y en la mano. Ver `ui/vibracion.ts`.
        vibrarPulso(pulsos.some((p) => p.acentuado));
      }
      id = requestAnimationFrame(mirar);
    };
    id = requestAnimationFrame(mirar);
    return () => cancelAnimationFrame(id);
  }, [pulsando]);

  useEffect(() => () => metronomo.current?.parar(), []);

  const alternarPulso = async () => {
    if (pulsando) {
      metronomo.current?.parar();
      setPulsando(false);
      return;
    }
    await despertarAudio();
    metronomo.current = new Metronomo(tempo, contenido.pulsosPorCompas ?? 4, true);
    metronomo.current.arrancar();
    setPulsando(true);
  };

  return (
    <section className="actividad pads" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El borde de la rejilla late con el pulso. Es el pulso VISIBLE que pide §6: una
          actividad de ritmo tiene que poder hacerse mirando. */}
      <div className="pads__rejilla" data-pulso={acento || undefined}>
        {ordenados.map((golpe, i) => (
          <button
            key={golpe}
            type="button"
            data-golpe={golpe}
            className="pads__pad"
            data-familia={FAMILIA[golpe]}
            data-sonando={sonando.has(golpe) || undefined}
            aria-label={`${t('golpe.' + golpe)}, ${t('familia.' + FAMILIA[golpe])}`}
            onPointerDown={() => {
              deslizando.current = true;
              ultimo.current = golpe;
              void golpear(golpe);
            }}
            /* onClick además de onPointerDown: es lo que hace que Enter funcione desde el
               teclado del ordenador sin escribir nada más. */
            onClick={() => {
              if (!deslizando.current) void golpear(golpe);
            }}
          >
            <span className="pads__nombre">{t('golpe.' + golpe)}</span>
            {letrasQwerty && LETRAS[i] && <span className="pads__letra">{LETRAS[i]}</span>}
          </button>
        ))}
      </div>

      <BarraAcciones>
        {conMetronomo && (
          <>
            <button
              type="button"
              className="boton-repetir"
              aria-pressed={pulsando}
              data-elegida={pulsando || undefined}
              onClick={() => void alternarPulso()}
            >
              {t(pulsando ? 'accion.sinPulso' : 'accion.pulso')}
            </button>
            <div className="pads__tempos acciones__grupo" role="group" aria-label={t('pads.tempo')}>
              {TEMPOS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="boton-repetir"
                  aria-pressed={tempo === n}
                  data-elegida={tempo === n || undefined}
                  onClick={() => {
                    setTempo(n);
                    metronomo.current?.cambiarTempo(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
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
              {t(grabando ? 'accion.parar' : 'teclado.grabar')}
            </button>

            <button
              type="button"
              className="boton-repetir"
              aria-disabled={!grabacion || grabacion.eventos.length === 0 || grabando || undefined}
              onClick={async () => {
                if (!grabacion || grabando) return;
                const p = await cargar();
                if (!p) return;
                setReproduciendo(true);
                reproducir(
                  grabacion,
                  (golpe, cuando) => p.golpear(golpe as Golpe, cuando),
                  obtenerContexto().currentTime + 0.15,
                );
                window.setTimeout(() => setReproduciendo(false), grabacion.duracionMs + 300);
              }}
            >
              <IconoTocar />
              {t(reproduciendo ? 'teclado.sonando' : 'accion.escuchar')}
            </button>
          </>
        )}
      </BarraAcciones>
    </section>
  );
}
