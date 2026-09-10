import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto, pararTodo } from '@/audio/AudioEngine';
import { SonidosDelCuerpo, ZONAS, type Zona } from '@/audio/cuerpo';
import { Sampler } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { IconoParar, IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { Reaccion } from '@/ui/Reaccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { mantenerALaVista } from '@/ui/seguirColumna';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «cuerpo»: percusión corporal.
 *
 * **Por qué esto merece estar en la aplicación.** Es lo que más se usa en el aula de música
 * española y no necesita instrumentos: funciona con treinta niños a la vez, no hay que
 * repartir nada, y es la vía natural al pulso antes de que haya coordinación para sostener
 * un instrumento.
 *
 * **Y por qué la notación es nuestra.** El método BAPNE® es un método registrado con
 * copyright de su autor, así que su notación, su terminología y sus secuencias **no se
 * pueden copiar**. Lo que sí es de todos son los cuatro sonidos —pitos, palmas, muslos y
 * pies—, que están en el Orff-Schulwerk desde los años treinta y en cualquier patio de
 * colegio desde antes. La forma de escribirlos aquí es propia: cuatro filas de colores.
 *
 * **El orden de las filas no es arbitrario.** De arriba abajo: pitos, palmas, muslos, pies.
 * Es a la vez el orden de **altura del sonido** —de más agudo a más grave— y el de **altura
 * en el cuerpo** —de las manos arriba a los pies en el suelo—. Las dos escalas coinciden, y
 * esa coincidencia es lo que hace que un niño no tenga que aprenderse el dibujo: ya lo sabe.
 *
 * **Lo que suena por el altavoz es una señal, no el instrumento.** El sonido de verdad lo
 * hace el niño con su cuerpo. Por eso hay bucle y por eso se puede seguir mirando: la
 * pantalla marca qué toca y cuándo, como un director.
 */

/** El dibujo de cada zona: chasquear los dedos, palmas, la pierna y el pie. OpenMoji. */
const ICONO_ZONA: Record<Zona, string> = {
  pitos: 'chasquido',
  palmas: 'palmas',
  muslos: 'muslo',
  pies: 'pie',
};

type Estado = { sonando: boolean; indice: number };
type Accion = { tipo: 'sonando'; valor: boolean } | { tipo: 'indice'; valor: number };

function reducir(estado: Estado, accion: Accion): Estado {
  if (accion.tipo === 'sonando') {
    return { sonando: accion.valor, indice: accion.valor ? estado.indice : -1 };
  }
  return { ...estado, indice: accion.valor };
}

export default function Cuerpo({ actividad, alTerminar, alSalir }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Un golpe por figura: qué zona del cuerpo y cuántos pulsos ocupa. */
    patron: Array<{ zona: Zona | 'silencio'; pulsos?: number }>;
    tempo?: number;
    /** Sílabas Kodály paralelas al patrón, si la actividad las quiere enseñar. */
    silabas?: string[];
    /**
     * La melodía, una nota por golpe —o `null` donde no hay nota—, para las canciones
     * enteras. Suena BAJITO debajo de los golpes: es la referencia para cantar, no el
     * protagonista, y por eso va a un tercio del volumen. Lo pidió el autor el 2026-09-10.
     */
    melodia?: Array<string | null>;
    /** Con qué suena la melodía. Por defecto la flauta, que sostiene y se canta encima. */
    instrumento?: string;
    /**
     * Repetir sin parar. Es lo de siempre para un patrón de cuatro pulsos, que se acaba antes
     * de que un niño se haya enterado. Una canción entera no: se toca una vez, y al acabar
     * se ofrece repetirla o terminar. Lo pidió el autor el 2026-09-10.
     */
    bucle?: boolean;
    /** Volumen de la melodía, de 0 a 1. Por defecto la mitad: acompaña a los golpes. */
    volumenMelodia?: number;
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 84;
  const patron = contenido.patron;

  const [estado, despachar] = useReducer(reducir, { sonando: false, indice: -1 });
  const sampler = useRef<Sampler | null>(null);
  const bucle = contenido.bucle ?? true;
  /** La canción ha llegado al final: el personaje felicita y se ofrece repetir o terminar. */
  const [terminada, setTerminada] = useState(false);
  // Subido de 0,35 a 0,5 el 2026-09-10: bajo los golpes, a 0,35 la flauta no se oía.
  /* Por actividad: la Radetzky (346) la quiere al 100 %, que ahí la melodía es la que manda
     y las palmas acompañan; en Estrellita sigue a la mitad, bajo los golpes. */
  const VOLUMEN_MELODIA = contenido.volumenMelodia ?? 0.5;
  /**
   * Con una canción entera el patrón no cabe en pantalla: la tira se desplaza de lado y
   * sigue sola al golpe que toca, como la cuadrícula del constructor. Lo pidió el autor el
   * 2026-09-10 para «Estrellita». Ver `ui/seguirColumna.ts`.
   */
  const rejilla = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (estado.indice < 0) return;
    mantenerALaVista(rejilla.current, rejilla.current?.querySelector('[data-aqui]'));
  }, [estado.indice]);
  const sonidos = useRef<SonidosDelCuerpo | null>(null);
  const temporizador = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  /** Instante de cada golpe, en pulsos desde el principio. */
  const inicios = useMemo(() => {
    let acumulado = 0;
    return patron.map((g) => {
      const cuando = acumulado;
      acumulado += g.pulsos ?? 1;
      return cuando;
    });
  }, [patron]);
  const duracionPulsos = inicios.length
    ? inicios[inicios.length - 1]! + (patron[patron.length - 1]!.pulsos ?? 1)
    : 0;

  /** Se da por hecha una sola vez: ver `HECHA_CUANDO` en `motor/actividadesLibres.ts`. */
  const yaHecha = useRef(false);
  const darPorHecha = useCallback(() => {
    if (yaHecha.current) return;
    yaHecha.current = true;
    alTerminar({ actividadId: actividad.id, completada: true });
  }, [actividad.id, alTerminar]);

  const parar = useCallback(() => {
    if (temporizador.current !== null) window.clearInterval(temporizador.current);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    temporizador.current = null;
    rafId.current = null;
    // Y la melodía que hubiera en cola, que sin esto sonaba un pulso más.
    pararTodo();
    despachar({ tipo: 'sonando', valor: false });
  }, []);

  useEffect(() => parar, [parar]);

  const arrancar = useCallback(async () => {
    if (estado.sonando) {
      parar();
      return;
    }
    try {
      await despertarAudio();
      if (!sonidos.current) {
        const s = new SonidosDelCuerpo();
        await s.cargar();
        sonidos.current = s;
      }
      if (contenido.melodia && !sampler.current) {
        const s = new Sampler(muestrasDe(contenido.instrumento ?? 'flauta'));
        await s.cargar();
        sampler.current = s;
      }
    } catch {
      // Sin muestras el patrón se sigue viendo avanzar, y en esta actividad eso basta: el
      // sonido de verdad lo hace el niño.
    }

    const ctx = obtenerContexto();
    const segundosPorPulso = 60 / bpm;
    const inicio = ctx.currentTime + 0.3;
    let siguiente = 0;

    despachar({ tipo: 'sonando', valor: true });

    // Lookahead, como todo lo que suena aquí: `setInterval` decide cuándo mirar, no cuándo
    // suena. Y en bucle: `% patron.length` es todo lo que hace falta para repetir.
    temporizador.current = window.setInterval(() => {
      const ahora = obtenerContexto().currentTime;
      while (inicio + posicionDe(siguiente) * segundosPorPulso < ahora + 0.1) {
        // Sin bucle, después del último golpe no se programa nada más.
        if (!bucle && siguiente >= patron.length) break;
        const g = patron[siguiente % patron.length]!;
        const cuando = inicio + posicionDe(siguiente) * segundosPorPulso;
        if (g.zona !== 'silencio') {
          sonidos.current?.golpear(g.zona, cuando);
        }
        // La nota de ese golpe, bajita y de lo que dura el golpe.
        const nota = contenido.melodia?.[siguiente % patron.length];
        if (nota) {
          sampler.current?.tocar(nota, cuando, (g.pulsos ?? 1) * segundosPorPulso * 0.95, VOLUMEN_MELODIA);
        }
        siguiente += 1;
      }
    }, 25);

    function posicionDe(n: number): number {
      const vuelta = Math.floor(n / patron.length);
      return vuelta * duracionPulsos + inicios[n % patron.length]!;
    }

    const mover = () => {
      const transcurrido = obtenerContexto().currentTime - inicio;
      const enPulsos = transcurrido / segundosPorPulso;
      // Una vuelta entera vista y oída es haberlo hecho: como en el musicograma.
      if (enPulsos >= duracionPulsos) {
        darPorHecha();
        if (!bucle) {
          parar();
          setTerminada(true);
          return;
        }
      }
      const dentro = ((enPulsos % duracionPulsos) + duracionPulsos) % duracionPulsos;
      let i = 0;
      for (let k = 0; k < inicios.length; k++) if (dentro >= inicios[k]!) i = k;
      despachar({ tipo: 'indice', valor: transcurrido < 0 ? -1 : i });
      rafId.current = requestAnimationFrame(mover);
    };
    rafId.current = requestAnimationFrame(mover);
  }, [bpm, duracionPulsos, estado.sonando, inicios, parar, patron, darPorHecha, contenido.melodia, contenido.instrumento, bucle]);

  return (
    <section className="actividad cuerpo" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/*
        Cuatro filas: pitos, palmas, muslos, pies. De arriba abajo es a la vez el orden de
        altura del SONIDO y el de altura en el CUERPO, y esa coincidencia es lo que hace que
        no haya que aprenderse el dibujo.
      */}
      {/* Cuántas filas hay decide el alto de cada una: ver `--alto-fila` en tokens.css. */}
      <div
        className="cuerpo__rejilla"
        ref={rejilla}
        style={{ ['--filas' as string]: contenido.silabas ? 5 : 4, ['--pulsos' as string]: patron.length }}
      >
        {ZONAS.map((zona) => (
          <div key={zona} className="cuerpo__fila" data-zona={zona}>
            {/* Un dibujo encima del nombre: para quien no lee, y para que «chasquidos» no
                haya que explicarlo. Lo pidió el autor el 2026-09-10. */}
            <span className="cuerpo__etiqueta">
              {/* El dibujo, del color de su zona: el SVG hace de máscara y el color lo pone
                  la fila. Así los cuatro se distinguen por color además de por forma. */}
              <span
                className="cuerpo__icono"
                aria-hidden="true"
                style={{ maskImage: `url(/iconos/${ICONO_ZONA[zona]}.svg)`, WebkitMaskImage: `url(/iconos/${ICONO_ZONA[zona]}.svg)` }}
              />
              {t(`cuerpo.${zona}`)}
            </span>
            <div className="cuerpo__golpes">
              {patron.map((g, i) => (
                <span
                  key={i}
                  className="cuerpo__golpe"
                  data-puesto={g.zona === zona || undefined}
                  /* El silencio se dibuja: un hueco vacío no se distingue de «aquí no
                     toca esta zona», y el silencio hay que contarlo igual que un golpe. */
                  data-silencio={g.zona === 'silencio' || undefined}
                  data-aqui={estado.indice === i || undefined}
                  /* El ancho dice la duración: un golpe que ocupa dos pulsos se dibuja el
                     doble de ancho, igual que en el musicograma. */
                  style={{ flexGrow: g.pulsos ?? 1 }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        ))}

        {/* Las sílabas debajo, si la actividad las trae: es lo que permite DECIR el ritmo
            antes de hacerlo, que es como se aprende un ritmo. */}
        {contenido.silabas && (
          <div className="cuerpo__fila cuerpo__silabas">
            <span className="cuerpo__etiqueta">{t('cuerpo.dilo')}</span>
            <div className="cuerpo__golpes">
              {contenido.silabas.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="cuerpo__silaba"
                  data-aqui={estado.indice === i || undefined}
                  /* Una semicorchea es una casilla de un dedo: la sílaba va pequeña y
                     puede salirse un poco. Mejor eso que una casilla vacía. */
                  data-corta={(patron[i]?.pulsos ?? 1) < 0.5 || undefined}
                  style={{ flexGrow: patron[i]?.pulsos ?? 1 }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <BarraAcciones>
        {terminada ? (
          <>
            {/* Sin color a la izquierda, el verde a la derecha: como en el musicograma. */}
            <button
              type="button"
              className="boton-repetir"
              onClick={() => {
                setTerminada(false);
                void arrancar();
              }}
            >
              <IconoRepetir />
              {t('tocar.otraVez')}
            </button>
            <button type="button" className="boton-principal" onClick={() => alSalir?.()}>
              <IconoSiguiente />
              {t('comun.terminar')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="boton-principal boton-arranque"
            data-sonando={estado.sonando || undefined}
            onClick={() => void arrancar()}
          >
            {estado.sonando ? <IconoParar /> : <IconoTocar />}
            {t(estado.sonando ? 'accion.parar' : 'accion.empezar')}
          </button>
        )}
      </BarraAcciones>

      <Reaccion tono={terminada ? 'bien' : 'neutro'} personaje={actividad.personaje}>
        {terminada && t('comun.completada')}
      </Reaccion>
    </section>
  );
}
