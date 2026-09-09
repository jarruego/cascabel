import { BarraAcciones } from './BarraAcciones';
import { Personaje } from './Personaje';
import type { Personaje as NombrePersonaje } from './personajes';
import { IconoRepetir, IconoSiguiente } from './Simbolos';
import { t } from '@/i18n';
import type { Calidad } from '@/motor/serie';

/**
 * El cierre de una actividad con varios ejercicios: cómo ha ido cada uno, en palabras.
 *
 * Sustituye a la modal de «¡Muy bien!» en las actividades que son una serie, porque ahí
 * hay algo que decir además de «terminada»: qué salió y qué conviene volver a hacer.
 *
 * **Sin cifras.** Una fila por ejercicio con su nombre y una de tres palabras —bien, casi,
 * hecho—, y el personaje celebrando si todo salió o animando si algo costó. «Casi» no es un
 * suspenso: es el ejercicio que el botón grande propone repetir. Los números, si los hay,
 * van a la hoja del maestro, como siempre.
 */
export function ResumenSerie({
  personaje = 'dora',
  filas,
  alRepetirCasi,
  alRepetirTodo,
  alTerminar,
}: {
  personaje?: NombrePersonaje;
  filas: Array<{ titulo: string; calidad: Calidad }>;
  alRepetirCasi: () => void;
  alRepetirTodo: () => void;
  alTerminar: () => void;
}) {
  const hayCasi = filas.some((f) => f.calidad === 'casi');
  return (
    <section className="resumen-serie" aria-labelledby="resumen-titulo">
      <Personaje nombre={personaje} pose={hayCasi ? 'anima' : 'celebra'} tamano={110} />
      <h2 id="resumen-titulo">{t(hayCasi ? 'serie.tituloCasi' : 'serie.tituloBien')}</h2>
      <ol className="resumen-serie__filas">
        {filas.map((f, i) => (
          <li key={i} className="resumen-serie__fila" data-calidad={f.calidad}>
            {/* La forma acompaña al color: un tic, un círculo a medias, un punto. */}
            <span className="resumen-serie__marca" aria-hidden="true">
              {f.calidad === 'bien' ? '✓' : f.calidad === 'casi' ? '◐' : '•'}
            </span>
            <span className="resumen-serie__nombre">{f.titulo}</span>
            <span className="resumen-serie__calidad">{t(`serie.${f.calidad}`)}</span>
          </li>
        ))}
      </ol>

      <BarraAcciones>
        {hayCasi ? (
          <>
            <button type="button" className="boton-principal boton-arranque" onClick={alRepetirCasi}>
              <IconoRepetir />
              {t('serie.repetirCasi')}
            </button>
            <button type="button" className="boton-repetir" onClick={alTerminar}>
              <IconoSiguiente />
              {t('comun.terminar')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="boton-principal" onClick={alTerminar}>
              <IconoSiguiente />
              {t('comun.terminar')}
            </button>
            <button type="button" className="boton-repetir" onClick={alRepetirTodo}>
              <IconoRepetir />
              {t('serie.enteraOtraVez')}
            </button>
          </>
        )}
        {hayCasi && (
          <button type="button" className="boton-repetir" onClick={alRepetirTodo}>
            <IconoRepetir />
            {t('serie.enteraOtraVez')}
          </button>
        )}
      </BarraAcciones>
    </section>
  );
}
