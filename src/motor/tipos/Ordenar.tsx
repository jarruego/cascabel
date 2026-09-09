import { useEffect, useReducer, useRef } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { Reaccion } from '@/ui/Reaccion';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoComprobar, IconoTocar } from '@/ui/Simbolos';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import { pararMuestra, sonarMuestra, sonarNota } from '../sonarMuestra';
import { sonarEstimulo } from '../sonarEstimulo';
import { duracionDe } from '../estimulo';
import { pararTodo } from '@/audio/AudioEngine';
import { propsArrastre, zonaBajoPunto } from '@/ui/arrastrable';
import {
  inicial,
  pendientes,
  reducirOrdenar,
  type AccionOrdenar,
  type EstadoOrdenar,
} from '../maquinaOrdenar';

/**
 * Tipo «ordenar»: colocar una secuencia por altura, duración o forma.
 *
 * **Elegir y luego colocar.** Se toca un elemento —suena, y queda elegido—, y después se
 * toca la casilla donde va. Tocar otro elemento antes de colocar suena el otro y cambia la
 * elección: **escuchar todas las veces que haga falta no compromete nada**, y en una
 * actividad donde hay que comparar sonidos eso es la mitad del ejercicio. La versión
 * anterior colocaba al final con un solo toque, o sea que obligaba a decidir con el mismo
 * gesto con el que escuchabas.
 *
 * Un elemento ya colocado se recoge tocándolo, así que se puede reordenar cualquiera y no
 * hace falta ningún «deshacer» que solo dejaba corregir en orden inverso.
 *
 * Reglas en `../maquinaOrdenar.ts`, vigiladas por `tests/ordenar.test.ts`.
 */

interface Elemento {
  clave: string;
  icono?: string;
  etiqueta?: string;
  audio?: string;
  /** Nota que suena, para cuando lo que se compara es una altura y no una muestra. */
  nota?: string;
  /**
   * Duraciones en pulsos marcadas con el clic, para cuando lo que se ordena es cuánto dura
   * una figura: una blanca no tiene altura que oír, tiene dos pulsos.
   */
  ritmo?: number[];
  /** Signo musical en Unicode, con Bravura. Lo que se ve cuando la ficha ES notación. */
  signo?: string;
  /** Token de color, sin el `--`. Sirve para distinguir fichas, no para informar. */
  color?: string;
  /**
   * Forma del distintivo: círculo, cuadrado o triángulo.
   *
   * Va junto al color y no en su lugar. El color solo no valdría —regla 6— y aquí
   * distinguir una ficha de otra es toda la mecánica: hay que poder decir «la del cuadrado
   * va primera» sin verle el color. Y la forma es **arbitraria a propósito**: no sugiere
   * ningún orden, que es justo lo que sí hacían las palabras «grave, medio, agudo».
   */
  forma?: 'circulo' | 'cuadrado' | 'triangulo';
  /** Nombre accesible cuando no hay etiqueta. Describe lo que se VE, nunca la respuesta. */
  alt?: string;
}

export default function Ordenar({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    elementos: Elemento[];
    /** Claves en el orden correcto. Es la solución, y no se manda al cliente cifrada:
     *  esto es una biblioteca educativa, no un examen. */
    orden: string[];
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
    (e: EstadoOrdenar, a: AccionOrdenar) => reducirOrdenar(e, a, contenido.orden),
    contenido.orden.length,
    inicial,
  );

  const porClave = (c: string) => contenido.elementos.find((e) => e.clave === c);
  const sinColocar = pendientes(
    contenido.elementos.map((e) => e.clave),
    estado.casillas,
  );

  const tempo = actividad.practica?.tempo ?? 84;
  /**
   * Suena una ficha, y corta lo que estuviera sonando: dos figuras seguidas no se
   * superponen. Muestras y notas ya cortaban; los ritmos no, y en «De la más corta a la más
   * larga» tocar dos seguidas las mezclaba. Lo vio el autor el 2026-09-12.
   */
  const sonar = (clave: string) => {
    const e = porClave(clave);
    pararMuestra();
    pararTodo();
    if (e?.audio) sonarMuestra(e.audio);
    else if (e?.nota) void sonarNota(e.nota, contenido.instrumento);
    else if (e?.ritmo) {
      void sonarEstimulo({ ritmo: e.ritmo, respuesta: '' }, { tempo });
    }
  };
  /** Cuánto dura una ficha al sonar, en milisegundos: para encadenarlas sin pisarse. */
  const duraMs = (clave: string) => {
    const e = porClave(clave);
    if (e?.ritmo) return duracionDe({ ritmo: e.ritmo, respuesta: '' }, tempo) * 1000 + 150;
    return 700;
  };
  /** Los temporizadores de «escuchar»: se cancelan al volver a pulsar y al salir. */
  const cola = useRef<number[]>([]);
  const vaciarCola = () => {
    cola.current.forEach((id) => window.clearTimeout(id));
    cola.current = [];
  };
  useEffect(() => vaciarCola, []);

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

  const listo = estado.casillas.every((c) => c !== null);

  /** Una ficha, esté en la mano o colocada. */
  function ficha(clave: string, casilla: number | null) {
    const e = porClave(clave);
    const mal = casilla !== null && estado.fueraDeSitio.includes(casilla);
    const elegida = estado.elegida === clave;
    return (
      <button
        type="button"
        className="boton-actividad ordenar__ficha"
        data-estado={mal ? 'fuera-de-sitio' : 'normal'}
        data-elegida={elegida || undefined}
        style={{
          minWidth: tam,
          minHeight: tam,
          ...(e?.color ? { borderColor: `var(--${e.color})`, borderWidth: 4 } : {}),
        }}
        aria-label={e?.alt ? t(e.alt) : undefined}
        /* aria-pressed: para un lector de pantalla esto es un interruptor —está cogido o
           no lo está—, y decirlo así es lo que hace comprensible el «elegir y colocar». */
        aria-pressed={elegida}
        aria-disabled={estado.fase !== 'colocando' || undefined}
        {...propsArrastre({
          carril,
          clave,
          zonaEn: (x, y) => zonaBajoPunto(x, y),
          alSoltar: (c, destino) => {
            const indice = Number(destino);
            if (Number.isNaN(indice)) return;
            sonar(c);
            despachar({ tipo: 'elegir', clave: c });
            despachar({ tipo: 'colocar', indice });
          },
        })}
        onClick={() => {
          sonar(clave);
          despachar({ tipo: 'elegir', clave });
        }}
      >
        {e?.icono && <Icono nombre={e.icono} tamano={Math.round(tam * 0.45)} />}
        {e?.signo && (
          <span className="boton__signo" style={{ fontSize: Math.round(tam * 0.5) }} aria-hidden="true">
            {e.signo}
          </span>
        )}
        {e?.forma && (
          <span
            className="ordenar__forma"
            data-forma={e.forma}
            style={e.color ? { background: `var(--${e.color})` } : undefined}
            aria-hidden="true"
          />
        )}
        {e?.etiqueta && <span className="boton__texto">{t(e.etiqueta)}</span>}
      </button>
    );
  }

  return (
    <section className="actividad ordenar" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/*
        Las casillas van numeradas y visibles desde el principio. Ver los huecos vacíos es
        lo que convierte «tengo que acordarme de cuántos van» en «quedan dos», y permite
        colocar la tercera antes que la primera, que es como se ordena de verdad cuando se
        está comparando.
      */}
      <ol className="ordenar__casillas" aria-label={t('ordenar.colocadas')}>
        {estado.casillas.map((clave, i) => (
          <li key={i}>
            <span className="ordenar__numero" aria-hidden="true">
              {i + 1}
            </span>
            {clave ? (
              ficha(clave, i)
            ) : (
              <button
                type="button"
                className="ordenar__casilla"
                data-zona={String(i)}
                style={{ minWidth: tam, minHeight: tam }}
                aria-label={`${t('ordenar.casilla')} ${i + 1}`}
                aria-disabled={!estado.elegida || undefined}
                onClick={() => despachar({ tipo: 'colocar', indice: i })}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="ordenar__banco" role="group" aria-label={t('ordenar.porColocar')}>
        {sinColocar.map((clave) => (
          <span key={clave}>{ficha(clave, null)}</span>
        ))}
        {sinColocar.length === 0 && (
          <p className="estado-actividad">{t('ordenar.todasPuestas')}</p>
        )}
      </div>

      {/* Se queda porque CAMBIA durante la actividad: dice en qué punto estás, no
          qué hay que hacer. Lo segundo lo explica el personaje. */}
      <p className="estado-actividad">
        {estado.elegida ? t('ordenar.ahoraCasilla') : t('ordenar.tocaParaOir')}
      </p>

      <BarraAcciones>
        {/* Escuchar lo colocado, en orden y seguido. Es lo que convierte «creo que va así»
            en «ahora lo oigo»: comparar de dos en dos no dice si la serie entera sube. */}
        <button
          type="button"
          className="boton-repetir"
          aria-disabled={estado.casillas.every((c) => c === null) || undefined}
          onClick={() => {
            // Cada ficha empieza cuando acaba la anterior: una redonda dura más que 700 ms,
            // y con un paso fijo las largas se pisaban con la siguiente.
            vaciarCola();
            const puestas = estado.casillas.filter((c): c is string => c !== null);
            let cuando = 0;
            for (const clave of puestas) {
              cola.current.push(window.setTimeout(() => sonar(clave), cuando));
              cuando += duraMs(clave);
            }
          }}
        >
          <IconoTocar />
          {t('accion.escuchar')}
        </button>
        <button
          type="button"
          className="boton-principal"
          aria-disabled={!listo || estado.fase !== 'colocando' || undefined}
          onClick={() => despachar({ tipo: 'comprobar' })}
        >
          <IconoComprobar />
          {t('ordenar.comprobar')}
        </button>
      </BarraAcciones>

      <Reaccion
        tono={estado.fase === 'revisando' ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {/* Solo «casi». El «¡completada!» lo decía aquí y otra vez medio segundo después en
            la modal de enhorabuena, que es la que se queda: al terminar ya hay pantalla. */}
        {estado.fase === 'revisando' &&
          t(pistaPara(actividad.pistas, estado.fallosAqui) ?? 'ordenar.casi')}
      </Reaccion>

      {/* Sin barra de progreso: las casillas se van llenando a la vista, y son las mismas que hay que llenar.
          Una barra que repite lo que ya se ve es ruido y quita sitio. */}
    </section>
  );
}
