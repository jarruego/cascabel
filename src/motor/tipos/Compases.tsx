import { useEffect, useReducer, useRef } from 'react';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { t } from '@/i18n';
import { figuraDe } from '../musicograma';
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
 * **Y por qué no se dibuja con VexFlow.** Aquí no hay pauta ni alturas: hay figuras en fila
 * y huecos entre ellas. Con la tipografía Bravura —que ya está en el proyecto y es SMuFL—
 * las figuras se escriben como texto, y los huecos son botones. Meter un renderizador de
 * partituras para dibujar ocho negras seguidas sería traer una imprenta para escribir una
 * postal, y además el chunk de VexFlow está deliberadamente fuera del precache.
 *
 * Las reglas viven en `../maquinaCompases.ts`, con test.
 */

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

  const [estado, despachar] = useReducer(
    (e: EstadoCompases, a: AccionCompases) =>
      reducirCompases(e, a, duraciones, pulsosPorCompas),
    INICIAL_COMPASES,
  );

  useEffect(() => {
    if (estado.fase !== 'revisando') return;
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), 2600);
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.intentos]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({ actividadId: actividad.id, completada: true, intentos: estado.intentos });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar]);

  return (
    <section className="actividad compases" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      {/* La cifra de compás, como se escribe: una cifra sobre otra y sin raya en medio.
          Es la que dice cuál es la respuesta, así que tiene que verse antes que nada. */}
      <p className="compases__cifra" aria-label={`${pulsosPorCompas} por ${abajo}`}>
        <span aria-hidden="true">{pulsosPorCompas}</span>
        <span aria-hidden="true">{abajo}</span>
      </p>

      <ol className="compases__linea" aria-label={t('compases.linea')}>
        {duraciones.map((d, i) => {
          const esUltimo = i === duraciones.length - 1;
          const puesta = estado.barras.has(i);
          const sobra = estado.sobran.includes(i);
          const falta = estado.faltan.includes(i);
          return (
            <li key={i} className="compases__hueco">
              <span className="compases__figura" aria-hidden="true">
                {figuraDe(d)}
              </span>

              {/* El hueco DESPUÉS de esta figura. El último no lleva: ahí la barra la pone
                  el final de la línea, y pedirla sería pedir una formalidad. */}
              {!esUltimo && (
                <button
                  type="button"
                  className="compases__barra"
                  data-puesta={puesta || undefined}
                  data-sobra={sobra || undefined}
                  data-falta={falta || undefined}
                  aria-pressed={puesta}
                  aria-label={`${t('compases.barraTras')} ${i + 1}`}
                  aria-disabled={estado.fase !== 'colocando' || undefined}
                  onClick={() => despachar({ tipo: 'alternar', hueco: i })}
                />
              )}
            </li>
          );
        })}
        {/* La barra final, siempre puesta y nunca tocable: cierra la línea. */}
        <li className="compases__final" aria-hidden="true" />
      </ol>

      <div className="compases__acciones">
        <button
          type="button"
          className="boton-repetir"
          aria-disabled={estado.fase !== 'colocando' || undefined}
          onClick={() => despachar({ tipo: 'comprobar' })}
        >
          {t('ordenar.comprobar')}
        </button>
      </div>

      {/*
        Dos mensajes distintos para dos errores distintos: «aquí no cierra el compás» no es
        lo mismo que «aquí cerraba y no lo has visto», y darles la misma frase perdería la
        mitad de lo que se está enseñando.
      */}
      <Reaccion
        tono={estado.fase === 'completada' ? 'bien' : estado.fase === 'revisando' ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {estado.fase === 'revisando' &&
          t(
            estado.sobran.length && estado.faltan.length
              ? 'compases.sobranYFaltan'
              : estado.sobran.length
                ? 'compases.sobran'
                : 'compases.faltan',
          )}
        {estado.fase === 'completada' && t('comun.completada')}
      </Reaccion>
    </section>
  );
}
