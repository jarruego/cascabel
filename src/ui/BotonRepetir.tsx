import { IconoRepetir } from '@/ui/Simbolos';
import { t } from '@/i18n';

/**
 * Siempre visible y siempre en el mismo sitio. Los niños quieren oír las cosas cinco
 * veces; esconder este botón detrás de un menú es uno de los errores más caros de
 * las apps infantiles.
 *
 * Llevaba un emoji de altavoz y era el último que quedaba en toda la interfaz: el resto del
 * vocabulario se dibuja en `ui/Simbolos.tsx` para que un símbolo signifique lo mismo en las
 * veintiuna pantallas y no dependa de qué tipografía de emojis tenga el aparato. Un altavoz
 * decía además otra cosa de la que hace: esto no sube el volumen, vuelve a poner lo que
 * acaba de sonar. La flecha en círculo es la de «otra vez» en la tabla de símbolos.
 */
export function BotonRepetir({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="boton-repetir" onClick={onClick}>
      <IconoRepetir />
      <span>{t('comun.repetir')}</span>
    </button>
  );
}
