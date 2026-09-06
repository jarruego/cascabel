import { useCallback, useEffect, useRef, useState } from 'react';
import { despertarAudio, latenciaMs, obtenerContexto } from '@/audio/AudioEngine';
import { TOLERANCIA_MS } from '@/config';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { DetectorDePalmadas } from '@/escucha/palmadas';
import { useCarril } from '@/app/preferencias';
import { evaluarRitmo, type EvaluacionRitmica } from '../evaluacion';
import { aMilisegundos, rejillaDesdeSilabas } from '../rejillaRitmica';
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
  const [conMicrofono, setConMicrofono] = useState(false);
  const [avisoMicro, setAvisoMicro] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRitmica | null>(null);
  const [pulsoActual, setPulsoActual] = useState(-1);

  const sampler = useRef<Sampler | null>(null);
  const detector = useRef<DetectorDePalmadas | null>(null);
  const golpes = useRef<number[]>([]);
  const esperados = useRef<number[]>([]);
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
    try {
      const d = new DetectorDePalmadas();
      await d.arrancar((onset) => {
        golpes.current.push(onset.tiempo * 1000);
      });
      detector.current = d;
      setConMicrofono(true);
    } catch (e) {
      const err = e as Error & { tipo?: string };
      detector.current?.parar();
      detector.current = null;
      setConMicrofono(false);
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
    const golpesEscucha = aMilisegundos(rejilla!, inicio, bpm);
    golpesEscucha.forEach((ms, i) => {
      sampler.current?.tocar('C5', ms / 1000, 0.9);
      temporizadores.current.push(
        window.setTimeout(() => setPulsoActual(i), ms - ctx.currentTime * 1000),
      );
    });

    // Fase de respuesta: empieza un compás después del final del patrón.
    const inicioRespuesta = inicio + (rejilla!.pulsos + 1) * msPorPulso;
    // La latencia se SUMA a lo esperado: el niño responde a lo que OYE, y lo oye tarde.
    esperados.current = aMilisegundos(rejilla!, inicioRespuesta, bpm, latenciaMs());
    golpes.current = [];
    setMarcas(esperados.current.map(() => 'pendiente'));

    // Al acabar el ejemplo entra la cuenta atrás; ella pasa a 'respondiendo'.
    temporizadores.current.push(
      window.setTimeout(
        () => {
          setFase('cuenta');
          setPulsoActual(-1);
        },
        inicio + rejilla!.pulsos * msPorPulso - ctx.currentTime * 1000,
      ),
    );

    // Cierre: un pulso de margen después del último golpe esperado.
    const fin = esperados.current[esperados.current.length - 1]! + msPorPulso * 1.5;
    temporizadores.current.push(
      window.setTimeout(
        () => {
          const r = evaluarRitmo(esperados.current, golpes.current, carril);
          setEvaluacion(r);
          setFase('resultado');
        },
        fin - ctx.currentTime * 1000,
      ),
    );
  }, [actividad.entrada.modo, bpm, carril, intentarMicrofono, rejilla]);

  const tocar = useCallback(() => {
    if (fase !== 'respondiendo') return;
    const ahora = obtenerContexto().currentTime * 1000;
    golpes.current.push(ahora);

    // Se marca en verde el golpe esperado más cercano, si cae dentro de la ventana
    // «casi» del carril. Es retorno inmediato: el niño ve que ha entrado sin esperar al
    // final, y eso es lo que le deja corregir en la siguiente vuelta.
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
    if (mejor >= 0) {
      setMarcas((m) => {
        if (m[mejor] === 'acertado') return m;
        const n = [...m];
        n[mejor] = 'acertado';
        return n;
      });
    }
  }, [fase, carril]);

  // Los golpes que ya han pasado sin respuesta se apagan en GRIS, no en rojo: la regla 4
  // prohíbe el rojo, y apagarse dice «este se fue» sin decir «has fallado».
  useEffect(() => {
    if (fase !== 'respondiendo') return;
    const id = window.setInterval(() => {
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
      <h1 id="consigna">{t(contenido.consigna)}</h1>

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

      {fase === 'listo' && (
        <button type="button" className="boton-repetir" onClick={() => void empezar()}>
          {t('tocar.empezar')}
        </button>
      )}

      {/*
        La cuenta atrás va justo antes de RESPONDER, no antes de escuchar.
        Estaba mal: avisaba de cuándo empezaba a sonar el ejemplo, que es cuando el niño
        solo tiene que escuchar. Lo que hace falta saber es cuándo empieza a contar lo que
        uno hace, y eso es después del ejemplo.
      */}
      {fase === 'cuenta' && (
        <CuentaAtras desde={2} bpm={bpm} alTerminar={() => setFase('respondiendo')} />
      )}

      {fase === 'escuchando' && <p aria-live="polite">{t('tocar.escucha')}</p>}

      {fase === 'respondiendo' && (
        <>
          <p aria-live="polite">{conMicrofono ? t('tocar.palmea') : t('tocar.toca')}</p>
          {/* El botón grande existe SIEMPRE, también con micrófono: un niño que prefiere
              tocar no tiene por qué explicarle a nadie por qué. */}
          <button type="button" className="boton-actividad tocar__diana" onPointerDown={tocar}>
            {t('tocar.diana')}
          </button>
        </>
      )}

      {avisoMicro && (
        <p className="tocar__aviso" role="status">
          {t(avisoMicro)}
        </p>
      )}

      {fase === 'resultado' && evaluacion && (
        <Resultado
          evaluacion={evaluacion}
          ronda={ronda}
          repeticiones={repeticiones}
          alSeguir={() => {
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
            } else {
              setRonda((n) => n + 1);
              setEvaluacion(null);
              setFase('listo');
            }
          }}
        />
      )}
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
  ronda,
  repeticiones,
  alSeguir,
}: {
  evaluacion: EvaluacionRitmica;
  ronda: number;
  repeticiones: number;
  alSeguir: () => void;
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
    <section className="tocar__resultado" aria-live="polite">
      <p className="tocar__mensaje">{t(mensaje)}</p>
      <p className="tocar__cifras">
        {t('tocar.desvio')} <strong>{desvioMedioMs >= 0 ? '+' : ''}{desvioMedioMs.toFixed(0)} ms</strong>
        {' · '}
        {t('tocar.regularidad')} <strong>{desviacionTipicaMs.toFixed(0)} ms</strong>
      </p>
      <button type="button" className="boton-repetir" onClick={alSeguir}>
        {ronda + 1 >= repeticiones ? t('comun.siguiente') : t('tocar.otraVez')}
      </button>
    </section>
  );
}
