import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cargarActividad } from '@/datos/cargar';
import { duracionLegible } from '@/motor/duracion';
import { codigoDe } from '@/motor/codigo';
import { t, existe } from '@/i18n';
import { Icono } from '@/ui/Icono';
import { APP } from '@/config';
import type { Actividad } from '@/motor/tipos';

/**
 * La ficha del maestro, generada **desde el mismo JSON** que ejecuta la actividad.
 *
 * **No es la actividad en papel.** Lo que hace valiosa a una actividad de pantalla es lo
 * que no se puede imprimir: que suena, que responde y que se autocorrige. Lo que sí va al
 * papel es el **criterio**: qué se aprende, cómo llevarla al aula paso a paso, la música
 * con la que se trabaja, cómo sacarle más y qué mirar mientras la hacen.
 *
 * **Dos caras de una sola hoja**, y es una decisión del autor (2026-09-12): «me gusta que
 * las fichas se puedan imprimir por las dos caras en una sola hoja». La cara 1 es para dar
 * la clase y la 2 para sacarle más y anotar. Una tercera solo si una actividad no cabe de
 * ninguna manera, y antes de eso se acorta.
 *
 * **La ficha es de esta actividad y de ninguna otra.** No nombra la anterior ni la
 * siguiente del camino: se lee sola, sin la app delante. Y va **sin paja**: fuera el
 * apartado de accesibilidad (es cómo está hecha la app, no algo que el maestro haga), fuera
 * los avisos sobre capas normativas y datos, que están en `docs/`. Lo único que se queda
 * por obligación es la atribución CC BY-SA del pie, en pequeño.
 *
 * **Sobre los datos de los niños.** La hoja de seguimiento tiene una columna de nombres, y
 * eso no contradice la regla 3: ese papel es del maestro, se escribe a mano y **no entra en
 * la aplicación jamás**. Va dicho en una frase del pie.
 *
 * Los textos de cada apartado salen del bloque `ficha` del JSON, escrito para esa actividad;
 * si falta alguno, se cae a la guía genérica del tipo (`ficha.tipo.<tipo>.<campo>`), que es
 * lo que hace que ninguna ficha salga con un hueco. Sin librería de PDF: el navegador ya
 * sabe imprimir. La partitura la dibuja abcjs, cargada solo aquí y solo si hay ABC.
 */

const ETAPA: Record<string, string> = {
  infantil: 'etapa.infantil',
  'primaria-c1': 'etapa.c1',
  'primaria-c2': 'etapa.c2',
  'primaria-c3': 'etapa.c3',
};

/** Lo que una actividad puede traer escrito para su ficha. Todo opcional. */
interface FichaPropia {
  aprende?: string;
  vocabulario?: string[];
  agrupamiento?: string;
  material?: string;
  pasos?: Array<{ min?: number; titulo: string; detalle?: string }>;
  enPantalla?: string;
  sinPantalla?: string;
  masFacil?: string;
  masDificil?: string;
  variante?: { titulo: string; texto: string };
  ideas?: string[];
  loTiene?: string[];
  errores?: Array<{ error: string; remedio: string }>;
  indicadores?: string[];
  // Los campos de la primera ficha, que siguen valiendo como respaldo.
  comoFunciona?: string;
  ampliacion?: string;
  refuerzo?: string;
  observar?: string;
  indicador1?: string;
  indicador2?: string;
  indicador3?: string;
}

/** Las columnas de seguimiento cuando ni la actividad ni su tipo dicen otras. */
const INDICADORES_DE_RESPALDO = ['ficha.ind1', 'ficha.ind2', 'ficha.ind3'] as const;

/** Traduce si existe la clave; si no, devuelve el texto tal cual. */
function tr(clave: string | undefined): string {
  if (!clave) return '';
  return existe(clave) ? t(clave) : clave;
}

/** El texto de un campo: el propio de la actividad, o el de su tipo. */
function guia(actividad: Actividad, propio: string | undefined, campoDelTipo: string): string {
  if (propio) return tr(propio);
  const clave = `ficha.tipo.${actividad.tipo}.${campoDelTipo}`;
  return existe(clave) ? t(clave) : '';
}

/** El texto de una duración, ya traducido. Igual que en el itinerario. */
function cuantoDura(minutos: number): string {
  const { clave, valores } = duracionLegible(minutos);
  return t(clave, valores);
}

/**
 * La partitura, dibujada con abcjs a partir del ABC del JSON. Se carga aquí y solo aquí:
 * es la única pantalla que la necesita, y son ciento y pico kilobytes que no tienen por qué
 * ir en el bundle de las actividades.
 */
function Partitura({ abc }: { abc: string }) {
  const el = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const abcjs = await import('abcjs');
        if (cancelado || !el.current) return;
        abcjs.renderAbc(el.current, abc, {
          responsive: 'resize',
          staffwidth: 700,
          paddingtop: 0,
          paddingbottom: 0,
          paddingleft: 0,
          paddingright: 0,
        });
      } catch {
        // Sin abcjs la ficha se imprime igual: la letra y el texto siguen ahí.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [abc]);
  return <div className="ficha__partitura" ref={el} aria-label={t('ficha.musica')} />;
}

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

  const f = (actividad.ficha ?? {}) as FichaPropia;
  const c = actividad.contenido as Record<string, unknown>;
  const conMicrofono = actividad.entrada.modo.startsWith('microfono');
  const herramienta = Boolean(actividad.herramienta);
  const lugar = existe(`ficha.lugar.${actividad.lugar}`) ? t(`ficha.lugar.${actividad.lugar}`) : actividad.lugar;
  const abc = actividad.musica?.abc;

  // Los pasos: los escritos para la ficha, o los de la guía de aula, que ahí SON la actividad.
  const pasosGuia = c.pasos as Array<{ titulo: string; detalle?: string; duracion?: string }> | undefined;
  const pasos =
    f.pasos ??
    pasosGuia?.map((p) => ({ min: Number.parseInt(p.duracion ?? '', 10) || undefined, titulo: tr(p.titulo), detalle: tr(p.detalle) }));

  const enPantalla = guia(actividad, f.enPantalla ?? f.comoFunciona, 'comoFunciona');
  const sinPantalla = guia(actividad, f.sinPantalla, 'sinPantalla');
  const masFacil = guia(actividad, f.masFacil ?? f.refuerzo, 'refuerzo');
  const masDificil = guia(actividad, f.masDificil ?? f.ampliacion, 'ampliacion');
  const loTiene = f.loTiene ?? [guia(actividad, f.observar, 'observar')].filter(Boolean);
  const indicadores = [0, 1, 2].map(
    (i) =>
      f.indicadores?.[i] ||
      guia(actividad, f[`indicador${i + 1}` as 'indicador1'], `indicador${i + 1}`) ||
      t(INDICADORES_DE_RESPALDO[i]!),
  );
  const creditos = (actividad.creditos ?? [])
    .map((cr) => `${cr.obra}${cr.autor ? `, ${cr.autor}` : ''} (${cr.licencia})`)
    .join(' · ');

  /**
   * Cabecera y pie de cada cara, en el margen: gris, pequeño y lejos del contenido. Con
   * `position: fixed` se repiten en cada página impresa sin gastar una línea. El pie lleva
   * el logotipo de cocomusic y su dirección, que en el papel es lo único que lleva al resto
   * del material, y la atribución, que la CC BY-SA obliga también en papel.
   */
  const marcas = (cara: number) => (
    <>
      <p className="ficha__marca ficha__marca--sup" aria-hidden="true">
        <span>
          {t(ETAPA[actividad.etapa] ?? '')} · {t(`eje.${actividad.eje}`)} · {actividad.titulo}
        </span>
        <span>{t('ficha.hojaDe', { n: cara, m: 2 })}</span>
      </p>
      <p className="ficha__marca ficha__marca--inf">
        <span className="ficha__logo">
          <img src="/marca/cocomusic.png" alt="" width="24" height="13" />
          <a href={APP.webProyecto} target="_blank" rel="noopener">
            cocomusic.es
          </a>{' '}
          · {APP.nombre} · CC BY-SA 4.0
        </span>
        <span>{actividad.id}</span>
      </p>
    </>
  );

  return (
    <main className="ficha">
      <div className="no-imprimir ficha__barra">
        <Link to={`/actividad/${id}`} className="atras">
          {t('comun.atras')}
        </Link>
        <button type="button" className="boton-principal" onClick={() => window.print()}>
          <Icono nombre="lupa" tamano={24} /> {t('ficha.imprimir')}
        </button>
        <p className="ficha__consejo">{t('ficha.consejo')}</p>
      </div>

      {/* ───────────── Cara 1: dar la clase ───────────── */}
      <article className="ficha__hoja">
        {marcas(1)}
        <p className="ficha__sobre">
          <span className="codigo">{codigoDe(actividad.id)}</span> · {t(ETAPA[actividad.etapa] ?? '')} ·{' '}
          {t(`eje.${actividad.eje}`)}
        </p>
        <h1>{actividad.titulo}</h1>
        {actividad.descripcion && <p className="ficha__entradilla">{actividad.descripcion}</p>}

        {/* La ficha técnica: seis datos con su etiqueta, para leer uno sin leer los demás.
            Estaban en una línea seguida y «2/4 · 72 ppm» no se sabía de qué era. */}
        <dl className="ficha__tecnica">
          <div>
            <dt>{t('ficha.duracion')}</dt>
            <dd>{actividad.duracion_min ? cuantoDura(actividad.duracion_min) : '—'}</dd>
          </div>
          <div>
            <dt>{t('ficha.donde')}</dt>
            <dd>{lugar}</dd>
          </div>
          <div>
            <dt>{t('ficha.microfono')}</dt>
            <dd>{conMicrofono ? t('ficha.micOpcional') : t('ficha.micNo')}</dd>
          </div>
          <div>
            <dt>{t('ficha.agrupamiento')}</dt>
            <dd>{f.agrupamiento ?? (actividad.tipo === 'guia-aula' ? t('ficha.grupoClase') : t('ficha.grupoIndividual'))}</dd>
          </div>
          <div>
            <dt>{t('ficha.compasTempo')}</dt>
            <dd>
              {actividad.practica?.compas && actividad.practica.compas !== 'libre' ? actividad.practica.compas : '—'}
              {actividad.practica?.tempo ? ` · ${actividad.practica.tempo} ppm` : ''}
            </dd>
          </div>
          <div>
            <dt>{t('ficha.material')}</dt>
            <dd>{f.material ?? t('ficha.sinMaterial')}</dd>
          </div>
        </dl>

        {(f.aprende || f.vocabulario?.length) && (
          <section>
            <h2>{t('ficha.aprende')}</h2>
            {f.aprende && <p className="ficha__aprende">{f.aprende}</p>}
            {f.vocabulario && f.vocabulario.length > 0 && (
              <ul className="ficha__vocab">
                {f.vocabulario.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section>
          <h2>{t('ficha.comoVa')}</h2>
          {actividad.enunciado && (
            <div className="ficha__consigna">
              <p className="ficha__sobre ficha__sobre--consigna">{t('ficha.loQueOye')}</p>
              <p>«{t(actividad.enunciado)}»</p>
            </div>
          )}
          {pasos && pasos.length > 0 && (
            <ol className="ficha__pasos">
              {pasos.map((p, i) => (
                <li key={i}>
                  <span className="ficha__min">{p.min ? `${p.min}′` : ''}</span>
                  <span>
                    <b>{p.titulo}</b>
                    {p.detalle ? ` ${p.detalle}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {(abc || actividad.letra) && (
          <section>
            <h2>{t('ficha.musica')}</h2>
            {abc && <Partitura abc={abc} />}
            {actividad.letra && (
              <p className="ficha__letra" lang={actividad.letra.idioma}>
                {actividad.letra.texto}
              </p>
            )}
            {actividad.letra?.fuente && <p className="ficha__nota">{actividad.letra.fuente}</p>}
          </section>
        )}

        {enPantalla && (
          <section>
            <h2>{t('ficha.enPantalla')}</h2>
            <p>{enPantalla}</p>
          </section>
        )}
      </article>

      {/* ───────────── Cara 2: sacarle más y anotar ───────────── */}
      <article className="ficha__hoja">
        {marcas(2)}

        <section>
          <h2>{t('ficha.sacarMas')}</h2>
          <div className="ficha__bloques">
            {sinPantalla && (
              <div>
                <h3>{t('ficha.sinPantalla')}</h3>
                <p>{sinPantalla}</p>
              </div>
            )}
            {masFacil && (
              <div>
                <h3>{t('ficha.masFacil')}</h3>
                <p>{masFacil}</p>
              </div>
            )}
            {masDificil && (
              <div>
                <h3>{t('ficha.masDificil')}</h3>
                <p>{masDificil}</p>
              </div>
            )}
            {f.variante && (
              <div>
                <h3>{f.variante.titulo}</h3>
                <p>{f.variante.texto}</p>
              </div>
            )}
          </div>
          {f.ideas && f.ideas.length > 0 && (
            <>
              <h3 className="ficha__ideasTitulo">{t('ficha.ideas')}</h3>
              <ul className="ficha__lista">
                {f.ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        {(loTiene.length > 0 || f.errores?.length) && (
          <section>
            <h2>{t('ficha.queMirar')}</h2>
            <div className="ficha__mirar">
              {loTiene.length > 0 && (
                <div>
                  <p className="ficha__sobre">{t('ficha.loTiene')}</p>
                  <ul className="ficha__lista">
                    {loTiene.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {f.errores && f.errores.length > 0 && (
                <div>
                  <p className="ficha__sobre">{t('ficha.errores')}</p>
                  <ul className="ficha__lista">
                    {f.errores.map((e) => (
                      <li key={e.error}>
                        <b>{e.error}</b> → {e.remedio}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <h2>{t('ficha.curriculo')}</h2>
          <dl className="ficha__curri">
            <dt>{t('ficha.competencia')}</dt>
            <dd>
              {actividad.curriculo.competencia ?? t('ficha.sinConfirmar')} · {actividad.curriculo.area}
            </dd>
            <dt>{t('ficha.criterioLargo')}</dt>
            <dd>{actividad.curriculo.criterio ?? t('ficha.sinConfirmar')}</dd>
            <dt>{t('ficha.saber')}</dt>
            <dd>{actividad.curriculo.saber ?? t('ficha.sinConfirmar')}</dd>
            {actividad.practica && (actividad.practica.figuras?.length || actividad.practica.notas?.length || actividad.practica.compas) && (
              <>
                <dt>{t('ficha.practica')}</dt>
                <dd>
                  {[
                    actividad.practica.compas && actividad.practica.compas !== 'libre' ? actividad.practica.compas : '',
                    actividad.practica.figuras?.join(', ') ?? '',
                    actividad.practica.notas?.join(' ') ?? '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </>
            )}
            {actividad.practica?.metodo && actividad.practica.metodo.length > 0 && (
              <>
                <dt>{t('ficha.metodo')}</dt>
                <dd>{actividad.practica.metodo.join(', ')}</dd>
              </>
            )}
          </dl>
        </section>

        {!herramienta && (
          <section>
            <h2>{t('ficha.seguimiento')}</h2>
            {/* Solo fecha y grupo: la app no recoge ninguno de los dos, se escriben a mano. */}
            <div className="ficha__datos">
              <span>{t('ficha.fecha')} ____ / ____ / ______</span>
              <span>{t('ficha.grupo')} ______________________</span>
            </div>
            {/* Tres indicadores y no cinco: una rejilla que no se puede rellenar mientras das
                clase no se rellena nunca. Salen de «qué mirar». */}
            <table className="ficha__seguimiento">
              <thead>
                <tr>
                  <th scope="col" className="ficha__colNombre">
                    {t('ficha.alumno')}
                  </th>
                  {indicadores.map((ind, i) => (
                    <th scope="col" key={i}>
                      {ind}
                    </th>
                  ))}
                  <th scope="col" className="ficha__colNotas">
                    {t('ficha.notas')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => (
                  <tr key={i}>
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <p className="ficha__nota ficha__pie">
          {!herramienta && `${t('ficha.leyenda')} `}
          {t('ficha.pie')}
          {creditos ? ` ${creditos}.` : ''}
        </p>
      </article>
    </main>
  );
}
