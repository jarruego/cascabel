import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { esperaTrasRespuesta } from '../maquinaReaccion';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoComprobar } from '@/ui/Simbolos';
import { t } from '@/i18n';
import { ALTO, HUECO, LINEA_1, LINEA_3, LINEA_5, disponerPauta } from '../pautaRitmica';
import {
  INICIAL_COMPASES,
  reducirCompases,
  type AccionCompases,
  type EstadoCompases,
} from '../maquinaCompases';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «compases»: poner las barras de compás a una línea de figuras.
 *
 * **Por qué esto merece un tipo propio.** Es de las poquísimas cosas del lenguaje musical
 * que se comprueban solas: una divisoria está bien puesta o no lo está, y la respuesta no
 * depende del gusto de nadie ni del criterio de una maestra. Eso lo convierte en el
 * ejercicio autocorrectivo perfecto, que es justo lo que el proyecto promete y lo que casi
 * ningún contenido de lenguaje musical permite.
 *
 * **Se dibuja sobre un pentagrama de verdad, y sin VexFlow.** Desde el 2026-09-10 hay
 * clave de sol, cifra de compás, cinco líneas y divisorias como las de una partitura: el
 * autor pidió que se aprendiera a poner barras donde las barras viven. Pero no hay alturas
 * —todas las figuras van en la tercera línea— y con eso la fuente Bravura basta: es SMuFL,
 * sus glifos están dibujados para que 1 em sea la altura de la pauta, y un SVG con cinco
 * líneas y unos `<text>` en su sitio es una partitura. Meter un renderizador para eso sería
 * traer una imprenta para escribir una postal, y además el chunk de VexFlow está
 * deliberadamente fuera del precache. La disposición —dónde va cada cosa, en espacios de
 * pentagrama— vive en `../pautaRitmica.ts`, con test; los huecos son botones transparentes
 * encima del dibujo, colocados en porcentaje del mismo ancho, así que no hay que medir nada.
 *
 * Las reglas viven en `../maquinaCompases.ts`, con test.
 */

const GLIFO_CLAVE = '\uE050';

export default function Compases({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Duración de cada figura, en pulsos. */
    duraciones: number[];
    /** La cifra de compás: 4 en un 4/4, 3 en un 3/4. */
    pulsosPorCompas: number;
    /** Denominador de la cifra, solo para dibujarla. */
    figuraDelCompas?: number;
  };

  const carril = useCarril(actividad.etapa);
  const { duraciones, pulsosPorCompas } = contenido;
  const abajo = contenido.figuraDelCompas ?? 4;
  const yaTerminada = useRef(false);
  const pauta = useMemo(
    () => disponerPauta(duraciones, pulsosPorCompas, abajo),
    [duraciones, pulsosPorCompas, abajo],
  );
  /** De espacios a porcentaje del ancho: el SVG y los botones comparten la misma escala. */
  const pct = (v: number) => `${(v / pauta.ancho) * 100}%`;

  const [estado, despachar] = useReducer(
    (e: EstadoCompases, a: AccionCompases) =>
      reducirCompases(e, a, duraciones, pulsosPorCompas),
    INICIAL_COMPASES,
  );

  /* Lo que dice la tarjeta al fallar: el error concreto y, si la hay, la pista. Se calcula
     aquí porque de su longitud sale cuánto se espera antes de volver a colocar. */
  const mensajeDeFallo =
    estado.fase === 'revisando'
      ? t(
          estado.sobran.length && estado.faltan.length
            ? 'compases.sobranYFaltan'
            : estado.sobran.length
              ? 'compases.sobran'
              : 'compases.faltan',
        ) + (pistaPara(actividad.pistas, estado.intentos) ? ` ${t(pistaPara(actividad.pistas, estado.intentos)!)}` : '')
      : '';

  useEffect(() => {
    if (estado.fase !== 'revisando') return;
    const id = window.setTimeout(
      () => despachar({ tipo: 'seguir' }),
      esperaTrasRespuesta(false, mensajeDeFallo),
    );
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.intentos, mensajeDeFallo]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({ actividadId: actividad.id, completada: true, intentos: estado.intentos });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar]);

  return (
    <section className="actividad compases" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/*
        El marco se lleva el alto que quede y, si la pauta no cabe a lo ancho, se desplaza
        de lado en un solo bloque: partida en dos renglones, contar los pulsos de un compás
        se vuelve imposible. La caja de dentro tiene la proporción exacta del dibujo, así
        que su alto fija su ancho y los botones se colocan en porcentaje.
      */}
      <div className="compases__marco">
        <div className="compases__pauta" style={{ aspectRatio: `${pauta.ancho} / ${ALTO}` }}>
          <svg
            className="compases__dibujo"
            viewBox={`0 0 ${pauta.ancho} ${ALTO}`}
            aria-label={`${pulsosPorCompas} por ${abajo}`}
            role="img"
          >
            {/* Las cinco líneas. */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} className="compases__raya" x1={0.5} x2={pauta.ancho - 0.5} y1={LINEA_1 + i} y2={LINEA_1 + i} />
            ))}
            {/* La clave de sol se apoya en la línea del sol, la segunda desde abajo. */}
            <text className="compases__glifo" x={pauta.clave.x} y={LINEA_5 - 1}>
              {GLIFO_CLAVE}
            </text>
            {/* La cifra: los dígitos de Bravura miden dos espacios y van centrados en su
                línea base, así que el de arriba se apoya un espacio por encima de la
                tercera línea y el de abajo un espacio por debajo. */}
            <text className="compases__glifo" x={pauta.cifra.x} y={LINEA_3 - 1}>
              {pauta.cifra.arriba}
            </text>
            <text className="compases__glifo" x={pauta.cifra.x} y={LINEA_3 + 1}>
              {pauta.cifra.abajo}
            </text>
            {/* Las figuras, todas en la tercera línea. Ver `pautaRitmica.ts`. */}
            {pauta.figuras.map((f, i) => (
              <text key={i} className="compases__glifo" x={f.x} y={LINEA_3}>
                {f.glifo}
              </text>
            ))}
            {/* Las divisorias, según lo que haya pasado en cada hueco. Mientras se coloca,
                un rastro punteado dice dónde se puede tocar; puesta, es una barra como las
                de verdad. Sobra: en naranja y doble, nunca en rojo (regla 4). Falta: se
                enseña dónde estaba, en verde y punteada: enseñar la respuesta es enseñar. */}
            {pauta.huecos.map((h, i) => {
              const puesta = estado.barras.has(i);
              const sobra = estado.sobran.includes(i);
              const falta = estado.faltan.includes(i);
              const estadoBarra = sobra ? 'sobra' : falta ? 'falta' : puesta ? 'puesta' : 'libre';
              return (
                <g key={i} className="compases__divisoria" data-estado={estadoBarra}>
                  {estadoBarra !== 'libre' && (
                    <rect x={h.x0} y={LINEA_1 - 1} width={HUECO} height={LINEA_5 - LINEA_1 + 2} rx={0.4} className="compases__banda" />
                  )}
                  <line x1={h.xBarra} x2={h.xBarra} y1={LINEA_1} y2={LINEA_5} className="compases__linea-barra" />
                </g>
              );
            })}
            {/* La doble barra final: fina y gruesa, siempre puesta y nunca tocable. */}
            <line className="compases__final-fina" x1={pauta.final.xFina} x2={pauta.final.xFina} y1={LINEA_1} y2={LINEA_5} />
            <line className="compases__final-gruesa" x1={pauta.final.xGruesa} x2={pauta.final.xGruesa} y1={LINEA_1} y2={LINEA_5} />
          </svg>

          {/* Los huecos que se pulsan: botones transparentes encima del dibujo, de arriba a
              abajo del marco para que el dedo entre aunque la pauta sea baja. El último
              hueco no existe: ahí la barra la pone el final, y pedirla sería pedir una
              formalidad. */}
          <ol className="compases__huecos" aria-label={t('compases.linea')}>
            {pauta.huecos.map((h, i) => (
              <li key={i} className="compases__hueco" style={{ left: pct(h.x0), width: pct(HUECO) }}>
                <button
                  type="button"
                  className="compases__barra"
                  aria-pressed={estado.barras.has(i)}
                  aria-label={`${t('compases.barraTras')} ${i + 1}`}
                  aria-disabled={estado.fase !== 'colocando' || undefined}
                  onClick={() => despachar({ tipo: 'alternar', hueco: i })}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <BarraAcciones>
        <button
          type="button"
          className="boton-principal"
          aria-disabled={estado.fase !== 'colocando' || undefined}
          onClick={() => despachar({ tipo: 'comprobar' })}
        >
          <IconoComprobar />
          {t('ordenar.comprobar')}
        </button>
      </BarraAcciones>

      {/*
        Dos mensajes distintos para dos errores distintos: «aquí no cierra el compás» no es
        lo mismo que «aquí cerraba y no lo has visto», y darles la misma frase perdería la
        mitad de lo que se está enseñando.
      */}
      <Reaccion
        tono={estado.fase === 'revisando' ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {/*
            Aquí la frase genérica NO es genérica: «aquí no cierra el compás» y «aquí cerraba
            y no lo has visto» son dos errores distintos y se dicen distinto. Así que la
            pista de la actividad se añade debajo en vez de sustituirla — es la única del
            grupo donde el tipo sabe más que el JSON sobre lo que acaba de pasar.
          */}
        {estado.fase === 'revisando' && mensajeDeFallo}
        {/* Y nada al completar: eso lo dice la modal de enhorabuena medio segundo después. */}
      </Reaccion>
    </section>
  );
}
