import { useCallback, useEffect, useReducer, useRef } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { sonarMuestra, sonarNota, sonarSeguidos } from '../sonarMuestra';
import {
  INICIAL_EMPAREJAR,
  reducirEmparejar,
  type AccionEmparejar,
  type EstadoEmparejar,
  type ParejaResuelta,
} from '../maquinaEmparejar';

/**
 * Tipo «emparejar»: dos columnas, se tocan de dos en dos.
 *
 * Toque sucesivo y nunca arrastre. Al tocar el segundo elemento **suenan los dos seguidos**:
 * la corrección la hace el oído del niño, no un aspa roja. Ver docs/04-DISENO-UI.md.
 *
 * Las reglas viven en `../maquinaEmparejar.ts` y las vigila `tests/emparejar.test.ts`.
 */

interface Elemento {
  clave: string;
  icono?: string;
  etiqueta?: string;
  audio?: string;
  /**
   * Nota que suena al tocar este elemento, en notación científica. Alternativa a `audio`
   * cuando lo que hay que oír es una altura y no una muestra concreta: el sampler la
   * transporta, así que no hace falta un fichero por nota.
   */
  nota?: string;
  /**
   * Imagen propia, servida desde nuestro origen. La usan los diagramas de digitación de
   * flauta, que no son iconos: un icono es un símbolo pequeño y esto es un dibujo que hay
   * que leer, con siete agujeros que se distinguen o no se distinguen.
   */
  imagen?: string;
  /** Texto alternativo de esa imagen. Obligatorio si hay imagen: si no, no se pone. */
  alt?: string;
}

export default function Emparejar({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    izquierda: Elemento[];
    derecha: Elemento[];
    parejas: ParejaResuelta[];
  };

  const carril = useCarril(actividad.etapa);
  const tam = OBJETIVO_TACTIL[carril];
  const yaTerminada = useRef(false);

  const [estado, despachar] = useReducer(
    (e: EstadoEmparejar, a: AccionEmparejar) => reducirEmparejar(e, a, contenido.parejas),
    INICIAL_EMPAREJAR,
  );

  const porClave = useCallback(
    (clave: string): Elemento | undefined =>
      [...contenido.izquierda, ...contenido.derecha].find((e) => e.clave === clave),
    [contenido.izquierda, contenido.derecha],
  );

  // La autocorrección: al cerrar una pareja suenan los dos, acierte o no. Oírlos juntos
  // es la información; que uno de los dos sea el equivocado se aprende oyéndolo.
  useEffect(() => {
    if (estado.fase !== 'comprobando' || !estado.ultima) return;
    const rutas = [estado.ultima.izquierda, estado.ultima.derecha]
      .map((c) => porClave(c)?.audio)
      .filter((r): r is string => Boolean(r));
    void sonarSeguidos(rutas);
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), 1400);
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.ultima, porClave]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      aciertos: contenido.parejas.length,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar, contenido.parejas.length]);

  function columna(elementos: Elemento[], lado: 'izquierda' | 'derecha') {
    return (
      <ul className="emparejar__columna">
        {elementos.map((e) => {
          const resuelta = estado.resueltas.includes(e.clave);
          const elegida = estado.seleccion === e.clave;
          return (
            <li key={e.clave}>
              <button
                type="button"
                className="boton-actividad emparejar__ficha"
                style={{ minWidth: tam, minHeight: tam }}
                // aria-disabled y no `disabled`: quitar el foco a media actividad deja
                // perdido a quien navega con teclado.
                aria-disabled={resuelta || estado.fase !== 'eligiendo' || undefined}
                aria-pressed={elegida}
                data-estado={resuelta ? 'resuelta' : elegida ? 'elegida' : 'libre'}
                onClick={() => {
                  // Suena al tocarlo: así el primer toque ya da información.
                  if (!resuelta) {
                    if (e.audio) sonarMuestra(e.audio);
                    else if (e.nota) void sonarNota(e.nota);
                  }
                  despachar({ tipo: 'tocar', clave: e.clave, lado });
                }}
              >
                {e.imagen && (
                  <img
                    className="emparejar__imagen"
                    src={e.imagen}
                    alt={e.alt ? t(e.alt) : ''}
                    height={Math.round(tam * 1.5)}
                  />
                )}
                {e.icono && <Icono nombre={e.icono} tamano={Math.round(tam * 0.45)} />}
                <span className="boton__texto">{e.etiqueta ? t(e.etiqueta) : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="actividad emparejar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <div className="emparejar__tablero">
        {columna(contenido.izquierda, 'izquierda')}
        {columna(contenido.derecha, 'derecha')}
      </div>

      <p className="feedback" aria-live="polite">
        {estado.ultima?.acierto === true && t('comun.bien')}
        {estado.ultima?.acierto === false && t('comun.escuchaOtraVez')}
        {estado.fase === 'completada' && t('comun.completada')}
      </p>

      <progress
        value={estado.resueltas.length / 2}
        max={contenido.parejas.length}
        aria-label={t('comun.progreso')}
      />
    </section>
  );
}
