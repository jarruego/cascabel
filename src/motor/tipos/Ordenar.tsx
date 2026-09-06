import { useEffect, useReducer, useRef } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { sonarMuestra } from '../sonarMuestra';
import {
  INICIAL_ORDENAR,
  pendientes,
  reducirOrdenar,
  type AccionOrdenar,
  type EstadoOrdenar,
} from '../maquinaOrdenar';

/**
 * Tipo «ordenar»: colocar una secuencia por altura, duración o forma.
 *
 * Se toca en secuencia; no se arrastra nada. Cada elemento suena al tocarlo, así que la
 * comparación la hace el oído. Y colocar mal NO se impide: se coloca, y al comprobar se
 * devuelve lo que estaba fuera de sitio. Impedirlo convertiría esto en un cerrojo.
 *
 * Reglas en `../maquinaOrdenar.ts`, vigiladas por `tests/ordenar.test.ts`.
 */

interface Elemento {
  clave: string;
  icono?: string;
  etiqueta?: string;
  audio?: string;
}

export default function Ordenar({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    elementos: Elemento[];
    /** Claves en el orden correcto. Es la solución, y no se manda al cliente cifrada:
     *  esto es una biblioteca educativa, no un examen. */
    orden: string[];
  };

  const carril = useCarril(actividad.etapa);
  const tam = OBJETIVO_TACTIL[carril];
  const yaTerminada = useRef(false);

  const [estado, despachar] = useReducer(
    (e: EstadoOrdenar, a: AccionOrdenar) => reducirOrdenar(e, a, contenido.orden),
    INICIAL_ORDENAR,
  );

  const porClave = (clave: string) => contenido.elementos.find((e) => e.clave === clave);
  const sinColocar = pendientes(
    contenido.elementos.map((e) => e.clave),
    estado.colocadas,
  );

  // Tras enseñar lo que estaba fuera de sitio, se vuelve solo. Hay tiempo de sobra para
  // mirarlo: meter prisa a un niño que acaba de equivocarse es lo que CLAUDE.md §4 prohíbe.
  useEffect(() => {
    if (estado.fase !== 'revisando') return;
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), 2200);
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.intentos]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      aciertos: contenido.orden.length,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar, contenido.orden.length]);

  const listo = estado.colocadas.length === contenido.orden.length;

  function ficha(clave: string, i: number | null) {
    const e = porClave(clave);
    const mal = i !== null && estado.fueraDeSitio.includes(i);
    return (
      <button
        key={clave}
        type="button"
        className="boton-actividad ordenar__ficha"
        style={{ minWidth: tam, minHeight: tam }}
        data-estado={mal ? 'fuera-de-sitio' : 'normal'}
        aria-disabled={estado.fase !== 'colocando' || undefined}
        onClick={() => {
          if (e?.audio) sonarMuestra(e.audio);
          if (i === null) despachar({ tipo: 'colocar', clave });
        }}
      >
        {e?.icono && <Icono nombre={e.icono} tamano={Math.round(tam * 0.45)} />}
        <span className="boton__texto">{e?.etiqueta ? t(e.etiqueta) : ''}</span>
      </button>
    );
  }

  return (
    <section className="actividad ordenar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <ol className="ordenar__fila" aria-label={t('ordenar.colocadas')}>
        {estado.colocadas.map((clave, i) => (
          <li key={clave}>{ficha(clave, i)}</li>
        ))}
        {estado.colocadas.length === 0 && <li className="ordenar__hueco" aria-hidden="true" />}
      </ol>

      <div className="ordenar__banco" role="group" aria-label={t('ordenar.pordolocar')}>
        {sinColocar.map((clave) => ficha(clave, null))}
      </div>

      <div className="ordenar__acciones">
        <button
          type="button"
          className="boton-repetir"
          aria-disabled={estado.colocadas.length === 0 || estado.fase !== 'colocando' || undefined}
          onClick={() => despachar({ tipo: 'deshacer' })}
        >
          {t('ordenar.deshacer')}
        </button>
        <button
          type="button"
          className="boton-repetir"
          aria-disabled={!listo || estado.fase !== 'colocando' || undefined}
          onClick={() => despachar({ tipo: 'comprobar' })}
        >
          {t('ordenar.comprobar')}
        </button>
      </div>

      <p className="feedback" aria-live="polite">
        {estado.fase === 'revisando' && t('ordenar.casi')}
        {estado.fase === 'completada' && t('comun.completada')}
      </p>

      <progress
        value={estado.colocadas.length}
        max={contenido.orden.length}
        aria-label={t('comun.progreso')}
      />
    </section>
  );
}
