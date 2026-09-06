import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cargarIndice } from '@/datos/cargar';
import { comprobarCodigo, diaDeHoy, resumen } from '@/datos/compartir';
import { t } from '@/i18n';
import { Icono } from '@/ui/Icono';

/**
 * Comprobador de códigos, para el maestro.
 *
 * Es el patrón de musictheory.net que el dosier manda copiar literalmente: el alumno
 * termina una actividad, recibe un código y se lo enseña; el maestro lo teclea aquí y ve
 * qué hizo. **Evaluación con evidencia, sin cuentas de alumno y sin tratar un solo dato
 * personal.**
 *
 * El código no dice quién es el niño. Dice que alguien completó *esa* actividad con *esos*
 * aciertos *ese* día. Quién se lo enseña lo sabe el maestro porque lo tiene delante — es
 * exactamente cómo funciona un sello en una libreta, y por eso no hay nada que declarar.
 */
export default function Comprobar() {
  const [codigo, setCodigo] = useState('');
  const [titulos, setTitulos] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    // Se necesita el índice para traducir el resumen del código a un título legible.
    void cargarIndice()
      .then((i) => setTitulos(new Map(i.actividades.map((a) => [resumen(a.id), a.titulo]))))
      .catch(() => setTitulos(new Map()));
  }, []);

  const r = codigo.trim() ? comprobarCodigo(codigo) : null;
  const hoy = diaDeHoy();

  return (
    <main className="legal">
      <Link to="/" className="atras">
        {t('comun.atras')}
      </Link>

      <h1>{t('comprobar.titulo')}</h1>
      <p>{t('comprobar.texto')}</p>

      <label className="comprobar__campo">
        {t('comprobar.etiqueta')}
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          placeholder="ABC DEF G"
        />
      </label>

      {r && !r.valido && (
        <p className="comprobar__resultado" data-estado="mal" role="status">
          {t(r.motivo === 'formato' ? 'comprobar.formato' : 'comprobar.control')}
        </p>
      )}

      {r?.valido && r.datos && (
        <section className="comprobar__resultado" data-estado="bien" role="status">
          <Icono nombre="pulgar" tamano={48} />
          <p>
            <strong>{titulos.get(r.datos.hashActividad) ?? t('comprobar.actividadDesconocida')}</strong>
          </p>
          <p>
            {t('comprobar.aciertos')} <strong>{r.datos.aciertos}</strong> {t('comprobar.de')}{' '}
            <strong>{r.datos.intentos}</strong>
          </p>
          <p className="comprobar__cuando">
            {r.datos.dia === hoy
              ? t('comprobar.hoy')
              : `${t('comprobar.hace')} ${hoy - r.datos.dia} ${t('comprobar.dias')}`}
          </p>
        </section>
      )}

      <p className="legal__nota">{t('comprobar.privacidad')}</p>
    </main>
  );
}
