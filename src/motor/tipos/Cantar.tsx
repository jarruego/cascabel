import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio } from '@/audio/AudioEngine';
import { Sampler, aMidi } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { DetectorDeTono } from '@/escucha/tono';
import {
  desviacionEnCents,
  ventanasDe,
  evaluarAfinacion,
  mensajeAfinacion,
  type EvaluacionAfinacion,
} from '../afinacion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { nombreDe } from '@/ui/coloresNota';
import { CuentaAtras } from '@/ui/CuentaAtras';

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

type Fase = 'listo' | 'cuenta' | 'sonando' | 'escuchando' | 'resultado';

export default function Cantar({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Notas que se piden, en notación científica. */
    notas: string[];
    /**
     * Segundos que se escucha al niño en cada intento.
     *
     * Ocho y no cuatro. Un niño no ataca la nota: la BUSCA, y buscarla lleva sus segundos.
     * Con una ventana corta se acaba el tiempo mientras todavía está subiendo, y el
     * resultado dice que ha fallado cuando lo que ha pasado es que no le ha dado tiempo.
     * Además ahora se puede acabar antes: en cuanto la caza, se termina.
     */
    segundos?: number;
    /** Milisegundos que hay que mantenerla dentro de la ventana para darla por cazada. */
    msParaCazar?: number;
    /** Sistema de nombres: 'latino' (do re mi) por defecto, o 'ingles'. */
    nombres?: 'latino' | 'ingles';
    /** Timbre de la nota de referencia. */
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const segundos = contenido.segundos ?? 8;
  /*
    Ochocientos milisegundos, no cuatro segundos.

    La actividad no es «sostén una nota», es «encuentra una nota»: eso es lo que hace un
    niño cuando afina, y sostenerla ya viene después. Pedirle que la aguante afinada durante
    toda la escucha convertía un ejercicio de oído en uno de respiración.
  */
  const ventanas = ventanasDe(carril);
  /*
    El tiempo baja un poco con la edad, pero poco: la palanca principal es la ventana, no
    esto. Por debajo de medio segundo un barrido de voz que pasa por encima de la nota
    contaría como acierto, y el «la has cazado» dejaría de ser verdad.
  */
  const msParaCazar =
    contenido.msParaCazar ?? (carril === 'infantil' ? 600 : carril === 'lectores' ? 800 : 1000);
  const sistema = contenido.nombres ?? 'latino';

  const [fase, setFase] = useState<Fase>('listo');
  const [indice, setIndice] = useState(0);
  const [conMicrofono, setConMicrofono] = useState<boolean | null>(null);
  const [avisoMicro, setAvisoMicro] = useState<string | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionAfinacion | null>(null);
  /** true en cuanto la ha mantenido dentro de la ventana el tiempo pedido. */
  const [cazada, setCazada] = useState(false);
  const dentroDesde = useRef<number | null>(null);
  const finDeEscucha = useRef<number | null>(null);

  const detector = useRef<DetectorDeTono | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const lecturas = useRef<Array<number | null>>([]);
  const recientes = useRef<number[]>([]);
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
        const s = new Sampler(muestrasDe(contenido.instrumento));
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
    setCazada(false);
    dentroDesde.current = null;
    lecturas.current = [];
    recientes.current = [];

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
            recientes.current = [];
            setCents(null);
            return;
          }
          // Plegado a la octava más cercana: cantar la nota en tu octava es cantarla.
          const desviacion = desviacionEnCents(lectura.midi, midiObjetivo);
          lecturas.current.push(desviacion);

          // La aguja muestra la MEDIANA de las últimas lecturas, no la última. Hablar
          // produce alturas que van y vienen; sin suavizar, la aguja salta como loca y
          // parece rota. El detector ya filtra por claridad; esto filtra lo que pasa.
          recientes.current.push(desviacion);
          if (recientes.current.length > 5) recientes.current.shift();
          const orden = [...recientes.current].sort((a, b) => a - b);
          const suavizado = orden[Math.floor(orden.length / 2)]!;
          setCents(suavizado);

          /*
            Cazar la nota: mantenerla dentro de la ventana durante `msParaCazar` seguidos.
            Se cuenta con el reloj y no con el número de lecturas porque el detector no va a
            un ritmo fijo: contar lecturas mediría otra cosa según el dispositivo.
          */
          if (Math.abs(suavizado) <= ventanas.afinado) {
            const ahora = performance.now();
            dentroDesde.current ??= ahora;
            if (ahora - dentroDesde.current >= msParaCazar) {
              setCazada(true);
            }
          } else {
            dentroDesde.current = null;
          }
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

    finDeEscucha.current = window.setTimeout(() => {
      if (escuchando) setEvaluacion(evaluarAfinacion(lecturas.current, carril));
      setFase('resultado');
      setCents(null);
    }, segundos * 1000);
  }, [midiObjetivo, segundos, sonarNota, msParaCazar]);

  /*
    En cuanto la caza, se acaba. Esperar a que se agote el reloj después de haber acertado
    solo sirve para que el niño la pierda y acabe con peor resultado del que ya tenía.
  */
  useEffect(() => {
    if (!cazada || fase !== 'escuchando') return;
    if (finDeEscucha.current !== null) window.clearTimeout(finDeEscucha.current);
    const id = window.setTimeout(() => {
      setEvaluacion(evaluarAfinacion(lecturas.current, carril));
      setFase('resultado');
      setCents(null);
    }, 700);
    return () => window.clearTimeout(id);
  }, [cazada, fase]);

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

      {/* El nombre que usa la escuela española, no la notación científica: a un niño de
          ocho años «sol» le dice algo y «G4» no le dice nada. La octava tampoco se enseña:
          la actividad pliega a la octava más cercana, así que cantarla en la tuya vale. */}
      <p className="cantar__nota">{nombreDe(objetivo, sistema)}</p>

      {/* Retorno visual de afinación. Existe para que la actividad se pueda hacer
          MIRANDO además de oyendo, y para que un niño vea hacia dónde moverse en vez de
          que se lo digan al final. */}
      <div className="cantar__aguja" aria-hidden="true">
        <span className="cantar__centro" />
        <span
          className="cantar__marca"
          data-activa={cents !== null || undefined}
          data-dentro={
            (cents !== null && Math.abs(cents) <= ventanas.afinado) || undefined
          }
          style={{ transform: `translateX(${posicion * 1.4}px)` }}
        />
      </div>
      {/*
        Guía en vivo, en palabras.

        La aguja ya dice hacia dónde, pero **solo si sabes leer una aguja**, y un niño de
        ocho años no tiene por qué. «Sube un poco» se entiende sin explicación, y es lo que
        convierte el ejercicio en una búsqueda con pistas en vez de un intento a ciegas.

        Y las cifras en cents desaparecen de aquí: eran para el maestro y ya salen al final.
      */}
      <p className="cantar__guia" aria-live="polite" data-cazada={cazada || undefined}>
        {fase === 'escuchando' && (
          cazada ? t('cantar.cazada')
          : cents === null ? t('cantar.noTeOigo')
          : Math.abs(cents) <= ventanas.afinado ? t('cantar.ahi')
          : Math.abs(cents) <= ventanas.casi
            ? t(cents > 0 ? 'cantar.bajaPoco' : 'cantar.subePoco')
            : t(cents > 0 ? 'cantar.baja' : 'cantar.sube')
        )}
      </p>

      {fase === 'listo' && (
        <button
          type="button"
          className="boton-actividad cantar__empezar"
          onClick={() => setFase('cuenta')}
        >
          <Icono nombre="voz" tamano={40} /> {t('cantar.empezar')}
        </button>
      )}

      {fase === 'cuenta' && <CuentaAtras alTerminar={() => void empezar()} />}
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
