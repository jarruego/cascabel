import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MarcaCocomusic } from '@/ui/MarcaCocomusic';
import { APP } from '@/config';
import { cargarIndice } from '@/datos/cargar';
import { despertarAudio } from '@/audio/AudioEngine';
import { desmarcar, leerTodo } from '@/datos/progreso';
import { Modal } from '@/ui/Modal';
import { t } from '@/i18n';
import { encaja, palabrasDePractica, type PracticaBuscable } from './busqueda';
import { useVuelta } from './vuelta';
import { IconoAjustes } from '@/ui/Simbolos';
import { codigoDe } from '@/motor/codigo';
import type { Eje, TipoActividad } from '@/motor/tipos';
import type { Etapa } from '@/config';

/**
 * El índice de la biblioteca. **Ésta es la vista del maestro**, y por eso el filtro
 * principal es el criterio curricular y no una cuadrícula de iconos bonitos.
 *
 * El dosier señala esto como el defecto que hunde a Chrome Music Lab y a Aprendo Música:
 * cincuenta juguetes sueltos sin nada que los cosa. Aquí cada actividad nace con su
 * criterio asignado, y el maestro llega buscando «qué trabajo el criterio 3.1 en 2.º»,
 * no «qué juego pongo hoy».
 *
 * **Los filtros viven en la URL, y esa es la decisión de fondo de esta pantalla.** Estaban
 * en el estado del componente, así que abrir una actividad y volver los borraba: había que
 * volver a filtrar cada vez, y con setenta y siete actividades eso es abandonar la
 * búsqueda. En la URL se arreglan tres cosas de golpe, y ninguna hace falta programarla
 * aparte:
 *
 *  - **El botón «atrás» del navegador funciona**, porque cada filtro es una entrada del
 *    historial y volver restaura la anterior, con su posición de scroll incluida.
 *  - **Un filtro se puede compartir o guardar en favoritos.** «Todo lo del criterio 3.1 de
 *    segundo» pasa a ser un enlace que un maestro manda a otro por correo.
 *  - **No hay estado que sincronizar**, que es de donde salen la mitad de los errores de
 *    este tipo de pantalla.
 *
 * Es la misma idea que `datos/compartir.ts` aplica al progreso: si el estado cabe en una
 * URL, la URL es mejor sitio que la memoria.
 */

interface Entrada {
  id: string;
  titulo: string;
  etapa: Etapa;
  eje: Eje;
  tipo: TipoActividad;
  curriculo?: { competencia?: string | null; criterio?: string | null };
  estado?: string;
  /** Palabras por las que se busca y el título no dice. Ver `busqueda.ts`. */
  etiquetas?: string[];
  practica?: PracticaBuscable;
}

const ETAPAS: Array<{ valor: Etapa; clave: string }> = [
  { valor: 'infantil', clave: 'etapa.infantil' },
  { valor: 'primaria-c1', clave: 'etapa.c1' },
  { valor: 'primaria-c2', clave: 'etapa.c2' },
  { valor: 'primaria-c3', clave: 'etapa.c3' },
];

export default function Catalogo() {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hechas, setHechas] = useState<Set<string>>(new Set());
  /*
    La bienvenida: una tarjeta arriba del catálogo la primera vez, con el logotipo de
    cocomusic, una frase y el enlace, y «Entendido» para que no vuelva a salir. No es una
    pantalla que haya que cerrar para entrar —un maestro abre la app con la clase delante—
    sino una tarjeta que se puede ignorar. Que ya se ha visto se recuerda en el aparato,
    sin ningún dato personal; sin almacenamiento, no sale, que es lo menos molesto.
  */
  const [bienvenida, setBienvenida] = useState(() => {
    try {
      return localStorage.getItem('bienvenida:vista') !== 'si';
    } catch {
      return false;
    }
  });
  const cerrarBienvenida = () => {
    setBienvenida(false);
    try {
      localStorage.setItem('bienvenida:vista', 'si');
    } catch {
      // Volverá a salir la próxima vez, y nada más.
    }
  };
  /** La actividad cuyo tic se ha pulsado, a la espera de confirmar que se desmarca. */
  const [porDesmarcar, setPorDesmarcar] = useState<{ id: string; titulo: string } | null>(null);

  const [parametros, ponerParametros] = useSearchParams();
  const etapa = (parametros.get('etapa') ?? '') as Etapa | '';
  const eje = (parametros.get('eje') ?? '') as Eje | '';
  const criterio = parametros.get('crit') ?? '';
  const busqueda = parametros.get('q') ?? '';
  /* Esconder las ya hechas: lo pidió el autor el 2026-09-10, junto al buscador. Va en la
     URL como los demás filtros, así que volver al catálogo lo conserva. */
  const ocultarHechas = parametros.get('hechas') === 'no';

  /**
   * Cambiar un filtro.
   *
   * `replace` para la búsqueda y `push` para los desplegables, y la diferencia importa: al
   * escribir en el buscador cada letra sería una entrada del historial, y entonces el botón
   * «atrás» tendría que pulsarse una vez por letra tecleada. Elegir un curso, en cambio, sí
   * es una decisión que uno quiere poder deshacer.
   */
  const filtrar = (clave: string, valor: string, reemplazar = false) => {
    const siguiente = new URLSearchParams(parametros);
    if (valor) siguiente.set(clave, valor);
    else siguiente.delete(clave);
    ponerParametros(siguiente, { replace: reemplazar });
  };

  useEffect(() => {
    // Marcar lo ya hecho es orientación para el maestro, NO una recompensa para el niño:
    // no hay puntos, ni racha, ni porcentaje. Solo «esto ya lo abriste».
    void leerTodo().then((r) => setHechas(new Set(r.filter((x) => x.completada).map((x) => x.actividadId))));
  }, []);

  useEffect(() => {
    let vivo = true;
    cargarIndice()
      .then((i) => vivo && setEntradas(i.actividades as unknown as Entrada[]))
      .catch((e: Error) => vivo && setFallo(e.message));
    return () => {
      vivo = false;
    };
  }, []);

  /*
    Volver a donde estabas: la URL con sus filtros y la altura del scroll. Vive en
    `vuelta.ts`, compartido con el Taller y el Camino: «Volver» desde una actividad lleva a
    la pantalla de la que se salió, y no siempre es el catálogo.
  */
  const listaLista = entradas !== null;
  useVuelta(`/${parametros.toString() ? `?${parametros}` : ''}`, listaLista);

  /* La sombra de la barra de filtros solo cuando de verdad está pegada arriba. */
  const filtros = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = filtros.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Se observa un píxel por encima de la barra: en cuanto sale de la pantalla, la barra
    // está pegada. Es lo mismo que hacer un `scroll` listener, pero sin escuchar cada
    // fotograma del scroll.
    const centinela = el.previousElementSibling;
    if (!centinela) return;
    const observador = new IntersectionObserver(
      ([e]) => el.toggleAttribute('data-pegada', !e?.isIntersecting),
      { threshold: 1 },
    );
    observador.observe(centinela);
    return () => observador.disconnect();
  }, [listaLista]);

  const ejes = useMemo(
    () => [...new Set((entradas ?? []).map((e) => e.eje))].sort(),
    [entradas],
  );
  const criterios = useMemo(
    () =>
      [...new Set((entradas ?? []).map((e) => e.curriculo?.criterio).filter(Boolean))].sort() as string[],
    [entradas],
  );

  /**
   * Búsqueda por texto.
   *
   * Sin retardo: son unas decenas de actividades y filtrar es instantáneo, así que meter
   * un `debounce` solo añadiría una espera que no hace falta.
   *
   * Lo que se busca y dónde está en `busqueda.ts`, con su test: el código, el título, el eje,
   * el tipo, el criterio, las etiquetas y la práctica (figuras, compás, método, notas).
   * Se normaliza quitando los acentos por los dos lados. Un maestro con prisa escribe
   * «ritmico» sin tilde, y que eso no encuentre «rítmico» es exactamente el tipo de detalle
   * que hace pensar que el buscador está roto.
   */

  const aguja = busqueda.trim();
  const visibles = (entradas ?? []).filter((e) => {
    if (etapa && e.etapa !== etapa) return false;
    if (eje && e.eje !== eje) return false;
    if (criterio && e.curriculo?.criterio !== criterio) return false;
    if (ocultarHechas && hechas.has(e.id)) return false;
    if (!aguja) return true;
    // Se busca también por eje, por criterio y por código: «pulso», «3.1» o «107» son
    // búsquedas legítimas.
    const pajar =
      `${codigoDe(e.id)} ${e.titulo} ${t(`eje.${e.eje}`)} ${e.tipo} ${e.curriculo?.criterio ?? ''} ` +
      `${(e.etiquetas ?? []).join(' ')} ${palabrasDePractica(e.practica)}`;
    return encaja(aguja, pajar);
  });

  /*
    Aquí salen las actividades, y los instrumentos puros no lo son.

    Un piano, un afinador o un metrónomo no tienen consigna, ni solución, ni final, y
    mezclarlos obliga a quien busca algo que hacer en clase a descartarlos uno a uno: tienen
    su pantalla en `Instrumentos.tsx`. Se reconocen por el prefijo `tr-`, que es la familia
    de las herramientas transversales.

    **Pero una actividad que ADEMÁS sea herramienta sí sale aquí**, aunque también salga en
    Instrumentos: el editor de melodías tiene criterio curricular, y un maestro que busca por
    el 4.1 tiene que encontrarlo. Ser las dos cosas no es duplicar.
  */
  const actividades = visibles.filter((e) => !e.id.startsWith('tr-'));

  if (fallo) return <main className="catalogo"><p role="alert">{t('catalogo.fallo')}</p></main>;
  if (!entradas) return <main className="catalogo"><p>{t('catalogo.cargando')}</p></main>;

  return (
    <main className="catalogo">
      {/* La rueda de ajustes va junto al título, a la derecha del todo: Ajustes salió de la
          barra de abajo para dejar sitio a los criterios, y este es su sitio ahora. */}
      <header className="catalogo__cabecera">
        <h1>{t('catalogo.titulo')}</h1>
        <Link to="/ajustes" className="catalogo__ajustes" aria-label={t('nav.ajustes')}>
          <IconoAjustes tamano={28} />
        </Link>
      </header>
      {/* La promesa, escrita donde se entra y no solo en la política de privacidad. Es una
          línea, va antes de la barra de filtros y desaparece al desplazarse: quien llega
          por primera vez la lee, y quien viene a buscar una actividad no la vuelve a ver. */}
      <p className="catalogo__lema">{t('app.lema')}</p>

      {bienvenida && (
        <aside className="bienvenida" aria-label={t('bienvenida.titulo')}>
          <img className="bienvenida__logo" src="/marca/cocomusic.png" alt={APP.proyecto} width={480} height={266} />
          <div className="bienvenida__cuerpo">
            <h2>{t('bienvenida.titulo')}</h2>
            <p>{t('bienvenida.texto')}</p>
            {/* Sin color a la izquierda, el principal a la derecha: como en toda botonera. */}
            <div className="bienvenida__acciones">
              <button type="button" className="boton-repetir" onClick={cerrarBienvenida}>
                {t('bienvenida.cerrar')}
              </button>
              <a
                className="boton-principal"
                href={APP.webProyecto}
                target="_blank"
                rel="noopener"
                onClick={cerrarBienvenida}
              >
                {t('bienvenida.enlace')}
              </a>
            </div>
          </div>
        </aside>
      )}

      {/*
        Filtros sin etiqueta visible: **la opción «todos» se llama como la categoría**, así
        que el propio desplegable dice de qué es cuando no hay nada elegido, y cuando lo hay
        muestra el valor. Ahorra una línea de texto por filtro, que en la pantalla del
        maestro es donde más se agradece.

        Pero el `aria-label` NO se quita. Sin él, un lector de pantalla anuncia «cuadro
        combinado, 3.º y 4.º» sin decir de qué es: se ve bien y deja de ser usable para quien
        no ve. Es la parte del patrón que casi todo el mundo se salta.
      */}
      {/* Centinela: cuando este píxel sale por arriba, la barra de filtros está pegada y
          se le pone la sombra. Mide un píxel de alto a propósito — un elemento de área
          cero le da a IntersectionObserver una proporción de cero SIEMPRE, esté visible o
          no, y el observador no llegaría a dispararse nunca. */}
      <div className="centinela" aria-hidden="true" />
      <div className="filtros" ref={filtros}>
        {/* Arriba lo que se ESCRIBE, que necesita todo el ancho, con el botón de quitar
            al lado. Abajo lo que se ELIGE, que son tres y caben. Estaban los cinco en una
            sola fila que se partía por donde tocara según el ancho, y una barra que se
            recoloca sola hay que volver a leerla cada vez. */}
        <div className="filtros__linea filtros__linea--buscar">
          <input
            type="search"
            className="filtros__buscar"
            value={busqueda}
            onChange={(ev) => filtrar('q', ev.target.value, true)}
            placeholder={t('filtro.buscar')}
            aria-label={t('filtro.buscar')}
          />

          {/* Un solo botón para volver a cero, y solo cuando hay algo que borrar: si no hay
              filtro puesto, un botón de «quitar filtros» es ruido. */}
          {(etapa || eje || criterio || busqueda) && (
            <button
              type="button"
              className="filtros__limpiar"
              onClick={() => {
                // «Ocultar hechas» no es un filtro de qué buscar, es cómo se mira la lista:
                // se conserva. Lo pidió el autor el 2026-09-10.
                const limpio = new URLSearchParams();
                if (ocultarHechas) limpio.set('hechas', 'no');
                ponerParametros(limpio);
              }}
            >
              {t('filtro.limpiar')}
            </button>
          )}
        </div>

        <div className="filtros__linea">
        <select
          value={etapa}
          onChange={(ev) => filtrar('etapa', ev.target.value)}
          aria-label={t('filtro.etapa')}
          data-activo={etapa ? 'si' : undefined}
        >
          <option value="">{t('filtro.etapa')}</option>
          {ETAPAS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {t(e.clave)}
            </option>
          ))}
        </select>

        <select
          value={eje}
          onChange={(ev) => filtrar('eje', ev.target.value)}
          aria-label={t('filtro.eje')}
          data-activo={eje ? 'si' : undefined}
        >
          <option value="">{t('filtro.eje')}</option>
          {ejes.map((e) => (
            <option key={e} value={e}>
              {t(`eje.${e}`)}
            </option>
          ))}
        </select>

        <select
          value={criterio}
          onChange={(ev) => filtrar('crit', ev.target.value)}
          aria-label={t('filtro.criterio')}
          data-activo={criterio ? 'si' : undefined}
        >
          <option value="">{t('filtro.criterio')}</option>
          {criterios.map((c) => (
            <option key={c} value={c}>
              {/* La misma palabra que la opción vacía: «Criterio» y «Criterio 3.1». Tenía
                  clave propia y decía exactamente lo mismo. */}
              {t('filtro.criterio')} {c}
            </option>
          ))}
        </select>

        </div>
      </div>

      {/* La cuenta se anuncia al filtrar. Va en frase y no como «12 / 56» porque un lector
          de pantalla lee eso como «doce barra cincuenta y seis», que no dice nada. */}
      <div className="catalogo__cuenta-linea">
        <p className="catalogo__cuenta" aria-live="polite">
          {visibles.length === entradas.length
            ? `${entradas.length} ${t('catalogo.actividades')}`
            : `${visibles.length} ${t('catalogo.de')} ${entradas.length} ${t('catalogo.actividades')}`}
        </p>
        {/* Esconder o enseñar las que ya se han hecho, a la derecha de la cuenta: es a la
            cuenta a lo que afecta. Un conmutador y no un filtro más. */}
        <button
          type="button"
          className="filtros__conmutador"
          aria-pressed={ocultarHechas}
          onClick={() => filtrar('hechas', ocultarHechas ? '' : 'no')}
        >
          {t(ocultarHechas ? 'filtro.mostrarHechas' : 'filtro.ocultarHechas')}
        </button>
      </div>

      {/* Confirmar antes de desmarcar: un tic se pulsa sin querer al ir a abrir la tarjeta. */}
      <Modal abierto={porDesmarcar !== null} alCerrar={() => setPorDesmarcar(null)} titulo={t('catalogo.desmarcar.titulo')}>
        <h2>{t('catalogo.desmarcar.titulo')}</h2>
        <p className="modal__texto">
          {t('catalogo.desmarcar.texto', { titulo: porDesmarcar?.titulo ?? '' })}
        </p>
        <div className="modal__acciones">
          <button type="button" className="boton-repetir" onClick={() => setPorDesmarcar(null)}>
            {t('comun.ahoraNo')}
          </button>
          <button
            type="button"
            className="boton-principal modal__empezar"
            onClick={() => {
              const id = porDesmarcar?.id;
              setPorDesmarcar(null);
              if (!id) return;
              void desmarcar(id).then(() =>
                setHechas((h) => {
                  const n = new Set(h);
                  n.delete(id);
                  return n;
                }),
              );
            }}
          >
            {t('catalogo.desmarcar.confirmar')}
          </button>
        </div>
      </Modal>

      <ul className="catalogo__lista">
        {actividades.map((e) => (
          <li key={e.id}>
            <Link
              to={`/actividad/${e.id}`}
              className={`tarjeta tarjeta--${e.eje}${hechas.has(e.id) ? ' tarjeta--hecha' : ''}`}
              /* El AudioContext nace suspendido y solo se reanuda DENTRO de un gesto.
                 Este clic es el gesto: para cuando la actividad se monte, ya no lo hay.
                 Si falla, la actividad se abre igual y el sonido lo intenta después. */
              onClick={() => void despertarAudio().catch(() => {})}
            >
              <span className="tarjeta__titulo">
                <span className="codigo">{codigoDe(e.id)}</span> {e.titulo}
              </span>
              {/* El tic es una franja verde en el borde derecho, de arriba a abajo, con el
                  tic en blanco: plano y sin adorno, como pidió el autor el 2026-09-10. Se
                  puede pulsar para quitar la marca; va dentro del enlace de la tarjeta, así
                  que para no abrir la actividad se para el clic aquí. */}
              {hechas.has(e.id) && (
                  <span
                    className="tarjeta__hecha"
                    role="button"
                    tabIndex={0}
                    aria-label={t('catalogo.yaHecha')}
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setPorDesmarcar({ id: e.id, titulo: e.titulo });
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key !== 'Enter' && ev.key !== ' ') return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      setPorDesmarcar({ id: e.id, titulo: e.titulo });
                    }}
                  >
                    ✓
                  </span>
                )}
              <span className="tarjeta__meta">
                {t(`eje.${e.eje}`)} · {e.tipo}
                {e.curriculo?.criterio ? ` · crit. ${e.curriculo.criterio}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {actividades.length === 0 && <p>{t('catalogo.vacio')}</p>}

      {/* Los instrumentos viven en su propia pantalla, no aquí: ver `Instrumentos.tsx`.
          Tenerlos en dos sitios sería peor que en ninguno. */}

      <div className="catalogo__marca">
        <MarcaCocomusic />
      </div>
      <p className="catalogo__pie">
        <Link to="/privacidad">{t('catalogo.privacidad')}</Link>
        {' · '}
        <Link to="/creditos">{t('catalogo.creditos')}</Link>
        {' · '}
        <Link to="/diagnostico">{t('catalogo.diagnostico')}</Link>
      </p>
    </main>
  );
}
