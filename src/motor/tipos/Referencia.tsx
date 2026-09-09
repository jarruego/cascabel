import { useCallback, useMemo, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { obtenerContexto } from '@/audio/AudioEngine';
import { sonarEstimulo } from '../sonarEstimulo';
import { IconoTocar } from '@/ui/Simbolos';
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
 *  - `ritmo`: pulsos que se marcan con el clic del metrónomo, con `acentos` si es un
 *    compás. Es lo que convierte una figura dibujada en una duración.
 *  - `patron`: golpes del kit de percusión, para los ritmos que son de un baile o de un
 *    estilo y no de una figura.
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
  /** Pulsos de cada nota. Por defecto, uno. */
  duraciones?: number[];
  /** Duraciones en pulsos, marcadas con el clic. */
  ritmo?: number[];
  /** Índices del ritmo o del patrón que llevan acento: es lo que hace un compás. */
  acentos?: number[];
  /** Golpes del kit, una celda por pulso. Ver `motor/estimulo.ts`. */
  patron?: string[];
  celda?: number;
  /** A qué velocidad se toca el ritmo. Por defecto, 84. */
  tempo?: number;
  /** Timbre de ESTA entrada, si no es el de la actividad: la referencia de instrumentos. */
  instrumento?: string;
}

interface Seccion {
  titulo: string;
  entradas: Entrada[];
}

export default function Referencia({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    secciones: Seccion[];
    /** Timbre de los ejemplos con notas. */
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const [busqueda, setBusqueda] = useState('');
  const [sonando, setSonando] = useState<string | null>(null);

  /*
    Suena por el mismo camino que los estímulos de «elección»: `sonarEstimulo`. Antes esto
    tenía su propio sampler y su propio bucle de clics, y en cuanto hizo falta un acento —un
    tres por cuatro no se explica sin él— o un timbre distinto por entrada, tocaba escribirlo
    dos veces. Ahora una entrada de referencia y un estímulo de pregunta son la misma cosa
    descrita en el JSON.
  */
  const sonar = useCallback(
    async (entrada: Entrada) => {
      setSonando(entrada.termino);
      const fin = await sonarEstimulo(
        {
          notas: entrada.notas,
          duraciones: entrada.duraciones,
          ritmo: entrada.ritmo,
          acentos: entrada.acentos,
          patron: entrada.patron,
          celda: entrada.celda,
          tempo: entrada.tempo,
          respuesta: '',
        },
        { instrumento: entrada.instrumento ?? contenido.instrumento, tempo: 84 },
      );
      const dura = fin === null ? 600 : Math.max(400, (fin - obtenerContexto().currentTime) * 1000);
      window.setTimeout(() => setSonando((s) => (s === entrada.termino ? null : s)), dura);
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
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

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
    </section>
  );
}
