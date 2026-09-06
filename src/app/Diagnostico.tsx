import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { DetectorDeTono, type LecturaTono } from '@/escucha/tono';
import { medirCosteNsdf, type CosteNsdf } from '@/escucha/banco';
import { aTexto, recoger, type EstadoMicrofono, type Informe } from './informe';

/**
 * Ruta /diagnostico — tarea T0.1 del roadmap.
 *
 * No es una pantalla de producto: es un instrumento. Mide el entorno y el micrófono,
 * y entrega un informe copiable. Existe porque el proyecto no tiene ningún dispositivo
 * iOS con el que verificar el bug 185448 de WebKit, y el primer maestro con iPad que
 * abra la app puede darnos en un pegado lo que nosotros no podemos medir.
 *
 * Cumple la regla de CLAUDE.md §8: cualquier fallo del micrófono se informa y se
 * sigue. Aquí el fallo no degrada a toque porque el fallo ES el dato que buscamos.
 */
export default function Diagnostico() {
  const [micro, setMicro] = useState<EstadoMicrofono>({ fase: 'sin-pedir' });
  const [lectura, setLectura] = useState<LecturaTono | null>(null);
  const [informe, setInforme] = useState<Informe>(() => recoger({ fase: 'sin-pedir' }, null));
  const [copiado, setCopiado] = useState(false);
  const [coste, setCoste] = useState<CosteNsdf | null>(null);
  const detector = useRef<DetectorDeTono | null>(null);

  // El informe se refresca solo: sampleRate y las latencias cambian al abrir el micro.
  useEffect(() => {
    const id = window.setInterval(() => {
      setInforme(recoger(micro, detector.current?.costeMedioMs() ?? null, coste));
    }, 500);
    return () => window.clearInterval(id);
  }, [micro, coste]);

  // El banco de medida bloquea el hilo unas décimas de segundo. Se lanza después del
  // primer pintado para que la página aparezca ya, y una sola vez.
  useEffect(() => {
    const id = window.setTimeout(() => {
      let tasa = 48000;
      try {
        tasa = obtenerContexto().sampleRate;
      } catch {
        // Sin AudioContext usable, medimos contra la tasa habitual y se nota en el informe.
      }
      setCoste(medirCosteNsdf(tasa));
    }, 300);
    return () => window.clearTimeout(id);
  }, []);

  // track.stop() al salir, para que el indicador del navegador se apague.
  useEffect(() => () => detector.current?.parar(), []);

  const escuchar = useCallback(async () => {
    try {
      await despertarAudio();
      const d = new DetectorDeTono();
      detector.current = d;
      await d.arrancar(setLectura);
      setMicro({ fase: 'escuchando' });
    } catch (e) {
      const err = e as Error & { tipo?: string; name?: string };
      const detalle = `${err.name ?? err.tipo ?? 'Error'} — ${err.message}`;
      setMicro(err.tipo === 'denegado' ? { fase: 'denegado', detalle } : { fase: 'error', detalle });
      detector.current?.parar();
      detector.current = null;
    }
  }, []);

  const parar = useCallback(() => {
    detector.current?.parar();
    detector.current = null;
    setLectura(null);
    setMicro({ fase: 'sin-pedir' });
  }, []);

  const copiar = useCallback(async () => {
    const texto = aTexto(informe);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles (o sin contexto seguro): el <pre> de abajo
      // sigue siendo seleccionable, que es la vía que nunca falla.
      setCopiado(false);
    }
  }, [informe]);

  return (
    <main className="diagnostico">
      <h1>{t('diagnostico.titulo')}</h1>
      <p className="diagnostico__intro">{t('diagnostico.intro')}</p>

      <section className="diagnostico__tono" aria-live="polite">
        <p className="diagnostico__hz">
          {lectura ? `${lectura.hz.toFixed(1)} Hz` : '—'}
        </p>
        <p className="diagnostico__nota">
          {lectura
            ? `MIDI ${lectura.midi.toFixed(2)} · ${lectura.cents >= 0 ? '+' : ''}${lectura.cents.toFixed(0)} cents · claridad ${lectura.claridad.toFixed(2)}`
            : t('diagnostico.sinSenal')}
        </p>
      </section>

      <div className="diagnostico__acciones">
        {micro.fase === 'escuchando' ? (
          <button type="button" className="boton-repetir" onClick={parar}>
            {t('diagnostico.parar')}
          </button>
        ) : (
          <button type="button" className="boton-repetir" onClick={escuchar}>
            {t('diagnostico.escuchar')}
          </button>
        )}
        <button type="button" className="boton-repetir" onClick={copiar}>
          {copiado ? t('diagnostico.copiado') : t('diagnostico.copiar')}
        </button>
      </div>

      {(micro.fase === 'denegado' || micro.fase === 'error') && (
        <p className="diagnostico__fallo" role="status">
          {t('diagnostico.fallo')} <code>{micro.detalle}</code>
        </p>
      )}

      {coste && (
        <p className="diagnostico__coste">
          {t('diagnostico.coste')} <strong>{coste.msPorAnalisis.toFixed(3)} ms</strong>{' '}
          ({(coste.fraccionNucleo * 100).toFixed(1)} % · {t('diagnostico.costeEstimacion')})
        </p>
      )}

      <h2>{t('diagnostico.informe')}</h2>
      <pre className="diagnostico__informe">{aTexto(informe)}</pre>

      <p className="diagnostico__pie">{t('diagnostico.pie')}</p>
    </main>
  );
}
