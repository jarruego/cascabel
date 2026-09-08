import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { Sampler } from '@/audio/sampler';
import { instrumentosDisponibles, muestrasDe } from '@/audio/instrumentos';
import { Percusion, type Golpe } from '@/audio/percusion';
import { colorDe } from '@/ui/coloresNota';
import { IconoDescargar, IconoLimpiar, IconoParar, IconoTocar } from '@/ui/Simbolos';
import { aMidiSMF, descargar, type NotaExportable } from '@/datos/exportar';
import {
  INICIAL_PISTAS,
  clavePista,
  loQueSuena,
  reducirPistas,
  tieneAlgo,
  type AccionPistas,
  type EstadoPistas,
  type Pista,
} from '../maquinaPistas';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «pistas»: componer con varias voces a la vez.
 *
 * **Qué añade sobre `rejilla`.** La rejilla es una voz. Aquí hay varias sonando juntas, y eso
 * cambia lo que se puede enseñar: **textura** —que dos cosas suenen a la vez y sigan siendo
 * dos cosas—, **función** —una percusión sostiene y una melodía canta, aunque las dos sean
 * casillas— y **comparación**, porque silenciar una pista y volver a ponerla es la forma más
 * directa de oír qué aporta. Ninguna de las tres existe con una sola voz.
 *
 * **Y lo que no lleva, a propósito**: ni volumen, ni paneo, ni efectos. Eso es un DAW, y un
 * DAW en Primaria es una pantalla llena de botones que no enseñan música. Encender, apagar y
 * silenciar basta para entender qué es una textura.
 *
 * La reproducción va con `lookahead` sobre el reloj del `AudioContext`, como todo lo que
 * suena aquí: `setInterval` cada 25 ms programa lo de los próximos 100 ms, y el cursor se
 * mueve aparte con `requestAnimationFrame`. Mezclarlos haría que el dibujo cojeara sin que
 * el sonido lo hiciera.
 */

export default function Pistas({ actividad }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    pistas: Pista[];
    columnas: number;
    tempo?: number;
    /** Pulsos por casilla. 1 es una negra por casilla; 0,5 una corchea. */
    pulsosPorCasilla?: number;
    exportable?: boolean;
  };

  const carril = useCarril(actividad.etapa);
  const { pistas, columnas } = contenido;
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 96;
  const porCasilla = contenido.pulsosPorCasilla ?? 1;

  const [estado, despachar] = useReducer(
    (e: EstadoPistas, a: AccionPistas) => reducirPistas(e, a),
    INICIAL_PISTAS,
  );

  /**
   * Qué instrumento suena en cada pista, que ya no es fijo.
   *
   * Arranca con el que declara el JSON y el niño lo puede cambiar: oír el mismo arreglo con
   * la melodía en flauta y luego en guitarra es media lección de timbre, y hasta ahora
   * exigía editar el fichero. Solo tienen selector las pistas de notas — la percusión no
   * tiene instrumento que elegir, tiene golpes.
   */
  const [instrumentos, setInstrumentos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pistas.filter((p) => p.clase === 'melodica').map((p) => [p.clave, p.instrumento ?? 'marimba']),
    ),
  );

  /* La clave del sampler lleva el instrumento, no solo la pista: al cambiar de instrumento
     hace falta OTRO sampler, y con la pista como clave el anterior se habría quedado puesto
     y la pista seguiría sonando a lo de antes. */
  const samplers = useRef(new Map<string, Sampler>());
  const percusion = useRef<Percusion | null>(null);
  const temporizador = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const parar = useCallback(() => {
    if (temporizador.current !== null) window.clearInterval(temporizador.current);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    temporizador.current = null;
    rafId.current = null;
    despachar({ tipo: 'sonando', valor: false });
  }, []);

  useEffect(() => parar, [parar]);

  /** Carga solo lo que la actividad usa: un instrumento por pista, y solo sus golpes. */
  const preparar = useCallback(async () => {
    await despertarAudio();
    for (const p of pistas) {
      if (p.clase !== 'melodica') continue;
      const nombre = instrumentos[p.clave] ?? p.instrumento ?? 'marimba';
      if (samplers.current.has(nombre)) continue;
      const s = new Sampler(muestrasDe(nombre));
      await s.cargar();
      samplers.current.set(nombre, s);
    }
    const golpes = pistas
      .filter((p) => p.clase === 'percusion')
      .flatMap((p) => p.filas as Golpe[]);
    if (golpes.length && !percusion.current) {
      const pc = new Percusion([...new Set(golpes)]);
      await pc.cargar();
      percusion.current = pc;
    }
  }, [pistas, instrumentos]);

  /**
   * @param cuando instante del reloj de audio. **Sin él suena ya**, y hay que omitirlo, no
   *        poner un cero: un cero es un instante del pasado, y una envolvente programada en
   *        el pasado salta directamente a su valor final, que es el silencio. Sonaría nada.
   */
  const sonarCelda = useCallback((pista: Pista, fila: number, cuando?: number) => {
    if (pista.clase === 'percusion') {
      percusion.current?.golpear(pista.filas[fila] as Golpe, cuando);
    } else {
      const nombre = instrumentos[pista.clave] ?? pista.instrumento ?? 'marimba';
      samplers.current
        .get(nombre)
        ?.tocar(pista.filas[fila]!, cuando, porCasilla * (60 / bpm) * 0.95);
    }
  }, [bpm, porCasilla, instrumentos]);

  const reproducir = useCallback(async () => {
    if (estadoRef.current.sonando) {
      parar();
      return;
    }
    try {
      await preparar();
    } catch {
      // Sin muestras la cuadrícula se sigue viendo y editando. No se cierra nada.
    }

    const ctx = obtenerContexto();
    const segundosPorCasilla = (60 / bpm) * porCasilla;
    const inicio = ctx.currentTime + 0.2;
    let siguiente = 0;

    despachar({ tipo: 'sonando', valor: true });

    /*
      Lookahead: cada 25 ms se programa lo que caiga en los próximos 100 ms. Es lo que hace
      que el ritmo no dependa de si el navegador está ocupado, y está en `CLAUDE.md` §7 como
      regla del proyecto. `setInterval` decide CUÁNDO MIRAR, no cuándo suena.
    */
    temporizador.current = window.setInterval(() => {
      const ahora = obtenerContexto().currentTime;
      while (inicio + siguiente * segundosPorCasilla < ahora + 0.1) {
        const columna = siguiente % columnas;
        for (const { pista, fila } of loQueSuena(estadoRef.current, pistas, columna)) {
          sonarCelda(pista, fila, inicio + siguiente * segundosPorCasilla);
        }
        siguiente += 1;
      }
    }, 25);

    // El cursor va aparte: animarlo dentro del planificador lo desincronizaría del sonido.
    const mover = () => {
      const transcurrido = obtenerContexto().currentTime - inicio;
      const columna = Math.max(0, Math.floor(transcurrido / segundosPorCasilla) % columnas);
      despachar({ tipo: 'columna', valor: columna });
      rafId.current = requestAnimationFrame(mover);
    };
    rafId.current = requestAnimationFrame(mover);
  }, [bpm, columnas, parar, pistas, porCasilla, preparar, sonarCelda]);

  /** Las notas melódicas, para exportar. La percusión no cabe en una partitura de una voz. */
  const paraExportar = useCallback((): NotaExportable[] => {
    const salida: NotaExportable[] = [];
    for (const p of pistas) {
      if (p.clase !== 'melodica') continue;
      for (let fila = 0; fila < p.filas.length; fila++) {
        let desde: number | null = null;
        for (let col = 0; col <= columnas; col++) {
          const on = col < columnas && estado.encendidas.has(clavePista(p.clave, fila, col));
          if (on && desde === null) desde = col;
          if (!on && desde !== null) {
            salida.push({
              nota: p.filas[fila]!,
              inicio: desde * porCasilla,
              duracion: (col - desde) * porCasilla,
            });
            desde = null;
          }
        }
      }
    }
    return salida.sort((a, b) => a.inicio - b.inicio);
  }, [estado.encendidas, pistas, columnas, porCasilla]);

  return (
    <section className="actividad pistas" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div className="pistas__tabla">
        {pistas.map((p) => {
          const muda = estado.silenciadas.has(p.clave);
          return (
            <div key={p.clave} className="pistas__pista" data-muda={muda || undefined}>
              <div className="pistas__cabecera">
                <span className="pistas__nombre">{t(`pista.${p.clave}`)}</span>

                {/* Solo en las pistas de notas: la percusión no tiene instrumento que
                    elegir. Va con `select` nativo y no con botones porque son seis. */}
                {p.clase === 'melodica' && (
                  <label className="pistas__instrumento">
                    <span className="visualmente-oculto">
                      {t('pistas.instrumento')} {t(`pista.${p.clave}`)}
                    </span>
                    <select
                      value={instrumentos[p.clave] ?? p.instrumento ?? 'marimba'}
                      onChange={(e) => {
                        setInstrumentos((x) => ({ ...x, [p.clave]: e.target.value }));
                      }}
                    >
                      {instrumentosDisponibles().map((n) => (
                        <option key={n} value={n}>
                          {t(`instrumento.${n}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {/* Silenciar no borra: es lo que permite oír qué aporta cada pista. */}
                <button
                  type="button"
                  className="pistas__mudo"
                  aria-pressed={muda}
                  aria-label={`${t(muda ? 'pistas.activar' : 'pistas.silenciar')} ${t(`pista.${p.clave}`)}`}
                  onClick={() => despachar({ tipo: 'silenciar', pista: p.clave })}
                >
                  {t(muda ? 'pistas.muda' : 'pistas.suena')}
                </button>
                <button
                  type="button"
                  className="pistas__limpiar"
                  /* Vacía ESTA pista, y el de abajo las cuatro. En pantalla se distinguen
                     por dónde están; para un lector de pantalla no, así que este dice cuál.
                     Es lo mismo que ya hacía el botón de silenciar, al lado. */
                  aria-label={`${t('pistas.limpiar')} ${t(`pista.${p.clave}`)}`}
                  aria-disabled={!tieneAlgo(estado, p.clave) || undefined}
                  onClick={() => despachar({ tipo: 'limpiarPista', pista: p.clave })}
                >
                  {t('pistas.limpiar')}
                </button>
              </div>

              <div className="pistas__rejilla">
                {p.filas.map((valor, fila) => (
                  <div key={valor} className="pistas__fila">
                    <span className="pistas__etiqueta" aria-hidden="true">
                      {p.clase === 'percusion' ? t(`golpe.${valor}`) : valor.replace(/\d/, '')}
                    </span>
                    {Array.from({ length: columnas }, (_, col) => {
                      const on = estado.encendidas.has(clavePista(p.clave, fila, col));
                      return (
                        <button
                          key={col}
                          type="button"
                          className="pistas__celda"
                          data-on={on || undefined}
                          data-aqui={estado.columna === col || undefined}
                          /* La primera casilla de cada compás se marca: sin esa referencia,
                             dieciséis casillas iguales son imposibles de contar. */
                          data-compas={col % 4 === 0 || undefined}
                          style={
                            on && p.clase === 'melodica'
                              ? { background: colorDe(valor) }
                              : undefined
                          }
                          aria-label={`${t(`pista.${p.clave}`)} ${valor} ${col + 1}`}
                          aria-pressed={on}
                          onClick={() => {
                            despachar({ tipo: 'alternar', pista: p.clave, fila, columna: col });
                            /*
                              Y suena al encenderla, como en la rejilla: se aprende oyendo lo
                              que se pone, no mirándolo. Al apagarla no suena — sonaría igual
                              que al encenderla y no diría cuál de las dos cosas ha pasado.

                              `preparar()` puede tardar la primera vez, mientras carga el
                              instrumento; por eso va sin esperar a nada y la casilla se
                              enciende ya. Que la primera nota no suene es mejor que una
                              casilla que tarda medio segundo en responder.
                            */
                            if (!on) void preparar().then(() => sonarCelda(p, fila));
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BarraAcciones>
        <button
          type="button"
          className="boton-principal boton-arranque"
          data-sonando={estado.sonando || undefined}
          onClick={() => void reproducir()}
        >
          {estado.sonando ? <IconoParar /> : <IconoTocar />}
          {t(estado.sonando ? 'accion.parar' : 'accion.empezar')}
        </button>

        <button
          type="button"
          className="boton-repetir"
          aria-disabled={estado.encendidas.size === 0 || undefined}
          onClick={() => despachar({ tipo: 'limpiarTodo' })}
        >
          <IconoLimpiar />
          {t('pistas.limpiar')}
        </button>

        {contenido.exportable && (
          <button
            type="button"
            className="boton-repetir"
            aria-disabled={paraExportar().length === 0 || undefined}
            onClick={() =>
              descargar(`${actividad.id}.mid`, aMidiSMF(paraExportar(), bpm), 'audio/midi')
            }
          >
            <IconoDescargar />
            {t('rejilla.midi')}
          </button>
        )}
      </BarraAcciones>

      {/* La exportación se lleva solo las pistas melódicas: la percusión no cabe en una
          partitura de una voz, y meterla como notas de altura sería escribir una mentira. */}
      {contenido.exportable && <p className="pista-fija">{t('pistas.exportaMelodia')}</p>}
    </section>
  );
}
