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
  /*
    La pauta es un rótulo que avanza: se escribe sin parar, y cuando ya no cabe una nota
    más, la de la izquierda desaparece y las demás corren un sitio. Lo pidió el autor el
    2026-09-10: así hay movimiento, la pauta cabe siempre y sobra el «empezar otra vez»
    —una escala mal empezada se arregla siguiendo, no borrando—. Lo que se evalúa son las
    ÚLTIMAS ocho notas: en cuanto forman la escala mayor, está. Cuántas caben lo dice el
    ancho de la pauta, que se mide.
  */
  const pauta = useRef<HTMLDivElement | null>(null);
  const [anchoPauta, setAnchoPauta] = useState(0);
  useEffect(() => {
    const el = pauta.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setAnchoPauta(Math.floor(e?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const caben = Math.max(3, Math.floor((anchoPauta - 40) / 46));

  /*
    La pista de «no es una escala mayor» sale UNA vez, al llegar a ocho notas sin acertar,
    y se queda seis segundos: lo pidió el autor el 2026-09-10, y basta para leerla. No se
    repite después —quien sigue tocando ya sabe lo que busca—. El tono y el texto de la
    tarjeta salen de la misma condición; cuando miraban condiciones distintas, el texto se
    quedaba flotando sin su caja.
  */
  const PISTA_MS = 6000;
  const objetivo = escalaDesde(tonica, MAYOR);
  const [pistaVisible, setPistaVisible] = useState(false);
  const relojPista = useRef<number | null>(null);
  /*
    Un salto —más de un tono entre dos notas— también avisa, y avisa de lo que hay que
    hacer: volver a empezar en la tónica. Lo pidió el autor el 2026-09-10 para la escala de
    do mayor. Como se evalúan las últimas ocho notas, volver a empezar es tocar do otra vez.
  */
  const [ultimoFueSalto, setUltimoFueSalto] = useState(false);
  const textoPista = ultimoFueSalto
    ? t('escala.saltoVuelve', { nota: nombreDe(tonica) })
    : t(pistaPara(actividad.pistas, 1) ?? 'escala.casi');
  useEffect(() => {
    if (resuelta || puestas.length !== objetivo.length) return;
    setPistaVisible(true);
    if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    relojPista.current = window.setTimeout(() => setPistaVisible(false), PISTA_MS);
  }, [puestas.length, resuelta, objetivo.length]);
  useEffect(
    () => () => {
      if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    },
    [],
  );
  const primera = Math.max(0, puestas.length - caben);
  const visibles = puestas.slice(primera);
  const sampler = useRef<Sampler | null>(null);
  const yaTerminada = useRef(false);


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

  /** La misma nota sin la octava: la escala tiene que empezar en la tónica, en la que sea. */
  const sinOctava = (n: string) => n.replace(/\d/g, '');

  const anadir = (nota: string) => {
    if (resuelta) return;
    void sonar(nota);
    const nuevas = [...puestas, nota];

    // La escala mayor de la tónica pedida, no cualquiera: las últimas ocho notas tienen
    // que formarla Y empezar en ella. Se mira antes que nada: la última nota de la escala
    // es también la tónica, y sin este orden se tomaría por un «empezar de nuevo».
    const ultimas = nuevas.slice(-objetivo.length);
    if (esEscalaMayor(ultimas) && sinOctava(ultimas[0]!) === sinOctava(tonica)) {
      setPuestas(nuevas);
      setResuelta(true);
      return;
    }

    /*
      Tocar la tónica es empezar de nuevo: la pauta se vacía y queda solo esa nota. Antes
      «vuelve a empezar en do» se decía y no se hacía —el do se añadía detrás de lo anterior,
      la distancia desde la última nota mala era otro salto, y volvía a avisar—. Lo vio el
      autor el 2026-09-10.
    */
    if (sinOctava(nota) === sinOctava(tonica)) {
      setPuestas([nota]);
      setUltimoFueSalto(false);
      setPistaVisible(false);
      return;
    }

    setPuestas(nuevas);
    const salto = distancia(puestas[puestas.length - 1]!, nota) === null;
    setUltimoFueSalto(salto);
    if (salto) {
      setPistaVisible(true);
      if (relojPista.current !== null) window.clearTimeout(relojPista.current);
      relojPista.current = window.setTimeout(() => setPistaVisible(false), PISTA_MS);
    }
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
      <div className="escala__pauta" role="img" aria-label={t('escala.pauta')} ref={pauta}>
        {[1, 2, 3, 4, 5].map((l) => (
          <span
            key={l}
            className="escala__linea"
            style={{ top: yDeLinea(l, SEP, MARGEN) }}
            aria-hidden="true"
          />
        ))}
        {visibles.map((nota, i) => {
          const alto = alturaEnPauta(nota.replace('#', ''), 'sol', SEP, MARGEN);
          // La clave es el índice absoluto: así la nota que corre un sitio es el mismo
          // elemento, y la transición de `left` se ve como movimiento.
          return (
            <span key={primera + i} aria-hidden="true">
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
        {distancias.slice(Math.max(0, distancias.length - (caben - 1))).map((d, j) => (
          <li key={distancias.length - Math.min(distancias.length, caben - 1) + j} data-distancia={d ?? 'otra'}>
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
      <Reaccion tono={pistaVisible && !resuelta ? 'casi' : 'neutro'} personaje={actividad.personaje}>
        {pistaVisible && !resuelta && textoPista}
      </Reaccion>
    </section>
  );
}
