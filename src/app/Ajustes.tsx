import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { t } from '@/i18n';
import { borrarTodo, leerTodo } from '@/datos/progreso';
import {
  borrarDescarga,
  descargarTodo,
  tamanoDescargado,
  type EstadoDescarga,
} from './sinConexion';

/**
 * Ajustes. Está pensada **para el adulto**, no para el niño: aquí se decide si descargar
 * para el aula sin wifi y se borra el progreso.
 *
 * El botón de borrar es lo que permite decirle a una familia «puedes borrarlo todo tú,
 * ahora, sin pedírnoslo». Por eso está a la vista y no escondido tras tres menús.
 */

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Ajustes() {
  const [descarga, setDescarga] = useState<EstadoDescarga>({
    fase: 'inactiva',
    hechos: 0,
    total: 0,
    bytes: 0,
  });
  const [ocupado, setOcupado] = useState(0);
  const [actividades, setActividades] = useState(0);
  const [borrado, setBorrado] = useState(false);

  const refrescar = useCallback(() => {
    void tamanoDescargado().then(setOcupado);
    void leerTodo().then((r) => setActividades(r.length));
  }, []);

  useEffect(refrescar, [refrescar]);

  return (
    <main className="ajustes">
      <Link to="/" className="atras">
        {t('comun.atras')}
      </Link>

      <h1>{t('ajustes.titulo')}</h1>

      <section>
        <h2>{t('ajustes.sinConexion')}</h2>
        <p>{t('ajustes.sinConexionTexto')}</p>

        <button
          type="button"
          className="boton-repetir"
          aria-disabled={descarga.fase === 'descargando' || undefined}
          onClick={() => {
            void descargarTodo(setDescarga).then(refrescar);
          }}
        >
          {t('ajustes.descargar')}
        </button>

        {descarga.fase === 'descargando' && (
          <p aria-live="polite">
            <progress value={descarga.hechos} max={descarga.total || 1} />{' '}
            {descarga.hechos} / {descarga.total} · {mb(descarga.bytes)}
          </p>
        )}
        {descarga.fase === 'lista' && <p aria-live="polite">{t('ajustes.descargaLista')}</p>}
        {descarga.fase === 'fallo' && <p aria-live="polite">{t('ajustes.descargaFallo')}</p>}

        {ocupado > 0 && (
          <p>
            {t('ajustes.ocupa')} <strong>{mb(ocupado)}</strong>{' '}
            <button
              type="button"
              className="enlace-boton"
              onClick={() => void borrarDescarga().then(refrescar)}
            >
              {t('ajustes.borrarDescarga')}
            </button>
          </p>
        )}
      </section>

      <section>
        <h2>{t('ajustes.progreso')}</h2>
        {/* Se dice exactamente qué se guarda. No es un formalismo: es lo que permite que
            un maestro se lo explique a una familia sin tener que creerse nada. */}
        <p>{t('ajustes.progresoTexto')}</p>
        <p>
          {t('ajustes.progresoCuenta')} <strong>{actividades}</strong>
        </p>
        <button
          type="button"
          className="boton-repetir"
          onClick={() => {
            void borrarTodo().then(() => {
              setBorrado(true);
              refrescar();
            });
          }}
        >
          {t('ajustes.borrarProgreso')}
        </button>
        {borrado && <p aria-live="polite">{t('ajustes.borradoHecho')}</p>}
      </section>

      <section>
        <h2>{t('ajustes.calibracion')}</h2>
        <p>{t('ajustes.calibracionTexto')}</p>
        <Link to="/calibracion" className="boton-repetir">
          {t('ajustes.irCalibracion')}
        </Link>
      </section>

      <section>
        <h2>{t('ajustes.privacidad')}</h2>
        <p>{t('ajustes.privacidadTexto')}</p>
      </section>
    </main>
  );
}
