import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio } from '@/audio/AudioEngine';
import { Sampler } from '@/audio/sampler';
import { instrumentosDisponibles, muestrasDe, sostiene } from '@/audio/instrumentos';
import { Acompanamiento, type Patron } from '@/audio/acompanamiento';
import { IconoParar, IconoTocar } from '@/ui/Transporte';
import { Retos } from '@/ui/Retos';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import { Icono } from '@/ui/Icono';

/**
 * Tipo «lienzo»: creación libre, sin evaluación.
 *
 * Ocho de las cincuenta y cuatro actividades del catálogo son de este tipo, y es el que más
 * fácil sería estropear: **aquí no hay respuesta correcta, no hay comprobación, no hay
 * puntuación y no se puede fallar**. Es la regla de Incredibox que el dosier señala como el
 * mejor modelo de motivación infantil del sector — que explorar sea más divertido que
 * acertar — y es lo contrario de Duolingo.
 *
 * Por eso este componente **no tiene máquina de estados con solución**. Si algún día alguien
 * quiere añadirle un «comprobar», que lo piense dos veces: dejaría de ser un lienzo.
 *
 * Termina cuando el niño dice que ha terminado. No hay otra condición.
 *
 * **El acompañamiento opcional** (`acompanamiento` en el JSON) es lo que convierte cinco
 * notas sueltas en música. Sobre un bordón —tónica y quinta, sin tercera— no hay nota de la
 * pentatónica que suene mal, y ésa es justamente la propiedad que hace que un niño con
 * vergüenza se atreva a improvisar. Ver `audio/acompanamiento.ts`.
 */

interface Trazo {
  x: number;
  y: number;
  fila: number;
}

export default function Lienzo({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    /** Notas disponibles, de aguda a grave. La altura en pantalla es la altura del sonido. */
    notas?: string[];
    /** Colores por fila, para que el dibujo tenga sentido visual además de sonoro. */
    colores?: string[];
    /** Propuestas de qué dibujar. Ver `ui/Retos.tsx`: son ideas, no tareas. */
    retos?: string[];
    /**
     * Timbre. **Cambia lo que se puede dibujar**, no solo cómo suena.
     *
     * Con un instrumento que sostiene —flauta, violín, voz— una raya horizontal es una nota
     * larga, que es lo que un niño espera al dibujarla. Con uno percusivo no puede serlo, y
     * entonces la raya se convierte en un trémolo. Ver `audio/instrumentos.ts`.
     */
    instrumento?: string;
    /**
     * El selector de instrumento.
     *
     * **Apagado salvo que la actividad lo pida.** Cambiar el timbre enseña algo de verdad
     * —una raya horizontal con flauta es una nota larga y con marimba es un trémolo— pero
     * eso es el asunto de una actividad concreta, no de todas. En la caja de sonidos, lo
     * bueno es dibujar; un desplegable al lado es una decisión que interrumpe.
     */
    elegirInstrumento?: boolean;
    /**
     * La botonera de colores de debajo del lienzo.
     *
     * Es la vía por toque para quien no quiere arrastrar, **y el lienzo ya la tiene**: se
     * puede tocar directamente donde se quiere que suene. Donde estorba —una caja de
     * sonidos, donde lo bueno es dibujar— se apaga, y para no perder el acceso por teclado
     * el propio lienzo responde a las flechas y a la barra espaciadora.
     */
    teclas?: boolean;
    /**
     * Base en bucle que suena por debajo. Ver `audio/acompanamiento.ts`.
     *
     * No arranca sola: hay un botón. Una base que empieza a sonar al entrar en la pantalla
     * asusta y, sobre todo, no deja elegir; y a veces lo que quiere el maestro es justo el
     * silencio de debajo.
     */
    acompanamiento?: Patron;
  };

  const carril = useCarril(actividad.etapa);
  const conTeclas = contenido.teclas ?? true;
  const conInstrumento = contenido.elegirInstrumento ?? false;
  const notas = contenido.notas ?? ['C6', 'G5', 'E5', 'C5', 'G4', 'E4', 'C4'];
  const colores = contenido.colores ?? [
    'vivo-rosa', 'vivo-rojo', 'vivo-naranja', 'vivo-amarillo',
    'vivo-verde', 'vivo-turquesa', 'vivo-azul',
  ];

  const [trazos, setTrazos] = useState<Trazo[]>([]);
  /* Qué sonido está elegido para quien navega con teclado. Empieza en el más grave,
     que es el de abajo: subir con la flecha de subir es lo que espera cualquiera. */
  const [filaTeclado, setFilaTeclado] = useState(0);
  const lienzo = useRef<HTMLDivElement | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const dibujando = useRef(false);
  const ultimaFila = useRef(-1);

  /**
   * Instrumento elegido.
   *
   * **Cambiarlo cambia lo que se puede dibujar, no solo cómo suena.** Con flauta o violín
   * una raya horizontal es una nota larga; con marimba no puede serlo, y esa misma raya se
   * convierte en un trémolo. Que el niño pueda cambiarlo y oír la diferencia es media
   * lección sobre qué distingue a un instrumento de otro.
   */
  const [instrumento, setInstrumento] = useState(contenido.instrumento ?? 'flauta');
  const puedeSostener = sostiene(instrumento);
  /** Función que suelta la nota que se está manteniendo, si hay alguna. */
  const soltar = useRef<(() => void) | null>(null);

  const cargado = useRef<string | null>(null);

  /* El acompañamiento vive en un ref y no en el estado: lo que cambia con él en pantalla es
     un botón, y meterlo en el estado obligaría a redibujar el lienzo entero cada vuelta. */
  const base = useRef<Acompanamiento | null>(null);
  const [sonandoBase, setSonandoBase] = useState(false);

  const alternarBase = useCallback(async () => {
    if (!contenido.acompanamiento) return;
    if (base.current?.enMarcha) {
      base.current.parar();
      setSonandoBase(false);
      return;
    }
    try {
      await despertarAudio();
      if (!base.current) {
        const a = new Acompanamiento(contenido.acompanamiento);
        await a.cargar();
        base.current = a;
      }
      base.current.arrancar();
      setSonandoBase(true);
    } catch {
      // Sin muestras el lienzo sigue funcionando entero. La base es un apoyo, no un
      // requisito, y quedarse sin ella no puede cerrar la actividad.
    }
  }, [contenido.acompanamiento]);

  // Al salir, la base se calla. Es lo único de esta pantalla que sigue sonando solo.
  useEffect(() => () => base.current?.parar(), []);

  const preparar = useCallback(async () => {
    await despertarAudio();
    // Si ha cambiado el instrumento, el sampler anterior ya no sirve: sus muestras son
    // otras. Se suelta lo que esté sonando antes, o quedaría una nota huérfana.
    if (cargado.current !== instrumento) {
      soltar.current?.();
      soltar.current = null;
      sampler.current = null;
      cargado.current = instrumento;
    }
    if (!sampler.current) {
      const s = new Sampler(muestrasDe(instrumento));
      await s.cargar();
      sampler.current = s;
    }
    return sampler.current;
  }, [instrumento]);

  /**
   * Empieza una nota.
   *
   * Con un instrumento que sostiene, la nota se **mantiene** hasta que se cambia de fila o
   * se levanta el dedo: una raya horizontal es un sonido largo, que es lo que cualquiera
   * espera al dibujarla. Con uno percusivo eso no se puede —una marimba se golpea y se
   * apaga—, así que la raya se convierte en repeticiones, que es el trémolo y es el gesto
   * que hace un percusionista de verdad para mantener una nota.
   */
  const sonar = useCallback(async (fila: number) => {
    try {
      const s = await preparar();
      const nota = notas[fila] ?? 'C4';
      if (puedeSostener) {
        soltar.current?.();
        soltar.current = s.sostener(nota, 0.9);
      } else {
        s.tocar(nota, undefined, 0.9);
      }
    } catch {
      // Sin sonido se sigue dibujando. Media actividad es visual.
    }
  }, [notas, preparar, puedeSostener]);

  /** Al levantar el dedo se suelta lo que estuviera sonando. */
  const callar = useCallback(() => {
    soltar.current?.();
    soltar.current = null;
  }, []);

  // Y al salir de la actividad también: una nota sostenida que sobrevive a la pantalla es
  // de las cosas más desconcertantes que puede hacer una aplicación de música.
  useEffect(() => callar, [callar]);

  /**
   * Cuanto más arriba se dibuja, más aguda es la nota. Es la metáfora que usan todos los
   * métodos —el caracol que sube y baja— y la que un niño entiende sin que se la expliquen.
   */
  const puntoDe = useCallback(
    (clientX: number, clientY: number): Trazo | null => {
      const caja = lienzo.current?.getBoundingClientRect();
      if (!caja) return null;
      const x = ((clientX - caja.left) / caja.width) * 100;
      const y = ((clientY - caja.top) / caja.height) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) return null;
      const fila = Math.min(notas.length - 1, Math.max(0, Math.floor((y / 100) * notas.length)));
      return { x, y, fila };
    },
    [notas.length],
  );

  /**
   * Cada cuántos píxeles recorridos se vuelve a atacar la misma nota.
   *
   * **Antes una línea horizontal sonaba una sola vez, igual que un punto**, así que el
   * dibujo más largo y el más corto producían exactamente el mismo sonido. Eso rompe lo
   * único que la actividad promete: que lo que dibujas es lo que se oye.
   *
   * Se repite el ataque, y no es un apaño: una marimba **no puede sostener una nota**. Para
   * mantenerla se repite el golpe, que es el trémolo, y es literalmente lo que hace un niño
   * con una lámina Orff cuando quiere un sonido largo. Así que repetir es el gesto
   * auténtico del instrumento, no un sustituto de uno mejor.
   *
   * Se mide en píxeles y no en tiempo: así el sonido depende del DIBUJO y no de lo deprisa
   * que se dibuje, que es lo que permite volver a hacer el mismo trazo y que suene igual.
   */
  const PASO_PX = 34;
  /** Y aun así, un mínimo de tiempo: un barrido rápido no puede convertirse en metralla. */
  const MINIMO_MS = 85;

  const ultimoX = useRef<number | null>(null);
  const ultimoSonido = useRef(0);

  const anadir = useCallback(
    (clientX: number, clientY: number) => {
      const p = puntoDe(clientX, clientY);
      if (!p) return;
      setTrazos((t) => [...t, p]);

      const ahora = performance.now();
      const cambioDeFila = p.fila !== ultimaFila.current;
      const recorrido =
        ultimoX.current === null ? Infinity : Math.abs(clientX - ultimoX.current);
      // Repetir por distancia solo tiene sentido si el instrumento NO sostiene: si
      // sostiene, la nota ya está sonando y volver a atacarla la partiría en trozos.
      const tocaRepetir =
        !puedeSostener && recorrido >= PASO_PX && ahora - ultimoSonido.current >= MINIMO_MS;

      if (cambioDeFila || tocaRepetir) {
        ultimaFila.current = p.fila;
        ultimoX.current = clientX;
        ultimoSonido.current = ahora;
        void sonar(p.fila);
      }
    },
    [puntoDe, sonar, puedeSostener],
  );

  return (
    <section className="actividad lienzo" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div
        ref={lienzo}
        className="lienzo__area"
        role="application"
        aria-label={t(contenido.consigna)}
        /*
          El lienzo se puede tocar con el teclado.

          Hace falta desde que la botonera de colores es opcional: era la única vía sin
          ratón, y quitarla de una actividad no puede dejar sin acceso a quien navega con
          teclado. Flechas para subir y bajar de sonido, espacio o Enter para tocarlo.
        */
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            setFilaTeclado((f) => {
              const siguiente = e.key === 'ArrowUp' ? f - 1 : f + 1;
              return Math.max(0, Math.min(notas.length - 1, siguiente));
            });
          } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            void sonar(filaTeclado);
            setTrazos((t) => [
              ...t,
              { x: (t.length * 3) % 100, y: (filaTeclado / notas.length) * 100 + 5, fila: filaTeclado },
            ]);
          }
        }}
        onPointerDown={(e) => {
          dibujando.current = true;
          ultimaFila.current = -1;
          ultimoX.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          anadir(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dibujando.current) anadir(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dibujando.current = false;
          callar();
        }}
        onPointerCancel={() => {
          dibujando.current = false;
          callar();
        }}
      >
        {/* Franjas de altura: se ven, así que el niño sabe dónde está cada sonido antes
            de tocarlo. Sin ellas el lienzo sería una caja negra. */}
        {notas.map((n, i) => (
          <div
            key={n}
            className="lienzo__franja"
            style={{
              top: `${(i / notas.length) * 100}%`,
              height: `${100 / notas.length}%`,
              background: `var(--suave-${['azul', 'verde', 'amarillo', 'rojo', 'morado'][i % 5]})`,
            }}
          />
        ))}

        <svg className="lienzo__dibujo" viewBox="0 0 100 100" preserveAspectRatio="none">
          {trazos.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.4}
              fill={`var(--${colores[p.fila % colores.length]})`}
            />
          ))}
        </svg>
      </div>

      {/* Botonera de altura: la vía por TOQUE, para quien no puede o no quiere arrastrar
          el dedo. Es lo que hace que el lienzo cumpla WCAG 2.5.7. */}
      {conTeclas && (
      <div className="lienzo__teclas" role="group" aria-label={t('lienzo.notas')}>
        {notas.map((n, i) => (
          <button
            key={n}
            type="button"
            className="lienzo__tecla"
            style={{
              minWidth: OBJETIVO_TACTIL[carril] * 0.7,
              minHeight: OBJETIVO_TACTIL[carril],
              background: `var(--${colores[i % colores.length]})`,
            }}
            aria-label={n}
            onClick={() => {
              void sonar(i);
              setTrazos((t) => [...t, { x: (t.length * 3) % 100, y: (i / notas.length) * 100 + 5, fila: i }]);
            }}
          />
        ))}
      </div>
      )}

      {/* Propuestas y acciones en la misma fila: en un lienzo, cada línea que no sea
          lienzo es lienzo que se pierde. */}
      <div className="lienzo__acciones">
        {/* Elegir instrumento. Va con `select` nativo y no con botones porque son ocho y no
            tres: ocho botones serían una barra más larga que el propio lienzo. */}
        {conInstrumento && (
        <label className="lienzo__instrumento">
          <span className="visualmente-oculto">{t('lienzo.instrumento')}</span>
          <select value={instrumento} onChange={(e) => setInstrumento(e.target.value)}>
            {instrumentosDisponibles().map((n) => (
              <option key={n} value={n}>
                {t(`instrumento.${n}`)}
              </option>
            ))}
          </select>
        </label>
        )}

        {contenido.acompanamiento && (
          <button
            type="button"
            className="boton-repetir"
            aria-pressed={sonandoBase}
            data-elegida={sonandoBase || undefined}
            onClick={() => void alternarBase()}
          >
            {sonandoBase ? <IconoParar /> : <IconoTocar />}
            {t(sonandoBase ? 'lienzo.pararBase' : 'lienzo.base')}
          </button>
        )}

        {contenido.retos && <Retos retos={contenido.retos} />}
        <button type="button" className="boton-repetir" onClick={() => setTrazos([])}>
          {t('lienzo.limpiar')}
        </button>
        <button
          type="button"
          className="boton-repetir"
          onClick={() => {
            base.current?.parar();
            alTerminar({ actividadId: actividad.id, completada: true });
          }}
        >
          <Icono nombre="pulgar" tamano={26} /> {t('lienzo.terminar')}
        </button>
      </div>

      {/* Pista FIJA, no feedback: no cambia nunca, así que no necesita aria-live —un
          lector de pantalla ya la lee al llegar—. No hay marcador, ni porcentaje, ni
          «bien hecho»: aquí no se evalúa nada. */}
      <p className="pista-fija">{t('lienzo.libre')}</p>
    </section>
  );
}
