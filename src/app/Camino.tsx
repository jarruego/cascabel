import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarCamino, cargarIndice } from '@/datos/cargar';
import { despertarAudio } from '@/audio/AudioEngine';
import { leerTodo } from '@/datos/progreso';
import { haceCuanto, queRepasar, type Sugerencia } from '@/motor/repaso';
import { t } from '@/i18n';
import type { Etapa } from '@/config';

/**
 * El camino: en qué orden haría esto un maestro.
 *
 * **Y no bloquea nada, a propósito.** Es lo primero que hay que decir porque es lo primero
 * que se espera de una pantalla con esta forma. `CLAUDE.md` §1 dice que Cascabel «es una
 * biblioteca, no un método cerrado»: aquí no hay desbloqueos, ni candados, ni un paso que
 * exija el anterior. Cualquier actividad se abre el primer día. Lo único que cambia según lo
 * que se haya hecho es una marca de «ya lo abriste», que es orientación, no premio.
 *
 * **Por qué existe igualmente.** Sesenta y tantas actividades con filtros curriculares son
 * perfectas para el maestro que sabe qué busca y son un muro para el que llega sin saber por
 * dónde empezar. El dosier señala esto como el defecto que hunde a las colecciones de
 * juguetes sueltos: hay de todo y no hay un hilo. El hilo es esto.
 *
 * **Lo que se evita deliberadamente**, y son justo las cosas que hacen adictiva una app de
 * idiomas: no hay racha, no hay porcentaje de camino completado, no hay puntos, no hay nada
 * que se pierda por dejarlo una semana. `CLAUDE.md` §4: el error nunca castiga, y no
 * volver tampoco.
 *
 * **De Duolingo sí se coge una cosa, y es la que tiene evidencia detrás**: que un contenido
 * vuelva justo antes de olvidarse. Eso no es una recompensa, es un calendario. Sale arriba
 * como sugerencia —«hace un mes que no...»— y desaparece cuando no hay nada que sugerir. Las
 * reglas están en `motor/repaso.ts`, con test.
 */

interface Paso {
  titulo: string;
  idea: string;
  actividades: string[];
}

interface Recorrido {
  etapa: Etapa;
  titulo: string;
  resumen: string;
  pasos: Paso[];
}

export default function Camino() {
  const [caminos, setCaminos] = useState<Recorrido[] | null>(null);
  const [titulos, setTitulos] = useState<Map<string, string>>(new Map());
  const [hechas, setHechas] = useState<Set<string>>(new Set());
  const [repasar, setRepasar] = useState<Sugerencia[]>([]);
  const [fallo, setFallo] = useState(false);
  const [abierto, setAbierto] = useState<Etapa | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([cargarCamino(), cargarIndice()])
      .then(([c, i]) => {
        if (!vivo) return;
        setCaminos(c.caminos);
        setTitulos(new Map(i.actividades.map((a) => [a.id, a.titulo])));
        // Se abre la primera etapa y ya está. Abrir las cuatro deja una pantalla de
        // setenta enlaces, que es el muro del que esto viene a sacar a nadie.
        setAbierto(c.caminos[0]?.etapa ?? null);
      })
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    void leerTodo().then((r) => {
      setHechas(new Set(r.filter((x) => x.completada).map((x) => x.actividadId)));
      // El día se saca aquí y no dentro de `queRepasar`: así la regla es una función pura
      // a la que se le puede pasar cualquier fecha, y el test no depende del reloj.
      setRepasar(queRepasar(r, new Date().toISOString().slice(0, 10)));
    });
  }, []);

  if (fallo) {
    return (
      <main className="catalogo">
        <p role="alert">{t('catalogo.fallo')}</p>
      </main>
    );
  }
  if (!caminos) {
    return (
      <main className="catalogo">
        <p>{t('catalogo.cargando')}</p>
      </main>
    );
  }

  return (
    <main className="catalogo camino">
      <h1>{t('nav.camino')}</h1>
      {/* Dicho en la primera línea y no escondido en un pie: quien ve una pantalla así
          asume que hay candados, y hay que quitarle la idea antes de que la coja. */}
      <p className="catalogo__aclaracion">{t('camino.noBloquea')}</p>

      {/* Solo aparece si hay algo que sugerir. Una sección vacía con un «nada pendiente»
          sería un marcador, y aquí no hay marcadores. */}
      {repasar.length > 0 && (
        <section className="camino__repaso">
          <h2>{t('repaso.titulo')}</h2>
          <p>{t('repaso.explicacion')}</p>
          <ul>
            {repasar.map((r) => {
              const cuando = haceCuanto(r.diasDesde);
              return (
                <li key={r.actividadId}>
                  <Link
                    to={`/actividad/${r.actividadId}`}
                    className="camino__enlace"
                    onClick={() => void despertarAudio().catch(() => {})}
                  >
                    {titulos.get(r.actividadId) ?? r.actividadId}
                    <span className="camino__cuando">
                      {t(cuando.clave).replace('{n}', String(cuando.cantidad))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {caminos.map((c) => {
        const desplegado = abierto === c.etapa;
        return (
          <section key={c.etapa} className="camino__etapa">
            <h2>
              <button
                type="button"
                className="camino__cabecera"
                aria-expanded={desplegado}
                onClick={() => setAbierto(desplegado ? null : c.etapa)}
              >
                <span>{c.titulo}</span>
                <span className="camino__flecha" aria-hidden="true">
                  {desplegado ? '▾' : '▸'}
                </span>
              </button>
            </h2>

            {desplegado && (
              <>
                <p className="camino__resumen">{c.resumen}</p>
                <ol className="camino__pasos">
                  {c.pasos.map((paso, i) => (
                    <li key={paso.titulo} className="camino__paso">
                      {/* El número es la posición en el camino, no una nota ni un nivel.
                          Se puede empezar por el cuatro. */}
                      <span className="camino__numero" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className="camino__cuerpo">
                        <h3 className="camino__titulo">{paso.titulo}</h3>
                        <p className="camino__idea">{paso.idea}</p>
                        <ul className="camino__actividades">
                          {paso.actividades.map((id) => (
                            <li key={id}>
                              <Link
                                to={`/actividad/${id}`}
                                className="camino__enlace"
                                data-hecha={hechas.has(id) || undefined}
                                onClick={() => void despertarAudio().catch(() => {})}
                              >
                                {/* La marca lleva texto además del símbolo: un tic verde
                                    solo sería color informando por su cuenta (§6). */}
                                {hechas.has(id) && (
                                  <span className="camino__hecha">{t('camino.hecha')}</span>
                                )}
                                {titulos.get(id) ?? id}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        );
      })}

      <p className="pista-fija">{t('camino.paraElMaestro')}</p>
    </main>
  );
}
