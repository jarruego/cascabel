import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio, latenciaMs, obtenerContexto } from '@/audio/AudioEngine';
import { Sampler } from '@/audio/sampler';
import { muestrasDe } from '@/audio/instrumentos';
import { TOLERANCIA_MS } from '@/config';
import { evaluarRitmo, type EvaluacionRitmica } from '../evaluacion';
import { yDeLinea } from '../alturaEnPauta';
import {
  carrilesDe,
  figuraDe,
  geometriaDe,
  representaAltura,
  type NotaMusicograma,
  type Orientacion,
  type Representacion,
  anchoDeBandas,
} from '../musicograma';
import { duracionDe, instantesDe } from '../melodiaEnTiempo';
import { CuentaAtras } from '@/ui/CuentaAtras';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { Icono } from '@/ui/Icono';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';

/**
 * Tipo «karaoke»: las notas avanzan **de derecha a izquierda sobre un pentagrama** y hay que
 * tocarlas justo cuando cruzan la línea del presente.
 *
 * **Por qué es un tipo aparte de `seguir`.** En `seguir` el niño no responde: mira. Esa regla
 * es la que permite que aquel componente no tenga evaluación ni solución, y meterle una
 * mecánica interactiva la habría roto. Comparten la idea —la música avanza en el tiempo— y
 * no comparten el contrato.
 *
 * **Por qué sobre un pentagrama y no sobre carriles de colores.** Un juego de notas que caen
 * enseña ritmo; sobre una pauta real enseña además que ese ritmo se escribe y que lo que sube
 * en el dibujo sube al oído. Y sale gratis: la nota tiene que estar a alguna altura, y
 * ponerla en la suya no cuesta más que ponerla en una fila arbitraria.
 *
 * **Sin marcador y sin rojo mientras se juega** (regla 4). Al acertar, la nota se ilumina; si
 * pasa de largo, se apaga en gris. El resumen final **no es solo un porcentaje**: lleva el
 * desvío medio con signo, porque un niño que va sistemáticamente tarde con buen pulso no ha
 * fallado, va desfasado (`CLAUDE.md` §7).
 */

type Fase = 'listo' | 'cuenta' | 'sonando' | 'resultado';


/**
 * Segundos de recorrido visible antes de la línea, y **también** el margen antes de la
 * primera nota. Son el mismo número a propósito, y esa igualdad es la regla:
 *
 * toda nota entra por el borde del recuadro y tarda `VENTANA_S` en llegar a la línea. Si el
 * margen inicial fuera menor, **la primera nota nacería ya empezado el recorrido y tendría
 * menos aviso que todas las demás**. Con dos segundos frente a una ventana de 3,2 nacía a un
 * tercio del camino: se notaba, y el autor lo notó.
 *
 * Que sea una sola constante y no dos que casualmente coinciden es lo que impide que alguien
 * las separe sin darse cuenta.
 */
const VENTANA_S = 3.2;
const ANTICIPACION_S = VENTANA_S;
const ENTRADA_S = VENTANA_S;
/** Dónde está la línea del presente, en porcentaje del ancho. */
const LINEA_PCT = 22;
/** Separación entre líneas del pentagrama, en píxeles. */
const SEP = 14;
/** Altura libre por encima de la quinta línea, para las notas agudas. */
const MARGEN_ARRIBA = 46;

export default function Karaoke({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    notas: NotaMusicograma[];
    tempo?: number;
    clave?: 'sol' | 'fa';
    /** 'vertical' cae de arriba abajo; 'horizontal' viene de la derecha. */
    orientacion?: Orientacion;
    /** Qué se dibuja: pentagrama, color, sílaba rítmica, figura o icono. Ver musicograma.ts */
    representacion?: Representacion;
    /**
     * Un botón por banda en vez de uno solo.
     *
     * Cambia lo que se practica: con un botón único basta con acertar **cuándo**; con uno
     * por banda hay que acertar además **cuál**, que es coordinación y lectura de altura a
     * la vez. Y es lo que abre la puerta a los acordes: dos notas en el mismo instante y en
     * bandas distintas se tocan con dos dedos, sin que el motor necesite nada más.
     */
    botonesPorCarril?: boolean;
    /**
     * Qué aparece al acertar.
     *
     * Por defecto lo que corresponda a la representación, que es casi siempre lo correcto:
     * enseñar «sol» en una actividad de animales no aporta nada —el niño no está trabajando
     * el nombre de las notas— y encima mete un dato que sobra. Con `'ninguno'` no aparece
     * nada, que a veces es lo mejor.
     */
    avisoAlAcertar?: 'nota' | 'silaba' | 'icono' | 'ninguno';
    /**
     * Las figuras bajan como círculos neutros y su dibujo **aparece al acertarlas**.
     *
     * Cambia lo que se mira: sin revelar, el niño reconoce el dibujo mientras baja; con
     * revelar, tiene que atender al momento, y el dibujo es la recompensa. Sirve para hacer
     * más difícil la misma actividad sin tocar el tempo ni el número de figuras.
     */
    revelar?: boolean;
    /** Timbre. Ver `audio/instrumentos.ts`: hoy solo hay marimba. */
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  const bpm = contenido.tempo ?? actividad.practica?.tempo ?? 100;
  const clave = contenido.clave ?? 'sol';
  const notas = contenido.notas;
  const representacion = contenido.representacion ?? 'pentagrama';
  /*
    Vertical por defecto cuando NO se lee una pauta. Caer no exige ningún sentido de lectura,
    así que sirve antes de saber leer; venir de la derecha reproduce cómo se recorre una
    partitura, y eso solo aporta cuando lo que se aprende es justamente a leerla.
  */
  const orientacion: Orientacion =
    contenido.orientacion ?? (representacion === 'pentagrama' ? 'horizontal' : 'vertical');
  const vertical = orientacion === 'vertical';
  const conAltura = representaAltura(representacion);
  const carriles = useMemo(() => (conAltura ? carrilesDe(notas) : []), [notas, conAltura]);
  // Un botón por banda solo tiene sentido si hay bandas: con una sola sería el mismo botón
  // con otro nombre.
  const porCarril = (contenido.botonesPorCarril ?? false) && carriles.length > 1;
  const revelar = contenido.revelar ?? false;
  /*
    El aviso sigue a la representación salvo que se diga otra cosa. Es el mismo criterio que
    el resto del fichero: enseñar el nombre de la nota solo tiene sentido donde la altura es
    lo que se trabaja.
  */
  const aviso =
    contenido.avisoAlAcertar ??
    (representacion === 'silaba' ? 'silaba' :
     representacion === 'icono' ? 'icono' :
     representacion === 'figura' ? 'ninguno' : 'nota');

  const [fase, setFase] = useState<Fase>('listo');
  const [ahora, setAhora] = useState(0);
  const [acertadas, setAcertadas] = useState<Set<number>>(new Set());
  const [pasadas, setPasadas] = useState<Set<number>>(new Set());
  const [evaluacion, setEvaluacion] = useState<EvaluacionRitmica | null>(null);
  /**
   * Nombres de nota que suben flotando al acertar. Se guardan con un id propio y no con el
   * índice de la nota porque hay que poder repetir la misma nota: si dos «mi» seguidos
   * compartieran clave, React reutilizaría el nodo y la animación no volvería a arrancar.
   */
  const [avisos, setAvisos] = useState<
    Array<{ id: number; texto: string; icono?: string; cruce: number }>
  >([]);
  const siguienteAviso = useRef(0);

  const sampler = useRef<Sampler | null>(null);
  const rafId = useRef<number | null>(null);

  /*
    El ancho disponible se MIDE, no se supone.

    Las bandas estaban topadas en 360 px, así que en una tablet o en una pizarra la
    actividad se quedaba centrada y estrecha con media pantalla vacía al lado. Y el número
    fijo tenía un segundo problema: en un móvil de 320 px, cuatro bandas de 88 sumaban 352 y
    no cabían, así que el recuadro se encogía por CSS mientras las bandas seguían colocadas
    en coordenadas de 352. Se descolocaban por los dos extremos.

    Se mide con `ResizeObserver` y no con el ancho de la ventana porque lo que importa es la
    caja, y la caja cambia sin que cambie la ventana: al entrar y salir del modo lienzo.
  */
  const caja = useRef<HTMLElement | null>(null);
  const [anchoCaja, setAnchoCaja] = useState(0);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') {
      setAnchoCaja(el.clientWidth);
      return;
    }
    const ro = new ResizeObserver(([entrada]) => setAnchoCaja(entrada?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const instantes = useRef<number[]>([]);
  const golpes = useRef<number[]>([]);

  /** Instante de cada nota, en segundos desde el arranque. Incluye el margen de entrada. */
  const tiempos = useMemo(() => instantesDe(notas, bpm, ENTRADA_S), [notas, bpm]);

  // Un par de segundos de cola tras la última nota: si la evaluación llegara justo al
  // ataque, un golpe algo tardío en la última nota se perdería.
  const duracionTotal = duracionDe(notas, bpm, ENTRADA_S) + 2;

  /**
   * Tamaño del recuadro en el eje que NO es el del tiempo, en píxeles.
   *
   * **Y es el ancho de verdad del recuadro, no una aproximación.** Se aplica también por
   * estilo en línea, porque la geometría reparte las bandas sobre este número: si el CSS
   * dibujara el recuadro de otro ancho, las bandas no llegarían a los bordes y los botones
   * de abajo no cuadrarían con ellas. Tenerlo en dos sitios era un desajuste esperando.
   *
   * **Con bandas, el ancho sale de lo que hay**, y la regla vive en `anchoDeBandas`, con
   * test: cada banda es también su botón, así que su ancho es un objetivo táctil.
   */
  const TRANSVERSAL = vertical
    ? porCarril
      ? anchoDeBandas(carriles.length, anchoCaja, OBJETIVO_TACTIL[carril])
      : 200
    : 160;

  const opciones = useMemo(
    () => ({
      representacion,
      orientacion,
      clave,
      lineaPct: LINEA_PCT,
      anticipacionS: ANTICIPACION_S,
      transversalPx: TRANSVERSAL,
      separacion: SEP,
      margen: MARGEN_ARRIBA,
    }),
    [representacion, orientacion, clave, TRANSVERSAL],
  );

  const parar = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  }, []);

  useEffect(() => parar, [parar]);

  const arrancar = useCallback(async () => {
    await despertarAudio();
    if (!sampler.current) {
      try {
        const s = new Sampler(muestrasDe(contenido.instrumento));
        await s.cargar();
        sampler.current = s;
      } catch {
        // Sin muestras la melodía se ve avanzar igual: se pierde el sonido, no la actividad.
      }
    }

    const ctx = obtenerContexto();
    const t0 = ctx.currentTime + 0.4;
    // Lo esperado lleva la latencia SUMADA: el niño responde a lo que oye, y lo oye tarde.
    instantes.current = tiempos.map((s) => (t0 + s) * 1000 + latenciaMs());
    golpes.current = [];
    setAcertadas(new Set());
    setPasadas(new Set());
    setEvaluacion(null);

    const segundosPorPulso = 60 / bpm;
    tiempos.forEach((s, i) => {
      sampler.current?.tocar(notas[i]!.nota, t0 + s, notas[i]!.pulsos * segundosPorPulso * 0.9);
    });

    setFase('sonando');

    const bucle = () => {
      const ctxAhora = obtenerContexto().currentTime;
      setAhora(ctxAhora - t0);

      // Una nota se apaga cuando su ventana se cierra del todo, no cuando cruza la línea.
      const limite = TOLERANCIA_MS[carril].casi;
      const ms = ctxAhora * 1000;
      setPasadas((previas) => {
        let cambia = false;
        const nuevas = new Set(previas);
        instantes.current.forEach((esperado, i) => {
          if (!nuevas.has(i) && ms > esperado + limite) {
            nuevas.add(i);
            cambia = true;
          }
        });
        return cambia ? nuevas : previas;
      });

      if (ctxAhora - t0 > duracionTotal) {
        parar();
        setEvaluacion(evaluarRitmo(instantes.current, golpes.current, carril));
        setFase('resultado');
        return;
      }
      rafId.current = requestAnimationFrame(bucle);
    };
    rafId.current = requestAnimationFrame(bucle);
  }, [bpm, carril, notas, duracionTotal, parar, tiempos, contenido.instrumento]);

  /**
   * @param banda índice de la banda tocada, o `null` cuando hay un único botón.
   *
   * Con bandas, un toque **solo puede acertar notas de su banda**. Es lo que hace que la
   * actividad exija acertar cuál además de cuándo, y lo que permitirá los acordes: dos notas
   * simultáneas en bandas distintas se resuelven con dos toques independientes.
   */
  const tocar = useCallback((banda: number | null = null) => {
    if (fase !== 'sonando') return;
    const ms = obtenerContexto().currentTime * 1000;
    golpes.current.push(ms);

    const limite = TOLERANCIA_MS[carril].casi;
    let mejor = -1;
    let mejorError = Infinity;
    instantes.current.forEach((esperado, i) => {
      if (banda !== null && carriles.indexOf(notas[i]!.nota) !== banda) return;
      const error = Math.abs(ms - esperado);
      if (error < mejorError && error <= limite) {
        mejorError = error;
        mejor = i;
      }
    });
    if (mejor < 0) return;
    setAcertadas((a) => new Set(a).add(mejor));

    // El nombre de la nota, subiendo y desvaneciéndose. Es lo que convierte «he acertado»
    // en «he acertado un SOL»: la recompensa y el contenido son la misma cosa.
    const id = siguienteAviso.current++;
    const g = geometriaDe(
      notas[mejor]!, 0, carriles.indexOf(notas[mejor]!.nota),
      carriles.length, opciones,
    );
    const n = notas[mejor]!;
    const texto =
      aviso === 'nota' ? nombreDe(n.nota) :
      aviso === 'silaba' ? (n.silaba ?? '') : '';
    if (aviso !== 'ninguno') {
      setAvisos((previos) => [
        ...previos,
        { id, texto, icono: aviso === 'icono' ? n.icono : undefined, cruce: g.cruce },
      ]);
      window.setTimeout(() => setAvisos((p) => p.filter((a) => a.id !== id)), 1000);
    }
  }, [fase, carril, notas, carriles, opciones, aviso]);

  // La barra espaciadora vale como toque: en el ordenador del aula es lo natural, y de paso
  // deja la actividad accesible sin ratón.
  useEffect(() => {
    if (fase !== 'sonando') return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!porCarril && e.code === 'Space') {
        e.preventDefault();
        tocar();
        return;
      }
      // Con bandas, las teclas 1 a 4. Es lo que hace que la versión de varias bandas se
      // pueda tocar con las dos manos en un ordenador, que es donde de verdad se disfruta.
      if (porCarril) {
        const n = Number(e.code.replace('Digit', ''));
        if (e.code.startsWith('Digit') && n >= 1 && n <= carriles.length) {
          e.preventDefault();
          tocar(n - 1);
        }
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [fase, tocar, porCarril, carriles.length]);

  const total = notas.length;
  const porcentaje = total ? Math.round((acertadas.size / total) * 100) : 0;

  return (
    <section
      ref={caja}
      className="actividad karaoke"
      data-carril={carril}
      aria-labelledby="consigna"
    >
      <h1 id="consigna">{t(contenido.consigna)}</h1>

      <div
        className="karaoke__pauta"
        data-orientacion={orientacion}
        data-representacion={representacion}
        /* El ancho sale del mismo número que usa la geometría: ver TRANSVERSAL. */
        style={vertical ? { width: TRANSVERSAL, maxWidth: '100%' } : undefined}
        role="img"
        aria-label={t(`karaoke.pauta.${representacion}`)}
      >
        {/*
          El pentagrama, si lo hay. En vertical se pone de lado: las cinco líneas pasan a ser
          columnas, y la nota sube hacia la derecha en vez de hacia arriba. La pauta girada
          no es convencional —no existe en papel— pero mantiene la relación que importa:
          una nota más aguda está más lejos en el mismo sentido en el que se cuentan.
        */}
        {representacion === 'pentagrama' &&
          [1, 2, 3, 4, 5].map((linea) => {
            const d = yDeLinea(linea, SEP, MARGEN_ARRIBA);
            return (
              <span
                key={linea}
                className="karaoke__linea"
                style={vertical ? { left: TRANSVERSAL - d } : { top: d }}
                aria-hidden="true"
              />
            );
          })}

        {/* Carriles de color: una franja por grado, para orientarse sin leer.

            **Y la banda entera se toca**, no solo el botón de abajo. Es el blanco más grande
            que hay en pantalla, está justo donde el niño está mirando, y tocar donde está la
            nota es más directo que buscar un botón. Ley de Fitts en estado puro.

            Va con `aria-hidden` y sin foco a propósito: el mismo gesto ya lo ofrecen los
            botones de abajo, que sí tienen nombre accesible y sí entran en el orden de
            tabulación. Duplicarlo aquí haría que un lector de pantalla anunciara cada banda
            dos veces sin añadir nada. Puntero, la banda o el botón; teclado y lector, el
            botón. */}
        {representacion === 'color' &&
          carriles.map((nota, i) => {
            const g = geometriaDe({ nota, pulsos: 1 }, 0, i, carriles.length, opciones);
            const grosor = TRANSVERSAL / carriles.length;
            return (
              <span
                key={nota}
                className="karaoke__carril"
                data-tocable={porCarril || undefined}
                style={{
                  ...(vertical ? { left: g.cruce - grosor / 2 } : { top: g.cruce - grosor / 2 }),
                  ...(vertical ? { width: grosor } : { height: grosor }),
                  borderColor: colorDe(nota),
                }}
                onPointerDown={porCarril ? () => tocar(i) : undefined}
                aria-hidden="true"
              />
            );
          })}

        {/* La línea del presente: donde la figura se encuentra con su sonido. */}
        <span
          className="karaoke__ahora"
          style={vertical ? { top: `${100 - LINEA_PCT}%` } : { left: `${LINEA_PCT}%` }}
          aria-hidden="true"
        />

        {notas.map((n, i) => {
          const falta = tiempos[i]! - ahora;
          // Fuera de la ventana visible no se dibuja: no hay que animar treinta figuras.
          if (falta > ANTICIPACION_S || falta < -1.2) return null;
          const indice = conAltura ? carriles.indexOf(n.nota) : 0;
          const g = geometriaDe(n, falta, indice, carriles.length, opciones);
          const apagada = pasadas.has(i) && !acertadas.has(i);

          // El avance es siempre «cuánto falta»; el eje al que se aplica es lo único que
          // cambia entre las dos orientaciones. En vertical se invierte para que lo que
          // está por venir aparezca ARRIBA y baje hacia la línea.
          const posicion = vertical
            ? { top: `${100 - g.avance}%`, left: g.cruce }
            : { left: `${g.avance}%`, top: g.cruce };

          const largo = Math.max(SEP, n.pulsos * 20);
          const contenidoFigura =
            representacion === 'silaba' ? (n.silaba ?? '') :
            representacion === 'figura' ? figuraDe(n.pulsos) :
            representacion === 'icono' ? null : null;

          return (
            <span
              key={`${n.nota}-${i}`}
              className="karaoke__figura"
              data-forma={representacion}
              data-acertada={acertadas.has(i) || undefined}
              data-apagada={apagada || undefined}
              data-oculta={revelar && !acertadas.has(i) || undefined}
              style={{
                ...posicion,
                // La duración se ve como tamaño en el eje del tiempo: una nota que dura el
                // doble ocupa el doble, que es exactamente lo que dice la notación.
                ...(vertical ? { height: largo } : { width: largo }),
                ...(representacion === 'pentagrama' || representacion === 'color'
                  ? { background: apagada ? undefined : colorDe(n.nota) }
                  : { borderColor: apagada ? undefined : colorDe(n.nota) }),
              }}
              aria-hidden="true"
            >
              {/* Con `revelar`, la figura baja vacía y su dibujo solo aparece al acertarla. */}
              {(!revelar || acertadas.has(i)) && (
                <>
                  {representacion === 'icono' && n.icono && <Icono nombre={n.icono} tamano={38} />}
                  {contenidoFigura}
                </>
              )}
            </span>
          );
        })}

        {avisos.map((a) => (
          <span
            key={a.id}
            className="karaoke__aviso"
            style={
              vertical
                ? { top: `${100 - LINEA_PCT}%`, left: a.cruce }
                : { left: `${LINEA_PCT}%`, top: a.cruce }
            }
            aria-hidden="true"
          >
            {a.icono ? <Icono nombre={a.icono} tamano={44} /> : a.texto}
          </span>
        ))}
      </div>

      {/* El nombre también en texto vivo, para quien no puede ver la animación. */}
      <p className="visualmente-oculto" aria-live="polite">
        {avisos.length ? avisos[avisos.length - 1]!.texto : ''}
      </p>

      {fase === 'listo' && (
        <button type="button" className="boton-repetir" onClick={() => setFase('cuenta')}>
          {t('karaoke.empezar')}
        </button>
      )}

      {/* La cuenta atrás va justo antes de que empiece a contar lo que haces. */}
      {fase === 'cuenta' && <CuentaAtras desde={3} bpm={bpm} alTerminar={() => void arrancar()} />}

      {/*
        Los botones se ven DESDE EL PRINCIPIO y pegados al recuadro, sin nada entre medias.
        Antes aparecían al empezar y con una línea de texto en medio: el niño se encontraba
        la pantalla cambiando justo cuando empezaba a caer la primera figura, y la
        correspondencia entre banda y botón se perdía por culpa de esa línea. Estando desde
        el principio, además, se pueden colocar los dedos antes de que empiece.
      */}
      {porCarril ? (
        <div className="karaoke__botones" style={{ width: TRANSVERSAL, maxWidth: '100%' }}>
          {carriles.map((nota, i) => (
            <button
              key={nota}
              type="button"
              className="boton-actividad karaoke__banda"
              style={{ borderColor: colorDe(nota), background: colorDe(nota) }}
              onPointerDown={() => tocar(i)}
              aria-label={`${nombreDe(nota)} · ${i + 1}`}
            >
              {nombreDe(nota)}
            </button>
          ))}
        </div>
      ) : (
        fase === 'sonando' && (
          <button
            type="button"
            className="boton-actividad karaoke__diana"
            onPointerDown={() => tocar()}
          >
            {t('karaoke.diana')}
          </button>
        )
      )}

      {/* La consigna va DEBAJO de los botones, no entre ellos y el recuadro. */}
      {fase === 'sonando' && (
        <p className="pista-fija">{t(porCarril ? 'karaoke.tocaBanda' : 'karaoke.toca')}</p>
      )}

      {fase === 'resultado' && evaluacion && (
        <section className="karaoke__resultado" aria-live="polite">
          {/*
            El resumen lleva el porcentaje que pidió el autor, pero nunca solo: va con el
            desvío medio con signo, porque es la diferencia entre decirle a un niño «has
            sacado un 60 %» y decirle «vas 90 ms por detrás, prueba a entrar antes».
          */}
          <p className="karaoke__mensaje">
            {evaluacion.regularPeroDesfasado
              ? t(evaluacion.desvioMedioMs > 0 ? 'tocar.regularTarde' : 'tocar.regularPronto')
              : t(porcentaje >= 60 ? 'karaoke.bien' : 'karaoke.otraVez')}
          </p>
          <p className="karaoke__cifras">
            {t('karaoke.cogidas')} <strong>{acertadas.size}</strong> {t('comprobar.de')}{' '}
            <strong>{total}</strong> · <strong>{porcentaje} %</strong>
          </p>
          <p className="karaoke__cifras">
            {t('tocar.desvio')}{' '}
            <strong>
              {evaluacion.desvioMedioMs >= 0 ? '+' : ''}
              {evaluacion.desvioMedioMs.toFixed(0)} ms
            </strong>{' '}
            · {t('tocar.regularidad')} <strong>{evaluacion.desviacionTipicaMs.toFixed(0)} ms</strong>
          </p>

          <div className="karaoke__acciones">
            <button type="button" className="boton-repetir" onClick={() => setFase('listo')}>
              {t('tocar.otraVez')}
            </button>
            <button
              type="button"
              className="boton-repetir"
              onClick={() =>
                alTerminar({
                  actividadId: actividad.id,
                  completada: true,
                  aciertos: acertadas.size,
                  intentos: total,
                  desvioMedioMs: evaluacion.desvioMedioMs,
                  desviacionTipicaMs: evaluacion.desviacionTipicaMs,
                })
              }
            >
              {t('comun.siguiente')}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
