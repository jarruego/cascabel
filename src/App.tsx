import { useState } from 'react';
import { APP } from './config';
import { t } from './i18n';
import { despertarAudio } from './audio/AudioEngine';

/**
 * Pantalla de arranque provisional.
 *
 * El botón grande no es decorativo: el AudioContext nace suspendido y solo se puede
 * reanudar dentro de un gesto del usuario. Toda app de audio necesita esta puerta;
 * en una app infantil, conviene que sea lo más divertido de la pantalla.
 */
export default function App() {
  const [listo, setListo] = useState(false);

  async function empezar() {
    await despertarAudio();
    setListo(true);
  }

  return (
    <main style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      <h1>{APP.nombre}</h1>
      <p>{t('app.lema')}</p>

      {!listo ? (
        <button
          type="button"
          className="boton-actividad"
          style={{ minWidth: 220, minHeight: 96, fontSize: '1.4em' }}
          onClick={empezar}
        >
          {t('comun.empezar')}
        </button>
      ) : (
        <p>
          Audio listo. Siguiente paso: montar el índice de actividades y la ruta
          <code> /actividad/:id</code>. Ver <code>docs/07-ROADMAP.md</code>.
        </p>
      )}
    </main>
  );
}
