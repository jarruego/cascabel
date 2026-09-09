import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { OBJETIVO_TACTIL } from '@/config';
import { useCarril } from '@/app/preferencias';
import { MARIMBA, Sampler } from '@/audio/sampler';
import { despertarAudio } from '@/audio/AudioEngine';
import { Reaccion } from '@/ui/Reaccion';
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

const ANCHO = 460;
const SEPARACION = 14;
const ALTO = 200;
/** Margen superior: deja sitio para notas por encima de la pauta. */
const ARRIBA = 60;

export default function Pentagrama({ actividad, alTerminar }: PropsActividad) {
  const contenido = actividad.contenido as {
    consigna: string;
    clave?: Clave;
    opciones: Opcion[];
    rondas?: number;
  };

  const carril = useCarril(actividad.etapa);
  const tam = OBJETIVO_TACTIL[carril];
  const clave = contenido.clave ?? 'sol';
  const lienzo = useRef<HTMLDivElement | null>(null);
  const sampler = useRef<Sampler | null>(null);
  const yaTerminada = useRef(false);
  const [dibujado, setDibujado] = useState(false);

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
    if (!div || dibujado) return;

    let cancelado = false;
    void (async () => {
      try {
        const { Renderer, Stave } = await import('vexflow');
        if (cancelado || !lienzo.current) return;
        lienzo.current.innerHTML = '';

        const renderer = new Renderer(lienzo.current, Renderer.Backends.SVG);
        renderer.resize(ANCHO, ALTO);
        const ctx = renderer.getContext();

        /*
          Sin aire propio por encima ni por debajo: VexFlow pone cuatro espacios de margen
          sobre la quinta línea, así que la pauta se dibujaba 56 px más abajo de donde este
          componente colocaba los sitios, y las notas «estaban muy desplazadas de su sitio».
          El aire lo pone ARRIBA, que es el mismo número para el dibujo y para los sitios.
        */
        const pauta = new Stave(10, ARRIBA, ANCHO - 30, {
          spacingBetweenLinesPx: SEPARACION,
          spaceAboveStaffLn: 0,
          spaceBelowStaffLn: 0,
        });
        pauta.addClef(clave === 'sol' ? 'treble' : 'bass');
        pauta.setContext(ctx).draw();

        if (!cancelado) setDibujado(true);
      } catch {
        // Sin VexFlow se dibuja la pauta a mano más abajo. Una actividad no se cae por
        // no poder cargar una librería de notación.
        if (!cancelado) setDibujado(true);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [clave, dibujado]);

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

  return (
    <section className="actividad pentagrama" data-carril={carril} aria-labelledby="consigna">
      <h1 id="consigna" className="visualmente-oculto">{t(contenido.consigna)}</h1>

      <Progreso hechos={estado.indice} total={preguntas.length} />

      <p className="pentagrama__pedida" aria-live="polite">
        {pedida && t(`nota.${pedida}`)}
      </p>

      <div className="pentagrama__lienzo" style={{ width: ANCHO, height: ALTO }}>
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
                left: 150 + contenido.opciones.indexOf(o) * (tam + 12),
                top: y - tam / 2,
              }}
              aria-label={t(`nota.${o.clave}`)}
              aria-disabled={estado.fase !== 'estimulo' || undefined}
              onClick={() => void elegir(o)}
            >
              {/* La cabeza de nota, del tamaño real que tendría en la pauta. Sin el nombre
                  escrito debajo: con él, la actividad era leer, no colocar. */}
              <span className="pentagrama__nota" aria-hidden="true" />
              <span className="visualmente-oculto">{nota.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* Sin botonera: se juega tocando los sitios de la pauta, y no hay nada que hacerle a
          la actividad desde fuera. El «¡completada!» lo dice la modal de enhorabuena. */}
      <Reaccion
        tono={estado.fase === 'casi' ? 'casi' : estado.fase === 'bien' ? 'bien' : 'neutro'}
        personaje={actividad.personaje}
      >
        {estado.fase === 'bien' && t('comun.bien')}
        {estado.fase === 'casi' && (pista ? t(pista) : t('comun.casi'))}
      </Reaccion>

    </section>
  );
}
