import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio } from '@/audio/AudioEngine';
import { Sampler, aMidi } from '@/audio/sampler';
import { muestrasDe, sostiene } from '@/audio/instrumentos';
import { DetectorDeTono } from '@/escucha/tono';
import {
  desviacionEnCents,
  ventanasDe,
  evaluarAfinacion,
  llevaPista,
  mensajeAfinacion,
  tonoDe,
  type EvaluacionAfinacion,
  ultimoTramo,
} from '../afinacion';
import { rechazarMicrofono, seUsaMicrofono } from '@/escucha/permiso';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { Reaccion } from '@/ui/Reaccion';
import { Progreso } from '@/ui/Progreso';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { nombreDe } from '@/ui/coloresNota';

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
    /**
     * Segundos que se escucha al niño en cada intento, como mucho.
     *
     * Veinte. Un niño no ataca la nota: la BUSCA, y buscarla lleva sus segundos. Con una
     * ventana corta se acaba el tiempo mientras todavía está subiendo, y el resultado dice
     * que ha fallado cuando lo que ha pasado es que no le ha dado tiempo. Ocho seguían
     * siendo pocos; el autor pidió veinte el 2026-09-12. No es un cronómetro que puntúe:
     * en cuanto la caza —mantenida el tiempo pedido— se acaba, y lo normal es acabar mucho
     * antes. Si se agota, se evalúa el último tramo, no la búsqueda entera.
     */
    segundos?: number;
    /** Milisegundos que hay que mantenerla dentro de la ventana para darla por cazada. */
    msParaCazar?: number;
    /** Sistema de nombres: 'latino' (do re mi) por defecto, o 'ingles'. */
    nombres?: 'latino' | 'ingles';
    /** Timbre de la nota de referencia. */
    instrumento?: string;
    /**
     * Diagrama que se enseña con cada nota, por si se toca con un instrumento.
     *
     * **Se ve mientras se toca, no se esconde.** Esta actividad no es «adivina qué nota
     * es», es «toca esta nota y comprueba que suena bien»: esconder la digitación
     * convertiría un ejercicio de instrumento en uno de memoria, que es otra cosa y de otro
     * día.
     */
    digitaciones?: Record<string, string>;
  };

  const carril = useCarril(actividad.etapa);
  const segundos = contenido.segundos ?? 20;
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
  /*
    Dos referencias que arreglan dos fallos que el autor notó el 2026-09-12 y que tenían la
    misma raíz: **el detector se abre una vez y vive toda la actividad**, pero la función
    que recibe sus lecturas se escribió en el primer `empezar`.

     - Comparaba siempre contra la PRIMERA nota: `midiObjetivo` quedaba atrapado en ese
       cierre. En la segunda nota la aguja medía la desviación respecto a la primera, así
       que el centro no se ponía verde nunca aunque se cantara bien. `midiObjetivoRef`
       apunta siempre a la nota que toca.
     - Seguía leyendo entre nota y nota: durante la cuenta atrás de la segunda, cada
       lectura repintaba el componente, y la cuenta atrás —que reiniciaba su reloj con
       cada repintado— se atrancaba. `escuchandoRef` dice cuándo importan las lecturas.
  */
  const midiObjetivoRef = useRef(midiObjetivo);
  midiObjetivoRef.current = midiObjetivo;
  const escuchandoRef = useRef(false);

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

  /** Segundos que suena la referencia. Larga: una nota que se apaga no se puede imitar. */
  const REFERENCIA_S = 3;

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
    /*
      La nota se mantiene tres segundos. Sonaba 1,6 s de marimba —un golpe que se apaga—,
      y una nota que se apaga no se puede imitar: el autor pidió «un tono más largo, con
      otro instrumento o con voz». Con un instrumento que sostiene —órgano, flauta— se
      sostiene de verdad; con uno percusivo, se alarga lo que dé la muestra.
    */
    const s = sampler.current;
    if (!s) return;
    if (sostiene(contenido.instrumento)) {
      const soltar = s.sostener(objetivo, 0.9);
      window.setTimeout(soltar, REFERENCIA_S * 1000);
    } else {
      s.tocar(objetivo, undefined, REFERENCIA_S);
    }
  }, [objetivo, contenido.instrumento]);

  const empezar = useCallback(async () => {
    escuchandoRef.current = false;
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
    await new Promise((r) => setTimeout(r, REFERENCIA_S * 1000 + 200));

    let escuchando = false;
    // Si en esta sesión se eligió tocar en la pantalla, no se vuelve a pedir el micrófono
    // (`CLAUDE.md` §8). La actividad sigue: se oye la nota y se canta, sin que nadie mida.
    if (!detector.current && seUsaMicrofono()) {
      try {
        const d = new DetectorDeTono();
        await d.arrancar((lectura) => {
          if (!escuchandoRef.current) return;
          if (!lectura) {
            lecturas.current.push(null);
            recientes.current = [];
            setCents(null);
            return;
          }
          // Plegado a la octava más cercana: cantar la nota en tu octava es cantarla.
          const desviacion = desviacionEnCents(lectura.midi, midiObjetivoRef.current);
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
        // Un «no» del navegador vale para toda la sesión: nada de sacarle la barra gris en
        // cada nota a quien ya ha dicho que no.
        rechazarMicrofono();
        setAvisoMicro(err.tipo === 'denegado' ? 'cantar.sinPermiso' : 'cantar.sinMicrofono');
      }
    } else {
      escuchando = true;
    }

    escuchandoRef.current = true;
    setFase('escuchando');

    finDeEscucha.current = window.setTimeout(() => {
      escuchandoRef.current = false;
      if (escuchando) setEvaluacion(evaluarAfinacion(ultimoTramo(lecturas.current), carril));
      setFase('resultado');
      setCents(null);
    }, segundos * 1000);
  }, [segundos, sonarNota, msParaCazar]);

  /*
    En cuanto la caza, se acaba. Esperar a que se agote el reloj después de haber acertado
    solo sirve para que el niño la pierda y acabe con peor resultado del que ya tenía.
  */
  useEffect(() => {
    if (!cazada || fase !== 'escuchando') return;
    if (finDeEscucha.current !== null) window.clearTimeout(finDeEscucha.current);
    const id = window.setTimeout(() => {
      escuchandoRef.current = false;
      setEvaluacion(evaluarAfinacion(ultimoTramo(lecturas.current), carril));
      setFase('resultado');
      setCents(null);
    }, 700);
    return () => window.clearTimeout(id);
  }, [cazada, fase]);

  const siguiente = useCallback(() => {
    escuchandoRef.current = false;
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

  /*
    La aguja abarca ±300 cents —una tercera menor a cada lado—, no ±100. Con ±100 la aguja
    estaba clavada en un extremo casi siempre y no decía cuánto faltaba; con más recorrido
    se ve venir la nota desde lejos. El autor lo pidió: «más horquilla de tonos». La
    posición va en porcentaje del ancho, así la aguja sirve igual de ancha que se ponga.
  */
  const RANGO = 300;
  const posicion = cents === null ? 0 : Math.max(-RANGO, Math.min(RANGO, cents));
  const izquierdaPct = 50 + (posicion / RANGO) * 50;
  const anchoZona = (ventana: number) => `${(ventana / RANGO) * 100}%`;

  return (
    <section className="actividad cantar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El nombre que usa la escuela española, no la notación científica: a un niño de
          ocho años «sol» le dice algo y «G4» no le dice nada. La octava tampoco se enseña:
          la actividad pliega a la octava más cercana, así que cantarla en la tuya vale. */}
      <p className="cantar__nota">{nombreDe(objetivo, sistema)}</p>

      {contenido.digitaciones?.[objetivo] && (
        <img
          className="cantar__digitacion"
          src={contenido.digitaciones[objetivo]}
          alt={t(`digitacion.${nombreDe(objetivo, 'latino')}`)}
          height={190}
        />
      )}

      {/* Retorno visual de afinación. Existe para que la actividad se pueda hacer
          MIRANDO además de oyendo, y para que un niño vea hacia dónde moverse en vez de
          que se lo digan al final. */}
      <div className="cantar__aguja" aria-hidden="true">
        {/* Dos franjas: la de «casi», tenue, y dentro la de «afinado», verde. Su ancho es
            la ventana del carril: en Infantil la diana es más grande, y se ve. */}
        <span className="cantar__casi" style={{ width: anchoZona(ventanas.casi) }} />
        <span className="cantar__centro" style={{ width: anchoZona(ventanas.afinado) }} />
        <span
          className="cantar__marca"
          data-activa={cents !== null || undefined}
          data-dentro={
            (cents !== null && Math.abs(cents) <= ventanas.afinado) || undefined
          }
          style={{ left: `${izquierdaPct}%` }}
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

      {/* Estado, no instrucción: dice en qué punto va la actividad —ahora suena, ahora te
          toca—, cambia solo y cabe en tres palabras. Lo que hay que hacer lo cuenta el
          personaje al entrar. `.estado-actividad` es la misma pinta en todos los tipos. */}
      {fase === 'sonando' && <p className="estado-actividad">{t('cantar.escuchaLaNota')}</p>}
      {fase === 'escuchando' && <p className="estado-actividad">{t('cantar.ahoraTu')}</p>}

      {fase === 'resultado' && (
        <>
          {/*
            Lo dice el personaje, en una tarjeta que entra y se va, como en todas.

            Y **los cents se han ido de aquí**. Eran para el maestro —lo decía el propio
            comentario que había— y su sitio es la hoja de seguimiento de la ficha, no la
            pantalla de un niño de ocho años que acaba de cantar. Lo que el niño necesita es
            la lectura de ese número en palabras, que es lo que da `mensajeAfinacion`.
          */}
          {/*
            El color y la pista salen del MISMO veredicto que el texto.

            Comparaban a mano contra 50 cents, que es la ventana del tercer ciclo, mientras
            que el texto lo decide `mensajeAfinacion` con la ventana del carril —90 en
            Infantil, 70 en 1.º y 2.º—. Un niño de siete años que cantaba 60 cents bajo leía
            «¡la has cazado!» en una tarjeta pintada de corrección y con un consejo debajo
            para arreglar lo que acababa de hacer bien.
          */}
          <Reaccion tono={tonoDe(evaluacion)} personaje={actividad.personaje}>
            {t(evaluacion ? mensajeAfinacion(evaluacion) : 'cantar.sinMedir')}
            {/* «Respira antes de empezar y canta con la boca bien abierta» es algo que se
                puede hacer distinto la próxima vez. «Casi» no lo es. */}
            {llevaPista(evaluacion) && pistaPara(actividad.pistas, 1)
              ? ` ${t(pistaPara(actividad.pistas, 1)!)}`
              : ''}
          </Reaccion>
        </>
      )}

      {/* Abajo, encima de la botonera: la nota y la aguja son lo que se mira. */}
      <Progreso hechos={indice} total={contenido.notas.length} />

      <BarraAcciones>
        {fase === 'listo' && (
          <button
            type="button"
            className="boton-principal boton-arranque"
            // Sin cuenta atrás: la nota suena tres segundos y después se escucha; ese es el
            // aviso. Una cuenta antes de una nota larga era esperar dos veces.
            onClick={() => void empezar()}
          >
            <IconoTocar />
            {/* Como en palmear: el número va en el botón y en ningún sitio más. Aquí la
                barra de progreso ya dice por dónde vas con una forma, así que un número
                encima era la tercera vez que se decía lo mismo. */}
            {contenido.notas.length > 1
              ? t('comun.empezarDe', { n: indice + 1, total: contenido.notas.length })
              : t('accion.empezar')}
          </button>
        )}

        {fase === 'resultado' && (
          <>
            <button type="button" className="boton-repetir" onClick={() => void empezar()}>
              <IconoRepetir />
              {t('cantar.otraVez')}
            </button>
            <button type="button" className="boton-principal" onClick={siguiente}>
              <IconoSiguiente />
              {/* «Probar otra vez» repite ESTA nota y «Siguiente nota» pasa a la de al lado:
                  aquí sí son dos cosas distintas, y por eso siguen siendo dos botones. */}
              {indice + 1 >= contenido.notas.length
                ? t('comun.terminar')
                : t('cantar.siguienteNotaDe', {
                    n: indice + 2,
                    total: contenido.notas.length,
                  })}
            </button>
          </>
        )}
      </BarraAcciones>

      {avisoMicro && conMicrofono === false && (
        <p className="cantar__aviso" role="status">
          {t(avisoMicro)}
        </p>
      )}

    </section>
  );
}
