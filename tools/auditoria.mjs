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
process.exitCode = 0;
