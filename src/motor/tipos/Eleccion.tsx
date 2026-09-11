import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { BASE_MS, POR_CARACTER_MS } from '../maquinaReaccion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Boton } from '@/ui/Boton';
import { BotonRepetir } from '@/ui/BotonRepetir';
import { pararTodo } from '@/audio/AudioEngine';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { suena, type Estimulo } from '../estimulo';
import { sonarEstimulo } from '../sonarEstimulo';
import { Progreso } from '@/ui/Progreso';
import { seleccionarEstimulos } from '../seleccionEstimulos';
import {
  ESTADO_INICIAL,
  esperaMs,
  pistaPara,
  reducir,
  type AccionEleccion,
  type EstadoEleccion,
} from '../maquinaEleccion';

/**
 * Tipo «elección»: suena o se muestra un estímulo y el niño elige entre 2-4 opciones.
 * Cubre 10 de las 54 actividades del catálogo (¿largo o corto?, agudo o grave,
 * ¿quién ha sonado?, adagio/andante/allegro, mayor o menor...).
 *
 * Las reglas de producto NO están aquí: viven en `../maquinaEleccion.ts`, que es puro y
 * está cubierto por `tests/eleccion.test.ts`. Este fichero solo pinta y programa
 * temporizadores. Si vas a cambiar cuándo se avanza o qué cuenta como intento, se cambia
 * allí, donde hay un test que lo vigila.
 */

interface Opcion {
  clave: string;
  icono?: string;
  /** Signo musical en vez de dibujo. Ver `ui/Boton.tsx`. */
  signo?: string;
  color: string;
}

export default function Eleccion({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    opciones: Opcion[];
    /**
     * Lo que suena o se lee en cada ejercicio. Un fichero, un caso escrito, o —desde el
     * 2026-09-10— notas, un ritmo o un patrón del kit descritos en el JSON: ver
     * `motor/estimulo.ts`. Es lo que permite un intervalo, un dictado de figuras o un
     * «forte o piano» sin grabar nada.
     */
    estimulos: Estimulo[];
    /** Timbre de los estímulos con notas. Ver `audio/instrumentos.ts`. */
    instrumento?: string;
  };

  // El tamaño sale del CARRIL, no de la etapa: un niño de 4.º y uno de 3.º comparten
  // ciclo curricular y no comparten motricidad. Ver ADR 0005.
  const carril = useCarril(actividad.etapa);
  /*
    Cinco por vuelta, sacadas del banco de la actividad y repartidas entre las respuestas.
    La semilla se decide al montar: cada «otra vez» monta de nuevo y saca otras cinco. Las
    reglas en `motor/seleccionEstimulos.ts`, con test.
  */
  const semilla = useRef(Math.floor(Math.random() * 2 ** 31));
  const estimulos = useMemo(
    () => seleccionarEstimulos(contenido.estimulos, semilla.current),
    [contenido.estimulos],
  );
  const total = estimulos.length;

  const [estado, despachar] = useReducer(
    (e: EstadoEleccion, a: AccionEleccion) => reducir(e, a, total),
    ESTADO_INICIAL,
  );

  const estimulo = estimulos[estado.indice];
  /*
    Con dos opciones, los botones crecen: «solo hay dos», dijo el autor de «¿Largo o
    corto?», y dos cuadrados del tamaño mínimo en una pantalla vacía se ven perdidos. Con
    tres crecen algo menos; a partir de cuatro, el objetivo del carril tal cual.
  */
  const factor = contenido.opciones.length <= 2 ? 1.6 : contenido.opciones.length === 3 ? 1.3 : 1;
  const tam = Math.round(OBJETIVO_TACTIL[carril] * factor);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const yaTerminada = useRef(false);

  const reproducir = useCallback(() => {
    if (!estimulo) return;
    if (estimulo.audio) {
      audioRef.current?.pause();
      const a = new Audio(`/audio/${estimulo.audio}`);
      // El volumen del estímulo vale también para los sonidos grabados: «¿fuerte o flojito?»
      // (021) pone un león a tope y un gato bajito. Todo el banco está normalizado al mismo
      // pico, así que sin esto un rugido y un maullido sonarían igual de fuerte.
      a.volume = Math.max(0, Math.min(1, estimulo.volumen ?? 1));
      audioRef.current = a;
      void a.play().catch(() => {
        // Sin gesto previo el navegador bloquea la reproducción: no es un error del niño.
      });
      return;
    }
    // Notas, ritmo o golpes: se programan contra el reloj del audio y nunca lanzan. Antes se
    // corta lo que quede del anterior: repetir a mitad de una escala no superpone dos.
    pararTodo();
    void sonarEstimulo(estimulo, {
      instrumento: estimulo.instrumento ?? contenido.instrumento,
      tempo: actividad.practica?.tempo,
    });
  }, [estimulo, contenido.instrumento, actividad.practica?.tempo]);

  // Suena al llegar a cada estímulo nuevo, y al volver a él tras un fallo.
  useEffect(() => {
    if (estado.fase === 'estimulo') reproducir();
  }, [estado.fase, estado.indice, reproducir]);

  /*
    El feedback se muestra un rato y después viene la pregunta siguiente, sola.

    Hubo una pausa con reloj entre preguntas, y luego un paso con botón de «siguiente», y
    el autor se quedó con ninguno de los dos: «prefiero la barra de progreso». Lo que dice
    que la pregunta ha cambiado es el tramo que avanza en la barra y el estímulo nuevo que
    suena. El tiempo del feedback no es un cronómetro: es lo que tarda en leerse la pista.
  */
  useEffect(() => {
    if (estado.fase !== 'bien' && estado.fase !== 'casi') return;
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), esperaMs(estado.fase));
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.intentos, estado.indice, total]);

  // El aviso de fin va en su propio efecto para que no dependa del orden de los otros.
  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      aciertos: estado.aciertos,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.aciertos, estado.intentos, actividad.id, alTerminar]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const bloqueado = estado.fase !== 'estimulo';
  const pista = pistaPara(actividad.pistas, estado.fallosAqui);

  /*
    La pista de un fallo se queda lo que tarda en leerse, y se va antes si se responde.

    Sin reloj se quedaba flotando después de cualquier toque —lo vio el autor—; con 1,2 s
    no daba tiempo de leerla. Ahora dura lo que la tarjeta de elogio con ese mismo texto,
    tres segundos y medio más lo que mida la frase, y cualquier respuesta nueva la quita.
  */
  const [pistaVisible, setPistaVisible] = useState(false);
  /*
    El reloj vive en una referencia y no en la limpieza del efecto: la fase «casi» dura
    1,2 s y después vuelve a «estimulo», y si el reloj se cancelara con ese cambio —que es
    lo que hacía— la pista no se iba nunca. Lo vio el autor. Solo un nuevo fallo lo rearma.
  */
  const relojPista = useRef<number | null>(null);
  useEffect(() => {
    if (estado.fase !== 'casi') return;
    setPistaVisible(true);
    if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    const texto = pista ? t(pista) : t('comun.casi');
    relojPista.current = window.setTimeout(
      () => setPistaVisible(false),
      BASE_MS + texto.length * POR_CARACTER_MS,
    );
  }, [estado.fase, estado.intentos, pista]);
  useEffect(
    () => () => {
      if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    },
    [],
  );
  useEffect(() => {
    if (estado.fase === 'bien' || estado.fase === 'completada') setPistaVisible(false);
  }, [estado.fase]);
  const conPista = estado.fase === 'casi' || (estado.fase === 'estimulo' && pistaVisible);

  return (
    <section className="actividad" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El botón de repetir solo tiene sentido si hay algo que repetir. Cuando no lo hay
          desaparece entero, en vez de quedarse ahí sin hacer nada: un botón muerto es peor
          que ningún botón, y ya nos pasó una vez con el «Escuchar» de la modal. */}
      {/* El caso escrito. Va en aria-live porque cambia sin que se mueva el foco. */}
      {estimulo?.texto && (
        <p className="eleccion__caso" aria-live="polite">
          {t(estimulo.texto)}
        </p>
      )}

      <div className="opciones" role="group" aria-label={t(contenido.consigna)}>
        {contenido.opciones.map((o) => (
          <Boton
            key={o.clave}
            icono={o.icono}
            signo={o.signo}
            color={o.color}
            tamano={tam}
            etiqueta={t(`opcion.${o.clave}`)}
            /* aria-disabled y no `disabled`: deshabilitar de verdad le quitaría el foco
               a quien navega con teclado justo cuando aparece el feedback. */
            inactivo={bloqueado}
            onClick={() =>
              despachar({
                tipo: 'elegir',
                clave: o.clave,
                respuesta: estimulo?.respuesta ?? '',
              })
            }
          />
        ))}
      </div>

      {/* Debajo de los cuadros, no encima: lo primero que se mira es lo que se toca, y la
          barra se consulta después. Lo pidió el autor el 2026-09-12. */}
      <Progreso hechos={estado.indice} total={total} />

      <BarraAcciones>{estimulo && suena(estimulo) && <BotonRepetir onClick={reproducir} />}</BarraAcciones>

      {/*
        El «bien» de cada acierto se queda: son seis preguntas seguidas y ahí sí hace falta
        saber cómo ha ido cada una. Lo que se va es el «¡completada!» del final, que lo dice
        la modal de enhorabuena medio segundo después.
      */}
      {/* La pista de un fallo dura lo que tarda en leerse: ver `pistaVisible`. */}
      <Reaccion
        tono={estado.fase === 'bien' ? 'bien' : conPista ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {estado.fase === 'bien' && t('comun.bien')}
        {conPista && (pista ? t(pista) : t('comun.casi'))}
      </Reaccion>

    </section>
  );
}
