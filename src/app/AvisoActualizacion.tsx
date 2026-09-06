import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { aplicarActualizacion, vigilarActualizaciones } from './sinConexion';

/**
 * Aviso de versión nueva.
 *
 * `registerType: 'prompt'` en `vite.config.ts` significa que el service worker nuevo NO
 * toma el mando solo. Es deliberado: una app que se recarga sola a mitad de una actividad,
 * delante de veinticinco niños, es peor que una app desactualizada.
 *
 * Se comprueba al recuperar el foco y como mucho cada dos minutos. Un aula usa la app en
 * ráfagas de quince minutos; preguntar más a menudo solo molesta.
 */
export function AvisoActualizacion() {
  const [hay, setHay] = useState(false);

  useEffect(() => vigilarActualizaciones(() => setHay(true)), []);

  if (!hay) return null;

  return (
    <div className="aviso-actualizacion" role="status">
      <span>{t('actualizacion.hay')}</span>
      <button type="button" className="boton-repetir" onClick={() => void aplicarActualizacion()}>
        {t('actualizacion.aplicar')}
      </button>
      {/* Se puede cerrar. Quien está a mitad de clase decide cuándo, no nosotros. */}
      <button type="button" className="enlace-boton" onClick={() => setHay(false)}>
        {t('comun.ahoraNo')}
      </button>
    </div>
  );
}
