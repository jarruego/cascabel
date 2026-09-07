import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cargarActividad } from '@/datos/cargar';
import { t, existe } from '@/i18n';
import { Icono } from '@/ui/Icono';
import { APP, carrilPorDefecto, OBJETIVO_TACTIL } from '@/config';
import type { Actividad } from '@/motor/tipos';

/**
 * Dosier imprimible del maestro, generado **desde el mismo JSON** que ejecuta la actividad.
 *
 * **No es la actividad en papel, y ese fue el error de la primera versión.** Lo que hace
 * valiosa a una actividad de pantalla es justamente lo que no se puede imprimir: que suena,
 * que responde y que se autocorrige. Una fotocopia de eso es una fotocopia de lo que sobra.
 * Lo que sí se traslada al papel —y lo que un maestro necesita de verdad— es el **criterio**:
 * cómo llevarla al aula, qué proponer después, qué mirar mientras la hacen y qué parte del
 * currículo cubre para poder justificarla en la programación.
 *
 * Tres hojas, cada una con un lector y un momento distintos:
 *
 *  1. **Cómo llevarla al aula.** Se lee antes de la clase, de pie y con prisa. Va primero lo
 *     que hay que decidir —cuánto dura, qué hace falta, si se puede sin dispositivos— y
 *     después las propuestas.
 *  2. **Currículo.** Se consulta al programar o cuando hay que justificar algo. Mantiene
 *     **separadas las dos capas** de `CLAUDE.md` §9: lo normativo se cita literal, y la
 *     práctica («negra», «4/4») va aparte y marcada como convención, no como currículo.
 *  3. **Hoja de seguimiento.** Se rellena a mano durante o después de la clase.
 *
 * **Sobre los datos de los niños.** La hoja de seguimiento tiene una columna de nombres, y
 * eso no contradice la regla 3: ese papel es del maestro, se escribe a mano y **no entra en
 * la aplicación jamás**. La regla prohíbe que nosotros tratemos datos personales, no que un
 * maestro tome notas en su cuaderno. Va dicho impreso en la propia hoja para que no haya
 * duda de quién custodia ese papel.
 *
 * Sin librería de PDF: el navegador ya sabe imprimir, y meter jsPDF serían trescientos
 * kilobytes para hacer peor lo que el sistema hace bien.
 */

const ETAPA: Record<string, string> = {
  infantil: 'etapa.infantil',
  'primaria-c1': 'etapa.c1',
  'primaria-c2': 'etapa.c2',
  'primaria-c3': 'etapa.c3',
};

/** Traduce si existe la clave; si no, devuelve el texto tal cual. */
function tr(clave: string | undefined): string {
  if (!clave) return '';
  return existe(clave) ? t(clave) : clave;
}

/**
 * Texto de tipo de actividad. Cada tipo tiene su guía —cómo funciona, cómo hacerla sin
 * dispositivos, qué proponer para ampliar y para reforzar, y qué observar—, y una actividad
 * concreta puede sobreescribir cualquiera de ellos desde su JSON con el bloque `ficha`.
 *
 * Que la guía venga del TIPO y no de cada actividad es lo mismo que hace el motor con los
 * componentes: escribir 53 dosieres a mano habría envejecido igual de mal que escribir 53
 * componentes.
 */
function guia(actividad: Actividad, campo: string): string {
  const propio = (actividad.ficha as Record<string, string> | undefined)?.[campo];
  if (propio) return tr(propio);
  const porTipo = `ficha.tipo.${actividad.tipo}.${campo}`;
  return existe(porTipo) ? t(porTipo) : '';
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

  const c = actividad.contenido as Record<string, unknown>;
  const pasos = c.pasos as Array<{ titulo: string; detalle?: string; duracion?: string }> | undefined;
  const materiales = c.materiales as string[] | undefined;
  const carril = carrilPorDefecto(actividad.etapa);
  const conMicrofono = actividad.entrada.modo.startsWith('microfono');

  /**
   * Identidad de la actividad y atribución, como **marca de agua en el margen** de cada
   * página impresa.
   *
   * Estaban dentro de cada hoja, y repetir tres veces el mismo título y la misma atribución
   * costaba casi cuatro centímetros de alto en un documento donde el alto es justo lo que
   * escasea. Al imprimir se colocan con `position: fixed` y desplazamiento negativo, así que
   * **caen dentro del margen de `@page`**: se ven en todas las páginas y no ocupan ni una
   * línea del contenido.
   *
   * La atribución tiene que ir impresa igualmente: la CC BY-SA obliga también en papel, y es
   * lo que permite que otro maestro sepa de dónde salió la hoja. Que no ocupe sitio no
   * significa que pueda faltar.
   */
  const marcas = (
    <>
      <p className="ficha__marca ficha__marca--sup">
        {t(ETAPA[actividad.etapa] ?? '')} · {t(`eje.${actividad.eje}`)} · {actividad.titulo}
      </p>
      <p className="ficha__marca ficha__marca--inf">
        <span>
          {APP.nombre} · {APP.proyecto} · CC BY-SA 4.0
        </span>
        <span>{actividad.id}</span>
      </p>
    </>
  );

  /**
   * Título de cada hoja. Solo la primera lleva `h1`: el documento es uno, aunque se imprima
   * en tres páginas, y tres `h1` le dicen a un lector de pantalla que hay tres documentos.
   */
  const tituloHoja = (hoja: number, clave: string) => (
    <header className="ficha__cabecera">
      <div>
        {hoja === 1 ? (
          <>
            <p className="ficha__sobretitulo">
              {t(ETAPA[actividad.etapa] ?? '')} · {t(`eje.${actividad.eje}`)}
            </p>
            <h1>{actividad.titulo}</h1>
            <p className="ficha__subtitulo">{t(clave)}</p>
          </>
        ) : (
          <h2 className="ficha__tituloHoja">{t(clave)}</h2>
        )}
      </div>
      <p className="ficha__hojaNum" aria-hidden="true">
        {hoja}/3
      </p>
    </header>
  );

  return (
    <main className="ficha">
      <div className="no-imprimir ficha__barra">
        <Link to={`/actividad/${id}`} className="atras">
          {t('comun.atras')}
        </Link>
        <button type="button" className="boton-repetir" onClick={() => window.print()}>
          <Icono nombre="lupa" tamano={24} /> {t('ficha.imprimir')}
        </button>
        <p className="ficha__consejo">{t('ficha.consejo')}</p>
      </div>

      {marcas}

      {/* ───────────── Hoja 1: cómo llevarla al aula ───────────── */}
      <article className="ficha__hoja">
        {tituloHoja(1, 'ficha.hoja1')}

        {/*
          Lo primero es lo que hay que decidir antes de entrar en clase, no la explicación.
          Un maestro que mira esta hoja de pie necesita saber en tres segundos si le cabe en
          la sesión y si le hace falta algo que no tiene.
        */}
        <dl className="ficha__ficha-tecnica">
          <div>
            <dt>{t('ficha.duracion')}</dt>
            <dd>{actividad.duracion_min ? `${actividad.duracion_min} min` : '—'}</dd>
          </div>
          <div>
            <dt>{t('ficha.donde')}</dt>
            <dd>{t(`ficha.lugar.${actividad.lugar ?? 'pantalla'}`)}</dd>
          </div>
          <div>
            <dt>{t('ficha.microfono')}</dt>
            <dd>{conMicrofono ? t('ficha.micOpcional') : t('ficha.micNo')}</dd>
          </div>
          <div>
            <dt>{t('ficha.agrupamiento')}</dt>
            <dd>{t(actividad.tipo === 'guia-aula' ? 'ficha.grupoClase' : 'ficha.grupoIndividual')}</dd>
          </div>
        </dl>

        {actividad.descripcion && <p className="ficha__entradilla">{actividad.descripcion}</p>}

        <section>
          <h2>{t('ficha.comoFunciona')}</h2>
          <p>{guia(actividad, 'comoFunciona')}</p>
          {actividad.enunciado && (
            <p className="ficha__consigna">
              <strong>{t('ficha.loQueSeDice')}</strong> «{t(actividad.enunciado)}»
            </p>
          )}
        </section>

        {/* Los pasos solo los tienen las guías de aula, y ahí SON la actividad. */}
        {pasos && (
          <section>
            <h2>{t('ficha.pasos')}</h2>
            <ol className="ficha__pasos">
              {pasos.map((p) => (
                <li key={p.titulo}>
                  <strong>{tr(p.titulo)}</strong>
                  {p.duracion && <span className="ficha__duracion"> · {p.duracion}</span>}
                  {p.detalle && <div>{tr(p.detalle)}</div>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="ficha__propuestas">
          <h2>{t('ficha.propuestas')}</h2>
          <div className="ficha__dosColumnas">
            <div>
              <h3>{t('ficha.sinPantalla')}</h3>
              <p>{guia(actividad, 'sinPantalla')}</p>
            </div>
            <div>
              <h3>{t('ficha.ampliacion')}</h3>
              <p>{guia(actividad, 'ampliacion')}</p>
            </div>
            <div>
              <h3>{t('ficha.refuerzo')}</h3>
              <p>{guia(actividad, 'refuerzo')}</p>
            </div>
            <div>
              <h3>{t('ficha.observar')}</h3>
              <p>{guia(actividad, 'observar')}</p>
            </div>
          </div>
        </section>

        {materiales && materiales.length > 0 && (
          <section>
            <h2>{t('ficha.materiales')}</h2>
            <ul className="ficha__materiales">
              {materiales.map((m) => (
                <li key={m}>{tr(m)}</li>
              ))}
            </ul>
          </section>
        )}

      </article>

      {/* ───────────── Hoja 2: currículo ───────────── */}
      <article className="ficha__hoja">
        {tituloHoja(2, 'ficha.hoja2')}

        <section>
          <h2>{t('ficha.curriculo')}</h2>
          {/*
            Capa NORMATIVA: literal del real decreto. Aquí no se parafrasea nada, y si un
            criterio no está confirmado se imprime el hueco en vez de inventarlo.
          */}
          <table className="ficha__tabla">
            <tbody>
              <tr>
                <th scope="row">{t('ficha.area')}</th>
                <td>{actividad.curriculo.area}</td>
              </tr>
              <tr>
                <th scope="row">{t('ficha.competencia')}</th>
                <td>{actividad.curriculo.competencia ?? t('ficha.sinConfirmar')}</td>
              </tr>
              <tr>
                <th scope="row">{t('ficha.criterioLargo')}</th>
                <td>{actividad.curriculo.criterio ?? t('ficha.sinConfirmar')}</td>
              </tr>
              <tr>
                <th scope="row">{t('ficha.saber')}</th>
                <td>{actividad.curriculo.saber ?? t('ficha.sinConfirmar')}</td>
              </tr>
            </tbody>
          </table>
          <p className="ficha__aclaracion">{t('ficha.avisoNormativo')}</p>
        </section>

        {actividad.practica && (
          <section>
            <h2>{t('ficha.practica')}</h2>
            {/*
              Capa de PRÁCTICA, separada a propósito. «Negra» y «4/4» son convención
              pedagógica: el real decreto no nombra ninguna figura. Mezclar las dos capas es
              lo que hace que una programación no se sostenga cuando alguien la revisa.
            */}
            <ul className="ficha__practica">
              {actividad.practica.compas && (
                <li>
                  <strong>{t('ficha.compas')}</strong> {actividad.practica.compas}
                </li>
              )}
              {actividad.practica.tempo && (
                <li>
                  <strong>{t('ficha.tempo')}</strong> {actividad.practica.tempo} ppm
                </li>
              )}
              {actividad.practica.figuras && actividad.practica.figuras.length > 0 && (
                <li>
                  <strong>{t('ficha.figuras')}</strong> {actividad.practica.figuras.join(', ')}
                </li>
              )}
              {actividad.practica.secuencia && actividad.practica.secuencia !== 'ninguna' && (
                <li>
                  <strong>{t('ficha.secuencia')}</strong> {actividad.practica.secuencia}
                </li>
              )}
            </ul>
            <p className="ficha__aclaracion">{t('ficha.avisoPractica')}</p>
          </section>
        )}

        <section>
          <h2>{t('ficha.accesibilidad')}</h2>
          <ul className="ficha__practica">
            <li>{t('ficha.accTactil').replace('{px}', String(OBJETIVO_TACTIL[carril]))}</li>
            {conMicrofono && <li>{t('ficha.accMicrofono')}</li>}
            <li>{t('ficha.accColor')}</li>
            <li>{t('ficha.accAudio')}</li>
          </ul>
        </section>

        {actividad.creditos && actividad.creditos.length > 0 && (
          <section>
            <h2>{t('ficha.creditos')}</h2>
            <ul className="ficha__creditos">
              {actividad.creditos.map((cr) => (
                <li key={cr.obra}>
                  <strong>{cr.obra}</strong> — {cr.autor} · {cr.licencia}
                </li>
              ))}
            </ul>
          </section>
        )}

      </article>

      {/* ───────────── Hoja 3: seguimiento ───────────── */}
      <article className="ficha__hoja">
        {tituloHoja(3, 'ficha.hoja3')}

        <section>
          <h2>{t('ficha.seguimiento')}</h2>
          <p className="ficha__entradilla">{t('ficha.seguimientoIntro')}</p>

          {/* Solo fecha y grupo: la app no recoge ninguno de los dos, se escriben a mano. */}
          <div className="ficha__datos">
            <span>{t('ficha.fecha')} ____ / ____ / ______</span>
            <span>{t('ficha.grupo')} ______________________</span>
          </div>

          {/*
            Tres indicadores y no cinco: una rejilla que no se puede rellenar mientras das
            clase no se rellena nunca. Los indicadores salen del eje de la actividad, así que
            son distintos en una de pulso y en una de altura.
          */}
          <table className="ficha__seguimiento">
            <thead>
              <tr>
                <th scope="col" className="ficha__colNombre">
                  {t('ficha.alumno')}
                </th>
                <th scope="col">{guia(actividad, 'indicador1') || t('ficha.ind1')}</th>
                <th scope="col">{guia(actividad, 'indicador2') || t('ficha.ind2')}</th>
                <th scope="col">{guia(actividad, 'indicador3') || t('ficha.ind3')}</th>
                <th scope="col" className="ficha__colNotas">
                  {t('ficha.notas')}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }, (_, i) => (
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

          <p className="ficha__leyenda">{t('ficha.leyenda')}</p>
          {/* Va impreso: es la diferencia entre «la app no guarda datos» y «este papel es
              tuyo», y las dos cosas hay que decirlas. */}
          <p className="ficha__aclaracion">{t('ficha.avisoDatos')}</p>
        </section>

      </article>
    </main>
  );
}
