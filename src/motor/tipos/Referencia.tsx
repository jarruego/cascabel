import { useCallback, useMemo, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { Sampler } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { clic } from '@/audio/clic';
import { IconoTocar } from '@/ui/Transporte';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «referencia»: el «¿cómo era esto?» del lenguaje musical.
 *
 * **No es una actividad y no pretende serlo.** No hay respuesta, ni corrección, ni final: es
 * el sitio al que se va cuando en mitad de otra cosa uno no se acuerda de cuánto dura una
 * blanca. Eso es exactamente lo que un libro de texto resuelve y una aplicación de
 * ejercicios normalmente no, porque da por hecho que lo que hizo falta ya se explicó.
 *
 * **Y por eso suena.** Una tabla de figuras impresa dice que la corchea dura media negra; un
 * botón de escuchar lo demuestra. Es la única ventaja real que tiene una pantalla sobre el
 * papel para esto, así que toda entrada que pueda sonar, suena.
 *
 * Dos formas de sonar, y ninguna es un archivo grabado:
 *
 *  - `notas`: se tocan con el sampler, una detrás de otra. Sirve para intervalos y para
 *    escalas —«un tono» deja de ser una palabra en cuanto se oyen las dos notas seguidas—.
 *  - `ritmo`: pulsos que se marcan con el clic del metrónomo. Es lo que convierte una
 *    figura dibujada en una duración.
 *
 * **El contenido vive en el JSON**, así que añadir «qué es un calderón» no toca este
 * fichero. Es la misma promesa del motor aplicada a algo que no es un ejercicio.
 */

interface Entrada {
  /** Cómo se llama. Va tal cual, no es clave de traducción: es contenido. */
  termino: string;
  /** Una línea. Si hacen falta dos, es que la entrada son dos entradas. */
  explicacion: string;
  /** El signo, en Unicode musical. Se dibuja con Bravura. */
  signo?: string;
  /** Notas en notación científica, tocadas una detrás de otra. */
  notas?: string[];
  /** Duraciones en pulsos, marcadas con el clic. */
  ritmo?: number[];
  /** A qué velocidad se toca el ritmo. Por defecto, 84. */
  tempo?: number;
}

interface Seccion {
  titulo: string;
  entradas: Entrada[];
}

export default function Referencia({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    secciones: Seccion[];
    /** Timbre de los ejemplos con notas. */
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const [busqueda, setBusqueda] = useState('');
  const [sonando, setSonando] = useState<string | null>(null);
  const sampler = useRef<Sampler | null>(null);

  const sonar = useCallback(
    async (entrada: Entrada) => {
      setSonando(entrada.termino);
      const segundosPorPulso = 60 / (entrada.tempo ?? 84);
      try {
        await despertarAudio();
        const ctx = obtenerContexto();
        const desde = ctx.currentTime + 0.1;

        if (entrada.ritmo) {
          // El clic y no una nota: aquí lo que se enseña es la duración, y una altura
          // metería una información que no viene al caso.
          let t0 = desde;
          for (const pulsos of entrada.ritmo) {
            clic(t0, false);
            t0 += pulsos * segundosPorPulso;
          }
        }
        if (entrada.notas?.length) {
          if (!sampler.current) {
            const s = new Sampler(muestrasDe(contenido.instrumento));
            await s.cargar();
            sampler.current = s;
          }
          entrada.notas.forEach((nota, i) => {
            sampler.current?.tocar(nota, desde + i * segundosPorPulso * 0.9, 0.85);
          });
        }
      } catch {
        // Sin muestras la entrada sigue leyéndose. Una referencia que no suena sigue
        // sirviendo; una que se rompe al abrirla, no.
      }
      const total =
        ((entrada.ritmo?.reduce((a, b) => a + b, 0) ?? 0) + (entrada.notas?.length ?? 0)) *
        segundosPorPulso;
      window.setTimeout(() => setSonando(null), total * 1000 + 400);
    },
    [contenido.instrumento],
  );

  /* El buscador filtra por término y por explicación: quien no se acuerda de cómo se llama
     una cosa la busca por lo que hace, y «dura la mitad» tiene que encontrar la corchea. */
  const secciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return contenido.secciones;
    return contenido.secciones
      .map((s) => ({
        ...s,
        entradas: s.entradas.filter(
          (e) =>
            e.termino.toLowerCase().includes(q) || e.explicacion.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.entradas.length > 0);
  }, [busqueda, contenido.secciones]);

  return (
    <section className="actividad referencia" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <label className="referencia__buscar">
        <span>{t('referencia.buscar')}</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('referencia.ejemplo')}
        />
      </label>

      {secciones.map((s) => (
        <section key={s.titulo} className="referencia__seccion">
          <h2>{s.titulo}</h2>
          <ul className="referencia__lista">
            {s.entradas.map((e) => {
              const suena = Boolean(e.notas?.length || e.ritmo?.length);
              return (
                <li key={e.termino} className="referencia__entrada">
                  {/* El signo va aparte del texto y marcado como decorativo: un lector de
                      pantalla que intente leer «𝅘𝅥» no dice nada útil, y el nombre ya está
                      escrito al lado. */}
                  {e.signo && (
                    <span className="referencia__signo" aria-hidden="true">
                      {e.signo}
                    </span>
                  )}
                  <div className="referencia__texto">
                    <h3>{e.termino}</h3>
                    <p>{e.explicacion}</p>
                  </div>
                  {suena && (
                    <button
                      type="button"
                      className="boton-repetir referencia__oir"
                      data-sonando={sonando === e.termino || undefined}
                      aria-label={`${t('referencia.oir')} ${e.termino}`}
                      onClick={() => void sonar(e)}
                    >
                      <IconoTocar />
                      {t('referencia.oir')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {secciones.length === 0 && <p role="status">{t('referencia.nada')}</p>}

      <div className="referencia__acciones">
        <button
          type="button"
          className="boton-repetir"
          onClick={() => alTerminar({ actividadId: actividad.id, completada: true })}
        >
          {t('lienzo.terminar')}
        </button>
      </div>

      <p className="pista-fija">{t('referencia.paraConsultar')}</p>
    </section>
  );
}
