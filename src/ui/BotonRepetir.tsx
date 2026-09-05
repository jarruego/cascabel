import { t } from '@/i18n';

/**
 * Siempre visible y siempre en el mismo sitio. Los niños quieren oír las cosas cinco
 * veces; esconder este botón detrás de un menú es uno de los errores más caros de
 * las apps infantiles.
 */
export function BotonRepetir({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="boton-repetir" onClick={onClick}>
      <span aria-hidden="true">🔊</span>
      <span>{t('comun.repetir')}</span>
    </button>
  );
}
