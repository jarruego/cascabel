import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto, pararTodo } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { Metronomo } from '@/audio/metronomo';
import { clic } from '@/audio/clic';
import { vibrarPulso } from '@/ui/vibracion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoParar, IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { Reaccion } from '@/ui/Reaccion';
import { rejillaDesdeSilabas } from '../rejillaRitmica';
import { faltaPara, posicionEnVuelta, vueltasEncoladas } from '../bucle';

/**
 * Tipo «seguir»: reproducción con cursor sincronizado. Musicograma y karaoke.
 *
 * El niño no responde nada: **mira y sigue**. Es la actividad más pasiva del catálogo y a
 * la vez una de las más útiles, porque es donde se aprende que la música avanza en el
 * tiempo y que lo que se oye se puede representar.
 *
 * No hay acierto ni error: por eso no usa ninguna máquina de estados con solución. Termina
 * cuando acaba la pieza o cuando el maestro lo decide.
 *
 * **El cursor va por `requestAnimationFrame` y no por el planificador de audio.** Animar
 * dentro del planificador adelanta el destello respecto al sonido hasta cien milisegundos,
 * que a esta edad es la diferencia entre entender el pulso y no entenderlo.
 */

interface Bloque {
  /** Texto o sílaba que se muestra. */
  texto?: string;
  icono?: string;
  color?: string;
  /** Pulsos que dura este bloque. */
  pulsos?: number;
}

export default function Seguir({ actividad, alTerminar, alSalir }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    bloques: Bloque[];
    tempo?: number;
    /**
     * `tira`: los bloques en fila y se ilumina el que toca.
     * `cae`: los bloques bajan hacia una línea de acierto, como en Guitar Hero.
     *
     * **`cae` NO puntúa, no encadena combos y no se puede fallar.** La mecánica de notas
     * que caen hace visible que la música avanza en el tiempo, que es lo que queremos; el
     * marcador es lo que el dosier llama la mitad tóxica de Duolingo. Es un musicograma
     * que se mueve, no un juego de puntos.
     */
    modo?: 'tira' | 'cae';
    /** Lo pone `conSerie` cuando esta pieza es un ejercicio de una serie. */
    serie?: { n: number; total: number };
    /** Sílabas rítmicas si el musicograma es de ritmo; si no, se usa `pulsos` por bloque. */
    silabas?: string[];
    /**
     * Repetir sin parar hasta que se pulse «parar».
     *
     * Un patrón de cuatro pulsos dura tres segundos: se acaba antes de que un niño se haya
     * enterado. En bucle, el ritmo deja de ser algo que pasa y se convierte en algo que
     * está ahí, que es lo que permite mirarlo, decirlo en voz alta y palmearlo encima.
     */
    bucle?: boolean;
    /** Nota que suena en cada bloque, si se quiere sonido melódico. */
    notas?: string[];
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 92;
  const bloques = contenido.bloques;

  const modo = contenido.modo ?? 'tira';
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(-1);
  /** El último bloque que ya dio su golpecito. El bucle corre a 60 por segundo. */
  const ultimoVibrado = useRef(-1);
  /** Segundos que faltan para cada bloque. Negativo = ya ha pasado. Solo en modo `cae`. */
  const [restantes, setRestantes] = useState<number[]>([]);
  const sampler = useRef<Sampler | null>(null);
  const metronomo = useRef<Metronomo | null>(null);
  const rafId = useRef<number | null>(null);
  const yaTerminada = useRef(false);
  /**
   * La pieza ha llegado al final. Sin bucle y fuera de una serie, la actividad no se cierra
   * ahí: el autor lo vio el 2026-09-12 —«es muy corta y al terminar da directamente la
   * enhorabuena; ¿y si se quiere repetir?»—. La enhorabuena la da el personaje aquí mismo,
   * y la botonera ofrece «otra vez» como botón grande y «terminar» como discreto. Se anota
   * al acabar la primera vuelta, como siempre; lo que no sale es la modal.
   */
  const [terminada, setTerminada] = useState(false);

  /**
   * La tira se mueve sola para que el bloque que suena esté siempre a la vista.
   *
   * Un musicograma es una línea y no se parte en varias filas: con veinticuatro pictogramas
   * y un móvil eso serían ocho renglones, y el bloque iluminado saltaría de sitio —baja una
   * fila, vuelve a la izquierda— justo cuando lo que se está enseñando es que la música
   * avanza de izquierda a derecha. Así que la línea se desplaza, como una partitura larga
   * proyectada, y esto es lo que la empuja.
   *
   * `block: 'nearest'` para que no toque el desplazamiento vertical de la página: lo único
   * que tiene que moverse es la tira.
   */
  const tira = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    if (actual < 0) return;
    const el = tira.current?.children[actual];
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [actual]);

  const parar = useCallback(() => {
    metronomo.current?.parar();
    metronomo.current = null;
    // Y lo ya programado, que sin esto seguía sonando hasta el final de la vuelta.
    pararTodo();
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    setSonando(false);
    setActual(-1);
  }, []);

  useEffect(() => parar, [parar]);

  /**
   * Arranca, y en bucle no vuelve a arrancar nunca: sigue.
   *
   * **Por qué esto no relanza.** Antes cada vuelta llamaba otra vez aquí, y aquí el instante
   * de salida se calculaba como «ahora más medio segundo». Ese medio segundo era el margen
   * para tener el sonido cargado, y en la primera vuelta está bien; en las siguientes se
   * colaba entero entre el último bloque y el primero, o sea un silencio que ni es un pulso
   * ni es medio. Eso es lo que se oía como una costura, y además el metrónomo se paraba y se
   * creaba otro, con lo que el pulso se reiniciaba también.
   *
   * Ahora hay **un solo `inicio`** y la vuelta N sale exactamente en `inicio + N * duración`.
   * Es aritmética contra el reloj del audio: no acumula error y no puede haber hueco, porque
   * no hay ningún «ahora» de por medio.
   *
   * Se sigue programando poco por delante —algo más de un segundo—, que era la razón de
   * relanzar en vez de encolar veinte vueltas de golpe. Se mantiene el motivo y se cambia la
   * forma: es el mismo *lookahead* del metrónomo (`CLAUDE.md` §7).
   */
  const arrancar = useCallback(async () => {
    if (sonando) return;
    metronomo.current?.parar();
    metronomo.current = null;
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras el musicograma se sigue viendo: el cursor avanza igual y el
        // metrónomo marca el pulso. Se pierde la melodía, no la actividad.
      }
    }

    const ctx = obtenerContexto();
    const msPorPulso = 60000 / bpm;
    const inicio = ctx.currentTime * 1000 + 500;

    /*
      Cada bloque empieza donde acaba el anterior.

      **Las duraciones salen de las SÍLABAS, no de los golpes**, y confundirlos era el
      fallo: con `ta ta ti-ti ta` hay cuatro bloques y cinco golpes, así que salían cinco
      duraciones para cuatro bloques y encima equivocadas —el bloque «ti-ti» duraba medio
      pulso cuando dura uno entero—.
    */
    const rejilla = contenido.silabas ? rejillaDesdeSilabas(contenido.silabas) : null;
    const duraciones = rejilla
      ? rejilla.inicios.map((ini, i, a) =>
          i + 1 < a.length ? a[i + 1]! - ini : rejilla.pulsos - ini,
        )
      : bloques.map((b) => b.pulsos ?? 1);

    /*
      Los desfases dentro de UNA vuelta, en milisegundos desde su principio.

      Antes esto eran instantes absolutos y por eso había que recalcularlos en cada vuelta.
      Siendo desfases, la vuelta N son los mismos números más `N * duracionVuelta`: se
      calculan una vez y valen para siempre.
    */
    let acumulado = 0;
    const desfases = duraciones.map((d) => {
      const ms = acumulado * msPorPulso;
      acumulado += d;
      return ms;
    });
    const duracionVuelta = acumulado * msPorPulso;

    /** Programa el sonido de una vuelta. La N empieza en `inicio + N * duracionVuelta`. */
    const programarVuelta = (n: number) => {
      const base = inicio + n * duracionVuelta;
      desfases.forEach((desfase, i) => {
        const nota = contenido.notas?.[i];
        if (nota) sampler.current?.tocar(nota, (base + desfase) / 1000, msPorPulso / 1000);
      });
      /*
        **El ritmo suena, golpe a golpe.** Antes, sin `notas` declaradas no se programaba
        ningún sonido: solo corría el metrónomo marcando negras, así que se leía «ti-ti» y se
        oía «ta». El ritmo hay que oírlo, que es toda la actividad.
      */
      if (rejilla && !contenido.notas) {
        rejilla.golpes.forEach((g) => clic((base + g * msPorPulso) / 1000, g === 0));
      }
    };

    /*
      Y el metrónomo va EN SILENCIO cuando el ritmo ya suena. Un clic en cada negra sonando a
      la vez que el ritmo hace que un niño no distinga cuál es cuál; el pulso se sigue viendo,
      que es para lo que estaba. Se crea **una sola vez**: antes se paraba y se creaba otro en
      cada vuelta, así que el pulso se reiniciaba con ella.
    */
    const m = new Metronomo(bpm, 4, !contenido.notas && !rejilla);
    metronomo.current = m;
    m.arrancar();
    setSonando(true);

    /** Cuántas vueltas llevan el sonido ya encolado. */
    let programadas = 0;
    /** Cuánto se programa por delante. Poco: el niño puede parar en la primera vuelta. */
    const ADELANTO_MS = 1200;

    const seguirCursor = () => {
      const ahora = obtenerContexto().currentTime * 1000;

      // Encolar lo que entre en la ventana. En bucle no para nunca; si no, solo la primera.
      const reloj = { inicio, duracionVuelta, ahora };
      const hacenFalta = contenido.bucle
        ? vueltasEncoladas(reloj, ADELANTO_MS)
        : Math.min(1, vueltasEncoladas(reloj, ADELANTO_MS));
      while (programadas < hacenFalta) {
        programarVuelta(programadas);
        programadas += 1;
      }

      const transcurrido = ahora - inicio;
      const dentro = posicionEnVuelta(reloj, Boolean(contenido.bucle));

      let indice = -1;
      if (transcurrido >= 0) {
        for (let i = 0; i < desfases.length; i++) if (dentro >= desfases[i]!) indice = i;
      }
      /*
        Un golpecito cada vez que cambia el bloque que suena.

        Aquí no se evalúa a nadie: el musicograma se sigue con el dedo, y lo que se está
        enseñando es que la música avanza en el tiempo. Sin oírlo, un cambio de bloque es un
        color que se mueve; con la vibración es un pulso. Se compara con el índice anterior
        para no repetir el mismo golpe sesenta veces por segundo.
      */
      if (indice !== ultimoVibrado.current) {
        ultimoVibrado.current = indice;
        if (indice >= 0) vibrarPulso(indice === 0);
      }
      setActual(indice);

      if (modo === 'cae') {
        setRestantes(
          desfases.map(
            (desfase) =>
              faltaPara(desfase, dentro, duracionVuelta, Boolean(contenido.bucle)) / 1000,
          ),
        );
      }

      if (transcurrido >= duracionVuelta) {
        /*
          Se anota al acabar la PRIMERA vuelta, dé vueltas o no.

          Estaba dentro de la rama de «no hay bucle», detrás del `return` que relanzaba, así
          que **las actividades en bucle no se marcaban nunca** — y tres de las cuatro van en
          bucle, «Ta y ti-ti» incluida. Al acabar una vuelta el niño ha visto y oído el
          patrón entero, que es lo que aquí significa haberlo hecho: no hay nada que acertar.

          Quien decide si además se celebra es el marco, con `hayCelebracion`: en bucle no se
          celebra, porque la música sigue sonando.
        */
        if (!yaTerminada.current) {
          yaTerminada.current = true;
          // `cerrado`: el marco anota y no abre la modal. En una serie es el envoltorio
          // quien decide, y ahí sí hay que avisar sin cerrar.
          alTerminar({ actividadId: actividad.id, completada: true, cerrado: !contenido.serie });
        }
        if (!contenido.bucle) {
          parar();
          if (!contenido.serie) setTerminada(true);
          return;
        }
      }
      rafId.current = requestAnimationFrame(seguirCursor);
    };
    rafId.current = requestAnimationFrame(seguirCursor);
  }, [
    sonando,
    bpm,
    bloques,
    contenido.silabas,
    contenido.notas,
    contenido.bucle,
    contenido.serie,
    modo,
    parar,
    actividad.id,
    alTerminar,
  ]);

  return (
    <section className="actividad seguir" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El musicograma. Cada bloque se ilumina cuando le toca: es lo que enseña que la
          música avanza en el tiempo y que lo que suena se puede dibujar. */}
      {modo === 'tira' ? (
        <ol className="seguir__tira" ref={tira} aria-label={t(contenido.consigna)}>
          {bloques.map((b, i) => (
            <li
              key={`${b.texto ?? b.icono ?? i}-${i}`}
              className="seguir__bloque"
              data-actual={i === actual || undefined}
              data-pasado={i < actual || undefined}
              style={b.color ? { borderColor: `var(--eje-${b.color})` } : undefined}
            >
              {b.icono && <Icono nombre={b.icono} tamano={44} />}
              {b.texto && <span className="seguir__texto">{t(b.texto)}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="seguir__pista" aria-label={t(contenido.consigna)}>
          {/* La línea de acierto: donde el bloque se encuentra con el sonido. */}
          <div className="seguir__linea" aria-hidden="true" />
          {bloques.map((b, i) => {
            const seg = restantes[i];
            // Solo se dibujan los bloques que están cerca: los demás no se ven y
            // mantenerlos en el DOM cuesta memoria en una tablet vieja.
            if (seg === undefined || seg > 4 || seg < -0.9) return null;
            return (
              <div
                key={`${b.texto ?? b.icono ?? i}-${i}`}
                className="seguir__cayendo"
                data-acertando={Math.abs(seg) < 0.18 || undefined}
                /* 0 % es la línea de acierto y 100 % es arriba del todo. Cuatro segundos
                   de anticipación: menos no da tiempo a prepararse, y más satura. */
                style={{ bottom: `${Math.max(-12, (seg / 4) * 100)}%` }}
              >
                {b.icono && <Icono nombre={b.icono} tamano={40} />}
                {b.texto && <span>{t(b.texto)}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* La instrucción no se repite aquí: la cuenta el personaje al entrar y se vuelve a
          leer pulsándolo. Y la acción va donde va en todas, en la botonera de abajo. */}
      <BarraAcciones>
        {terminada ? (
          <>
            <button
              type="button"
              className="boton-principal"
              onClick={() => {
                setTerminada(false);
                void arrancar();
              }}
            >
              <IconoRepetir />
              {t('tocar.otraVez')}
            </button>
            <button type="button" className="boton-repetir" onClick={() => alSalir?.()}>
              <IconoSiguiente />
              {t('comun.terminar')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="boton-principal boton-arranque"
            data-sonando={sonando || undefined}
            onClick={() => (sonando ? parar() : void arrancar())}
          >
            {sonando ? <IconoParar /> : <IconoTocar />}
            {sonando ? t('accion.parar') : t('accion.empezar')}
          </button>
        )}
      </BarraAcciones>

      <Reaccion tono={terminada ? 'bien' : 'neutro'} personaje={actividad.personaje}>
        {terminada && t('comun.completada')}
      </Reaccion>
    </section>
  );
}
