import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCarril } from '@/app/preferencias';
import { useInsinuarDesplazamiento } from '@/ui/insinuarDesplazamiento';
import { OBJETIVO_TACTIL } from '@/config';
import { despertarAudio, latenciaMs, obtenerContexto } from '@/audio/AudioEngine';
import { clicYa } from '@/audio/clic';
import { Sampler } from '@/audio/sampler';
import { samplerPara } from '@/audio/instrumentos';
import { TOLERANCIA_MS } from '@/config';
import {
  bastanteBien,
  evaluarRitmo,
  marcaDeGolpe,
  type EvaluacionRitmica,
  type MarcaEnVivo,
} from '../evaluacion';
import { yDeLinea } from '../alturaEnPauta';
import {
  carrilesDe,
  figuraDe,
  geometriaDe,
  largoDe,
  representaAltura,
  silabasDichas,
  type NotaMusicograma,
  type Orientacion,
  type Representacion,
  anchoDeBandas,
} from '../musicograma';
import { duracionDe, instantesDe } from '../melodiaEnTiempo';
import { CuentaAtras } from '@/ui/CuentaAtras';
import { colorDe, nombreDe } from '@/ui/coloresNota';
import { Icono } from '@/ui/Icono';
import { Personaje } from '@/ui/Personaje';
import { personajeDe } from '@/ui/personajes';
import { pistaPara } from '../maquinaEleccion';
import { BarraAcciones } from '@/ui/BarraAcciones';
import { IconoRepetir, IconoSiguiente, IconoTocar } from '@/ui/Simbolos';
import { Reaccion } from '@/ui/Reaccion';
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
 * Que sea una sola medida y no dos que casualmente coinciden es lo que impide que alguien
 * las separe sin darse cuenta. Por eso `ventanaS`, que puede ensancharse para que quepa una
 * nota muy larga, se usa **en los tres sitios a la vez**: anticipación, margen de entrada y
 * geometría.
 */
const VENTANA_S = 3.2;
/** Dónde está la línea del presente, en porcentaje del ancho. */
const LINEA_PCT = 22;
/** Separación entre líneas del pentagrama, en píxeles. */
const SEP = 14;
/** La guía, bajita: lo que suena fuerte es la nota que se acierta. */
const VOLUMEN_GUIA = 0.33;
/** Altura libre por encima de la quinta línea, para las notas agudas. */
const MARGEN_ARRIBA = 46;

export default function Karaoke({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    notas: NotaMusicograma[];
    tempo?: number;
    /** Lo pone `conSerie`: qué ejercicio es de cuántos. */
    serie?: { n: number; total: number };
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
    /**
     * Dibujar detrás de cada figura una **cola tan larga como lo que dura**.
     *
     * **Apagada salvo que la actividad la pida**, y no por prudencia: la cola solo aporta
     * donde la duración es lo que se está aprendiendo —las sílabas rítmicas, las figuras
     * escritas—. En una canción por personajes o en una melodía sobre la pauta, lo que hay
     * que mirar es la altura, y una barra detrás de cada nota es ruido en medio de lo que
     * importa. Lo pidió el autor el 2026-09-14 después de verla en todas.
     */
    cola?: boolean;
    /**
     * Las `palabra` de las notas son **la letra de una canción**, no el nombre de cada figura.
     *
     * Cambia dónde se enseñan y cómo. Con el nombre de una figura —«e-le-fan-te» en una
     * redonda— lo que importa es verlo construirse *dentro* de esa nota, así que se escribe
     * junto a la línea y se borra al acabar. Con una letra es al revés: una sílaba por nota y
     * **la frase entera a la vista**, porque leer por delante es exactamente para lo que
     * sirve un karaoke. Quien no ve lo que viene no puede cantarlo.
     */
    letra?: boolean;
    /** Timbre. Ver `audio/instrumentos.ts`: hoy solo hay marimba. */
    instrumento?: string;
  };

  const carril = useCarril(actividad.etapa);
  /** La caja que se desplaza de lado: al entrar se insinúa que hay más. */
  const botones = useRef<HTMLDivElement | null>(null);
  useInsinuarDesplazamiento(botones);
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
  const conCola = contenido.cola ?? false;
  const conLetra = contenido.letra ?? false;
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
  /**
   * Las notas que el niño ha **tocado**, cuenten o no, para leerlas desde el planificador
   * sin esperar al render.
   *
   * No son las acertadas, y la diferencia importa: lo que decide este conjunto es si la
   * nota suena fuerte, y **una nota que has tocado suena, aunque caiga en la ventana ancha
   * y no cuente**. Al separar el «casi» del acierto se quedaron mudas, y la actividad
   * pasaba entera casi en silencio: «la 118 no suena» (el autor, 2026-09-14). Lo que
   * distingue al acierto es la marca verde y el resumen, no que se le quite el sonido.
   */
  const tocadasRef = useRef<Set<number>>(new Set());
  /** Qué notas se han programado ya: cada una suena UNA vez, alta o baja. */
  const programadas = useRef<Set<number>>(new Set());
  const [pasadas, setPasadas] = useState<Set<number>>(new Set());
  /** Tocadas dentro de la ventana ancha, pero fuera de lo que cuenta. */
  const [casis, setCasis] = useState<Set<number>>(new Set());
  /** Quemadas: golpeadas antes de tiempo. Ya no se pueden recuperar. */
  const [quemadas, setQuemadas] = useState<Set<number>>(new Set());
  /**
   * Estado de cada nota mientras el niño responde, para `marcaDeGolpe`.
   *
   * Se lleva en un `ref` y no solo en el estado porque dos toques seguidos antes de que
   * React repinte tienen que ver el segundo lo que hizo el primero. Es lo mismo que hace
   * `TocarATiempo`.
   */
  const marcasRef = useRef<MarcaEnVivo[]>([]);
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

  /**
   * La ventana: cuántos segundos de música se ven por delante de la línea.
   *
   * Es `VENTANA_S` salvo que haya una nota **más larga que eso**, y entonces se ensancha
   * hasta que quepa. Sin esto, la cola de una redonda a 60 pulsos por minuto mide cuatro
   * segundos y el recorrido visible solo da para 3,2: se dibujaba cortada por arriba y no
   * llegaba nunca a verse entera. Lo vio el autor el 2026-09-14.
   *
   * **Solo se ensancha si hay cola**, porque ensancharla cambia la velocidad a la que caen
   * las figuras, y eso no se le hace a una actividad que no ha pedido nada.
   */
  const ventanaS = useMemo(() => {
    if (!conCola) return VENTANA_S;
    const masLarga = notas.reduce((m, n) => Math.max(m, n.pulsos * (60 / bpm)), 0);
    return Math.max(VENTANA_S, masLarga);
  }, [conCola, notas, bpm]);

  /** Instante de cada nota, en segundos desde el arranque. Incluye el margen de entrada. */
  const tiempos = useMemo(() => instantesDe(notas, bpm, ventanaS), [notas, bpm, ventanaS]);

  /*
    Se deja de escuchar poco después de la ÚLTIMA nota, no al final de su duración más dos
    segundos. Con una blanca al final eran cuatro o cinco segundos mirando una pantalla
    parada —«cuando acabas de tocar, está mucho rato sin pasar nada», dijo el autor—. Lo que
    hace falta es que quepa un golpe algo tardío en esa última nota: un pulso y medio.
  */
  /*
    Con cola, la última nota **tiene que acabar de pasar**. El recorte de arriba la cortaba:
    una redonda a 60 dura cuatro segundos y el ejercicio se terminaba a los 1,5 pulsos de su
    ataque, así que la cola del elefante y su palabra se quedaban a medias. Sin cola no
    cambia nada, que es como estaba.
  */
  const colaFinal = conCola ? (notas[notas.length - 1]?.pulsos ?? 0) * (60 / bpm) : 0;
  const duracionTotal = Math.min(
    duracionDe(notas, bpm, ventanaS) + 2,
    (tiempos[tiempos.length - 1] ?? 0) + Math.max((60 / bpm) * 1.5, colaFinal),
  );

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
  /*
    Con personajes cada carril necesita sitio para el dibujo, aunque haya un solo pulsador:
    en la 140 seis carriles cabían en 200 px y los personajes salían «muy apelotonados»
    (el autor, 2026-09-11). Sin bandas pero con altura, en vertical el recuadro ocupa todo
    el ancho que haya, y en horizontal el alto no baja de 56 px por carril.
  */
  const minimoPorCarril = representacion === 'personaje' ? carriles.length * 56 : 0;
  const TRANSVERSAL = vertical
    ? porCarril
      ? anchoDeBandas(carriles.length, anchoCaja, OBJETIVO_TACTIL[carril])
      : representacion === 'personaje' && carriles.length > 1
        ? Math.max(200, Math.min(anchoCaja, 640))
        : 200
    /*
      En horizontal, esto es el ALTO del recuadro, y estaba clavado en 160 px: el mismo
      número en un móvil y en una pizarra de setenta pulgadas. Ahora sale de lo que hay,
      con suelo y techo — suelo porque por debajo de 160 las notas se pisan, techo porque
      un recuadro de un palmo obliga a recorrerlo con el ojo para ver dónde va a caer la
      siguiente, que es justo lo que la actividad no quiere.
    */
    : Math.max(160, minimoPorCarril, Math.min(320, Math.round(anchoCaja * 0.22)));

  const opciones = useMemo(
    () => ({
      representacion,
      orientacion,
      clave,
      lineaPct: LINEA_PCT,
      anticipacionS: ventanaS,
      transversalPx: TRANSVERSAL,
      separacion: SEP,
      margen: MARGEN_ARRIBA,
    }),
    [representacion, orientacion, clave, TRANSVERSAL, ventanaS],
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
        const s = samplerPara(contenido.instrumento);
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
    setCasis(new Set());
    setQuemadas(new Set());
    marcasRef.current = notas.map(() => 'pendiente' as MarcaEnVivo);
    setEvaluacion(null);

    const segundosPorPulso = 60 / bpm;
    /*
      La guía suena bajita y la nota que el niño acierta suena fuerte, en el momento de
      tocarla. Antes sonaba todo a tope tocara o no, y «toques o no la nota, siempre suena»
      (el autor, 2026-09-12): no había diferencia entre acertar y mirar. La guía se queda,
      porque es lo que permite seguir la canción; pero a un tercio, para que lo que se oye
      de verdad sea lo que uno toca.
    */
    // Las notas no se programan aquí de golpe: las programa el bucle justo antes de que
    // lleguen, y así cada una suena una sola vez, alta si ya está acertada y baja si no.
    // Antes la guía baja iba programada de antemano y la acertada se tocaba encima, y las
    // dos se solapaban: «que sea solo una vez», pidió el autor el 2026-09-12.
    tocadasRef.current = new Set();
    programadas.current = new Set();
    void segundosPorPulso;

    setFase('sonando');

    const bucle = () => {
      const ctxAhora = obtenerContexto().currentTime;
      setAhora(ctxAhora - t0);

      // Programar, con 120 ms de adelanto, las notas que van a llegar: una sola vez cada
      // una. Si el niño ya la ha acertado (llegó un poco antes), suena fuerte; si no, baja.
      tiempos.forEach((s, i) => {
        if (programadas.current.has(i) || t0 + s > ctxAhora + 0.12) return;
        programadas.current.add(i);
        const n = notas[i]!;
        const fuerte = tocadasRef.current.has(i);
        sampler.current?.tocar(n.nota, Math.max(t0 + s, ctxAhora), n.pulsos * (60 / bpm) * 0.9, fuerte ? 1 : VOLUMEN_GUIA);
      });

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

    /*
      **Todo toque suena.**

      Es la misma regla que en «Toca a tiempo», y aquí faltaba. Sin ella, desde que
      adelantarse quema la nota, un niño que va sistemáticamente pronto quemaba una detrás
      de otra y **no oía absolutamente nada**: ni su golpe, ni la nota. La actividad parecía
      rota. El clic no es un sonido de fallo —los prohíbe la regla 4—: es oírse a uno mismo,
      que es lo único que permite corregirse. Lo que distingue al acierto es que además
      suena la nota, o sea *ganar* algo, nunca perderlo.
    */
    clicYa(false);

    /*
      **La misma regla que la evaluación final**, en `marcaDeGolpe`.

      Antes aquí había otra: «de todas las notas, la más cercana que caiga dentro de la
      ventana». Con esa, aporrear la pantalla lo acertaba todo —entre tantos toques, siempre
      había uno dentro de cada ventana—, y encima el verde en vivo no coincidía con el
      resumen del final, que sí usaba la regla buena. Es exactamente el fallo que se corrigió
      el 2026-09-10 en «Ritmo de ocho» y el 2026-09-12 en «Palmea el ritmo»; el karaoke se
      quedó con su copia vieja hasta que el autor lo vio el 2026-09-14.

      Ahora cada toque se compara con la PRIMERA nota que aún no ha pasado: si llega dentro
      de la ventana, es suya; si llega antes de tiempo, la **quema** —se queda en gris y no
      se recupera, y los toques que vengan detrás para esa misma nota sobran, que castigar
      dos veces un solo adelanto no—; y si ya no queda nota por venir, sobra.
    */
    // Con bandas, un toque solo puede acertar notas de SU banda: se le pasa a la regla ese
    // trozo del patrón y se traduce el índice de vuelta.
    const indices = notas
      .map((_, i) => i)
      .filter((i) => banda === null || carriles.indexOf(notas[i]!.nota) === banda);
    const resultado = marcaDeGolpe(
      indices.map((i) => instantes.current[i]!),
      indices.map((i) => marcasRef.current[i] ?? 'pendiente'),
      ms,
      carril,
    );
    if (!resultado) return;
    const mejor = indices[resultado.indice]!;
    marcasRef.current = marcasRef.current.map((m, i) => (i === mejor ? resultado.marca : m));

    if (resultado.marca === 'quemado') {
      setQuemadas((q) => new Set(q).add(mejor));
      return;
    }
    // Tocada: suena fuerte. Que cuente o no lo dice la marca, no el volumen.
    tocadasRef.current.add(mejor);
    if (resultado.marca === 'casi') {
      setCasis((c) => new Set(c).add(mejor));
      return;
    }
    setAcertadas((a) => new Set(a).add(mejor));
    // Si la nota aún no ha sonado, sonará fuerte cuando llegue; si el golpe llega un pelín
    // tarde y ya sonó baja, no se repite: una sola vez, que si no se solapan.

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

  /**
   * La palabra de la nota que está sonando ahora mismo, y cuántas sílabas van dichas.
   *
   * **Se construye en la línea y no a lo largo de la cola**, que es donde estaba el primer
   * intento. Detrás de la línea solo queda el 22 % del recuadro —menos de un segundo de
   * recorrido—, así que las sílabas ya dichas se salían por el borde casi al encenderse y la
   * palabra entera no llegaba a verse nunca. Aquí se queda quieta mientras la nota dura, que
   * es exactamente lo que se pidió: que mientras la nota pasa por la línea se vaya
   * construyendo la palabra al pulso.
   */
  const palabraEnCurso = useMemo(() => {
    for (let i = notas.length - 1; i >= 0; i -= 1) {
      const n = notas[i]!;
      if (!n.palabra?.length) continue;
      const desde = ahora - tiempos[i]!;
      const duracion = n.pulsos * (60 / bpm);
      if (desde >= 0 && desde < duracion) {
        return { indice: i, silabas: n.palabra, dichas: silabasDichas(desde, duracion, n.palabra.length) };
      }
    }
    return null;
  }, [notas, tiempos, ahora, bpm]);

  const total = notas.length;
  const bien = bastanteBien(acertadas.size, total, evaluacion?.sobrantes ?? 0);

  return (
    <section
      ref={caja}
      className="actividad karaoke"
      data-carril={carril}
      aria-labelledby="consigna"
    >
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <div
        className="karaoke__pauta"
        data-orientacion={orientacion}
        data-representacion={representacion}
        /*
          La medida transversal sale del mismo número que usa la geometría: ver TRANSVERSAL.
          En vertical es el ancho y en horizontal el alto, y **las dos van aquí**. El alto
          estaba en el CSS con un número fijo, o sea el mismo número escrito en dos sitios,
          que es el desajuste que este comentario avisaba de no repetir.
        */
        style={vertical ? { width: TRANSVERSAL, maxWidth: '100%' } : { height: TRANSVERSAL }}
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
          const duracionNota = n.pulsos * (60 / bpm);
          /*
            Fuera de la ventana visible no se dibuja: no hay que animar treinta figuras.

            Por detrás, el límite **no puede ser fijo**: la cola de una redonda a 60 tarda
            cuatro segundos en terminar de cruzar la línea, y con el segundo y pico de antes
            el elefante se esfumaba a mitad de palabra. Se espera a que pase la cola entera.
          */
          if (falta > ventanaS || falta < -Math.max(1.2, duracionNota)) return null;
          const indice = conAltura ? carriles.indexOf(n.nota) : 0;
          const g = geometriaDe(n, falta, indice, carriles.length, opciones);
          const apagada = (pasadas.has(i) || quemadas.has(i)) && !acertadas.has(i) && !casis.has(i);

          // El avance es siempre «cuánto falta»; el eje al que se aplica es lo único que
          // cambia entre las dos orientaciones. En vertical se invierte para que lo que
          // está por venir aparezca ARRIBA y baje hacia la línea.
          const posicion = vertical
            ? { top: `${100 - g.avance}%`, left: g.cruce }
            : { left: `${g.avance}%`, top: g.cruce };

          /*
            La cola: lo que la nota dura, dibujado a escala del recorrido.

            Va detrás de la cabeza —hacia donde vienen las figuras— porque lo que queda por
            pasar por la línea es justamente lo que todavía está sonando. La cabeza no cambia
            de tamaño ni de anclaje: sigue centrada en su instante, que es el punto que se
            mide, y moverla habría desplazado el momento de acertar en todas las actividades.

            **Y ocupa todo el ancho del recuadro, no una tira detrás de la cabeza.** La
            aritmética siempre fue exacta —el largo de una nota y la distancia hasta la
            siguiente son el mismo número, porque `instantesDe` separa las notas justo por
            lo que duran—, pero lo que se VEÍA no lo era: la cabeza está centrada en su
            instante y mide medio centenar de píxeles, así que se comía la mitad de cada
            cola por cada punta. A 80 pulsos por minuto la cola de una corchea medía 38 px y
            la cabeza 54: desaparecía entera. Como banda, la cabeza se apoya encima y los
            bordes se ven a los lados, que es lo que permite compararlas.
          */
          const largoPct = largoDe(n.pulsos, bpm, opciones);
          /*
            Sin cola, la cabeza sigue creciendo con la duración como toda la vida: veinte
            píxeles por pulso. No es proporcional al recorrido —de eso iba la cola—, pero es
            lo que llevan viéndose las actividades que no han pedido nada, y cambiarlo de
            oficio en todas fue justamente lo que el autor devolvió el 2026-09-14.
          */
          const largoCabeza = conCola ? null : Math.max(SEP, n.pulsos * 20);
          const contenidoFigura =
            representacion === 'silaba' ? (n.silaba ?? '') :
            representacion === 'figura' ? figuraDe(n.pulsos) :
            representacion === 'icono' ? null : null;

          /*
            Dónde empieza la cola. En vertical las figuras caen, así que lo que todavía no ha
            pasado está ARRIBA y la cola crece hacia arriba desde la cabeza; en horizontal
            vienen de la derecha y crece hacia la derecha. En las dos es el mismo número: el
            avance más el largo.
          */
          const posicionCola = vertical
            ? { top: `${100 - g.avance - largoPct}%`, height: `${largoPct}%` }
            : { left: `${g.avance}%`, width: `${largoPct}%` };

          return (
            <Fragment key={`${n.nota}-${i}`}>
            {conCola && (
            <span
              className="karaoke__cola"
              data-orientacion={orientacion}
              data-acertada={acertadas.has(i) || undefined}
              data-apagada={apagada || undefined}
              // `color` y no `borderColor`: el CSS pinta con `currentColor` el borde de
              // ataque y el relleno a la vez, así que con uno basta.
              style={{ ...posicionCola, color: apagada ? undefined : colorDe(n.nota) }}
              aria-hidden="true"
            />
            )}
            <span
              className="karaoke__figura"
              data-forma={representacion}
              data-acertada={acertadas.has(i) || undefined}
              data-casi={casis.has(i) || undefined}
              data-quemada={quemadas.has(i) || undefined}
              data-apagada={apagada || undefined}
              data-oculta={revelar && !acertadas.has(i) || undefined}
              style={{
                ...posicion,
                ...(largoCabeza === null
                  ? {}
                  : vertical ? { height: largoCabeza } : { width: largoCabeza }),
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
                  {/* Con la pandilla, cada nota baja con su personaje: Dora es do, Milo es mi.
                      Lo pidió el autor el 2026-09-10 para las canciones por bandas. */}
                  {representacion === 'personaje' && personajeDe(n.nota) && (
                    /* Al acertar, el personaje se pone contento: celebra o baila, alternando
                       para que una racha no sea el mismo dibujo siete veces. El salto y el
                       latido los pone el CSS. Lo pidió el autor el 2026-09-11. */
                    <Personaje
                      nombre={personajeDe(n.nota)!}
                      pose={acertadas.has(i) ? (i % 2 === 0 ? 'celebra' : 'baila') : 'neutro'}
                      tamano={46}
                    />
                  )}
                  {contenidoFigura}
                </>
              )}
            </span>
            </Fragment>
          );
        })}

        {/* La palabra al pulso: una sílaba más cada vez que pasa un tramo de la nota. Solo
            las dichas, porque lo que enseña es verla crecer: «e», «e-le», «e-le-fan»... */}
        {palabraEnCurso && !conLetra && (
          <span className="karaoke__palabra" aria-hidden="true">
            {palabraEnCurso.silabas.slice(0, palabraEnCurso.dichas).map((silaba, k) => (
              <span key={k} className="karaoke__silaba">{silaba}</span>
            ))}
          </span>
        )}

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

      {/*
        La letra, entera y **debajo del recuadro**, no dentro.

        Dentro taparía justo la franja por la que las notas acaban de cruzar la línea, que es
        donde hay que estar mirando. Y entera, no una sílaba cada vez: un karaoke sirve
        porque se lee lo que viene, y quien no ve la sílaba siguiente no puede cantarla a
        tiempo. La que suena va resaltada, las cantadas se apagan y las que faltan esperan.

        No lleva `aria-hidden`: es texto y un lector de pantalla puede leerlo cuando quiera.
        Lo que no lleva es región viva, que anunciaría una sílaba cada medio segundo.
      */}
      {conLetra && (
        <p className="karaoke__letra">
          {notas.map((n, i) =>
            (n.palabra ?? []).map((silaba, k) => {
              const dichas = palabraEnCurso?.indice === i ? palabraEnCurso.dichas : 0;
              const estado =
                palabraEnCurso === null || i > palabraEnCurso.indice ? 'porVenir' :
                i < palabraEnCurso.indice ? 'dicha' :
                k < dichas - 1 ? 'dicha' :
                k === dichas - 1 ? 'ahora' : 'porVenir';
              return (
                <span key={`${i}-${k}`} className="karaoke__silabaLetra" data-estado={estado}>
                  {silaba}
                </span>
              );
            }),
          )}
        </p>
      )}

      {/* El nombre también en texto vivo, para quien no puede ver la animación. */}
      <p className="visualmente-oculto" aria-live="polite">
        {avisos.length ? avisos[avisos.length - 1]!.texto : ''}
      </p>

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
        <div className="karaoke__botones" style={{ width: TRANSVERSAL, maxWidth: '100%' }} ref={botones}>
          {carriles.map((nota, i) => (
            <button
              key={nota}
              type="button"
              className="boton-actividad karaoke__banda"
              style={{ borderColor: colorDe(nota), background: colorDe(nota) }}
              onPointerDown={() => tocar(i)}
              aria-label={`${nombreDe(nota)} · ${i + 1}`}
            >
              {/* El pulsador de cada banda es su personaje cantando, con el nombre de la
                  nota debajo: es la nota con su imagen, como pidió el autor. */}
              {representacion === 'personaje' && personajeDe(nota) && (
                <Personaje nombre={personajeDe(nota)!} pose="canta" tamano={48} />
              )}
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
            {t('tocar.diana')}
          </button>
        )
      )}

      {fase === 'resultado' && evaluacion && (
        <>
          {/*
            La frase la dice el personaje y entra deslizando, como en el resto.

            La línea de milisegundos y regularidad **se ha ido**: el autor la señaló por su
            nombre —«tampoco tiene sentido que salgan mensajes técnicos como ms,
            regularidad»— y tenía razón en algo más que el estilo. Un niño no puede hacer
            nada con «+90 ms»; quien sí puede es el maestro, y para eso está la hoja de
            seguimiento de la ficha. Lo que queda es la lectura en palabras de ese mismo
            número, que es lo que distingue «has fallado» de «vas un poquito por detrás,
            prueba a entrar antes».

            Lo que sí se queda es cuántas has cogido de cuántas: eso no es una nota, es lo
            que ha pasado, y se entiende a los siete años.
          */}
          <Reaccion
            tono={!evaluacion.regularPeroDesfasado && bien ? 'bien' : 'casi'}
            personaje={actividad.personaje}
          >
            {evaluacion.regularPeroDesfasado
              ? t(evaluacion.desvioMedioMs > 0 ? 'tocar.regularTarde' : 'tocar.regularPronto')
              : t(bien ? 'karaoke.bien' : 'karaoke.otraVez')}
            {/* La pista de la actividad, que es la concreta: «mira la sílaba antes de que
                llegue a la línea» dice qué hacer distinto; «otra vez» no. */}
            {!bien && pistaPara(actividad.pistas, 1)
              ? ` ${t(pistaPara(actividad.pistas, 1)!)}`
              : ''}
          </Reaccion>
          {/*
            Cuántas de cuántas, y **sin el tanto por ciento**.

            «12 de 16» es lo que ha pasado y se entiende a los siete años. «75 %» es la misma
            cifra convertida en calificación, que es lo que `TocarATiempo` lleva escrito en su
            propio comentario que no se hace nunca —un niño 120 ms tarde y clavado tiene un
            pulso excelente y el porcentaje le diría que ha fallado— y lo que la modal de
            enhorabuena tiene prohibido desde el primer día. Eran dos actividades de ritmo con
            la misma evaluación y dos criterios distintos.
          */}
          <p className="karaoke__cifras">
            {t('karaoke.cogidas')} <strong>{acertadas.size}</strong> {t('catalogo.de')}{' '}
            <strong>{total}</strong>
          </p>
        </>
      )}

      <BarraAcciones>
        {fase === 'listo' && (
          <button
            type="button"
            className="boton-principal boton-arranque"
            onClick={() => setFase('cuenta')}
          >
            <IconoTocar />
            {contenido.serie
              ? t('comun.empezarDe', { n: contenido.serie.n, total: contenido.serie.total })
              : t('accion.empezar')}
          </button>
        )}

        {fase === 'resultado' && evaluacion && (
          <>
            <button type="button" className="boton-repetir" onClick={() => setFase('listo')}>
              <IconoRepetir />
              {t('tocar.otraVez')}
            </button>
            <button
              type="button"
              className="boton-principal"
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
              <IconoSiguiente />
              {/* Una sola pasada: «otra vez» es voluntario. En una serie, lo que viene es el
                  siguiente ejercicio, y el botón lo dice. */}
              {contenido.serie && contenido.serie.n < contenido.serie.total
                ? t('serie.siguiente')
                : t('comun.terminar')}
            </button>
          </>
        )}
      </BarraAcciones>
    </section>
  );
}
