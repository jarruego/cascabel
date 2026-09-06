import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { despertarAudio, obtenerContexto } from '@/audio/AudioEngine';
import { MARIMBA, Sampler } from '@/audio/sampler';
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
  };

  const carril = useCarril(actividad.etapa);
  const modo: ModoRejilla = contenido.modo ?? (contenido.solucion ? 'dictado' : 'libre');
  const { filas, columnas } = contenido;
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 96;
  // En una rejilla hay muchas celdas: se usa el tamaño del carril como suelo, pero se
  // deja que encojan si no caben, nunca por debajo del mínimo de WCAG 2.5.8.
  const lado = Math.max(24, Math.min(OBJETIVO_TACTIL[carril], Math.floor(320 / columnas)));

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
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <div
        className="rejilla__cuadricula"
        role="grid"
        aria-label={t(contenido.consigna)}
        style={{ gridTemplateColumns: `repeat(${columnas}, ${lado}px)` }}
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
                style={{ width: lado, height: lado }}
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
          <Icono nombre="reproducir" tamano={26} /> {t('rejilla.reproducir')}
        </button>

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
            className="boton-repetir"
            onClick={() =>
              despachar({ tipo: 'comprobar', solucion: contenido.solucion ?? [] })
            }
          >
            {t('rejilla.comprobar')}
          </button>
        )}
      </div>

      <p className="feedback" aria-live="polite">
        {estado.fase === 'revisando' && t('rejilla.revisa')}
        {estado.fase === 'completada' && t('comun.completada')}
        {modo === 'libre' && estado.fase === 'editando' && t('rejilla.libre')}
      </p>

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
