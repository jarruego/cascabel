import { useCallback, useMemo, useReducer, useRef, type ComponentType } from 'react';
import { PasoEntreEjercicios } from '@/ui/ModalesActividad';
import { ResumenSerie } from '@/ui/ResumenSerie';
import { t } from '@/i18n';
import type { Actividad, PropsActividad, ResultadoActividad } from '../tipos';
import {
  actual,
  calidadDeResultado,
  calidadGlobal,
  ejerciciosDe,
  inicialSerie,
  llevaPausa,
  reducirSerie,
  type AccionSerie,
  type EstadoSerie,
} from '../serie';
import { variar } from '../variaciones';

/**
 * Convierte un tipo de un solo ejercicio en un tipo de serie.
 *
 * El componente de dentro no sabe nada de series: recibe una actividad cuyo `contenido` es
 * **el ejercicio que toca**, y avisa con `alTerminar` cuando acaba. Esto lo monta con una
 * clave nueva por ejercicio y por vuelta —así arranca de cero, que es más fiable que
 * pedirle a cada motor que sepa reiniciarse—, pone la pausa entre ejercicios, y al final el
 * cierre. Las reglas están en `serie.ts` y `variaciones.ts`, con test.
 *
 * Una actividad sin `ejercicios` es una serie de uno, y entonces esto no cambia nada de lo
 * que se ve: ni pausa ni cierre, la modal de siempre.
 */
export function conSerie(Uno: ComponentType<PropsActividad>, tipo: string) {
  return function Serie({ actividad, alTerminar, alSalir }: PropsActividad) {
    const ejercicios = useMemo(
      () => ejerciciosDe(actividad.contenido as Record<string, unknown>),
      [actividad.contenido],
    );
    const total = ejercicios.length;
    const [serie, despachar] = useReducer(
      (e: EstadoSerie, a: AccionSerie) => reducirSerie(e, a, total),
      total,
      inicialSerie,
    );
    const acumulado = useRef<ResultadoActividad[]>([]);
    const cerrada = useRef(false);

    const indice = actual(serie);
    const ejercicio = useMemo(
      () => ({
        ...variar(tipo, ejercicios[indice] ?? {}, serie.vuelta),
        // Para que el botón de empezar diga «Empezar · 2 de 4»: es el único sitio donde
        // sale el número, como se decidió con las vueltas.
        serie: total > 1 ? { n: serie.posicion + 1, total: serie.orden.length } : undefined,
      }),
      [ejercicios, indice, serie.vuelta, serie.posicion, serie.orden.length, total],
    );
    const actividadDelEjercicio = useMemo<Actividad>(
      () => ({ ...actividad, contenido: ejercicio }),
      [actividad, ejercicio],
    );

    const terminarEjercicio = useCallback(
      (r: ResultadoActividad) => {
        if (total <= 1) {
          alTerminar(r);
          return;
        }
        acumulado.current.push(r);
        despachar({ tipo: 'terminar', calidad: calidadDeResultado(r) });
        // Quien ya ha enseñado su resultado y ha esperado al «siguiente» no pasa por la
        // pausa: al siguiente ejercicio directamente. En el último, «seguir» no hace nada.
        if (!llevaPausa(tipo)) despachar({ tipo: 'seguir' });
      },
      [alTerminar, total],
    );

    // Con un solo ejercicio no hay serie: se pinta el motor tal cual.
    if (total <= 1) return <Uno actividad={actividad} alTerminar={alTerminar} alSalir={alSalir} />;

    if (serie.fase === 'resumen') {
      /*
        Se anota al llegar al cierre, no al pulsar «terminar»: si el niño se va desde el
        cierre sin tocar nada, la actividad está hecha igual. `cerrado` le dice al marco que
        el cierre ya es la celebración y que no abra la modal encima.
      */
      if (!cerrada.current) {
        cerrada.current = true;
        const todos = acumulado.current;
        const media = (campo: 'desvioMedioMs' | 'desviacionTipicaMs' | 'afinacionMediaCents') => {
          const v = todos.map((x) => x[campo]).filter((x): x is number => x !== undefined);
          return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
        };
        alTerminar({
          actividadId: actividad.id,
          completada: true,
          calidad: calidadGlobal(serie),
          cerrado: true,
          aciertos: todos.reduce((s, x) => s + (x.aciertos ?? 0), 0) || undefined,
          intentos: todos.reduce((s, x) => s + (x.intentos ?? 0), 0) || undefined,
          desvioMedioMs: media('desvioMedioMs'),
          desviacionTipicaMs: media('desviacionTipicaMs'),
          afinacionMediaCents: media('afinacionMediaCents'),
        });
      }
      return (
        <section className="actividad">
          <ResumenSerie
            personaje={actividad.personaje}
            filas={ejercicios.map((e, i) => ({
              titulo: e.titulo ? t(String(e.titulo)) : t('serie.ejercicio', { n: i + 1 }),
              calidad: serie.resultados[i] ?? 'hecho',
            }))}
            alRepetirCasi={() => {
              cerrada.current = false;
              despachar({ tipo: 'repetirCasi' });
            }}
            alRepetirTodo={() => {
              cerrada.current = false;
              despachar({ tipo: 'repetirTodo' });
            }}
            alTerminar={() => alSalir?.()}
          />
        </section>
      );
    }

    return (
      <>
        {/* El ejercicio que acaba se queda a la vista; su botonera y su tarjeta se esconden
            mientras el paso pone las suyas abajo, para que no haya dos. */}
        <div className="serie__ejercicio" data-entre={serie.fase === 'entre' || undefined}>
          <Uno
            key={`${indice}-${serie.vuelta}`}
            actividad={actividadDelEjercicio}
            alTerminar={terminarEjercicio}
            alSalir={alSalir}
          />
        </div>
        {serie.fase === 'entre' && (
          <PasoEntreEjercicios
            actual={serie.posicion + 1}
            total={serie.orden.length}
            // En «entre» la posición aún es la del ejercicio que acaba de terminar.
            calidad={serie.resultados[indice]}
            personaje={actividad.personaje}
            alSeguir={() => despachar({ tipo: 'seguir' })}
          />
        )}
      </>
    );
  };
}
