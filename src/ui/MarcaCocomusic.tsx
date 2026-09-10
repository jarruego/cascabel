import { APP } from '@/config';
import { t } from '@/i18n';

/**
 * «Un proyecto de cocomusic», con el logotipo y el enlace a la web.
 *
 * Cascabel es una herramienta más de cocomusic.es —no «su parte interactiva», y sin nombrar
 * a nadie: el creador es cocomusic, lo dijo el autor el 2026-09-10—, y hay que decirlo donde un
 * adulto lo busque: el pie del catálogo, los créditos, «acerca de» en Ajustes y la ficha
 * del maestro. **Nunca en la pantalla de actividad ni en su modal**: esa pantalla es del
 * niño y ahí no entra nada que no sea la actividad. Lo pidió el autor el 2026-09-10.
 *
 * El enlace abre en otra pestaña y no lleva nada: ni parámetros, ni referencia. Un enlace
 * no es una petición, así que la promesa de privacidad y la CSP quedan como están. El
 * logotipo se sirve desde nuestro origen (`public/marca/`) y es marca de cocomusic, fuera
 * de las licencias del código y del contenido: ver `TRADEMARK.md`.
 */
export function MarcaCocomusic({
  tamano = 'pequeno',
  conTexto = true,
}: {
  tamano?: 'pequeno' | 'grande';
  conTexto?: boolean;
}) {
  return (
    <a
      className="marca"
      data-tamano={tamano}
      href={APP.webProyecto}
      target="_blank"
      rel="noopener"
      aria-label={t('marca.abrir')}
    >
      {conTexto && <span className="marca__texto">{t('marca.proyectoDe')}</span>}
      <img className="marca__logo" src="/marca/cocomusic.png" alt={APP.proyecto} width={480} height={266} />
    </a>
  );
}
