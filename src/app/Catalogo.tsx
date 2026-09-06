import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cargarIndice } from '@/datos/cargar';
import { despertarAudio } from '@/audio/AudioEngine';
import { leerTodo } from '@/datos/progreso';
import { t } from '@/i18n';
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
 */

interface Entrada {
  id: string;
  titulo: string;
  etapa: Etapa;
  eje: Eje;
  tipo: TipoActividad;
  curriculo?: { competencia?: string | null; criterio?: string | null };
  estado?: string;
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
  const [etapa, setEtapa] = useState<Etapa | ''>('');
  const [eje, setEje] = useState<Eje | ''>('');
  const [criterio, setCriterio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [hechas, setHechas] = useState<Set<string>>(new Set());

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
   * Se normaliza quitando los acentos por los dos lados. Un maestro con prisa escribe
   * «ritmico» sin tilde, y que eso no encuentre «rítmico» es exactamente el tipo de detalle
   * que hace pensar que el buscador está roto.
   */
  const normalizar = (x: string) =>
    x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const aguja = normalizar(busqueda.trim());
  const visibles = (entradas ?? []).filter((e) => {
    if (etapa && e.etapa !== etapa) return false;
    if (eje && e.eje !== eje) return false;
    if (criterio && e.curriculo?.criterio !== criterio) return false;
    if (!aguja) return true;
    // Se busca también por eje y por criterio: «pulso» o «3.1» son búsquedas legítimas.
    const pajar = normalizar(
      `${e.titulo} ${t(`eje.${e.eje}`)} ${e.tipo} ${e.curriculo?.criterio ?? ''}`,
    );
    return aguja.split(/\s+/).every((palabra) => pajar.includes(palabra));
  });

  if (fallo) return <main className="catalogo"><p role="alert">{t('catalogo.fallo')}</p></main>;
  if (!entradas) return <main className="catalogo"><p>{t('catalogo.cargando')}</p></main>;

  return (
    <main className="catalogo">
      <h1>{t('catalogo.titulo')}</h1>

      {/*
        Filtros sin etiqueta visible: **la opción «todos» se llama como la categoría**, así
        que el propio desplegable dice de qué es cuando no hay nada elegido, y cuando lo hay
        muestra el valor. Ahorra una línea de texto por filtro, que en la pantalla del
        maestro es donde más se agradece.

        Pero el `aria-label` NO se quita. Sin él, un lector de pantalla anuncia «cuadro
        combinado, 3.º y 4.º» sin decir de qué es: se ve bien y deja de ser usable para quien
        no ve. Es la parte del patrón que casi todo el mundo se salta.
      */}
      <div className="filtros">
        <input
          type="search"
          className="filtros__buscar"
          value={busqueda}
          onChange={(ev) => setBusqueda(ev.target.value)}
          placeholder={t('filtro.buscar')}
          aria-label={t('filtro.buscar')}
        />

        <select
          value={etapa}
          onChange={(ev) => setEtapa(ev.target.value as Etapa | '')}
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
          onChange={(ev) => setEje(ev.target.value as Eje | '')}
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
          onChange={(ev) => setCriterio(ev.target.value)}
          aria-label={t('filtro.criterio')}
          data-activo={criterio ? 'si' : undefined}
        >
          <option value="">{t('filtro.criterio')}</option>
          {criterios.map((c) => (
            <option key={c} value={c}>
              {t('filtro.crit')} {c}
            </option>
          ))}
        </select>

        {/* Un solo botón para volver a cero, y solo cuando hay algo que borrar: si no hay
            filtro puesto, un botón de «quitar filtros» es ruido. */}
        {(etapa || eje || criterio || busqueda) && (
          <button
            type="button"
            className="filtros__limpiar"
            onClick={() => {
              setEtapa('');
              setEje('');
              setCriterio('');
              setBusqueda('');
            }}
          >
            {t('filtro.limpiar')}
          </button>
        )}
      </div>

      {/* La cuenta se anuncia al filtrar. Va en frase y no como «12 / 56» porque un lector
          de pantalla lee eso como «doce barra cincuenta y seis», que no dice nada. */}
      <p className="catalogo__cuenta" aria-live="polite">
        {visibles.length === entradas.length
          ? `${entradas.length} ${t('catalogo.actividades')}`
          : `${visibles.length} ${t('catalogo.de')} ${entradas.length} ${t('catalogo.actividades')}`}
      </p>

      <ul className="catalogo__lista">
        {visibles.map((e) => (
          <li key={e.id}>
            <Link
              to={`/actividad/${e.id}`}
              className={`tarjeta tarjeta--${e.eje}`}
              /* El AudioContext nace suspendido y solo se reanuda DENTRO de un gesto.
                 Este clic es el gesto: para cuando la actividad se monte, ya no lo hay.
                 Si falla, la actividad se abre igual y el sonido lo intenta después. */
              onClick={() => void despertarAudio().catch(() => {})}
            >
              <span className="tarjeta__titulo">{e.titulo}</span>
              {hechas.has(e.id) && (
                <span className="tarjeta__hecha" aria-label={t('catalogo.yaHecha')}>
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

      {visibles.length === 0 && <p>{t('catalogo.vacio')}</p>}

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
