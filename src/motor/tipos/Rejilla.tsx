import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { aMidiSMF, aMusicXML, descargar, type NotaExportable } from '@/datos/exportar';
import { Reaccion } from '@/ui/Reaccion';
import { pistaPara } from '../maquinaEleccion';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';
import {
  INICIAL_REJILLA,
  clave,
  notasDeColumna,
  reducirRejilla,
  type AccionRejilla,
  type EstadoRejilla,
  type ModoRejilla,
} from '../maquinaRejilla';

/**
 * Tipo «rejilla»: cuadrícula de altura × tiempo.
 *
 * Es la mejor interfaz que existe para escribir música sin saber notación: las columnas son
 * pulsos y las filas alturas, y tocar una celda enciende una nota. Cubre dictado rítmico,
 * dictado melódico y constructor de ritmos.
 *
 * **En modo `libre` no existe el error.** No hay solución ni botón de comprobar: es un
 * lienzo. Es la regla de Incredibox que el dosier señala como el mejor modelo de motivación
 * infantil del sector, y lo contrario de Duolingo.
 *
 * Reglas en `../maquinaRejilla.ts`, con 11 tests.
 */

export default function Rejilla({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    modo?: ModoRejilla;
    filas: number;
    columnas: number;
    /** Nota de cada fila, de arriba (aguda) abajo (grave). */
    notas?: string[];
    tempo?: number;
    /** Solo en dictado: celdas «fila,columna» de la respuesta. */
    solucion?: string[];
    /**
     * Botones para llevarse la composición en MIDI y MusicXML.
     *
     * **Es lo que separa componer de jugar a componer.** Un MIDI y un MusicXML se abren en
     * MuseScore, en Sibelius o en cualquier editor: lo que el niño ha hecho se puede seguir
     * trabajando, imprimir en papel pautado o tocar con otro instrumento. Sin exportar, la
     * composición se muere en la pantalla donde nació.
     */
    exportable?: boolean;
  };

  const carril = useCarril(actividad.etapa);
  const modo: ModoRejilla = contenido.modo ?? (contenido.solucion ? 'dictado' : 'libre');
  const { filas, columnas } = contenido;
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 96;
  /*
    El tamaño de celda lo decide el CSS, no este fichero.

    Aquí había `Math.floor(320 / columnas)`: la cuadrícula se dimensionaba como si la
    pantalla midiera siempre 320 px, así que ocho columnas daban celdas de 40 px lo mismo en
    un móvil que en una pizarra. Ahora las columnas se reparten el ancho que haya con `1fr`
    y las celdas son cuadradas con `aspect-ratio`, que es información que el navegador tiene
    y JavaScript no.

    Lo que sí se pasa al CSS es el objetivo táctil del carril, como suelo: una celda nunca
    baja de ahí, y si no caben, la cuadrícula desplaza en horizontal.
  */
  const objetivo = OBJETIVO_TACTIL[carril];

  const [estado, despachar] = useReducer(
    (e: EstadoRejilla, a: AccionRejilla) => reducirRejilla(e, a, modo, filas, columnas),
    INICIAL_REJILLA,
  );
  const [sonando, setSonando] = useState(false);
  const [columnaActual, setColumnaActual] = useState(-1);
  /** Repetir sin parar. Componer es probar, y parar cada cuatro compases lo corta. */
  const [bucle, setBucle] = useState(false);
  const bucleRef = useRef(false);
  const sampler = useRef<Sampler | null>(null);
  const yaTerminada = useRef(false);

  const notas = contenido.notas ?? ['C5', 'A4', 'G4', 'F4', 'D4', 'C4'].slice(0, filas);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.intentos, actividad.id, alTerminar]);

  const reproducir = useCallback(async () => {
    if (sonando) return;
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(MARIMBA);
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras se sigue: la rejilla se ve igual y se puede seguir editando.
      }
    }
    setSonando(true);

    const ctx = obtenerContexto();
    const inicio = ctx.currentTime + 0.15;
    const paso = 60 / bpm;

    for (let c = 0; c < columnas; c++) {
      const cuando = inicio + c * paso;
      for (const f of notasDeColumna(estado.encendidas, c)) {
        sampler.current?.tocar(notas[f] ?? 'C4', cuando, paso * 0.9);
      }
      // El resalte va por temporizador aparte del planificador de audio: animar dentro
      // del planificador adelanta el destello respecto al sonido.
      window.setTimeout(() => setColumnaActual(c), (cuando - ctx.currentTime) * 1000);
    }
    window.setTimeout(
      () => {
        setColumnaActual(-1);
        setSonando(false);
        // El bucle se relanza al terminar la vuelta en vez de programar cien compases por
        // delante: así, si el niño cambia una celda a mitad, la vuelta siguiente ya suena
        // con el cambio. Componer es probar, y esperar al final rompe el hilo.
        if (bucleRef.current) window.setTimeout(() => void reproducirRef.current?.(), 120);
      },
      (inicio + columnas * paso - ctx.currentTime) * 1000,
    );
  }, [sonando, bpm, columnas, estado.encendidas, notas]);

  /**
   * Las celdas encendidas, como notas con instante y duración.
   *
   * **Las celdas contiguas de la misma fila se funden en una nota larga**, y eso no es una
   * optimización: en la rejilla, tres casillas seguidas se ven y se oyen como un sonido
   * largo, así que exportarlas como tres negras repetidas escribiría en la partitura algo
   * distinto de lo que el niño compuso.
   */
  const notasExportables = useCallback((): NotaExportable[] => {
    const salida: NotaExportable[] = [];
    for (let fila = 0; fila < filas; fila++) {
      let desde: number | null = null;
      for (let col = 0; col <= columnas; col++) {
        const encendida = col < columnas && estado.encendidas.has(clave(fila, col));
        if (encendida && desde === null) desde = col;
        if (!encendida && desde !== null) {
          salida.push({
            nota: notas[fila] ?? 'C4',
            inicio: desde,
            duracion: col - desde,
          });
          desde = null;
        }
      }
    }
    return salida.sort((a, b) => a.inicio - b.inicio);
  }, [estado.encendidas, filas, columnas, notas]);

  // Referencia estable para que el bucle pueda llamarse a sí mismo sin ciclos de deps.
  const reproducirRef = useRef<(() => Promise<void>) | null>(null);
  reproducirRef.current = reproducir;

  const tocarCelda = useCallback(
    async (fila: number, columna: number) => {
      despachar({ tipo: 'alternar', fila, columna });
      // Suena al encenderla: la rejilla se aprende oyendo lo que se pone, no mirándola.
      if (estado.encendidas.has(clave(fila, columna))) return;
      try {
        await despertarAudio();
        if (!sampler.current) {
          const s = new Sampler(MARIMBA);
          await s.cargar();
          sampler.current = s;
        }
        sampler.current.tocar(notas[fila] ?? 'C4', undefined, 0.8);
      } catch {
        // Sin sonido se sigue editando igual.
      }
    },
    [estado.encendidas, notas],
  );

  return (
    <section className="actividad rejilla" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div
        className="rejilla__cuadricula"
        role="grid"
        aria-label={t(contenido.consigna)}
        style={
          {
            gridTemplateColumns: `repeat(${columnas}, minmax(var(--celda-minima), 1fr))`,
            '--celda-minima': `${Math.max(24, Math.min(objetivo, 44))}px`,
          } as CSSProperties
        }
      >
        {Array.from({ length: filas }, (_, f) =>
          Array.from({ length: columnas }, (_, c) => {
            const k = clave(f, c);
            const encendida = estado.encendidas.has(k);
            const sobra = estado.sobran.has(k);
            const falta = estado.faltan.has(k);
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                className="rejilla__celda"
                data-encendida={encendida || undefined}
                data-marca={sobra ? 'sobra' : falta ? 'falta' : undefined}
                data-columna-activa={c === columnaActual || undefined}
                aria-pressed={encendida}
                aria-label={`${notas[f] ?? f + 1}, ${t('rejilla.pulso')} ${c + 1}`}
                onClick={() => void tocarCelda(f, c)}
              />
            );
          }),
        )}
      </div>

      <div className="rejilla__acciones">
        <button type="button" className="boton-repetir" onClick={() => void reproducir()}>
          <Icono nombre="reproducir" tamano={26} /> {t('accion.escuchar')}
        </button>

        {/* Exportar. Todo se construye en memoria y se descarga con un enlace: no hay
            servidor, no hay subida y no viaja nada. Es la única forma de exportar que
            cumple la regla 1 sin excepciones. */}
        {contenido.exportable && (
          <>
            <button
              type="button"
              className="boton-repetir"
              aria-disabled={estado.encendidas.size === 0 || undefined}
              onClick={() =>
                descargar(
                  `${actividad.id}.mid`,
                  aMidiSMF(notasExportables(), bpm),
                  'audio/midi',
                )
              }
            >
              {t('rejilla.midi')}
            </button>
            <button
              type="button"
              className="boton-repetir"
              aria-disabled={estado.encendidas.size === 0 || undefined}
              onClick={() =>
                descargar(
                  `${actividad.id}.musicxml`,
                  aMusicXML(notasExportables(), bpm, actividad.titulo),
                  'application/vnd.recordare.musicxml+xml',
                )
              }
            >
              {t('rejilla.musicxml')}
            </button>
          </>
        )}

        <button
          type="button"
          className="boton-repetir"
          aria-pressed={bucle}
          onClick={() => {
            const v = !bucle;
            setBucle(v);
            bucleRef.current = v;
            if (v && !sonando) void reproducir();
          }}
        >
          {bucle ? t('rejilla.pararBucle') : t('rejilla.bucle')}
        </button>

        <button
          type="button"
          className="boton-repetir"
          onClick={() => despachar({ tipo: 'limpiar' })}
        >
          {t('rejilla.limpiar')}
        </button>

        {/* En modo libre no hay botón de comprobar, porque no hay nada que comprobar. */}
        {modo === 'dictado' && (
          <button
            type="button"
            className="boton-principal"
            onClick={() =>
              despachar({ tipo: 'comprobar', solucion: contenido.solucion ?? [] })
            }
          >
            {t('ordenar.comprobar')}
          </button>
        )}
      </div>

      <Reaccion
        tono={estado.fase === 'completada' ? 'bien' : estado.fase === 'revisando' ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
      >
        {estado.fase === 'revisando' &&
          t(pistaPara(actividad.pistas, estado.intentos) ?? 'rejilla.revisa')}
        {estado.fase === 'completada' && t('comun.completada')}
        {modo === 'libre' && estado.fase === 'editando' && t('rejilla.libre')}
      </Reaccion>

      {estado.fase === 'revisando' && (
        <button
          type="button"
          className="boton-repetir"
          onClick={() => despachar({ tipo: 'seguir' })}
        >
          {t('rejilla.seguirEditando')}
        </button>
      )}
    </section>
  );
}
