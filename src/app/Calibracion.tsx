import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Metronomo } from '@/audio/metronomo';
import {
  calibracionActualMs,
  despertarAudio,
  guardarCalibracion,
  obtenerContexto,
} from '@/audio/AudioEngine';
import {
  ajusteDesdeCalibracion,
  calcularCalibracion,
  mensajeCalibracion,
  type ResultadoCalibracion,
} from '@/audio/calibracion';
import { t } from '@/i18n';

/**
 * «Da tres palmadas al ritmo»: mide el bucle COMPLETO —salida de audio, altavoz, aire,
 * oído, mano, pantalla— que ninguna API del navegador conoce entero.
 *
 * Hace falta porque las cifras del navegador no bastan: Chromium declara 52 ms en un PC de
 * sobremesa y Firefox declara `baseLatency = 0`, que no es una latencia buena sino un dato
 * ausente. La ventana de «perfecto» de 9-12 años es de ±70 ms, así que sin compensar bien
 * un niño con pulso excelente sale como fallo.
 *
 * La hace el maestro una vez por dispositivo, no el niño. Por eso esta pantalla tiene texto
 * normal y densidad de adulto.
 */
const PULSOS = 8;
/** Se descartan los dos primeros: nadie acierta el pulso antes de haberlo oído. */
const DESCARTADOS = 2;

export default function Calibracion() {
  const [midiendo, setMidiendo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalibracion | null>(null);
  const [guardado, setGuardado] = useState<number | null>(null);
  const metronomo = useRef<Metronomo | null>(null);
  const golpes = useRef<number[]>([]);
  const esperados = useRef<number[]>([]);
  const rafId = useRef<number | null>(null);

  const parar = useCallback(() => {
    metronomo.current?.parar();
    metronomo.current = null;
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    setMidiendo(false);
  }, []);

  useEffect(() => parar, [parar]);

  const empezar = useCallback(async () => {
    await despertarAudio();
    golpes.current = [];
    esperados.current = [];
    setResultado(null);
    setGuardado(null);

    const m = new Metronomo(72, 4, true);
    metronomo.current = m;
    m.arrancar();
    setMidiendo(true);

    const recoger = () => {
      // Los instantes esperados salen del reloj de AUDIO, no de Date.now: es el único que
      // sabe cuándo va a sonar el clic de verdad.
      for (const p of m.pulsosParaPintar()) esperados.current.push(p.tiempo * 1000);

      if (esperados.current.length >= PULSOS) {
        parar();
        const e = esperados.current.slice(DESCARTADOS);
        const g = golpes.current.slice(0, e.length);
        setResultado(calcularCalibracion(g, e));
        return;
      }
      rafId.current = requestAnimationFrame(recoger);
    };
    rafId.current = requestAnimationFrame(recoger);
  }, [parar]);

  const golpear = useCallback(() => {
    if (!midiendo) return;
    // El instante del golpe, también en el reloj de audio: hay que restar peras con peras.
    golpes.current.push(obtenerContexto().currentTime * 1000);
  }, [midiendo]);

  // Espacio o Intro además del toque: un maestro con teclado no debería tener que usar el
  // ratón para dar palmadas.
  useEffect(() => {
    if (!midiendo) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        golpear();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [midiendo, golpear]);

  return (
    <main className="ajustes">
      <Link to="/ajustes" className="atras">
        {t('comun.atras')}
      </Link>

      <h1>{t('calibracion.titulo')}</h1>
      <p>{t('calibracion.texto')}</p>

      {!midiendo && (
        <button type="button" className="boton-repetir" onClick={() => void empezar()}>
          {t('calibracion.empezar')}
        </button>
      )}

      {midiendo && (
        <button
          type="button"
          className="boton-actividad calibracion__diana"
          onPointerDown={golpear}
        >
          {t('calibracion.golpea')}
        </button>
      )}

      {resultado && (
        <section aria-live="polite">
          <p>{t(mensajeCalibracion(resultado))}</p>
          <p>
            {t('calibracion.desvio')} <strong>{resultado.desvioMs.toFixed(0)} ms</strong>
            {' · '}
            {t('calibracion.regularidad')}{' '}
            <strong>{resultado.desviacionTipicaMs.toFixed(0)} ms</strong>
          </p>
          {resultado.fiable && (
            <button
              type="button"
              className="boton-repetir"
              onClick={() => {
                const ajuste = ajusteDesdeCalibracion(resultado.desvioMs);
                guardarCalibracion(ajuste);
                setGuardado(ajuste);
              }}
            >
              {t('calibracion.guardar')}
            </button>
          )}
        </section>
      )}

      {guardado !== null && (
        <p aria-live="polite">
          {t('calibracion.guardada')} <strong>{guardado} ms</strong>
        </p>
      )}

      <p className="ajustes__nota">
        {t('calibracion.actual')} <strong>{calibracionActualMs()} ms</strong>
      </p>
    </main>
  );
}
