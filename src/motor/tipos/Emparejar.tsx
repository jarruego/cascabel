import { useCallback, useEffect, useReducer, useRef } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { pistaPara } from '../maquinaEleccion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { sonarMuestra, sonarNota, sonarSeguidos } from '../sonarMuestra';
import { sonarEstimulo } from '../sonarEstimulo';
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
  /** Duraciones en pulsos con el clic: para emparejar una figura con su silencio. */
  ritmo?: number[];
  /** Signo musical en Unicode, con Bravura, cuando la ficha ES notación. */
  signo?: string;
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
    /**
     * Timbre con el que suenan las notas de esta actividad. Ver `audio/instrumentos.ts`.
     *
     * Importa más de lo que parece: la actividad de digitaciones de flauta sonaba con la
     * marimba de por defecto, o sea un ejercicio para aprender dónde van los dedos de la
     * flauta que no sonaba a flauta.
     */
    instrumento?: string;
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
                    else if (e.nota) void sonarNota(e.nota, contenido.instrumento);
                    else if (e.ritmo) {
                      void sonarEstimulo(
                        { ritmo: e.ritmo, respuesta: '' },
                        { tempo: actividad.practica?.tempo },
                      );
                    }
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
                {e.signo && (
                  <span className="boton__signo" style={{ fontSize: Math.round(tam * 0.5) }} aria-hidden="true">
                    {e.signo}
                  </span>
                )}
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
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div className="emparejar__tablero">
        {columna(contenido.izquierda, 'izquierda')}
        {columna(contenido.derecha, 'derecha')}
      </div>

      {/* Sin botonera: aquí no hay ninguna acción SOBRE la actividad. Se juega tocando las
          fichas, y una barra vacía abajo sería una franja de pantalla perdida. */}
      <Reaccion
        tono={
          estado.ultima?.acierto === false
            ? 'casi'
            : estado.ultima?.acierto === true
              ? 'bien'
              : 'neutro'
        }
        personaje={actividad.personaje}
      >
        {estado.ultima?.acierto === true && t('comun.bien')}
        {/* La pista de esta actividad si la trae, y si no la frase de siempre. Es lo que
            distingue «escucha otra vez» de «escucha los dos seguidos: ¿se parecen?». */}
        {estado.ultima?.acierto === false &&
          t(pistaPara(actividad.pistas, estado.fallosAqui) ?? 'comun.escuchaOtraVez')}
      </Reaccion>

      {/* Sin barra de progreso: el tablero se vacía solo: las parejas resueltas se quedan fijas y las que faltan son las que quedan.
          Una barra que repite lo que ya se ve es ruido y quita sitio. */}
    </section>
  );
}
