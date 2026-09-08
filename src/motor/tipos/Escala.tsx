import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio } from '@/audio/AudioEngine';
import { Sampler, aMidi } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { alturaEnPauta, yDeLinea } from '../alturaEnPauta';
import { distancia, escalaDesde, esEscalaMayor, MAYOR, type Distancia } from '../escala';
import { Reaccion } from '@/ui/Reaccion';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoRepetir } from '@/ui/Simbolos';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «escala»: construir una escala en el teclado viendo cómo se escribe en la pauta.
 *
 * **Por qué las dos cosas a la vez, que es toda la actividad.** Una escala mayor no es
 * «siete notas seguidas»: es un patrón de distancias que suena igual empiece donde empiece.
 * Un niño que solo ha tocado teclas blancas cree que do-re-mi-fa son cuatro pasos iguales, y
 * no lo son —mi-fa mide la mitad—. **Eso no se ve en el pentagrama**, donde las cuatro notas
 * están dibujadas igual de separadas; se ve en el piano, porque entre mi y fa no hay tecla
 * negra. Y al revés: en el piano no se ve que mi y fa son grados contiguos, y en la pauta sí.
 *
 * Ninguna de las dos representaciones explica esto sola. Por eso van enlazadas: se toca en
 * el teclado, aparece en la pauta, y entre nota y nota se escribe si el paso fue tono o
 * semitono.
 *
 * **No se impide tocar una nota que no toca.** Se toca, suena, se escribe, y la marca de
 * distancia dice lo que ha pasado. Rechazar la tecla convertiría la actividad en adivinar
 * dónde deja pulsar el programa, que es un cerrojo; dejarla y mostrar el resultado es lo que
 * enseña, porque el niño oye el paso mal y lo ve escrito.
 */

const SEP = 12;
const MARGEN = 40;
const BLANCAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const CON_NEGRA = [true, true, false, true, true, true, false];

export default function Escala({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Nota por la que empieza la escala. */
    tonica: string;
    /** Octava más grave del teclado. */
    desde?: number;
    octavas?: number;
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const tonica = contenido.tonica;
  const desde = contenido.desde ?? Number(tonica.replace(/[^0-9]/g, '') || '4');
  const octavas = contenido.octavas ?? 2;

  const [puestas, setPuestas] = useState<string[]>([tonica]);
  const [resuelta, setResuelta] = useState(false);
  const sampler = useRef<Sampler | null>(null);
  const yaTerminada = useRef(false);

  const objetivo = escalaDesde(tonica, MAYOR);

  const sonar = useCallback(async (nota: string) => {
    try {
      await despertarAudio();
      if (!sampler.current) {
        const s = new Sampler(muestrasDe(contenido.instrumento));
        await s.cargar();
        sampler.current = s;
      }
      sampler.current.tocar(nota, undefined, 1.1);
    } catch {
      // Sin muestras la actividad sigue: se ve la pauta y se ven las distancias.
    }
  }, [contenido.instrumento]);

  useEffect(() => {
    if (!resuelta || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({ actividadId: actividad.id, completada: true, aciertos: 1, intentos: 1 });
  }, [resuelta, actividad.id, alTerminar]);

  const anadir = (nota: string) => {
    if (resuelta) return;
    void sonar(nota);
    const nuevas = [...puestas, nota];
    setPuestas(nuevas);
    if (nuevas.length === objetivo.length) setResuelta(esEscalaMayor(nuevas));
  };

  const teclas: Array<{ nota: string; negra: boolean; indice: number }> = [];
  for (let o = 0; o < octavas; o++) {
    BLANCAS.forEach((letra, i) => {
      teclas.push({ nota: `${letra}${desde + o}`, negra: false, indice: o * 7 + i });
      if (CON_NEGRA[i]) {
        teclas.push({ nota: `${letra}#${desde + o}`, negra: true, indice: o * 7 + i });
      }
    });
  }
  const ancho = 46;

  /** Distancia entre cada par de notas puestas. Es lo que se está aprendiendo. */
  const distancias: Array<Distancia | null> = puestas
    .slice(1)
    .map((n, i) => distancia(puestas[i]!, n));

  return (
    <section className="actividad escala" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      {/* La pauta. Se escribe sola según se toca: ver cómo se escribe lo que suena es la
          mitad de la actividad, y esperar al final la perdería. */}
      <div className="escala__pauta" role="img" aria-label={t('escala.pauta')}>
        {[1, 2, 3, 4, 5].map((l) => (
          <span
            key={l}
            className="escala__linea"
            style={{ top: yDeLinea(l, SEP, MARGEN) }}
            aria-hidden="true"
          />
        ))}
        {puestas.map((nota, i) => {
          const alto = alturaEnPauta(nota.replace('#', ''), 'sol', SEP, MARGEN);
          return (
            <span key={`${nota}-${i}`} aria-hidden="true">
              {alto.adicionales.map((y) => (
                <span
                  key={y}
                  className="escala__adicional"
                  style={{ left: 40 + i * 46, top: y }}
                />
              ))}
              <span
                className="escala__nota"
                style={{ left: 40 + i * 46, top: alto.y - SEP / 2, background: colorDe(nota) }}
              />
              {/* El sostenido va escrito, porque en la pauta una nota alterada NO cambia de
                  sitio: cambia de nombre. Es justo lo que cuesta entender. */}
              {nota.includes('#') && (
                <span className="escala__alteracion" style={{ left: 22 + i * 46, top: alto.y - 12 }}>
                  ♯
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Las distancias, entre nota y nota. Un tono se dibuja el doble de largo que un
          semitono: la palabra dice qué es y el tamaño dice cuánto mide. */}
      <ol className="escala__distancias" aria-label={t('escala.distancias')}>
        {distancias.map((d, i) => (
          <li key={i} data-distancia={d ?? 'otra'}>
            {t(d === 'tono' ? 'escala.tono' : d === 'semitono' ? 'escala.semitono' : 'escala.salto')}
          </li>
        ))}
      </ol>

      <div className="escala__teclado" role="group" aria-label={t('teclado.teclas')}>
        {teclas.map((k) => {
          const usada = puestas.includes(k.nota);
          const siguiente = objetivo[puestas.length] === k.nota;
          return (
            <button
              key={k.nota}
              type="button"
              className={k.negra ? 'teclado__negra' : 'teclado__blanca'}
              data-usada={usada || undefined}
              /* La siguiente correcta NO se marca: eso convertiría la actividad en seguir
                 luces. Se guarda el dato para la pista, que solo aparece si se pide. */
              data-siguiente={undefined}
              style={
                k.negra
                  ? { left: (k.indice + 1) * ancho - ancho * 0.3, width: ancho * 0.6 }
                  : { width: ancho, borderBottom: `8px solid ${colorDe(k.nota[0]!)}` }
              }
              aria-label={`${nombreDe(k.nota)}${k.negra ? ' sostenido' : ''} ${aMidi(k.nota)}`}
              aria-disabled={resuelta || undefined}
              onClick={() => anadir(k.nota)}
            >
              {!k.negra && <span className="teclado__nombre">{nombreDe(k.nota)}</span>}
              {siguiente && <span className="visualmente-oculto">{t('escala.esLaSiguiente')}</span>}
            </button>
          );
        })}
      </div>

      {/* Solo el «casi». Al resolverla salta la modal de enhorabuena, y decirlo dos veces
          en medio segundo es lo que el autor señaló como repetición. */}
      <Reaccion
        tono={!resuelta && puestas.length === objetivo.length ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {!resuelta &&
          puestas.length === objetivo.length &&
          t(pistaPara(actividad.pistas, 1) ?? 'escala.casi')}
      </Reaccion>

      <BarraAcciones>
        <button
          type="button"
          className="boton-repetir"
          onClick={() => {
            setPuestas([tonica]);
            setResuelta(false);
          }}
        >
          <IconoRepetir />
          {t('escala.empezarDeNuevo')}
        </button>
      </BarraAcciones>
    </section>
  );
}
