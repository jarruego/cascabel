import { useState } from 'react';
import { Link } from 'react-router';
import { t } from '@/i18n';
import { APP } from '@/config';
import { Icono } from '@/ui/Icono';

/**
 * Aviso legal y política de privacidad, en dos versiones.
 *
 * El art. 12 del RGPD exige que la información dirigida a menores esté en lenguaje que
 * puedan entender. No es una recomendación: es una obligación, y cumplirla con un texto de
 * abogado en cuerpo 10 no la cumple. Por eso hay dos versiones y la que se ve primero es la
 * de los niños.
 *
 * Lo que se dice aquí tiene que ser **verificable**, no tranquilizador. Cada afirmación se
 * corresponde con algo que se puede comprobar en el código o en las cabeceras HTTP, y se
 * dice dónde. Ver docs/08-LEGAL.md.
 */
export default function Privacidad() {
  const [paraAdultos, setParaAdultos] = useState(false);

  return (
    <main className="legal">
      <Link to="/" className="atras">
        {t('comun.atras')}
      </Link>

      <div className="legal__conmutador">
        <button
          type="button"
          className="boton-repetir"
          aria-pressed={!paraAdultos}
          onClick={() => setParaAdultos(false)}
        >
          {t('legal.versionNinos')}
        </button>
        <button
          type="button"
          className="boton-repetir"
          aria-pressed={paraAdultos}
          onClick={() => setParaAdultos(true)}
        >
          {t('legal.versionAdultos')}
        </button>
      </div>

      {paraAdultos ? <ParaAdultos /> : <ParaNinos />}
    </main>
  );
}

/** Versión para niños: frases cortas, primera persona y un dibujo por idea. */
function ParaNinos() {
  const puntos = [
    { icono: 'voz', clave: 'legal.nino.microfono' },
    { icono: 'campana', clave: 'legal.nino.nombre' },
    { icono: 'tambor', clave: 'legal.nino.guarda' },
    { icono: 'silencio', clave: 'legal.nino.borrar' },
  ];

  return (
    <section className="legal__ninos">
      <h1>{t('legal.nino.titulo')}</h1>
      <ul>
        {puntos.map((p) => (
          <li key={p.clave}>
            {/* El pictograma acompaña siempre al texto, nunca lo sustituye: un dibujo
                solo se interpreta mal, y un texto solo no lo lee un niño de cinco años. */}
            <Icono nombre={p.icono} tamano={56} />
            <span>{t(p.clave)}</span>
          </li>
        ))}
      </ul>
      <p className="legal__nota">{t('legal.nino.pie')}</p>
    </section>
  );
}

/** Versión completa. Cada promesa dice dónde se puede comprobar. */
function ParaAdultos() {
  return (
    <section className="legal__adultos">
      <h1>{t('legal.titulo')}</h1>

      <h2>{t('legal.responsable')}</h2>
      <p>{t('legal.responsableTexto')}</p>

      <h2>{t('legal.queGuardamos')}</h2>
      <p>{t('legal.queGuardamosTexto')}</p>
      <ul>
        <li>{t('legal.dato1')}</li>
        <li>{t('legal.dato2')}</li>
      </ul>
      <p>
        <strong>{t('legal.noGuardamos')}</strong>
      </p>

      <h2>{t('legal.microfono')}</h2>
      <p>{t('legal.microfonoTexto')}</p>
      <p className="legal__verificable">{t('legal.microfonoComo')}</p>

      <h2>{t('legal.cookies')}</h2>
      <p>{t('legal.cookiesTexto')}</p>

      <h2>{t('legal.terceros')}</h2>
      <p>{t('legal.tercerosTexto')}</p>

      <h2>{t('legal.derechos')}</h2>
      <p>{t('legal.derechosTexto')}</p>
      <p>
        <Link to="/ajustes">{t('legal.irAjustes')}</Link>
      </p>

      <h2>{t('legal.licencias')}</h2>
      <p>{t('legal.licenciasTexto')}</p>
      <p>
        <Link to="/creditos">{t('legal.irCreditos')}</Link>
      </p>

      <p className="legal__nota">
        {t('legal.version')} {APP.nombre} · {APP.proyecto}
      </p>
    </section>
  );
}
