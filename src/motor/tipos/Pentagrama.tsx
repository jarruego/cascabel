import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { useInsinuarDesplazamiento } from '@/ui/insinuarDesplazamiento';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { despertarAudio } from '@/audio/AudioEngine';
import { Reaccion } from '@/ui/Reaccion';
import { BASE_MS, POR_CARACTER_MS } from '../maquinaReaccion';
import { Progreso } from '@/ui/Progreso';
import { barajarSinRepetir } from '../seleccionEstimulos';
import { t } from '@/i18n';
import type { PropsActividad } from '../tipos';
import {
  desplazamientoY,
  notaDe,
  type Clave,
  type Sitio,
} from '../pentagramaPosiciones';
import {
  ESTADO_INICIAL,
  esperaMs,
  pistaPara,
  reducir,
  type AccionEleccion,
  type EstadoEleccion,
} from '../maquinaEleccion';

/**
 * Tipo «pentagrama»: se pide una nota y hay que tocarla en su sitio de la pauta.
 *
 * **El truco que hace esto posible con niños** está en `docs/04-DISENO-UI.md`: se dibuja la
 * nota pequeña y tipográficamente correcta, y encima se pone un hitbox transparente del
 * tamaño táctil del carril. Un dedo de siete años no acierta un espacio de doce píxeles, y
 * dibujar la pauta enorme la haría dejar de parecer una partitura.
 *
 * Reutiliza la máquina de `eleccion`: las reglas son las mismas —un fallo repite y da
 * pista, nunca termina— y duplicarlas sería duplicar la posibilidad de romperlas.
 */

interface Opcion {
  clave: string;
  linea?: number;
  espacio?: number;
}

/**
 * Dónde empieza la primera nota: justo después de la clave. Estaba en 150 y con siete
 * sitios en clave de fa se salían del recuadro por la derecha —«las notas se van muy a la
 * derecha»—; el ancho del recuadro sale ahora de cuántos sitios hay, y si no cabe en la
 * pantalla, el recuadro se desplaza con el dedo.
 */
const INICIO_POR_ESPACIO = 6;

export default function Pentagrama({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    clave?: Clave;
    opciones: Opcion[];
    rondas?: number;
  };

  const carril = useCarril(actividad.etapa);
  /** La caja que se desplaza de lado: al entrar se insinúa que hay más. */
  const marco = useRef<HTMLDivElement | null>(null);
  useInsinuarDesplazamiento(marco);
  const tam = OBJETIVO_TACTIL[carril];
  const clave = contenido.clave ?? 'sol';
  const lienzo = useRef<HTMLDivElement | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const yaTerminada = useRef(false);

  /*
    La pauta ocupa el alto que hay, y de ahí sale todo lo demás.

    Medía 200 px con líneas a 14 px en cualquier pantalla: «el pentagrama es muy pequeño»,
    dijo el autor. Ahora el marco de la pauta es la fila que crece de la sección —ver
    `.pentagrama` en tokens.css— y se mide; la separación entre líneas sale de ese alto,
    entre 14 y 34 px, dejando sitio para el sitio táctil por arriba y por abajo. Con la
    separación crecen la clave, la cabeza de nota y el hueco tras la clave. Si a lo ancho no
    cabe, el marco se desplaza de lado con el dedo; lo demás —el nombre y la barra— se queda
    quieto fuera del marco.
  */
  const seccion = useRef<HTMLElement | null>(null);
  const [altoSeccion, setAltoSeccion] = useState(0);
  useEffect(() => {
    const el = seccion.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setAltoSeccion(Math.floor(e?.contentRect.height ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /*
    Se mide la sección, no el marco, y la pauta se acota por arriba: en vertical la sección
    es alta y una pauta que se la comiera entera dejaría el nombre de la nota arriba del
    todo, lejos de la pauta —«está muy arriba», dijo el autor—. Con la pauta acotada, el
    nombre, la pauta y la barra van juntos en el centro. Ciento veinte píxeles es lo que se
    llevan el nombre, la barra y los huecos.
  */
  const ALTO = Math.max(160, Math.min(340, altoSeccion - 120));
  const SEPARACION = Math.max(14, Math.min(34, Math.floor((ALTO - tam) / 10)));
  const ARRIBA = Math.round((ALTO - 4 * SEPARACION) / 2);
  const INICIO = Math.round(INICIO_POR_ESPACIO * SEPARACION);
  const paso = Math.max(tam + 12, Math.round(SEPARACION * 2.6));
  const ancho = Math.max(320, INICIO + contenido.opciones.length * paso + 12);

  // Las rondas son las opciones barajadas, sin dos iguales seguidas. Decía «barajadas» y
  // no lo estaban: salían sol, la, si, do, sol, la, si, do, y así se acierta sin mirar.
  const [preguntas] = useState(() => {
    const base = contenido.opciones.map((o) => o.clave);
    const n = contenido.rondas ?? base.length;
    const salida: string[] = [];
    while (salida.length < n) salida.push(...base);
    return barajarSinRepetir(salida.slice(0, n), Math.floor(Math.random() * 2 ** 31));
  });

  const [estado, despachar] = useReducer(
    (e: EstadoEleccion, a: AccionEleccion) => reducir(e, a, preguntas.length),
    ESTADO_INICIAL,
  );

  const pedida = preguntas[estado.indice];

  const sitioDe = useCallback(
    (o: Opcion): Sitio => (o.linea !== undefined ? { linea: o.linea } : { espacio: o.espacio! }),
    [],
  );

  // VexFlow dibuja la pauta y la clave. Se hace una sola vez: lo que cambia es dónde toca
  // el niño, no la partitura.
  useEffect(() => {
    const div = lienzo.current;
    if (!div || altoSeccion === 0) return;

    let cancelado = false;
    void (async () => {
      try {
        const { Renderer, Stave } = await import('vexflow');
        if (cancelado || !lienzo.current) return;
        lienzo.current.innerHTML = '';

        const renderer = new Renderer(lienzo.current, Renderer.Backends.SVG);
        renderer.resize(ancho, ALTO);
        const ctx = renderer.getContext();
        /*
          La pauta se dibuja a la separación de VexFlow, diez píxeles, y se escala entera
          después. VexFlow no agranda la clave con la separación entre líneas —dibuja el
          glifo a un tamaño fijo—, así que con líneas a 30 px la clave salía diminuta.
          Escalando el contexto crecen las líneas y la clave por igual.
        */
        const escala = SEPARACION / 10;
        ctx.scale(escala, escala);

        /*
          Sin aire propio por encima ni por debajo: VexFlow pone cuatro espacios de margen
          sobre la quinta línea, así que la pauta se dibujaba 56 px más abajo de donde este
          componente colocaba los sitios, y las notas «estaban muy desplazadas de su sitio».
          El aire lo pone ARRIBA, que es el mismo número para el dibujo y para los sitios.
        */
        const pauta = new Stave(10 / escala, ARRIBA / escala, (ancho - 20) / escala, {
          spacingBetweenLinesPx: 10,
          spaceAboveStaffLn: 0,
          spaceBelowStaffLn: 0,
        });
        pauta.addClef(clave === 'sol' ? 'treble' : 'bass');
        pauta.setContext(ctx).draw();
      } catch {
        // Sin VexFlow no hay pauta dibujada, pero los sitios siguen ahí y suenan. Una
        // actividad no se cae por no poder cargar una librería de notación.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [clave, ancho, ALTO, ARRIBA, SEPARACION, altoSeccion]);

  useEffect(() => {
    if (estado.fase !== 'bien' && estado.fase !== 'casi') return;
    const id = window.setTimeout(() => despachar({ tipo: 'seguir' }), esperaMs(estado.fase));
    return () => window.clearTimeout(id);
  }, [estado.fase, estado.intentos]);

  useEffect(() => {
    if (estado.fase !== 'completada' || yaTerminada.current) return;
    yaTerminada.current = true;
    alTerminar({
      actividadId: actividad.id,
      completada: true,
      aciertos: estado.aciertos,
      intentos: estado.intentos,
    });
  }, [estado.fase, estado.aciertos, estado.intentos, actividad.id, alTerminar]);

  const elegir = useCallback(
    async (o: Opcion) => {
      const nota = notaDe(sitioDe(o), clave);
      // Suena SIEMPRE, acierte o no: oír dónde ha tocado es la mitad del aprendizaje.
      try {
        await despertarAudio();
        if (!sampler.current) {
          const s = new Sampler(MARIMBA);
          await s.cargar();
          sampler.current = s;
        }
        sampler.current.tocar(
          `${nota.vexflow.split('/')[0]!.toUpperCase()}${nota.octava}`,
          undefined,
          1,
        );
      } catch {
        // Sin sonido la actividad sigue: el niño ve el resultado igual.
      }
      despachar({ tipo: 'elegir', clave: o.clave, respuesta: pedida ?? '' });
    },
    [clave, pedida, sitioDe],
  );

  const pista = pistaPara(actividad.pistas, estado.fallosAqui);

  /*
    La pista de un fallo se queda lo que tarda en leerse, y se va antes si se responde.

    Sin reloj se quedaba flotando después de cualquier toque —lo vio el autor—; con 1,2 s
    no daba tiempo de leerla. Ahora dura lo que la tarjeta de elogio con ese mismo texto,
    tres segundos y medio más lo que mida la frase, y cualquier respuesta nueva la quita.
    Y no bloquea: la fase «casi» dura solo el refractario del doble toque (`esperaMs`), así
    que quien ya sabe qué ha pasado corrige al momento, con la pista aún encima.
  */
  const [pistaVisible, setPistaVisible] = useState(false);
  /*
    El reloj vive en una referencia y no en la limpieza del efecto: la fase «casi» dura
    1,2 s y después vuelve a «estimulo», y si el reloj se cancelara con ese cambio —que es
    lo que hacía— la pista no se iba nunca. Lo vio el autor. Solo un nuevo fallo lo rearma.
  */
  const relojPista = useRef<number | null>(null);
  useEffect(() => {
    if (estado.fase !== 'casi') return;
    setPistaVisible(true);
    if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    const texto = pista ? t(pista) : t('comun.casi');
    relojPista.current = window.setTimeout(
      () => setPistaVisible(false),
      BASE_MS + texto.length * POR_CARACTER_MS,
    );
  }, [estado.fase, estado.intentos, pista]);
  useEffect(
    () => () => {
      if (relojPista.current !== null) window.clearTimeout(relojPista.current);
    },
    [],
  );
  useEffect(() => {
    if (estado.fase === 'bien' || estado.fase === 'completada') setPistaVisible(false);
  }, [estado.fase]);
  const conPista = estado.fase === 'casi' || (estado.fase === 'estimulo' && pistaVisible);

  return (
    <section className="actividad pentagrama" data-carril={carril} aria-labelledby="consigna" ref={seccion}>
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <p className="pentagrama__pedida" aria-live="polite">
        {pedida && t(`nota.${pedida}`)}
      </p>

      {/* El marco es lo único que se desplaza, y solo de lado. */}
      <div className="pentagrama__marco" ref={marco}>
      <div className="pentagrama__lienzo" style={{ width: ancho, height: ALTO }}>
        <div ref={lienzo} aria-hidden="true" />

        {/*
          Los hitboxes. Van ENCIMA del dibujo, son transparentes y miden lo que el carril
          exige (75 / 60 / 48 px). La nota se ve pequeña y correcta; el dedo tiene sitio.
          Son <button> nativos, así que Tab y Enter funcionan sin escribir nada.
        */}
        {contenido.opciones.map((o) => {
          const sitio = sitioDe(o);
          const nota = notaDe(sitio, clave);
          const y = ARRIBA + desplazamientoY(sitio, SEPARACION);
          return (
            <button
              key={o.clave}
              type="button"
              className="pentagrama__sitio"
              style={{
                width: tam,
                height: tam,
                left: INICIO + contenido.opciones.indexOf(o) * paso,
                top: y - tam / 2,
              }}
              aria-label={t(`nota.${o.clave}`)}
              aria-disabled={estado.fase !== 'estimulo' || undefined}
              onClick={() => void elegir(o)}
            >
              {/* La cabeza de nota, del tamaño real que tendría en la pauta. Sin el nombre
                  escrito debajo: con él, la actividad era leer, no colocar. */}
              <span
                className="pentagrama__nota"
                aria-hidden="true"
                style={{ width: Math.round(SEPARACION * 1.25), height: Math.round(SEPARACION * 0.9) }}
              />
              <span className="visualmente-oculto">{nota.nombre}</span>
            </button>
          );
        })}
      </div>
      </div>

      <Progreso hechos={estado.indice} total={preguntas.length} />

      {/* Sin botonera: se juega tocando los sitios de la pauta, y no hay nada que hacerle a
          la actividad desde fuera. El «¡completada!» lo dice la modal de enhorabuena. */}
      {/* La pista de un fallo dura lo que tarda en leerse: ver `pistaVisible`. */}
      <Reaccion
        tono={estado.fase === 'bien' ? 'bien' : conPista ? 'casi' : 'neutro'}
        personaje={actividad.personaje}
        /* La pista no bloquea: tras el refractario (`esperaMs`) se puede corregir al momento,
           y cualquier respuesta nueva es la que la quita. Por eso aquí no hay `alCerrar`. */
      >
        {estado.fase === 'bien' && t('comun.bien')}
        {conPista && (pista ? t(pista) : t('comun.casi'))}
      </Reaccion>

    </section>
  );
}
