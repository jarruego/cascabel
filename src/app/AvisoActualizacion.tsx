import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { aplicarActualizacion, prefetchPersonajes, vigilarActualizaciones } from './sinConexion';
import { decidirActualizacion } from '@/motor/actualizacion';

/**
 * Aviso de versión nueva.
 *
 * `registerType: 'prompt'` en `vite.config.ts` significa que el service worker nuevo NO
 * toma el mando solo. Es deliberado: una app que se recarga sola a mitad de una actividad,
 * delante de veinticinco niños, es peor que una app desactualizada.
 *
 * Se comprueba al arrancar, al recuperar el foco —como mucho cada dos minutos— y cada
 * media hora. Y si la versión nueva aparece nada más abrir la app, fuera de una actividad,
 * se aplica en el acto sin preguntar: es el único momento en que recargar no molesta a
 * nadie, y lo que hace que una PWA instalada se ponga al día en el siguiente arranque en
 * vez de quedarse días con la versión vieja. La regla está en `motor/actualizacion.ts`.
 */
export function AvisoActualizacion() {
  const [hay, setHay] = useState(false);

  useEffect(
    () =>
      vigilarActualizaciones(() => {
        const decision = decidirActualizacion({
          msDesdeArranque: performance.now(),
          ruta: window.location.pathname,
        });
        if (decision === 'aplicar') void aplicarActualizacion();
        else setHay(true);
      }),
    [],
  );

  /*
    Las poses de personaje que no van en el precache se bajan aquí, en los ratos muertos y
    solo si la conexión no es de pago ni lenta. Va en este componente porque es el único que
    vive durante toda la sesión y no pinta nada la mayor parte del tiempo.
  */
  useEffect(() => prefetchPersonajes(), []);

  if (!hay) return null;

  return (
    <div className="aviso-actualizacion" role="status">
      <span>{t('actualizacion.hay')}</span>
      <button type="button" className="boton-principal" onClick={() => void aplicarActualizacion()}>
        {t('actualizacion.aplicar')}
      </button>
      {/* Se puede cerrar. Quien está a mitad de clase decide cuándo, no nosotros. */}
      <button type="button" className="enlace-boton" onClick={() => setHay(false)}>
        {t('comun.ahoraNo')}
      </button>
    </div>
  );
}
