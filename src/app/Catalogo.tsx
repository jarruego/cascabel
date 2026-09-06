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

  const visibles = (entradas ?? []).filter(
    (e) =>
      (!etapa || e.etapa === etapa) &&
      (!eje || e.eje === eje) &&
      (!criterio || e.curriculo?.criterio === criterio),
  );

  if (fallo) return <main className="catalogo"><p role="alert">{t('catalogo.fallo')}</p></main>;
  if (!entradas) return <main className="catalogo"><p>{t('catalogo.cargando')}</p></main>;

  return (
    <main className="catalogo">
      <h1>{t('catalogo.titulo')}</h1>

      <div className="filtros">
        <label>
          {t('filtro.etapa')}
          <select value={etapa} onChange={(ev) => setEtapa(ev.target.value as Etapa | '')}>
            <option value="">{t('filtro.todas')}</option>
            {ETAPAS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {t(e.clave)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('filtro.eje')}
          <select value={eje} onChange={(ev) => setEje(ev.target.value as Eje | '')}>
            <option value="">{t('filtro.todos')}</option>
            {ejes.map((e) => (
              <option key={e} value={e}>
                {t(`eje.${e}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('filtro.criterio')}
          <select value={criterio} onChange={(ev) => setCriterio(ev.target.value)}>
            <option value="">{t('filtro.todos')}</option>
            {criterios.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="catalogo__cuenta" aria-live="polite">
        {visibles.length} / {entradas.length}
      </p>

      <ul className="catalogo__lista">
        {visibles.map((e) => (
          <li key={e.id}>
            <Link
              to={`/actividad/${e.id}`}
              className={`ficha ficha--${e.eje}`}
              /* El AudioContext nace suspendido y solo se reanuda DENTRO de un gesto.
                 Este clic es el gesto: para cuando la actividad se monte, ya no lo hay.
                 Si falla, la actividad se abre igual y el sonido lo intenta después. */
              onClick={() => void despertarAudio().catch(() => {})}
            >
              <span className="ficha__titulo">{e.titulo}</span>
              {hechas.has(e.id) && (
                <span className="ficha__hecha" aria-label={t('catalogo.yaHecha')}>
                  ✓
                </span>
              )}
              <span className="ficha__meta">
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
