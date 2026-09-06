import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, latenciaMs, obtenerContexto } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { TOLERANCIA_MS } from '@/config';
import { evaluarRitmo, type EvaluacionRitmica } from '../evaluacion';
import { alturaEnPauta, yDeLinea } from '../alturaEnPauta';
import { duracionDe, instantesDe } from '../melodiaEnTiempo';
import { CuentaAtras } from '@/ui/CuentaAtras';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «karaoke»: las notas avanzan **de derecha a izquierda sobre un pentagrama** y hay que
 * tocarlas justo cuando cruzan la línea del presente.
 *
 * **Por qué es un tipo aparte de `seguir`.** En `seguir` el niño no responde: mira. Esa regla
 * es la que permite que aquel componente no tenga evaluación ni solución, y meterle una
 * mecánica interactiva la habría roto. Comparten la idea —la música avanza en el tiempo— y
 * no comparten el contrato.
 *
 * **Por qué sobre un pentagrama y no sobre carriles de colores.** Un juego de notas que caen
 * enseña ritmo; sobre una pauta real enseña además que ese ritmo se escribe y que lo que sube
 * en el dibujo sube al oído. Y sale gratis: la nota tiene que estar a alguna altura, y
 * ponerla en la suya no cuesta más que ponerla en una fila arbitraria.
 *
 * **Sin marcador y sin rojo mientras se juega** (regla 4). Al acertar, la nota se ilumina; si
 * pasa de largo, se apaga en gris. El resumen final **no es solo un porcentaje**: lleva el
 * desvío medio con signo, porque un niño que va sistemáticamente tarde con buen pulso no ha
 * fallado, va desfasado (`CLAUDE.md` §7).
 */

type Fase = 'listo' | 'cuenta' | 'sonando' | 'resultado';

interface NotaKaraoke {
  /** Notación científica, p. ej. «E4». */
  nota: string;
  /** Duración en pulsos. */
  pulsos: number;
}

/** Segundos de melodía visibles a la derecha de la línea. Menos no da tiempo a prepararse. */
const ANTICIPACION_S = 3.2;
/**
 * Margen antes de la primera nota.
 *
 * Sin esto la melodía arranca en el instante cero y **la primera nota nace justo encima de
 * la línea**: no se puede anticipar, solo reaccionar, y se falla siempre. Con dos segundos
 * la primera nota entra por la derecha y se ve venir como todas las demás. La cuenta atrás
 * no basta, porque termina y la nota ya está ahí.
 */
const ENTRADA_S = 2;
/** Dónde está la línea del presente, en porcentaje del ancho. */
const LINEA_PCT = 22;
/** Separación entre líneas del pentagrama, en píxeles. */
const SEP = 14;
/** Altura libre por encima de la quinta línea, para las notas agudas. */
const MARGEN_ARRIBA = 46;

export default function Karaoke({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    notas: NotaKaraoke[];
    tempo?: number;
    clave?: 'sol' | 'fa';
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 100;
  const clave = contenido.clave ?? 'sol';
  const notas = contenido.notas;

  const [fase, setFase] = useState<Fase>('listo');
  const [ahora, setAhora] = useState(0);
  const [acertadas, setAcertadas] = useState<Set<number>>(new Set());
  const [pasadas, setPasadas] = useState<Set<number>>(new Set());
  const [evaluacion, setEvaluacion] = useState<EvaluacionRitmica | null>(null);
  /**
   * Nombres de nota que suben flotando al acertar. Se guardan con un id propio y no con el
   * índice de la nota porque hay que poder repetir la misma nota: si dos «mi» seguidos
   * compartieran clave, React reutilizaría el nodo y la animación no volvería a arrancar.
   */
  const [avisos, setAvisos] = useState<Array<{ id: number; nombre: string; x: number; y: number }>>([]);
  const siguienteAviso = useRef(0);

  const sampler = useRef<Sampler | null>(null);
  const rafId = useRef<number | null>(null);
  const instantes = useRef<number[]>([]);
  const golpes = useRef<number[]>([]);

  /** Instante de cada nota, en segundos desde el arranque. Incluye el margen de entrada. */
  const tiempos = useMemo(() => instantesDe(notas, bpm, ENTRADA_S), [notas, bpm]);

  // Un par de segundos de cola tras la última nota: si la evaluación llegara justo al
  // ataque, un golpe algo tardío en la última nota se perdería.
  const duracionTotal = duracionDe(notas, bpm, ENTRADA_S) + 2;

  /** Altura de cada nota en la pauta, con sus líneas adicionales si se sale. */
  const alturas = useMemo(
    () =>
      notas.map((n) => alturaEnPauta(n.nota, clave, SEP, MARGEN_ARRIBA)),
    [notas, clave],
  );

  const parar = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  }, []);

  useEffect(() => parar, [parar]);

  const arrancar = useCallback(async () => {
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras la melodía se ve avanzar igual: se pierde el sonido, no la actividad.
      }
    }

    const ctx = obtenerContexto();
    const t0 = ctx.currentTime + 0.4;
    // Lo esperado lleva la latencia SUMADA: el niño responde a lo que oye, y lo oye tarde.
    instantes.current = tiempos.map((s) => (t0 + s) * 1000 + latenciaMs());
    golpes.current = [];
    setAcertadas(new Set());
    setPasadas(new Set());
    setEvaluacion(null);

    const segundosPorPulso = 60 / bpm;
    tiempos.forEach((s, i) => {
      sampler.current?.tocar(notas[i]!.nota, t0 + s, notas[i]!.pulsos * segundosPorPulso * 0.9);
    });

    setFase('sonando');

    const bucle = () => {
      const ctxAhora = obtenerContexto().currentTime;
      setAhora(ctxAhora - t0);

      // Una nota se apaga cuando su ventana se cierra del todo, no cuando cruza la línea.
      const limite = TOLERANCIA_MS[carril].casi;
      const ms = ctxAhora * 1000;
      setPasadas((previas) => {
        let cambia = false;
        const nuevas = new Set(previas);
        instantes.current.forEach((esperado, i) => {
          if (!nuevas.has(i) && ms > esperado + limite) {
            nuevas.add(i);
            cambia = true;
          }
        });
        return cambia ? nuevas : previas;
      });

      if (ctxAhora - t0 > duracionTotal) {
        parar();
        setEvaluacion(evaluarRitmo(instantes.current, golpes.current, carril));
        setFase('resultado');
        return;
      }
      rafId.current = requestAnimationFrame(bucle);
    };
    rafId.current = requestAnimationFrame(bucle);
  }, [bpm, carril, notas, duracionTotal, parar, tiempos]);

  const tocar = useCallback(() => {
    if (fase !== 'sonando') return;
    const ms = obtenerContexto().currentTime * 1000;
    golpes.current.push(ms);

    const limite = TOLERANCIA_MS[carril].casi;
    let mejor = -1;
    let mejorError = Infinity;
    instantes.current.forEach((esperado, i) => {
      const error = Math.abs(ms - esperado);
      if (error < mejorError && error <= limite) {
        mejorError = error;
        mejor = i;
      }
    });
    if (mejor < 0) return;
    setAcertadas((a) => new Set(a).add(mejor));

    // El nombre de la nota, subiendo y desvaneciéndose. Es lo que convierte «he acertado»
    // en «he acertado un SOL»: la recompensa y el contenido son la misma cosa.
    const id = siguienteAviso.current++;
    setAvisos((previos) => [
      ...previos,
      { id, nombre: nombreDe(notas[mejor]!.nota), x: LINEA_PCT, y: alturas[mejor]!.y },
    ]);
    window.setTimeout(() => setAvisos((p) => p.filter((a) => a.id !== id)), 1000);
  }, [fase, carril, notas, alturas]);

  // La barra espaciadora vale como toque: en el ordenador del aula es lo natural, y de paso
  // deja la actividad accesible sin ratón.
  useEffect(() => {
    if (fase !== 'sonando') return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tocar();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [fase, tocar]);

  const total = notas.length;
  const porcentaje = total ? Math.round((acertadas.size / total) * 100) : 0;

  return (
    <section className="actividad karaoke" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <div className="karaoke__pauta" role="img" aria-label={t('karaoke.pauta')}>
        {[1, 2, 3, 4, 5].map((linea) => (
          <span
            key={linea}
            className="karaoke__linea"
            style={{ top: yDeLinea(linea, SEP, MARGEN_ARRIBA) }}
            aria-hidden="true"
          />
        ))}

        {/* La línea del presente: donde la nota se encuentra con su sonido. */}
        <span className="karaoke__ahora" style={{ left: `${LINEA_PCT}%` }} aria-hidden="true" />

        {notas.map((n, i) => {
          const falta = tiempos[i]! - ahora;
          // Fuera de la ventana visible no se dibuja: no hay que animar treinta notas a la vez.
          if (falta > ANTICIPACION_S || falta < -1.2) return null;
          const x = LINEA_PCT + (falta / ANTICIPACION_S) * (100 - LINEA_PCT);
          const alto = alturas[i]!;
          const apagada = pasadas.has(i) && !acertadas.has(i);
          return (
            <span key={`${n.nota}-${i}`} aria-hidden="true">
              {alto.adicionales.map((y) => (
                <span key={y} className="karaoke__adicional" style={{ left: `${x}%`, top: y }} />
              ))}
              <span
                className="karaoke__nota"
                data-acertada={acertadas.has(i) || undefined}
                data-apagada={apagada || undefined}
                style={{
                  left: `${x}%`,
                  top: alto.y - SEP / 2,
                  width: Math.max(SEP, n.pulsos * 20),
                  // Color Boomwhacker por grado. Nunca informa solo: la nota está además a
                  // su altura en la pauta, y al acertarla aparece escrita.
                  background: apagada ? undefined : colorDe(n.nota),
                }}
              />
            </span>
          );
        })}
        {avisos.map((a) => (
          <span
            key={a.id}
            className="karaoke__aviso"
            style={{ left: `${a.x}%`, top: a.y }}
            aria-hidden="true"
          >
            {a.nombre}
          </span>
        ))}
      </div>

      {/* El nombre también en texto vivo, para quien no puede ver la animación. */}
      <p className="visualmente-oculto" aria-live="polite">
        {avisos.length ? avisos[avisos.length - 1]!.nombre : ''}
      </p>

      {fase === 'listo' && (
        <button type="button" className="boton-repetir" onClick={() => setFase('cuenta')}>
          {t('karaoke.empezar')}
        </button>
      )}

      {/* La cuenta atrás va justo antes de que empiece a contar lo que haces. */}
      {fase === 'cuenta' && <CuentaAtras desde={3} alTerminar={() => void arrancar()} />}

      {fase === 'sonando' && (
        <>
          <p className="pista-fija">{t('karaoke.toca')}</p>
          <button type="button" className="boton-actividad karaoke__diana" onPointerDown={tocar}>
            {t('karaoke.diana')}
          </button>
        </>
      )}

      {fase === 'resultado' && evaluacion && (
        <section className="karaoke__resultado" aria-live="polite">
          {/*
            El resumen lleva el porcentaje que pidió el autor, pero nunca solo: va con el
            desvío medio con signo, porque es la diferencia entre decirle a un niño «has
            sacado un 60 %» y decirle «vas 90 ms por detrás, prueba a entrar antes».
          */}
          <p className="karaoke__mensaje">
            {evaluacion.regularPeroDesfasado
              ? t(evaluacion.desvioMedioMs > 0 ? 'tocar.regularTarde' : 'tocar.regularPronto')
              : t(porcentaje >= 60 ? 'karaoke.bien' : 'karaoke.otraVez')}
          </p>
          <p className="karaoke__cifras">
            {t('karaoke.cogidas')} <strong>{acertadas.size}</strong> {t('comprobar.de')}{' '}
            <strong>{total}</strong> · <strong>{porcentaje} %</strong>
          </p>
          <p className="karaoke__cifras">
            {t('tocar.desvio')}{' '}
            <strong>
              {evaluacion.desvioMedioMs >= 0 ? '+' : ''}
              {evaluacion.desvioMedioMs.toFixed(0)} ms
            </strong>{' '}
            · {t('tocar.regularidad')} <strong>{evaluacion.desviacionTipicaMs.toFixed(0)} ms</strong>
          </p>

          <div className="karaoke__acciones">
            <button type="button" className="boton-repetir" onClick={() => setFase('listo')}>
              {t('tocar.otraVez')}
            </button>
            <button
              type="button"
              className="boton-repetir"
              onClick={() =>
                alTerminar({
                  actividadId: actividad.id,
                  completada: true,
                  aciertos: acertadas.size,
                  intentos: total,
                  desvioMedioMs: evaluacion.desvioMedioMs,
                  desviacionTipicaMs: evaluacion.desviacionTipicaMs,
                })
              }
            >
              {t('comun.siguiente')}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
