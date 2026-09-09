import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarActividad, cargarIndice, cargarSonidos, type SonidoDelBanco } from '@/datos/cargar';
import { t } from '@/i18n';
import type { Actividad } from '@/motor/tipos';

/**
 * Créditos, **generados desde el campo `creditos` de cada actividad**, no escritos a mano.
 *
 * Es la única forma de que no mientan. Una lista mantenida aparte se desincroniza el día
 * que alguien añade una actividad con prisa, y entonces el proyecto está atribuyendo mal
 * material ajeno — que es justo lo que la licencia de ese material prohíbe.
 *
 * `THIRD-PARTY-NOTICES.md` sigue siendo el inventario auditable y completo; esto es lo que
 * ve quien usa la app.
 */

interface Credito {
  obra: string;
  autor?: string;
  fuente?: string;
  licencia: string;
}

/** Une créditos idénticos y anota en qué actividades aparece cada uno. */
function agrupar(entradas: Array<{ credito: Credito; actividad: string }>) {
  const mapa = new Map<string, { credito: Credito; actividades: string[] }>();
  for (const { credito, actividad } of entradas) {
    const clave = `${credito.obra}|${credito.autor ?? ''}|${credito.licencia}`;
    const previo = mapa.get(clave);
    if (previo) previo.actividades.push(actividad);
    else mapa.set(clave, { credito, actividades: [actividad] });
  }
  return [...mapa.values()].sort((a, b) => a.credito.obra.localeCompare(b.credito.obra, 'es'));
}

export default function Creditos() {
  const [grupos, setGrupos] = useState<ReturnType<typeof agrupar> | null>(null);
  const [fallo, setFallo] = useState(false);
  /*
    El banco de sonidos reales, sonido a sonido.

    Aquí no vale agrupar: la CC BY exige nombrar al autor de CADA grabación, y en el banco
    hay noventa autores distintos. La lista sale del manifiesto que la herramienta
    verificó contra Commons, así que dice exactamente lo que se comprobó, ni más ni menos.
  */
  const [sonidos, setSonidos] = useState<SonidoDelBanco[]>([]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const indice = await cargarIndice();
        /*
          Las setenta y ocho a la vez, no una detrás de otra.

          Estaba con un `await` dentro del bucle, así que la actividad setenta y ocho no
          empezaba a pedirse hasta que había llegado la setenta y siete: setenta y ocho
          viajes encadenados en la única pantalla que existe por una obligación legal. Son
          ficheros del propio origen y el navegador ya limita cuántos abre a la vez.

          El `catch` sigue siendo de cada una: una actividad ilegible no puede dejar en
          blanco los créditos de las demás, que son obligaciones que hay que mostrar igual.
        */
        const porActividad = await Promise.all(
          indice.actividades.map(async (e) => {
            try {
              const a = (await cargarActividad(e.id)) as Actividad;
              return (a.creditos ?? []).map((c) => ({
                credito: c as Credito,
                actividad: a.titulo,
              }));
            } catch {
              return [];
            }
          }),
        );
        if (vivo) setGrupos(agrupar(porActividad.flat()));
        try {
          const banco = await cargarSonidos();
          if (vivo) setSonidos(banco.sonidos.filter((x) => x.verificado));
        } catch {
          // Sin manifiesto no hay banco que enseñar, y los demás créditos siguen saliendo.
        }
      } catch {
        if (vivo) setFallo(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <main className="legal">
      <Link to="/" className="atras">
        {t('comun.atras')}
      </Link>

      <h1>{t('creditos.titulo')}</h1>
      <p>{t('creditos.texto')}</p>

      {fallo && <p role="alert">{t('creditos.fallo')}</p>}
      {!grupos && !fallo && <p>{t('catalogo.cargando')}</p>}

      {grupos && grupos.length === 0 && <p>{t('creditos.vacio')}</p>}

      {grupos && grupos.length > 0 && (
        <ul className="creditos__lista">
          {grupos.map(({ credito, actividades }) => (
            <li key={`${credito.obra}-${credito.licencia}`}>
              <strong>{credito.obra}</strong>
              {credito.autor && <> · {credito.autor}</>}
              <span className="creditos__licencia">{credito.licencia}</span>
              {credito.fuente && <div className="creditos__fuente">{credito.fuente}</div>}
              <div className="creditos__usos">
                {t('creditos.en')} {actividades.join(', ')}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sonidos.length > 0 && (
        <>
          <h2>{t('creditos.sonidos')}</h2>
          <p>{t('creditos.sonidosTexto')}</p>
          <ul className="creditos__lista creditos__banco">
            {sonidos.map((s) => (
              <li key={s.id}>
                <strong>{s.nombre}</strong>
                {s.verificado?.autor && <> · {s.verificado.autor}</>}
                <span className="creditos__licencia">{s.verificado?.licencia}</span>
                {s.verificado?.url && (
                  <div className="creditos__fuente">
                    <a href={s.verificado.url} rel="noreferrer">
                      {s.commons.replace(/^File:/, '')}
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>{t('creditos.software')}</h2>
      <p>{t('creditos.softwareTexto')}</p>

      <h2>{t('creditos.tipografias')}</h2>
      <p>{t('creditos.tipografiasTexto')}</p>

      <p className="legal__nota">{t('creditos.inventario')}</p>
    </main>
  );
}
