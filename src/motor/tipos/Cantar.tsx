import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio } from '@/audio/AudioEngine';
import { MARIMBA, Sampler, aMidi } from '@/audio/sampler';
import { DetectorDeTono } from '@/escucha/tono';
import { evaluarAfinacion, mensajeAfinacion, type EvaluacionAfinacion } from '../afinacion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';

/**
 * Tipo «cantar»: suena una nota, el niño la canta y ve si está afinando.
 *
 * Es la actividad que más se apoya en todo lo demás: el detector de tono de T2.0, la
 * evaluación de `../afinacion.ts` y el sampler de T1.7.
 *
 * **Regla 8, y aquí pesa más que en ninguna otra parte.** Sin micrófono esta actividad no
 * se puede hacer *como está pensada*, pero eso no significa que se quede cerrada: cae a un
 * modo de escucha —suena la nota, el niño canta sin que nadie le mida, y sigue— porque
 * cantar sin que te evalúen sigue siendo cantar. Una pantalla de error delante de un niño
 * con mutismo selectivo o sin permiso de micrófono sería exactamente lo contrario de lo
 * que este proyecto promete.
 *
 * **Ojo con iOS**: `getUserMedia` redirige la salida de audio y baja el volumen. Por eso
 * la nota se toca ANTES de abrir el micrófono, nunca a la vez.
 */

type Fase = 'listo' | 'sonando' | 'escuchando' | 'resultado';

export default function Cantar({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Notas que se piden, en notación científica. */
    notas: string[];
    /** Segundos que se escucha al niño en cada intento. */
    segundos?: number;
  };

  const carril = useCarril(actividad.etapa);
  const segundos = contenido.segundos ?? 4;

  const [fase, setFase] = useState<Fase>('listo');
  const [indice, setIndice] = useState(0);
  const [conMicrofono, setConMicrofono] = useState<boolean | null>(null);
  const [avisoMicro, setAvisoMicro] = useState<string | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionAfinacion | null>(null);

  const detector = useRef<DetectorDeTono | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const lecturas = useRef<Array<number | null>>([]);
  const yaTerminada = useRef(false);

  const objetivo = contenido.notas[indice] ?? contenido.notas[0]!;
  const midiObjetivo = (() => {
    try {
      return aMidi(objetivo);
    } catch {
      return 60;
    }
  })();

  useEffect(
    () => () => {
      detector.current?.parar();
    },
    [],
  );

  useEffect(() => {
    if (fase !== 'resultado' || !evaluacion) return;
    if (indice + 1 < contenido.notas.length || yaTerminada.current) return;
    yaTerminada.current = true;
  }, [fase, evaluacion, indice, contenido.notas.length]);

  const sonarNota = useCallback(async () => {
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras se sigue: el niño no oye la referencia, pero puede intentarlo.
      }
    }
    sampler.current?.tocar(objetivo, undefined, 1.6);
  }, [objetivo]);

  const empezar = useCallback(async () => {
    setEvaluacion(null);
    setCents(null);
    lecturas.current = [];

    // La nota suena PRIMERO y el micrófono se abre DESPUÉS. En iOS, abrir el micrófono
    // redirige la salida de audio y baja el volumen: si se hicieran a la vez, el niño no
    // oiría la referencia que tiene que imitar.
    setFase('sonando');
    await sonarNota();
    await new Promise((r) => setTimeout(r, 1700));

    let escuchando = false;
    if (!detector.current) {
      try {
        const d = new DetectorDeTono();
        await d.arrancar((lectura) => {
          if (!lectura) {
            lecturas.current.push(null);
            setCents(null);
            return;
          }
          const desviacion = (lectura.midi - midiObjetivo) * 100;
          lecturas.current.push(desviacion);
          setCents(desviacion);
        });
        detector.current = d;
        escuchando = true;
        setConMicrofono(true);
      } catch (e) {
        const err = e as Error & { tipo?: string };
        detector.current = null;
        setConMicrofono(false);
        setAvisoMicro(err.tipo === 'denegado' ? 'cantar.sinPermiso' : 'cantar.sinMicrofono');
      }
    } else {
      escuchando = true;
    }

    setFase('escuchando');

    window.setTimeout(() => {
      if (escuchando) setEvaluacion(evaluarAfinacion(lecturas.current));
      setFase('resultado');
      setCents(null);
    }, segundos * 1000);
  }, [midiObjetivo, segundos, sonarNota]);

  const siguiente = useCallback(() => {
    if (indice + 1 >= contenido.notas.length) {
      detector.current?.parar();
      detector.current = null;
      alTerminar({
        actividadId: actividad.id,
        completada: true,
        intentos: contenido.notas.length,
        afinacionMediaCents: evaluacion?.centsMedios,
      });
      return;
    }
    setIndice((n) => n + 1);
    setEvaluacion(null);
    setFase('listo');
  }, [indice, contenido.notas.length, actividad.id, alTerminar, evaluacion]);

  // Aguja de afinación: la posición horizontal es la desviación, acotada a ±100 cents.
  const posicion = cents === null ? 0 : Math.max(-100, Math.min(100, cents));

  return (
    <section className="actividad cantar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <p className="cantar__nota">{objetivo}</p>

      {/* Retorno visual de afinación. Existe para que la actividad se pueda hacer
          MIRANDO además de oyendo, y para que un niño vea hacia dónde moverse en vez de
          que se lo digan al final. */}
      <div className="cantar__aguja" aria-hidden="true">
        <span className="cantar__centro" />
        <span
          className="cantar__marca"
          data-activa={cents !== null || undefined}
          style={{ transform: `translateX(${posicion * 1.4}px)` }}
        />
      </div>
      <p className="cantar__lectura" aria-live="polite">
        {fase === 'escuchando' && cents === null && t('cantar.noTeOigo')}
        {fase === 'escuchando' && cents !== null && (
          <>
            {cents > 0 ? '+' : ''}
            {cents.toFixed(0)} cents
          </>
        )}
      </p>

      {fase === 'listo' && (
        <button type="button" className="boton-actividad cantar__empezar" onClick={() => void empezar()}>
          <Icono nombre="voz" tamano={40} /> {t('cantar.empezar')}
        </button>
      )}
      {fase === 'sonando' && <p aria-live="polite">{t('cantar.escuchaLaNota')}</p>}
      {fase === 'escuchando' && <p aria-live="polite">{t('cantar.ahoraTu')}</p>}

      {fase === 'resultado' && (
        <section className="cantar__resultado" aria-live="polite">
          {evaluacion ? (
            <>
              <p className="cantar__mensaje">{t(mensajeAfinacion(evaluacion))}</p>
              {/* Las cifras son para el maestro. El niño ya tiene su frase. */}
              <p className="cantar__cifras">
                {evaluacion.centsMedios > 0 ? '+' : ''}
                {evaluacion.centsMedios.toFixed(0)} cents · {t('cantar.estabilidad')}{' '}
                {evaluacion.desviacionCents.toFixed(0)}
              </p>
            </>
          ) : (
            <p className="cantar__mensaje">{t('cantar.sinMedir')}</p>
          )}

          <div className="cantar__acciones">
            <button type="button" className="boton-repetir" onClick={() => void empezar()}>
              {t('cantar.otraVez')}
            </button>
            <button type="button" className="boton-repetir" onClick={siguiente}>
              {indice + 1 >= contenido.notas.length ? t('comun.siguiente') : t('cantar.siguienteNota')}
            </button>
          </div>
        </section>
      )}

      {avisoMicro && conMicrofono === false && (
        <p className="cantar__aviso" role="status">
          {t(avisoMicro)}
        </p>
      )}

      <progress value={indice} max={contenido.notas.length} aria-label={t('comun.progreso')} />
    </section>
  );
}
