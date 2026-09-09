#!/usr/bin/env node
/**
 * ¿Cada actividad pide lo que se le puede pedir a esa edad?
 *
 * Nació la noche del 2026-09-09, cuando el autor pidió revisar el nivel de dificultad por
 * curso. No sustituye a una maestra —qué se puede pedir a un niño de siete años es criterio
 * pedagógico— pero sí mide lo que **sí se puede medir**, que es más de lo que parece, y deja
 * escrito lo que hay que mirar con los ojos.
 *
 * ## Las dos cargas, y no son la misma
 *
 * La confusión que hay que evitar: un patrón de veinticuatro pulsos y un tablero de
 * veinticuatro fichas no piden lo mismo ni de lejos.
 *
 * - **Elegir** — cuántas cosas distintas tiene que discriminar el niño *a la vez* **para
 *   acertar una**: las opciones de una pregunta, las fichas de un tablero, los sitios de una
 *   pauta. Es la que gobierna `docs/04-DISENO-UI.md`: 2–4 en Infantil, 4–6 en 1.º–3.º, 6–9
 *   en 4.º–6.º. Esos números salen de la investigación de NN/g sobre interfaces infantiles y
 *   son un techo, no una meta.
 *
 *   **Un instrumento no cuenta aquí, y esto costó tres falsos positivos.** Las ocho teclas
 *   del piano de la pandilla, las catorce de tonos y semitonos y las ocho filas de una
 *   rejilla libre no son opciones que compitan entre sí: son una paleta, se tocan de una en
 *   una y suenan, y no hay nada que acertar. Medirlas con la vara de las preguntas llevaría
 *   a partir en dos un piano que tiene ocho teclas porque son los ocho personajes.
 * - **Seguir** — cuántos pasos tiene una secuencia que se recorre en el tiempo: los pulsos
 *   de un ritmo, los bloques de un musicograma, las notas de un karaoke. Aquí no hay que
 *   discriminar nada a la vez, hay que aguantar la atención, y el límite es otro y mucho más
 *   alto.
 *
 * Medir las dos con la misma vara daría falsos positivos en todas las actividades de ritmo,
 * que es exactamente el error que hay que no cometer.
 *
 * ## Y una tercera comprobación, la más útil
 *
 * **El bicho raro dentro de su propio ciclo.** Si una actividad de 1.º pide el triple que la
 * mediana de las demás de 1.º, eso no lo dice ninguna tabla: lo dice el propio catálogo. Es
 * la señal que ha encontrado las cosas de verdad, porque no depende de que yo acierte con un
 * número.
 *
 * Uso:  npm run contenido:dificultad
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'content', 'actividades');

/**
 * Cuántas cosas distintas puede haber a la vez delante, por etapa.
 *
 * De `docs/04-DISENO-UI.md`, que lo saca de NN/g. El ciclo 2 (3.º–4.º) cae entre dos bandas
 * de esa tabla —3.º está en la de 1.º–3.º y 4.º en la de 4.º–6.º—, así que se le da la unión
 * de las dos en vez de inventar una intermedia.
 */
const ELEGIR = {
  infantil: [2, 4],
  'primaria-c1': [4, 6],
  'primaria-c2': [4, 7],
  'primaria-c3': [6, 9],
};

/**
 * Cuántos pasos puede tener una secuencia, por etapa.
 *
 * Esto **no** sale de ninguna tabla del proyecto: es criterio, y por eso se marca. Sale de
 * la práctica común —los patrones de Kodály para Infantil son de cuatro a ocho pulsos, y una
 * canción entera de una estrofa anda por los veinticuatro— y de que aquí lo que se gasta es
 * atención sostenida, no memoria de trabajo.
 *
 * PENDIENTE DE REVISIÓN PEDAGÓGICA: los topes de esta tabla. Lo que se puede afirmar sin
 * una maestra es que **la de elegir y la de seguir son distintas**; dónde está exactamente
 * el techo de cada edad, no.
 */
const SEGUIR = {
  infantil: 24,
  'primaria-c1': 32,
  'primaria-c2': 48,
  'primaria-c3': 64,
};

/** Cuántas cosas hay que discriminar a la vez, y cuántos pasos tiene la secuencia. */
function cargaDe(a) {
  // Una serie (2026-09-11): lo que se discrimina es lo del ejercicio más pesado, y lo que se
  // sigue es la del más largo. Sin `ejercicios`, la actividad es un solo ejercicio.
  const base = a.contenido ?? {};
  if (Array.isArray(base.ejercicios) && base.ejercicios.length) {
    const { ejercicios, ...comun } = base;
    const cargas = ejercicios.map((e) => cargaDeUno(a, { ...comun, ...e }));
    return {
      elegir: Math.max(...cargas.map((x) => x.elegir)),
      // Lo que hay delante en cada momento es UN ejercicio, con su pausa antes y después:
      // se mide el más largo, no la suma.
      seguir: Math.max(...cargas.map((x) => x.seguir)),
      ejercicios: cargas.reduce((s, x) => s + (x.ejercicios ?? 0), 0) || undefined,
      que: `${cargas.length} ejercicios: ${cargas[0].que}…`,
    };
  }
  return cargaDeUno(a, base);
}

function cargaDeUno(a, c) {
  const n = (x) => (Array.isArray(x) ? x.length : 0);

  switch (a.tipo) {
    case 'eleccion':
      return {
        elegir: n(c.opciones),
        seguir: 0,
        ejercicios: n(c.estimulos),
        que: `${n(c.opciones)} opciones`,
      };
    case 'emparejar':
      // Cada toque elige dentro de UNA columna; la otra no compite con ella.
      return { elegir: Math.max(n(c.izquierda), n(c.derecha)), seguir: 0, que: `${n(c.parejas)} parejas` };
    case 'memoria':
      // Lo que hay que recordar son las parejas, no las cartas.
      return { elegir: n(c.parejas), seguir: 0, que: `${n(c.parejas)} parejas boca abajo` };
    case 'ordenar':
      return { elegir: n(c.orden), seguir: 0, que: `${n(c.orden)} fichas` };
    case 'pentagrama':
      return { elegir: n(c.opciones), seguir: 0, que: `${n(c.opciones)} sitios` };
    // Instrumentos: paleta, no pregunta. Ver la cabecera.
    case 'escala':
      return { elegir: 0, seguir: 7 * (c.octavas ?? 1), que: 'teclas de la escala' };
    case 'teclado':
      return { elegir: 0, seguir: c.blancas ?? 7 * (c.octavas ?? 1), que: 'teclas' };
    case 'pads':
      return { elegir: 0, seguir: n(c.golpes) || 10, que: 'pads' };
    case 'lienzo':
      // Las franjas no se eligen de una lista: se recorren con el dedo, arriba y abajo.
      return { elegir: 0, seguir: n(c.notas), que: `${n(c.notas)} franjas` };
    /*
      La rejilla es dos cosas. En dictado hay una solución y las filas SON opciones entre las
      que discriminar; en modo libre es una paleta y no hay nada que acertar.
    */
    case 'rejilla':
      return {
        elegir: c.modo === 'libre' ? 0 : (c.filas ?? 0),
        seguir: c.columnas ?? 0,
        que: `${c.filas}×${c.columnas}${c.modo === 'libre' ? ' libre' : ''}`,
      };
    case 'pistas':
      return {
        elegir: n(c.pistas),
        seguir: c.columnas ?? 0,
        que: `${n(c.pistas)} voces × ${c.columnas}`,
      };
    case 'seguir':
      return { elegir: 0, seguir: n(c.bloques), que: `${n(c.bloques)} bloques` };
    case 'karaoke':
      // A la vez solo se ven las que están cayendo; lo que crece es la secuencia.
      return {
        elegir: n(c.carriles) || 1,
        seguir: n(c.notas),
        que: `${n(c.notas)} notas`,
      };
    case 'cantar':
      return { elegir: 0, seguir: n(c.notas), que: `${n(c.notas)} notas` };
    case 'tocar-a-tiempo':
      return {
        elegir: 0,
        // Sin repeticiones declaradas, una: desde las series, repetir lo mismo ya no es la norma.
        seguir: n(c.silabas) * (c.repeticiones ?? 1),
        que: `${n(c.silabas)} sílabas × ${c.repeticiones ?? 1} vueltas`,
      };
    case 'cuerpo':
      return { elegir: 4, seguir: n(c.patron), que: `${n(c.patron)} golpes` };
    case 'compases':
      return { elegir: 0, seguir: n(c.duraciones), que: `${n(c.duraciones)} figuras` };
    case 'eco':
      return { elegir: 0, seguir: c.maximoGolpes ?? 8, que: 'golpes como mucho' };
    default:
      // Guía de aula, referencia, paisaje, acompañamientos: no tienen carga que medir.
      return null;
  }
}

/**
 * Lo que la auditoría marca y se queda, con el motivo.
 *
 * Igual que las dos asignaciones de personaje de `docs/14-PERSONAJES.md`: **una auditoría que
 * se afina hasta dar cero deja de avisar de nada.** El aviso se sigue imprimiendo; lo que
 * cambia es que aquí queda escrito por qué está bien, para que nadie lo «arregle» dentro de
 * seis meses.
 */
const REVISADOS = {
  'c2-11-instrumentos-del-mundo':
    'Doce preguntas, y son seis instrumentos que suenan DOS VECES cada uno, en dos notas ' +
    'distintas. Ésa es la actividad: el timbre no depende de la altura, y para verlo hay que ' +
    'oír el mismo instrumento en dos alturas. Reducirlo a seis lo convertiría en otra cosa.',
  'c1-15-ritmo-de-ocho':
    'Tres ritmos de ocho sílabas. El patrón largo es el tema —se llama «Ritmo de ocho»— y ' +
    'desde el 2026-09-11 cada vuelta es un ritmo distinto, no el mismo repetido.',
  'c3-10-ritmo-de-doce': 'Lo mismo, con doce: tres ritmos distintos de doce, y el patrón largo es el tema.',
  /*
    Estos cinco aparecieron el 2026-09-10 sin que cambiara nada en ellos: entraron treinta y
    cuatro actividades cortas de lenguaje —dos notas, cuatro clics— y la mediana de cada
    ciclo bajó. Son instrumentos y musicogramas, no preguntas, y el motivo es el de siempre:
    lo que hay delante en cada momento es pequeño aunque la secuencia sea larga.
  */
  'tr-05-piano': 'Es un piano: veintiuna teclas es una paleta, y se tocan de una en una.',
  'c2-16-cuatro-bandas': 'Dieciséis notas cayendo de una en una por cuatro bandas. Lo que crece es la duración.',
  'c3-12-compon-por-pistas': 'Cuatro voces de dieciséis casillas, y es un editor: no hay nada que acertar.',
  'inf-09-eco-de-palmas': 'Cuatro palmadas por tres vueltas. Cuatro es lo que cabe en un eco de Infantil, y tres vueltas es lo mínimo para que se aprenda.',
  'inf-17-palmas-y-muslos': 'Ocho golpes en bucle, de dos en dos: dos palmadas y dos en los muslos, sin parar hasta que salga.',
  'c1-14-notas-que-caen':
    'Veinticuatro notas, pero de una en una: en un musicograma que cae solo hay dos o tres ' +
    'en pantalla a la vez. Lo que crece es la duración, no lo que hay que discriminar.',
  'c2-14-himno-de-la-alegria': 'Treinta notas porque la frase de Beethoven tiene treinta.',
  'inf-11-cancion-con-pictogramas':
    'Veinticuatro pictogramas porque una estrofa tiene veinticuatro sílabas. Lo que sí ' +
    'estaba mal era el dibujo: la tira se partía en ocho renglones y el bloque iluminado ' +
    'saltaba de sitio. Ahora es una línea que se desplaza sola.',
  'inf-16-animales-que-bajan':
    'Catorce notas cayendo de una en una, como el de 1.º. La secuencia es larga; lo que hay ' +
    'delante en cada momento, no.',
};

const actividades = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')));

const avisos = [];
const porEtapa = new Map();

for (const a of actividades) {
  const carga = cargaDe(a);
  if (!carga) continue;
  if (!porEtapa.has(a.etapa)) porEtapa.set(a.etapa, []);
  porEtapa.get(a.etapa).push({ id: a.id, tipo: a.tipo, ...carga });

  const [, techoElegir] = ELEGIR[a.etapa] ?? [0, 99];
  if (carga.elegir > techoElegir && !a.herramienta) {
    avisos.push(
      `${a.id}\n      ${carga.elegir} cosas a la vez (${carga.que}) y para ${a.etapa} el ` +
        `techo son ${techoElegir}. Es memoria de trabajo, no atención: mira si se puede ` +
        `partir en dos rondas.`,
    );
  }
  /*
    Cuántas preguntas seguidas. Es distinto de las dos cargas de arriba: no es cuánto pide
    cada pregunta, es cuántas hay que aguantar. Doce iguales cansan mucho antes de que el
    contenido se acabe, y una actividad que se abandona a la mitad no enseña la mitad: no
    enseña nada, porque lo que se recuerda es que era larga.

    PENDIENTE DE REVISIÓN PEDAGÓGICA: los topes. Salen de la duración razonable por etapa
    dividida entre lo que tarda una pregunta con su escucha, no de ninguna fuente.
  */
  const EJERCICIOS = { infantil: 6, 'primaria-c1': 8, 'primaria-c2': 10, 'primaria-c3': 12 };
  if (carga.ejercicios && carga.ejercicios > (EJERCICIOS[a.etapa] ?? 99)) {
    avisos.push(
      `${a.id}\n      ${carga.ejercicios} preguntas seguidas y para ${a.etapa} el tope ` +
        `estimado son ${EJERCICIOS[a.etapa]}. No es lo que pide cada una, es aguantar todas.`,
    );
  }

  const techoSeguir = SEGUIR[a.etapa] ?? 99;
  if (carga.seguir > techoSeguir && !a.herramienta) {
    avisos.push(
      `${a.id}\n      secuencia de ${carga.seguir} pasos (${carga.que}) y para ${a.etapa} el ` +
        `tope estimado son ${techoSeguir}. Aquí lo que se gasta es atención sostenida.`,
    );
  }
}

/** La mediana, que aguanta un caso raro mucho mejor que la media. */
function mediana(xs) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

console.log(`${actividades.length} actividades.\n`);

if (avisos.length) {
  console.log(`## por encima de la banda de su edad (${avisos.length})`);
  for (const x of avisos) {
    console.log(`   ${x}`);
    const id = x.split('\n')[0];
    if (REVISADOS[id]) console.log(`      revisado: ${REVISADOS[id]}`);
  }
  console.log();
}

console.log('## el bicho raro de cada ciclo');
console.log('   Lo que pide el triple que la mediana de su propio ciclo. No lo dice ninguna');
console.log('   tabla: lo dice el catálogo, y por eso encuentra cosas que un techo no ve.\n');
for (const [etapa, lista] of porEtapa) {
  const conCarga = lista.filter((x) => x.elegir + x.seguir > 0);
  const med = mediana(conCarga.map((x) => x.elegir + x.seguir));
  const raros = conCarga
    .filter((x) => x.elegir + x.seguir > med * 3)
    .sort((a, b) => b.elegir + b.seguir - (a.elegir + a.seguir));
  console.log(`   ${etapa}  (mediana ${med})`);
  if (!raros.length) console.log('      nada que destaque');
  for (const r of raros) {
    console.log(`      ${r.id.padEnd(32)} ${r.elegir + r.seguir}  (${r.que})`);
    if (REVISADOS[r.id]) console.log(`         revisado: ${REVISADOS[r.id]}`);
  }
}
process.exitCode = 0;
