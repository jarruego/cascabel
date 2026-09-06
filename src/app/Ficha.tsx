import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cargarActividad } from '@/datos/cargar';
import { t } from '@/i18n';
import { Icono } from '@/ui/Icono';
import { APP } from '@/config';
import type { Actividad } from '@/motor/tipos';

/**
 * Ficha imprimible, generada **desde el mismo JSON** que ejecuta la actividad.
 *
 * No se usa ninguna librería de PDF: el navegador ya sabe imprimir a PDF, y meter jsPDF o
 * similar serían trescientos kilobytes en el bundle para hacer peor lo que el sistema hace
 * bien. Lo que faltaba no era un generador, era una vista pensada para papel.
 *
 * **Una ficha no es la pantalla en papel.** En pantalla hay un ejercicio interactivo; en
 * papel hace falta el enunciado, el contenido desplegado —todas las opciones, todos los
 * pasos— y sitio para escribir. Un maestro imprime esto para el aula sin dispositivos, que
 * el dosier marca como el escenario más probable de todos.
 */
export default function Ficha() {
  const { id = '' } = useParams();
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarActividad(id)
      .then((a) => vivo && setActividad(a))
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (fallo) return <main className="ficha"><p role="alert">{t('actividad.noEncontrada')}</p></main>;
  if (!actividad) return <main className="ficha"><p>{t('catalogo.cargando')}</p></main>;

  const c = actividad.contenido as Record<string, unknown>;
  const opciones = (c.opciones ?? c.elementos ?? c.izquierda) as
    | Array<{ clave: string; icono?: string; etiqueta?: string }>
    | undefined;
  const pasos = c.pasos as Array<{ titulo: string; detalle?: string; duracion?: string }> | undefined;
  const silabas = c.silabas as string[] | undefined;

  return (
    <main className="ficha">
      <div className="no-imprimir ficha__barra">
        <Link to={`/actividad/${id}`} className="atras">
          {t('comun.atras')}
        </Link>
        <button type="button" className="boton-repetir" onClick={() => window.print()}>
          <Icono nombre="lupa" tamano={24} /> {t('ficha.imprimir')}
        </button>
        <p className="ficha__consejo">{t('ficha.consejo')}</p>
      </div>

      <article className="ficha__hoja">
        <header className="ficha__cabecera">
          <h1>{actividad.titulo}</h1>
          {/* Espacio para nombre y fecha. No lo recoge la app: lo escribe el niño a mano
              en su papel, que es donde ese dato no supone ningún tratamiento. */}
          <div className="ficha__datos">
            <span>{t('ficha.nombre')} ______________________</span>
            <span>{t('ficha.fecha')} ____ / ____ / ______</span>
          </div>
        </header>

        {actividad.locucion?.enunciado && (
          <p className="ficha__enunciado">{t(actividad.locucion.enunciado)}</p>
        )}

        {/* Las opciones se despliegan todas: en papel no hay interacción que las revele. */}
        {opciones && opciones.length > 0 && (
          <section>
            <h2>{t('ficha.opciones')}</h2>
            <ul className="ficha__opciones">
              {opciones.map((o) => (
                <li key={o.clave}>
                  {o.icono && <Icono nombre={o.icono} tamano={40} />}
                  <span>{o.etiqueta ? t(o.etiqueta) : t(`opcion.${o.clave}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {silabas && (
          <section>
            <h2>{t('ficha.ritmo')}</h2>
            <p className="ficha__ritmo">{silabas.join('   ')}</p>
          </section>
        )}

        {pasos && (
          <section>
            <h2>{t('ficha.pasos')}</h2>
            <ol className="ficha__pasos">
              {pasos.map((p) => (
                <li key={p.titulo}>
                  <strong>{t(p.titulo)}</strong>
                  {p.duracion && <span className="ficha__duracion"> · {p.duracion}</span>}
                  {p.detalle && <div>{t(p.detalle)}</div>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="ficha__espacio">
          <h2>{t('ficha.escribe')}</h2>
          <div className="ficha__pauta" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </section>

        <footer className="ficha__pie">
          {/* La atribución va impresa: la CC BY-SA obliga a conservarla también en papel,
              y es lo que permite que otro maestro sepa de dónde salió la ficha. */}
          <span>
            {actividad.curriculo.competencia} · {t('ficha.criterio')}{' '}
            {actividad.curriculo.criterio ?? '—'}
          </span>
          <span>
            {APP.nombre} · {APP.proyecto} · CC BY-SA 4.0
          </span>
        </footer>
      </article>
    </main>
  );
}
