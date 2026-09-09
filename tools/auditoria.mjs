#!/usr/bin/env node
/**
 * Auditoría de las actividades, una por una.
 *
 * No sustituye a mirarlas: comprueba lo que **se puede comprobar leyendo**, que es más de lo
 * que parece, y deja escrito lo que hay que mirar con los ojos. Nació el 2026-09-08, cuando
 * el autor pidió repasar las setenta y ocho contra las reglas que habían ido saliendo.
 *
 * Cada regla tiene su porqué en el propio mensaje: un aviso que no dice por qué está mal no
 * se arregla, se silencia.
 *
 * Uso:  npm run contenido:auditar
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'content', 'actividades');
const textos = JSON.parse(readFileSync(join(RAIZ, 'src', 'i18n', 'es.json'), 'utf-8'));

/** Cuánto puede durar una frase que se le lee en voz alta a un niño, por etapa. */
const LARGO_ENUNCIADO = {
  infantil: 130,
  'primaria-c1': 170,
  'primaria-c2': 220,
  'primaria-c3': 260,
};

/**
 * Minutos **de pantalla** razonables, y solo se aplican a lo que pasa en la pantalla.
 *
 * Una guía de aula de treinta y cinco minutos no es tiempo de pantalla: es una sesión, con
 * la pantalla llevando el pulso mientras la clase construye cotidiáfonos. La primera versión
 * de esta regla las medía a todas por igual y avisaba de diez actividades que estaban bien.
 * El tope duro de 20 minutos de pantalla lo comprueba `validar.py`.
 */
const MINUTOS = { infantil: 10, 'primaria-c1': 12, 'primaria-c2': 15, 'primaria-c3': 20 };

/**
 * Qué trabaja cada personaje. Sirve para avisar de una asignación que se contradice con el
 * eje de la actividad — no para decidirla: eso es criterio y está en `docs/14-PERSONAJES.md`.
 */
const AFINIDAD = {
  dora: ['altura', 'notacion'],
  rex: ['timbre', 'cultura', 'altura', 'notacion'],
  milo: ['pulso', 'cuerpo'],
  fara: ['timbre', 'cultura', 'altura', 'creacion', 'pulso'],
  sol: ['pulso', 'cuerpo', 'cultura', 'notacion'],
  laia: ['creacion', 'altura', 'timbre'],
  simon: ['timbre', 'altura', 'notacion', 'cultura', 'pulso'],
  doby: ['cultura', 'creacion'],
};

/** Palabras que un niño de Infantil no tiene por qué conocer. */
const PALABRAS_DIFICILES = [
  'pentagrama', 'compás', 'corchea', 'semicorchea', 'negra con puntillo', 'tesitura',
  'intervalo', 'pentatónica', 'ostinato', 'síncopa', 'contratiempo', 'armónica',
  'digitación', 'bordón', 'diatónica', 'cromática', 'anacrusa',
];

/**
 * Qué ayuda enseña la pantalla de explicación para cada tipo.
 *
 * Es la mitad de `src/motor/ayudaPorTipo.ts` que se puede comparar con un texto: los dos
 * tipos que la eligen en marcha —karaoke según tenga botones por carril, tocar a tiempo
 * según entre por micrófono— se quedan fuera, porque aquí no se sabe cuál saldría.
 */
const AYUDA_POR_TIPO = {
  seguir: 'seguir.sigue',
  ordenar: 'ordenar.tambienArrastrando',
  lienzo: 'lienzo.libre',
  teclado: 'teclado.libre',
  pads: 'pads.libre',
  referencia: 'referencia.paraConsultar',
};

const hallazgos = [];
const avisa = (id, regla, que) => hallazgos.push({ id, regla, que });

const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

for (const fichero of ficheros) {
  const a = JSON.parse(readFileSync(join(DIR, fichero), 'utf-8'));
  const id = a.id;
  const c = a.contenido ?? {};
  const etapa = a.etapa;

  // ── Textos: que existan y digan algo ────────────────────────────────────────
  for (const [campo, clave] of [['consigna', c.consigna], ['enunciado', a.enunciado]]) {
    if (!clave) {
      avisa(id, 'textos', `sin ${campo}`);
    } else if (!textos[clave]) {
      avisa(id, 'textos', `${campo} apunta a «${clave}», que no está en el diccionario`);
    }
  }
  for (const pista of a.pistas ?? []) {
    if (!textos[pista]) avisa(id, 'textos', `pista «${pista}» sin traducción`);
  }

  // ── Lenguaje por edad ───────────────────────────────────────────────────────
  const enunciado = textos[a.enunciado] ?? '';
  const tope = LARGO_ENUNCIADO[etapa];
  if (enunciado.length > tope) {
    avisa(
      id,
      'lenguaje',
      `el enunciado tiene ${enunciado.length} caracteres y para ${etapa} el tope es ${tope}: ` +
        'se lo lee un adulto en voz alta, y una frase larga se pierde a la mitad',
    );
  }
  if (etapa === 'infantil') {
    const dificiles = PALABRAS_DIFICILES.filter((p) =>
      `${enunciado} ${textos[c.consigna] ?? ''}`.toLowerCase().includes(p),
    );
    if (dificiles.length) {
      avisa(id, 'lenguaje', `palabra de mayores en Infantil: ${dificiles.join(', ')}`);
    }
  }

  // ── Ficha y nivel ───────────────────────────────────────────────────────────
  if (a.lugar === 'pantalla' && a.duracion_min > MINUTOS[etapa]) {
    avisa(
      id,
      'nivel',
      `${a.duracion_min} min para ${etapa}; a esa edad la atención sostenida no da para ` +
        `más de ${MINUTOS[etapa]}`,
    );
  }
  const pistas = (a.pistas ?? []).length;
  if (a.evaluacion?.autocorrectiva && pistas === 0) {
    avisa(id, 'nivel', 'autocorrectiva y sin ninguna pista: al fallar no hay nada que ofrecer');
  }

  // ── Currículo ───────────────────────────────────────────────────────────────
  /*
    `null` no es lo mismo que ausente.

    `CLAUDE.md` §9 dice que ante la duda se deje `null` y se marque, así que un `null` es una
    decisión tomada y lo que hay que hacer con él es confirmarlo, no corregirlo. Ausente sí
    es un descuido: nadie llegó a plantearse la pregunta.
  */
  const cur = a.curriculo ?? {};
  for (const campo of ['criterio', 'saber']) {
    if (!(campo in cur)) avisa(id, 'curriculo', `falta el campo «${campo}»`);
    else if (cur[campo] === null) {
      avisa(id, 'curriculo-pendiente', `«${campo}» está en null y espera confirmación`);
    }
  }
  /*
    El número del criterio dice de qué competencia cuelga: 3.5 es de la tercera, 4.1 de la
    cuarta. Dos actividades no cuadraban y las dos enseñaban en la ficha una competencia que
    no era la suya — `inf-06` decía CE3 con el criterio 4.1, e `inf-16` no decía ninguna.

    Esto no es criterio musical: es concordancia. Qué criterio toca sí lo es, y eso va a la
    lista de revisión, no aquí.
  */
  if (cur.competencia && cur.criterio) {
    const numero = String(cur.competencia).replace('CE', '');
    if (!String(cur.criterio).startsWith(`${numero}.`)) {
      avisa(
        id,
        'curriculo',
        `${cur.competencia} con el criterio ${cur.criterio}: el número del criterio dice de ` +
          'qué competencia cuelga, así que uno de los dos está mal',
      );
    }
  } else if (cur.criterio && !cur.competencia) {
    avisa(id, 'curriculo', `criterio ${cur.criterio} sin competencia, y el número la dice`);
  }

  const areaInfantil = etapa === 'infantil';
  const esperada = areaInfantil
    ? 'Comunicación y Representación de la Realidad'
    : 'Educación Artística';
  if (cur.area && cur.area !== esperada) {
    avisa(id, 'curriculo', `área «${cur.area}» y para ${etapa} toca «${esperada}»`);
  }

  // ── Personaje ───────────────────────────────────────────────────────────────
  if (!a.personaje) {
    avisa(id, 'personaje', 'sin personaje: presentaría Dora sin que nadie lo haya decidido');
  } else if (!AFINIDAD[a.personaje]?.includes(a.eje) && !a.herramienta) {
    avisa(
      id,
      'personaje',
      `${a.personaje} en una actividad de «${a.eje}», que no es lo suyo: revísalo contra ` +
        'docs/14-PERSONAJES.md o cámbialo',
    );
  }

  /*
    El enunciado no repite lo que ya dice la ayuda de su tipo.

    La pantalla de explicación cuenta dos cosas seguidas: qué hay que hacer (esta actividad)
    y cómo se maneja (todas las de su tipo). Al juntarlas salieron duplicados literales:

        Sigue los dibujos con el dedo mientras suena la canción.
        Sigue el dibujo con el dedo mientras suena.

    Se comparan las palabras largas —las de cinco letras o más—, que son las que llevan el
    significado. Con cuatro en común ya se está diciendo lo mismo dos veces.
  */
  const ayuda = textos[AYUDA_POR_TIPO[a.tipo] ?? ''] ?? '';
  if (ayuda && enunciado) {
    const palabras = (x) =>
      new Set(
        x
          .toLowerCase()
          .replace(/[^a-záéíóúüñ ]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 5),
      );
    const suyas = palabras(enunciado);
    const comunes = [...palabras(ayuda)].filter((w) => suyas.has(w));
    if (comunes.length >= 4) {
      avisa(
        id,
        'textos',
        `el enunciado repite la ayuda del tipo (${comunes.join(', ')}): en la pantalla de ` +
          'explicación salen seguidos y se lee dos veces lo mismo',
      );
    }
  }

  // ── Interfaz: extras que no vienen al caso ──────────────────────────────────
  if (etapa === 'infantil') {
    for (const [campo, texto] of [
      ['grabable', 'grabar y escuchar son dos decisiones más delante de un niño de cuatro años'],
      ['elegirOctavas', 'elegir octavas no es una decisión de esta edad'],
      ['metronomo', 'a esta edad la tarea es el timbre o la altura, no llevar el tiempo'],
      ['letrasQwerty', 'en Infantil se toca con el dedo; una letra más en cada tecla es ruido'],
    ]) {
      if (c[campo] === true) avisa(id, 'interfaz', `${campo} en Infantil: ${texto}`);
    }
  }
  /*
    Las ideas hacen falta donde no hay nada que hacer: un lienzo, un teclado, unos pads. Una
    herramienta con procedimiento —el afinador, el metrónomo, la referencia— ya dice sola
    para qué es, y la primera versión de esta regla avisaba de las cuatro que estaban bien.
  */
  if (a.herramienta && !c.retos && ['lienzo', 'teclado', 'pads'].includes(a.tipo)) {
    avisa(
      id,
      'interfaz',
      'es una herramienta abierta y no trae ideas: sin consigna ni final, un niño se queda mirándola',
    );
  }
}

// ── Salida ────────────────────────────────────────────────────────────────────
const porRegla = new Map();
for (const h of hallazgos) {
  if (!porRegla.has(h.regla)) porRegla.set(h.regla, []);
  porRegla.get(h.regla).push(h);
}

console.log(`${ficheros.length} actividades auditadas.\n`);
for (const [regla, lista] of [...porRegla].sort()) {
  console.log(`## ${regla} (${lista.length})`);
  for (const h of lista) console.log(`   ${h.id}\n      ${h.que}`);
  console.log();
}
if (!hallazgos.length) console.log('Sin hallazgos.');

/*
  Y el recuento de saberes, que no es un aviso sino una foto.

  PENDIENTE DE REVISIÓN PEDAGÓGICA. Los saberes se escriben a mano en cada JSON y aquí no
  hay forma de saber cuál es la redacción buena: el real decreto está en el BOE y este
  proyecto no lo tiene delante. Lo que sí se ve es cuándo una redacción la usa **una sola
  actividad** y otra parecida la usan treinta, que casi siempre significa que alguien
  escribió el mismo saber de dos maneras — pasó con el F de Infantil, que estaba de cuatro
  formas distintas y partía en cuatro un grupo que es uno.

  Se imprime ordenado por uso para que se lea de un vistazo cuáles hay que confirmar, y la
  que usa una sola actividad **dice cuál es**: una lista de redacciones sin nombres obliga a
  buscarla a mano por los setenta y ocho ficheros, y esta foto es justo lo que se le enseña a
  quien tiene el decreto delante.

  Hasta que eso pase no se toca ninguna que no sea una variante evidente de otra, y evidente
  significa **mismo bloque y misma idea**. Se arregló así la de `c2-01`, que decía
  «Lenguajes musicales: aplicación de sus conceptos básicos» donde otras diecinueve del mismo
  criterio dicen «Lenguajes y práctica musical». No se tocó la de `c1-08`: esa cambia de
  bloque, de D a A, y decidir si reconocer timbres es escucha del bloque musical o recepción
  del bloque de análisis no es redactar distinto, es clasificar distinto.
*/
const saberes = new Map();
for (const f of ficheros) {
  const a = JSON.parse(readFileSync(join(DIR, f), 'utf-8'));
  const clave = `${a.etapa === 'infantil' ? 'Infantil' : 'Primaria'}  ${a.curriculo?.saber}`;
  const antes = saberes.get(clave) ?? { n: 0, quien: [] };
  saberes.set(clave, { n: antes.n + 1, quien: [...antes.quien, a.id] });
}
console.log('## saberes declarados, por uso');
for (const [clave, { n, quien }] of [...saberes].sort((x, y) => y[1].n - x[1].n)) {
  const cola = n === 1 ? `   <- confirmar (${quien[0]})` : '';
  console.log(`   ${String(n).padStart(3)}  ${clave}${cola}`);
}
process.exitCode = 0;
