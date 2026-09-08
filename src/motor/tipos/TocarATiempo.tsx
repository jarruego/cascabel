import { useCallback, useEffect, useRef, useState } from 'react';
import { clicYa } from '@/audio/clic';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { TOLERANCIA_MS } from '@/config';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { DetectorDePalmadas } from '@/escucha/palmadas';
import { useCarril } from '@/app/preferencias';
import { evaluarRitmo, type EvaluacionRitmica } from '../evaluacion';
import { aMilisegundos, anclarEn, rejillaDesdeSilabas } from '../rejillaRitmica';
import { Reaccion } from '@/ui/Reaccion';
import type { Personaje as PersonajeNombre } from '@/ui/personajes';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { rechazarMicrofono, seUsaMicrofono } from '@/escucha/permiso';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { CuentaAtras } from '@/ui/CuentaAtras';

/**
 * Tipo «tocar a tiempo»: se escucha un patrón y se repite, con palmadas o tocando.
 *
 * **La regla que manda aquí es la 8 de CLAUDE.md**: el micrófono es un accesorio, nunca un
 * requisito. Si falla —permiso denegado, worklet que no carga, navegador sin getUserMedia,
 * el bug de iOS— la actividad **sigue** con toque en pantalla. El cambio es silencioso para
 * el niño; el aviso, si acaso, es para el adulto.
 *
 * Y hay una razón de aula además de la de accesibilidad: veinticinco micrófonos abiertos a
 * la vez son inutilizables. El toque no es el plan B, es el plan A en clase entera.
 */

/**
 * Pulsos de entrada entre el ejemplo y la respuesta: un compás.
 *
 * Es lo que da un director y lo que un niño necesita para colocarse. Menos no da tiempo, y
 * más deja al grupo sin saber si ya ha empezado.
 */
const CUENTA_PULSOS = 4;

type Fase = 'listo' | 'cuenta' | 'escuchando' | 'respondiendo' | 'resultado';

export default function TocarATiempo({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    silabas: string[];
    repeticiones?: number;
    tempo?: number;
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 84;
  const repeticiones = contenido.repeticiones ?? 3;

  const [fase, setFase] = useState<Fase>('listo');
  const [ronda, setRonda] = useState(0);
  // Solo importa el `set`: la vía se decide al primer golpe y el valor no se dibuja
  // desde que la instrucción salió de la pantalla.
  const [, setConMicrofono] = useState(false);
  const [avisoMicro, setAvisoMicro] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRitmica | null>(null);
  /** Se acabó el tiempo sin que el niño tocara nada. No es un fallo: es que no empezó. */
  const [sinRespuesta, setSinRespuesta] = useState(false);
  /**
   * Por dónde entró la primera respuesta de la ronda: palmada o toque.
   *
   * **Y a partir de ahí solo vale esa.** Con las dos vías abiertas a la vez, una palmada
   * dada mientras se toca el botón cuenta dos veces y el ritmo sale al doble. Decide la
   * primera respuesta, que es lo natural: el niño ya ha elegido con qué lo va a hacer.
   */
  const via = useRef<'palmada' | 'toque' | null>(null);
  const [viaVisible, setViaVisible] = useState<'palmada' | 'toque' | null>(null);
  const [pulsoActual, setPulsoActual] = useState(-1);

  const sampler = useRef<Sampler | null>(null);
  const detector = useRef<DetectorDePalmadas | null>(null);
  const golpes = useRef<number[]>([]);
  const esperados = useRef<number[]>([]);
  /*
   * NOTA SOBRE LA LATENCIA, que aquí desapareció y conviene que se sepa por qué.
   *
   * Antes había que compensar `outputLatency`: el niño responde a lo que OYE, lo oye tarde,
   * y sin compensar salía sistemáticamente tarde contra una rejilla absoluta. Con el patrón
   * anclado a su primer golpe, **eso deja de existir**: el origen y los golpes siguientes se
   * miden con el mismo reloj y el retardo de salida los desplaza a todos por igual, así que
   * se cancela solo. Lo mismo por micrófono, donde la latencia de entrada afecta igual al
   * primer golpe que a los demás.
   *
   * No es que se haya olvidado la compensación: es que anclar la hace innecesaria. Sigue
   * haciendo falta en el musicograma, donde las notas SÍ caen contra un reloj externo.
   */

  /**
   * Compases del patrón en pulsos, ya sin tempo. Es lo que se ancla al primer golpe.
   *
   * Se guarda aparte de `esperados` porque hasta que el niño no toca por primera vez **no
   * existe ningún instante esperado**: existe la forma del ritmo, y nada más.
   */
  const patronEnPulsos = useRef<number[]>([]);
  /** Instante del primer golpe de la respuesta. `null` hasta que el niño empieza. */
  const origen = useRef<number | null>(null);
  const cierre = useRef<number | null>(null);
  const temporizadores = useRef<number[]>([]);

  /** Estado de cada golpe esperado mientras el niño responde. */
  const [marcas, setMarcas] = useState<Array<'pendiente' | 'acertado' | 'pasado'>>([]);

  const rejilla = (() => {
    try {
      return rejillaDesdeSilabas(contenido.silabas);
    } catch {
      // Un JSON con una sílaba desconocida no debe dejar la pantalla en blanco.
      return null;
    }
  })();

  const limpiar = useCallback(() => {
    temporizadores.current.forEach((id) => window.clearTimeout(id));
    temporizadores.current = [];
  }, []);

  useEffect(
    () => () => {
      limpiar();
      detector.current?.parar();
    },
    [limpiar],
  );

  /** Intenta el micrófono. Si no puede, sigue con toque. Nunca lanza. */
  const intentarMicrofono = useCallback(async () => {
    // Si ya se dijo que no en esta sesión, no se vuelve a insistir (`CLAUDE.md` §8). Y sin
    // aviso: quien eligió tocar en la pantalla no ha tenido ningún problema que contarle.
    if (!seUsaMicrofono()) return;
    try {
      const d = new DetectorDePalmadas();
      await d.arrancar((onset) => {
        /*
          **Una palmada entra por la misma puerta que un toque.**

          Antes se empujaba aquí mismo en `golpes.current`, saltándose `tocar()`. Con el
          patrón anclado al primer golpe eso dejaba la actividad muerta por micrófono: la
          palmada no fijaba el origen, no marcaba ningún círculo y no sonaba. Dos caminos
          para lo mismo siempre acaban así, con uno de los dos quedándose atrás.

          Se le pasa el instante del onset y no el reloj de ahora: el detector sabe cuándo
          sonó la palmada mejor que el momento en que nos avisa.
        */
        tocarRef.current?.(onset.tiempo * 1000, 'palmada');
      });
      detector.current = d;
      setConMicrofono(true);
    } catch (e) {
      const err = e as Error & { tipo?: string };
      detector.current?.parar();
      detector.current = null;
      setConMicrofono(false);
      // Un «no» del navegador vale para toda la sesión: volver a pedirlo en cada ronda es
      // sacar la barra gris del navegador una y otra vez a quien ya ha dicho que no.
      rechazarMicrofono();
      // El aviso es para el adulto. Al niño solo le aparece el botón grande.
      setAvisoMicro(err.tipo === 'denegado' ? 'tocar.sinPermiso' : 'tocar.sinMicrofono');
    }
  }, []);

  const empezar = useCallback(async () => {
    await despertarAudio();

    if (!sampler.current) {
      const s = new Sampler(MARIMBA);
      try {
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras se sigue: el metrónomo del navegador basta para marcar el patrón.
      }
    }

    if (actividad.entrada.modo.startsWith('microfono') && !detector.current) {
      await intentarMicrofono();
    }

    const ctx = obtenerContexto();
    const msPorPulso = 60000 / bpm;
    const inicio = ctx.currentTime * 1000 + 700;

    // Fase de escucha: suena el patrón.
    setFase('escuchando');
    setPulsoActual(-1);
    // El sonido va por GOLPES: «ti-ti» son dos.
    const golpesEscucha = aMilisegundos(rejilla!, inicio, bpm);
    golpesEscucha.forEach((ms) => {
      sampler.current?.tocar('C5', ms / 1000, 0.9);
    });

    // Y el cursor va por SÍLABAS, que es lo que hay escrito en pantalla. Mezclarlos es lo
    // que hacía que a partir del primer «ti-ti» se iluminara la casilla equivocada.
    rejilla!.inicios.forEach((pulso, i) => {
      const ms = inicio + pulso * msPorPulso;
      temporizadores.current.push(
        window.setTimeout(() => setPulsoActual(i), ms - ctx.currentTime * 1000),
      );
    });

    /*
      Fase de respuesta: empieza tras UN COMPÁS ENTERO de entrada, como la da un director.

      Antes empezaba un solo pulso después del patrón, y la cuenta atrás dura más que eso:
      a 84 ppm son casi dos segundos frente a 0,7. Los primeros golpes esperados caían con
      la cuenta todavía en pantalla, y `tocar()` los descartaba porque la fase aún no era
      'respondiendo'. El niño no podía acertar el principio hiciera lo que hiciera.
    */
    const finPatron = inicio + rejilla!.pulsos * msPorPulso;
    const inicioRespuesta = finPatron + CUENTA_PULSOS * msPorPulso;

    /*
      **Los instantes esperados no se calculan aquí.** Se calculan cuando el niño da su
      primer golpe, porque es ese golpe el que fija el origen.

      Lo que sí se guarda ahora es la forma del ritmo en pulsos, relativa a su primer golpe.
      Anclar el patrón a un reloj ajeno obligaba a acertar el patrón Y la entrada a la vez,
      y fallar la entrada arruinaba todo lo demás aunque el ritmo fuera perfecto.
    */
    patronEnPulsos.current = rejilla!.golpes.map((g) => g - rejilla!.golpes[0]!);
    esperados.current = [];
    origen.current = null;
    golpes.current = [];
    via.current = null;
    setViaVisible(null);
    setSinRespuesta(false);
    setMarcas(patronEnPulsos.current.map(() => 'pendiente'));

    // Al acabar el ejemplo entra la cuenta.
    temporizadores.current.push(
      window.setTimeout(
        () => {
          setFase('cuenta');
          setPulsoActual(-1);
        },
        finPatron - ctx.currentTime * 1000,
      ),
    );

    /*
      Y la fase de respuesta la marca EL RELOJ, no el final de la cuenta atrás.

      Encadenarla al callback de un componente ataba un instante musical a una cadena de
      `setTimeout` de React. Medio pulso de margen por delante para que un golpe algo
      adelantado en la primera nota cuente: entrar un poco antes es lo normal, y descartarlo
      sería castigar precisamente al que ha anticipado bien.
    */
    temporizadores.current.push(
      window.setTimeout(
        () => setFase('respondiendo'),
        inicioRespuesta - msPorPulso * 0.5 - ctx.currentTime * 1000,
      ),
    );

    /*
      Cierre de seguridad: si el niño no llega a tocar nada, la actividad tiene que
      terminar igualmente. El cierre de verdad lo programa el primer golpe.

      Se da margen de sobra —el patrón entero más cuatro pulsos— porque aquí no hay prisa
      que valga: quedarse esperando es mejor que cortarle a un niño que estaba pensando.
    */
    temporizadores.current.push(
      window.setTimeout(
        () => terminar(),
        inicioRespuesta + (rejilla!.pulsos + 4) * msPorPulso - ctx.currentTime * 1000,
      ),
    );
  }, [actividad.entrada.modo, bpm, carril, intentarMicrofono, rejilla]);

  const terminar = useCallback(() => {
    if (cierre.current !== null) window.clearTimeout(cierre.current);
    cierre.current = null;
    /*
      Si no se ha tocado nada, no se evalúa nada.

      El cierre de seguridad saltaba igual, y una lista vacía de golpes da desviación cero,
      que el mensaje leía como «pulso muy regular». Decirle «muy bien» a un niño que no ha
      tocado no es solo un fallo de cálculo: es lo único capaz de hacer que deje de fiarse
      de lo que le dice la pantalla.
    */
    setSinRespuesta(golpes.current.length === 0);
    setEvaluacion(evaluarRitmo(esperados.current, golpes.current, carril));
    setFase('resultado');
  }, [carril]);

  const tocar = useCallback((instanteMs?: number, desde: 'palmada' | 'toque' = 'toque') => {
    if (fase !== 'respondiendo') return;

    // La primera respuesta elige la vía; después se ignora la otra.
    via.current ??= desde;
    if (via.current !== desde) return;
    setViaVisible(via.current);

    const ahora = instanteMs ?? obtenerContexto().currentTime * 1000;
    const msPorPulso = 60000 / bpm;

    /*
      **El primer golpe fija el origen.** A partir de él se despliega el patrón, y desde ese
      momento sí hay instantes que esperar.

      El primero cuenta siempre como acierto, y eso no es hacer trampa: es que ese golpe
      *define* el origen, así que no puede estar desplazado respecto a sí mismo. Lo que se
      evalúa es lo que viene después, que es el patrón.
    */
    if (origen.current === null) {
      origen.current = ahora;
      esperados.current = anclarEn(rejilla!, ahora, bpm);
      const ultimo = esperados.current[esperados.current.length - 1]!;
      cierre.current = window.setTimeout(
        terminar,
        ultimo + msPorPulso * 1.5 - obtenerContexto().currentTime * 1000,
      );
    }

    golpes.current.push(ahora);

    // Se marca en verde el golpe esperado más cercano, si cae dentro de la ventana «casi»
    // del carril. Es retorno inmediato: el niño ve que ha entrado sin esperar al final, y
    // eso es lo que le deja corregir dentro de la misma vuelta.
    const limite = TOLERANCIA_MS[carril].casi;
    let mejor = -1;
    let mejorError = Infinity;
    esperados.current.forEach((e, i) => {
      const err = Math.abs(ahora - e);
      if (err < mejorError && err <= limite) {
        mejorError = err;
        mejor = i;
      }
    });

    /*
      **Todo golpe suena; el acierto suena MÁS.**

      El clic va siempre, porque oír el propio golpe es lo que permite corregirse: quitarlo
      cuando fallas te deja tocando a ciegas justo cuando más falta hace oírte. Lo que
      distingue al acierto es que además suena la nota del modelo, así que la diferencia es
      *ganar algo*, nunca perderlo. La regla 4 prohíbe el sonido desagradable de fallo, y
      esta es la forma de dar retorno sin romperla.
    */
    /*
      **Con palmadas no sonamos nosotros.** El altavoz sonando mientras el micrófono
      escucha monta un lazo: nuestro clic entra por el micrófono, el detector lo toma por
      una palmada y eso dispara otro clic. Cada vuelta pasa de los 110 ms del periodo
      refractario, así que el refractario no puede pararlo — no son ecos de una palmada,
      son palmadas nuevas que nos inventamos.

      Y no hace falta: una palmada ya se oye. El clic estaba para el camino del dedo, que
      es silencioso. Con micrófono, el retorno lo dan los círculos.
    */
    if (desde === 'toque') clicYa(false);
    if (mejor >= 0) {
      if (desde === 'toque') sampler.current?.tocar('C5', undefined, 0.9);
      setMarcas((m) => {
        if (m[mejor] === 'acertado') return m;
        const n = [...m];
        n[mejor] = 'acertado';
        return n;
      });
    }
  }, [fase, carril, bpm, terminar, rejilla]);

  /*
    El detector de palmadas se arranca una vez y su callback se queda con el `tocar` que
    hubiera entonces. Esta referencia es lo que hace que siempre llame al actual: sin ella,
    la primera palmada usaría un `tocar` con la fase congelada en 'escuchando' y no haría
    nada, que es un fallo que solo se ve por micrófono.
  */
  const tocarRef = useRef<
    ((ms?: number, desde?: 'palmada' | 'toque') => void) | null
  >(null);
  tocarRef.current = tocar;

  // Los golpes que ya han pasado sin respuesta se apagan en GRIS, no en rojo: la regla 4
  // prohíbe el rojo, y apagarse dice «este se fue» sin decir «has fallado».
  useEffect(() => {
    if (fase !== 'respondiendo') return;
    const id = window.setInterval(() => {
      // Sin origen todavía no hay nada que envejecer: el niño aún no ha empezado.
      if (origen.current === null) return;
      const ahora = obtenerContexto().currentTime * 1000;
      const limite = TOLERANCIA_MS[carril].casi;
      setMarcas((m) =>
        m.map((v, i) =>
          v === 'pendiente' && ahora > (esperados.current[i] ?? Infinity) + limite
            ? 'pasado'
            : v,
        ),
      );
    }, 60);
    return () => window.clearInterval(id);
  }, [fase, carril]);

  // Barra espaciadora además del toque: se puede hacer entera con teclado.
  useEffect(() => {
    if (fase !== 'respondiendo') return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tocar();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [fase, tocar]);

  if (!rejilla) {
    return (
      <section className="actividad" data-carril={carril}>
        <p role="alert">{t('actividad.contenidoInvalido')}</p>
      </section>
    );
  }

  return (
    <section className="actividad tocar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El patrón se VE, no solo se oye. Criterio 1.1.1: toda actividad de ritmo debe
          poder hacerse mirando, para que un alumno sordo pueda participar. */}
      <ol className="tocar__patron" aria-label={t('tocar.patron')}>
        {contenido.silabas.map((s, i) => (
          <li key={`${s}-${i}`} data-activo={i === pulsoActual} data-silaba={s}>
            {s}
          </li>
        ))}
      </ol>

      {/* Un punto por golpe esperado. Verde al entrar, gris al pasar de largo. Nunca
          rojo: «apagado» dice que ese se fue, «rojo» diría que has fallado. */}
      {(fase === 'respondiendo' || fase === 'resultado') && marcas.length > 0 && (
        <ol className="tocar__marcas" aria-label={t('tocar.marcas')}>
          {marcas.map((m, i) => (
            <li key={i} data-marca={m} />
          ))}
        </ol>
      )}


      {/*
        La cuenta atrás va justo antes de RESPONDER, no antes de escuchar.
        Estaba mal: avisaba de cuándo empezaba a sonar el ejemplo, que es cuando el niño
        solo tiene que escuchar. Lo que hace falta saber es cuándo empieza a contar lo que
        uno hace, y eso es después del ejemplo.
      */}
      {fase === 'cuenta' && (
        /* La cuenta ya no cambia la fase: eso lo hace el reloj. Aquí solo cuenta, en
           tempo, con su clic por número. Un compás menos el «¡ya!», que cae encima del
           primer golpe. */
        <CuentaAtras desde={CUENTA_PULSOS - 1} bpm={bpm} alTerminar={() => {}} />
      )}

      {/*
        En qué vuelta va. Seis actividades de este tipo hacen tres o cuatro y ninguna lo
        decía: ni al entrar, ni durante, ni en el botón, así que el niño no sabía si le
        quedaba una o cinco. Con una sola vuelta no sale: un «1 de 1» es ruido.
      */}
      {repeticiones > 1 && (
        <p className="estado-actividad">
          {t('tocar.vuelta', { n: ronda + 1, total: repeticiones })}
        </p>
      )}

      {fase === 'escuchando' && <p className="estado-actividad">{t('tocar.escucha')}</p>}

      {fase === 'respondiendo' && (
        <>
          {/* La instrucción de qué hacer va en la explicación, no aquí. */}
          {/* El botón grande existe SIEMPRE, también con micrófono: un niño que prefiere
              tocar no tiene por qué explicarle a nadie por qué. */}
          {/* El botón desaparece si la ronda ya se está haciendo con palmadas: dejarlo
              ahí invitaría a un doble conteo, y quitarlo dice sin palabras «esta vuelta va
              de palmas». Vuelve a estar en la siguiente. */}
          {viaVisible !== 'palmada' && (
            <button
              type="button"
              className="boton-actividad tocar__diana"
              onPointerDown={() => tocar(undefined, 'toque')}
            >
              {t('tocar.diana')}
            </button>
          )}
          {/* Se queda porque CAMBIA durante la actividad: dice en qué punto estás, no qué
              hay que hacer. Lo segundo lo explica el personaje. */}
          {viaVisible === 'palmada' && (
            <p className="estado-actividad">{t('tocar.vaDePalmas')}</p>
          )}
        </>
      )}

      {avisoMicro && (
        <p className="tocar__aviso" role="status">
          {t(avisoMicro)}
        </p>
      )}

      {/* Ni felicitación ni reproche cuando no ha tocado nada: solo lo que ha pasado, y lo
          dice el personaje como todo lo demás. */}
      {fase === 'resultado' && sinRespuesta && (
        <Reaccion tono="casi" personaje={actividad.personaje}>
          {t('tocar.noHasTocado')}
        </Reaccion>
      )}

      {fase === 'resultado' && !sinRespuesta && evaluacion && (
        <Resultado
          evaluacion={evaluacion}
          personaje={actividad.personaje}
          pista={pistaPara(actividad.pistas, ronda + 1) ?? undefined}
        />
      )}

      <BarraAcciones>
        {fase === 'listo' && (
          <button
            type="button"
            className="boton-principal boton-arranque"
            onClick={() => void empezar()}
          >
            <IconoTocar />
            {t('accion.empezar')}
          </button>
        )}

        {/* Aquí «otra vez» sí es otra vez: no ha tocado nada, así que la vuelta no cuenta
            y se repite la misma. Por eso no lleva contador. */}
        {fase === 'resultado' && sinRespuesta && (
          <button type="button" className="boton-principal" onClick={() => void empezar()}>
            <IconoRepetir />
            {t('tocar.otraVez')}
          </button>
        )}

        {/*
          El botón que cierra la ronda vive aquí y no dentro de `Resultado`.

          `Resultado` calcula y dice cómo ha ido; la acción de seguir es una acción sobre la
          actividad y va donde van todas. Separarlos es lo que permite que el resultado sea
          una tarjeta que se va sola y el botón se quede.
        */}
        {fase === 'resultado' && !sinRespuesta && evaluacion && (
          <button
            type="button"
            className="boton-principal"
            onClick={() => {
              if (ronda + 1 >= repeticiones) {
                detector.current?.parar();
                alTerminar({
                  actividadId: actividad.id,
                  completada: true,
                  aciertos: evaluacion.aciertos,
                  intentos: esperados.current.length,
                  desvioMedioMs: evaluacion.desvioMedioMs,
                  desviacionTipicaMs: evaluacion.desviacionTipicaMs,
                });
                return;
              }
              /*
                Arranca la vuelta siguiente aquí mismo.

                Antes hacía `setFase('listo')`, o sea devolvía la actividad a la pantalla de
                inicio, y había que pulsar «Empezar» otra vez: dos toques para «venga, la
                siguiente». Y como «Empezar» volvía a salir, parecía que se reiniciaba todo
                cuando en realidad ibas por la vuelta dos de tres.
              */
              setRonda((n) => n + 1);
              setEvaluacion(null);
              void empezar();
            }}
          >
            {ronda + 1 >= repeticiones ? <IconoSiguiente /> : <IconoRepetir />}
            {/* En la última vuelta no dice «otra vez», porque no hay otra. */}
            {ronda + 1 >= repeticiones
              ? t('comun.terminar')
              : t('tocar.otraVezDe', { n: ronda + 2, total: repeticiones })}
          </button>
        )}
      </BarraAcciones>
    </section>
  );
}

/**
 * El resultado. **Nunca un porcentaje.**
 *
 * Un niño que da todas las palmadas 120 ms tarde con una desviación de 20 ms tiene un
 * pulso excelente, solo desfasado; un porcentaje le diría que ha fallado. Por eso se
 * separan las dos cosas y el mensaje sale de ellas, no del número de aciertos.
 */
function Resultado({
  evaluacion,
  personaje,
  pista,
}: {
  evaluacion: EvaluacionRitmica;
  personaje?: PersonajeNombre;
  /** La pista de ESTA actividad, que es la que enseña algo. Ver `Reaccion`. */
  pista?: string;
}) {
  const { desvioMedioMs, desviacionTipicaMs, regularPeroDesfasado } = evaluacion;

  const mensaje = regularPeroDesfasado
    ? desvioMedioMs > 0
      ? 'tocar.regularTarde'
      : 'tocar.regularPronto'
    : desviacionTipicaMs < 90
      ? 'tocar.bien'
      : 'tocar.masRegular';

  return (
    <>
      {/* Como en todas: el personaje lo dice, entra deslizando y se va solo. Antes era un
          párrafo fijo, y una frase que se queda hasta que pase otra cosa deja de leerse. */}
      <Reaccion tono={mensaje === 'tocar.bien' ? 'bien' : 'casi'} personaje={personaje}>
        {t(mensaje)}
        {/* Y la pista de la actividad detrás, cuando no ha salido: «marca el pulso con el
            pie mientras palmeas» enseña algo que «prueba a ir más regular» no enseña. */}
        {mensaje !== 'tocar.bien' && pista ? ` ${t(pista)}` : ''}
      </Reaccion>
      {/*
        Los milisegundos ya no se enseñan aquí.

        `CLAUDE.md` §7 pide reportar **siempre** desvío medio con signo y desviación típica,
        y sigue en pie: es lo que distingue a un niño con pulso excelente que entra tarde de
        uno que va a saltos, y un porcentaje le diría a los dos que han fallado. Pero eso es
        información **para el maestro**, y su sitio es la hoja de seguimiento de la ficha, no
        la pantalla de un niño de siete años en mitad del ejercicio.

        Lo que sí llega al niño es la lectura de esos números en palabras: «tu pulso es muy
        regular, solo vas un poquito por detrás». Eso lo decide `mensaje`, aquí arriba.
      */}
    </>
  );
}
