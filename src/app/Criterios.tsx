import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarCriterios, cargarIndice } from '@/datos/cargar';
import { t } from '@/i18n';
import type { Etapa } from '@/config';

/**
 * Los criterios del currículo y las actividades que abarca cada uno.
 *
 * **Es una pantalla provisional, y ocupa el sitio de Ajustes en la barra** a petición del
 * autor el 2026-09-10: mientras se revisa el etiquetado curricular, lo útil es ver de un
 * vistazo qué criterio cubre cada actividad y qué criterios se quedan sin nada. Ajustes
 * sigue existiendo: se llega por la rueda dentada que hay junto al título del catálogo.
 *
 * Dos capas y no se mezclan (`CLAUDE.md` §9): lo que sale aquí es la capa normativa —el
 * código de competencia y de criterio que declara cada JSON—, no la práctica. Los textos
 * de las competencias son los del real decreto; los resúmenes de los criterios de
 * Primaria no lo son todavía, y la pantalla lo dice.
 */

interface Entrada {
  id: string;
  titulo: string;
  etapa: Etapa;
  curriculo?: { competencia?: string | null; criterio?: string | null };
  herramienta?: boolean;
}

interface Criterio {
  codigo: string;
  competencia: string;
  resumen: string;
  literal: boolean;
}

interface EtapaCriterios {
  etapa: Etapa;
  titulo: string;
  area: string;
  competencias: Array<{ codigo: string; texto: string }>;
  criterios: Criterio[];
}

export default function Criterios() {
  const [etapas, setEtapas] = useState<EtapaCriterios[] | null>(null);
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([cargarCriterios(), cargarIndice()])
      .then(([c, i]) => {
        if (!vivo) return;
        setEtapas(c.etapas as EtapaCriterios[]);
        setEntradas(i.actividades as unknown as Entrada[]);
      })
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, []);

  if (fallo) {
    return (
      <main className="catalogo">
        <p role="alert">{t('catalogo.fallo')}</p>
      </main>
    );
  }
  if (!etapas || !entradas) {
    return (
      <main className="catalogo">
        <p>{t('catalogo.cargando')}</p>
      </main>
    );
  }

  return (
    <main className="catalogo criterios">
      <h1>{t('criterios.titulo')}</h1>
      <p className="catalogo__aclaracion">{t('criterios.texto')}</p>

      {etapas.map((e) => {
        const deLaEtapa = entradas.filter((a) => a.etapa === e.etapa);
        const sinCriterio = deLaEtapa.filter((a) => !a.curriculo?.criterio);
        return (
          <section key={e.etapa} className="criterios__etapa">
            <h2>{e.titulo}</h2>
            <p className="criterios__area">{e.area}</p>

            <h3>{t('criterios.competencias')}</h3>
            <ul className="criterios__competencias">
              {e.competencias.map((c) => (
                <li key={c.codigo}>
                  <strong>{c.codigo}</strong> {c.texto}
                </li>
              ))}
            </ul>

            <h3>{t('criterios.criterios')}</h3>
            {e.criterios.map((c) => {
              const actividades = deLaEtapa.filter((a) => a.curriculo?.criterio === c.codigo);
              return (
                <article key={c.codigo} className="criterios__criterio">
                  <h4>
                    <span className="criterios__codigo">{c.codigo}</span> · {c.competencia}
                    {!c.literal && <span className="criterios__aviso"> · {t('criterios.resumen')}</span>}
                  </h4>
                  <p>{c.resumen}</p>
                  {actividades.length === 0 ? (
                    <p className="criterios__vacio">{t('criterios.sinActividades')}</p>
                  ) : (
                    <ul className="criterios__actividades">
                      {actividades.map((a) => (
                        <li key={a.id}>
                          <Link to={`/actividad/${a.id}`}>{a.titulo}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}

            {sinCriterio.length > 0 && (
              <article className="criterios__criterio">
                <h4>{t('criterios.sinCriterio')}</h4>
                <ul className="criterios__actividades">
                  {sinCriterio.map((a) => (
                    <li key={a.id}>
                      <Link to={`/actividad/${a.id}`}>{a.titulo}</Link>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </section>
        );
      })}
    </main>
  );
}
