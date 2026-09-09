import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Boton } from '@/ui/Boton';
import { BotonRepetir } from '@/ui/BotonRepetir';
import { pararTodo } from '@/audio/AudioEngine';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { suena, type Estimulo } from '../estimulo';
import { sonarEstimulo } from '../sonarEstimulo';
import { PasoEntreEjercicios } from '@/ui/ModalesActividad';
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
  const total = contenido.estimulos.length;

  const [estado, despachar] = useReducer(
    (e: EstadoEleccion, a: AccionEleccion) => reducir(e, a, total),
    ESTADO_INICIAL,
  );

  const estimulo = contenido.estimulos[estado.indice];
  const tam = OBJETIVO_TACTIL[carril];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const yaTerminada = useRef(false);

  const reproducir = useCallback(() => {
    if (!estimulo) return;
    if (estimulo.audio) {
      audioRef.current?.pause();
      const a = new Audio(`/audio/${estimulo.audio}`);
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
      instrumento: contenido.instrumento,
      tempo: actividad.practica?.tempo,
    });
  }, [estimulo, contenido.instrumento, actividad.practica?.tempo]);

  // Suena al llegar a cada estímulo nuevo, y al volver a él tras un fallo.
  useEffect(() => {
    if (estado.fase === 'estimulo') reproducir();
  }, [estado.fase, estado.indice, reproducir]);

  /*
    El feedback se muestra un rato y después viene la pausa entre ejercicios.

    **La pausa existía hecha y sin conectar.** `PasoEntreEjercicios` estaba escrito, con sus
    estilos y sus textos, desde que el autor pidió «pausas o indicadores entre subejercicios»,
    y no lo usaba nadie: lo destapó la auditoría del 2026-09-07. Un componente construido y
    sin enchufar es peor que código muerto, porque parece que la funcionalidad está.

    Y hace falta: sin ella, seis estímulos se encadenan y el niño no se entera de que ha
    cambiado la pregunta. Desde el 2026-09-12 es un paso con botón, no una pausa con reloj:
    el niño pulsa «siguiente» cuando quiere.
  */
  const [enPausa, setEnPausa] = useState(false);

  useEffect(() => {
    if (estado.fase !== 'bien' && estado.fase !== 'casi') return;
    const id = window.setTimeout(() => {
      // En el último no hay pausa: lo que viene después no es otro ejercicio, es el final.
      if (estado.indice + 1 < total) setEnPausa(true);
      else despachar({ tipo: 'seguir' });
    }, esperaMs(estado.fase));
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

  const bloqueado = estado.fase !== 'estimulo' || enPausa;
  const pista = pistaPara(actividad.pistas, estado.fallosAqui);

  return (
    <section className="actividad" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* El botón de repetir solo tiene sentido si hay algo que repetir. Cuando no lo hay
          desaparece entero, en vez de quedarse ahí sin hacer nada: un botón muerto es peor
          que ningún botón, y ya nos pasó una vez con el «Escuchar» de la modal. */}
      {enPausa && (
        <PasoEntreEjercicios
          actual={estado.indice + 1}
          total={total}
          alSeguir={() => {
            setEnPausa(false);
            despachar({ tipo: 'seguir' });
          }}
        />
      )}


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

      <BarraAcciones>{estimulo && suena(estimulo) && <BotonRepetir onClick={reproducir} />}</BarraAcciones>

      {/*
        El «bien» de cada acierto se queda: son seis preguntas seguidas y ahí sí hace falta
        saber cómo ha ido cada una. Lo que se va es el «¡completada!» del final, que lo dice
        la modal de enhorabuena medio segundo después.
      */}
      <Reaccion
        tono={estado.fase === 'casi' ? 'casi' : estado.fase === 'bien' ? 'bien' : 'neutro'}
        personaje={actividad.personaje}
      >
        {estado.fase === 'bien' && t('comun.bien')}
        {estado.fase === 'casi' && (pista ? t(pista) : t('comun.casi'))}
      </Reaccion>

      {/*
        El progreso se muestra, pero NO la puntuación: cuántas van de cuántas es
        orientación, y cuántas has fallado es un castigo. Ver CLAUDE.md §4.
      */}
      <progress
        value={estado.indice}
        max={total}
        aria-label={t('comun.progreso')}
      />
    </section>
  );
}
