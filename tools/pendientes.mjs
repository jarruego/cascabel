#!/usr/bin/env node
/**
 * Reúne en un solo sitio todo lo que espera criterio musical o pedagógico.
 *
 * Estaban repartidas por el código, cada una junto a la decisión que la provocó, que es
 * donde tienen que estar: una nota de «esto habría que revisarlo» a cien líneas de lo que
 * hay que revisar no sirve de nada. Pero eso las hacía **imposibles de revisar de una
 * sentada**, que es como se va a hacer: una profesora de música con un rato libre, no
 * leyendo el repositorio entero.
 *
 * Así que se quedan donde están y se recogen aquí, con su contexto, generando
 * `docs/13-PENDIENTE-DE-REVISION.md`. El fichero es **generado**: no se edita a mano.
 *
 * Uso:  npm run docs:pendientes
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'docs', '13-PENDIENTE-DE-REVISION.md');

/** Las dos marcas que se usan en el proyecto, con acento y sin él. */
const MARCAS = [/PENDIENTE DE REVISI[OÓ]N PEDAG[OÓ]GICA/i, /PENDIENTE DE CRITERIO MUSICAL/i];

const CARPETAS = ['src', 'content', 'tools'];
// Este mismo fichero contiene las marcas que busca. Sin esto, sale listado como si
// fuera una decision esperando respuesta.
const SE_EXCLUYE = 'tools/pendientes.mjs';
const EXTENSIONES = new Set(['ts', 'tsx', 'json', 'py', 'mjs']);

function ficheros(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada.startsWith('.')) continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta));
    else if (EXTENSIONES.has(entrada.split('.').pop())) salida.push(ruta);
  }
  return salida;
}

/**
 * El párrafo entero, no la línea suelta.
 *
 * La marca casi nunca está donde está la explicación: va al principio de un bloque que dice
 * qué se decidió y por qué. Recortarlo a una línea deja «PENDIENTE DE REVISIÓN PEDAGÓGICA»
 * a secas, que es exactamente lo que no sirve.
 */
function bloqueDe(lineas, i) {
  // El bucle importa: una cita dentro de un bloque de comentario empieza por « * > »
  // y con una sola pasada el `>` se queda dentro del texto recogido.
  const limpia = (l) => {
    // Cierres de bloque: `*/` de JavaScript y las comillas triples de Python, que se
    // colaban al final del ultimo parrafo de un docstring.
    let x = l.replace(/\*\/\s*$/, '').replace(/("""|''')\s*$/, '');
    let antes;
    do {
      antes = x;
      // El `(?!\\*)` es lo que salva la negrita: en « * **PENDIENTE» la primera
      // pasada se lleva el asterisco del comentario y la segunda se llevaba los dos de
      // markdown, con lo que el texto salia empezando por «PENDIENTE...**».
      x = x
        .replace(/^\s*\/\*+\s?/, '')
        .replace(/^\s*\*(?!\*)\s?/, '')
        .replace(/^\s*(\/\/|#|>)\s?/, '');
    } while (x !== antes);
    return x.trim();
  };
  /*
    Qué cuenta como «sigue el mismo párrafo».

    En un comentario de JavaScript es fácil: la línea empieza por `*`, `//` o `>`. Pero en un
    docstring de Python no hay ningún prefijo, y con esa condición sola el bloque se quedaba
    en la línea suelta —«PENDIENTE DE REVISIÓN PEDAGÓGICA: se usan tres campanas separadas
    por quintas justas», cortado ahí—, que es justo lo que este script existe para evitar.

    Así que también sigue la prosa, y para en cuanto la línea parezca código.
  */
  const codigo = /^\s*(def |class |import |from |const |let |var |function |export |return |if |for |while |[\w.[\]]+\s*[=(])|[;{}]\s*$/;
  const sigue = (l) =>
    l !== undefined && limpia(l) !== '' && (/^\s*(\*|\/\/|#|>)/.test(l) || !codigo.test(l));

  let arriba = i;
  while (arriba > 0 && sigue(lineas[arriba - 1])) arriba--;
  let abajo = i;
  while (abajo + 1 < lineas.length && sigue(lineas[abajo + 1])) abajo++;
  return lineas
    .slice(arriba, abajo + 1)
    .map(limpia)
    .filter((l) => l !== '' && l !== '/')
    .join(' ')
    .replace(/\s+/g, ' ');
}

const hallazgos = [];
for (const carpeta of CARPETAS) {
  for (const ruta of ficheros(join(RAIZ, carpeta))) {
    const lineas = readFileSync(ruta, 'utf-8').replace(/\r\n/g, '\n').split('\n');
    lineas.forEach((linea, i) => {
      if (!MARCAS.some((m) => m.test(linea))) return;
      if (relative(RAIZ, ruta).split('\\').join('/') === SE_EXCLUYE) return;
      hallazgos.push({
        fichero: relative(RAIZ, ruta).replace(/\\/g, '/'),
        linea: i + 1,
        texto: bloqueDe(lineas, i),
      });
    });
  }
}

hallazgos.sort((a, b) => a.fichero.localeCompare(b.fichero) || a.linea - b.linea);

const hoy = new Date().toISOString().slice(0, 10);
const cuerpo = `# Pendiente de revisión

> **Fichero generado.** Lo escribe \`npm run docs:pendientes\` leyendo las marcas que hay
> repartidas por el código. No lo edites a mano: edita la marca, que está junto a la decisión
> que la provocó. Generado el ${hoy}.

Esto es lo que **decidió un desarrollador leyendo la convención documentada** y que hace falta
que confirme alguien que sepa de música o de aula. Ninguna de estas decisiones está mal por
definición: están sin verificar, que es distinto y peor de dejar callado.

En cada una, lo que hace falta es una de tres respuestas: **vale**, **cámbialo por esto**, o
**depende, y depende de esto**.

${hallazgos.length} punto${hallazgos.length === 1 ? '' : 's'} esperando respuesta.

${hallazgos
  .map(
    (h, n) => `## ${n + 1}. \`${h.fichero}\` (línea ${h.linea})

${h.texto}
`,
  )
  .join('\n')}`;

writeFileSync(SALIDA, cuerpo, 'utf-8');
console.log(`docs/13-PENDIENTE-DE-REVISION.md: ${hallazgos.length} puntos`);
