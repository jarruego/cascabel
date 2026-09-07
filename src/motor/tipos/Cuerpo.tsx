import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { SonidosDelCuerpo, ZONAS, type Zona } from '@/audio/cuerpo';
import { IconoParar, IconoTocar } from '@/ui/Transporte';
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

type Estado = { sonando: boolean; indice: number };
type Accion = { tipo: 'sonando'; valor: boolean } | { tipo: 'indice'; valor: number };

function reducir(estado: Estado, accion: Accion): Estado {
  if (accion.tipo === 'sonando') {
    return { sonando: accion.valor, indice: accion.valor ? estado.indice : -1 };
  }
  return { ...estado, indice: accion.valor };
}

export default function Cuerpo({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Un golpe por figura: qué zona del cuerpo y cuántos pulsos ocupa. */
    patron: Array<{ zona: Zona | 'silencio'; pulsos?: number }>;
    tempo?: number;
    /** Sílabas Kodály paralelas al patrón, si la actividad las quiere enseñar. */
    silabas?: string[];
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 84;
  const patron = contenido.patron;

  const [estado, despachar] = useReducer(reducir, { sonando: false, indice: -1 });
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

  const parar = useCallback(() => {
    if (temporizador.current !== null) window.clearInterval(temporizador.current);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    temporizador.current = null;
    rafId.current = null;
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
        const g = patron[siguiente % patron.length]!;
        if (g.zona !== 'silencio') {
          sonidos.current?.golpear(g.zona, inicio + posicionDe(siguiente) * segundosPorPulso);
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
      const dentro = ((enPulsos % duracionPulsos) + duracionPulsos) % duracionPulsos;
      let i = 0;
      for (let k = 0; k < inicios.length; k++) if (dentro >= inicios[k]!) i = k;
      despachar({ tipo: 'indice', valor: transcurrido < 0 ? -1 : i });
      rafId.current = requestAnimationFrame(mover);
    };
    rafId.current = requestAnimationFrame(mover);
  }, [bpm, duracionPulsos, estado.sonando, inicios, parar, patron]);

  return (
    <section className="actividad cuerpo" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/*
        Cuatro filas: pitos, palmas, muslos, pies. De arriba abajo es a la vez el orden de
        altura del SONIDO y el de altura en el CUERPO, y esa coincidencia es lo que hace que
        no haya que aprenderse el dibujo.
      */}
      <div className="cuerpo__rejilla">
        {ZONAS.map((zona) => (
          <div key={zona} className="cuerpo__fila" data-zona={zona}>
            <span className="cuerpo__etiqueta">{t(`cuerpo.${zona}`)}</span>
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
                  style={{ flexGrow: patron[i]?.pulsos ?? 1 }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="cuerpo__acciones">
        <button type="button" className="boton-actividad" onClick={() => void arrancar()}>
          {estado.sonando ? <IconoParar /> : <IconoTocar />}
          {t(estado.sonando ? 'cuerpo.parar' : 'cuerpo.tocar')}
        </button>
        <button
          type="button"
          className="boton-repetir"
          onClick={() => {
            parar();
            alTerminar({ actividadId: actividad.id, completada: true });
          }}
        >
          {t('lienzo.terminar')}
        </button>
      </div>

      <p className="pista-fija">{t('cuerpo.loHacesTu')}</p>
    </section>
  );
}
