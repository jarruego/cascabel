#!/usr/bin/env node
/**
 * Prepara los SVG de los personajes de cocomusic para la aplicación.
 *
 * Los ficheros llegan exportados de un programa de dibujo, y eso trae dos cosas que hay que
 * arreglar antes de meterlos en la interfaz:
 *
 * 1. **Peso.** Cabecera XML, DOCTYPE y espacios que no pintan nada. Se quitan sin tocar un
 *    solo trazo.
 *
 * 2. **Encuadre — y esto es lo que de verdad importa.** Cada pose viene recortada a su
 *    dibujo, así que una tiene 155 × 225 y otra 207 × 220. Puestas en una misma caja, cada
 *    pose sale de un tamaño y el personaje parece encoger y crecer al cambiar de gesto.
 *
 *    Se les da a todas **la misma altura**, con el dibujo centrado en horizontal y
 *    **apoyado abajo**. Apoyado abajo y no centrado: lo que tiene que coincidir entre una
 *    pose y otra son los pies. Si se centrara, un personaje con los brazos en alto —que
 *    ocupa más arriba— bajaría los pies para compensar, y al alternar poses parecería que
 *    da saltos.
 *
 *    **La altura y no la caja entera.** El primer intento las metía a todas en un cuadrado,
 *    y `milo-canta.svg` lo rompió: mide 354 de ancho porque canta con los brazos abiertos,
 *    y en un cuadrado de 250 se le habrían ido cincuenta unidades por cada lado. Lo que
 *    tiene que coincidir entre poses es el personaje, no la caja: un gesto abierto ocupa
 *    más, y eso es el gesto.
 *
 * No reescribe ningún trazo: solo cambia el `viewBox`, que es la ventana por la que se mira.
 *
 * Uso:  npm run personajes
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'personajes');

/**
 * Altura del lienzo común, en unidades del dibujo.
 *
 * Un poco más que la pose más alta que hay, para que ninguna quede pegada al borde: el
 * personaje necesita aire, y en algunos sitios se recorta en redondo.
 */
const ALTO = 250;

/**
 * Ancho mínimo. Una pose estrecha —Fara con el dedo en los labios, brazos pegados— saldría
 * apretada contra los bordes en una caja de su propio ancho.
 */
const ANCHO_MINIMO = 250;

/** Ficheros que no son una pose y se dejan como están. */
const APARTE = new Set(['doby-main.svg']);

let total = 0;
let tocados = 0;

for (const fichero of readdirSync(DIR).sort()) {
  if (!fichero.endsWith('.svg')) continue;
  const ruta = join(DIR, fichero);
  const antes = statSync(ruta).size;
  let svg = readFileSync(ruta, 'utf-8');

  // Cabeceras que no pinta nadie. El `<?xml?>` solo hace falta si el fichero se sirve como
  // XML suelto, y estos se incrustan o se piden como imagen.
  svg = svg
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')
    .replace(/\s*xml:space="preserve"/g, '')
    .replace(/\s*xmlns:serif="[^"]*"/g, '')
    .replace(/\s+serif:[a-zA-Z-]+="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .trim();

  if (!APARTE.has(fichero)) {
    /*
      Se mira primero si viene tal cual del exportador (`viewBox="0 0 ancho alto"`) y solo
      entonces se recuadra. Pasar el script dos veces no puede encoger el dibujo un poco
      más cada vez.

      Con expresiones literales y no con `new RegExp`: en una cadena, `\d` se queda en una
      `d` suelta y la clase pasa a ser «un guion, una letra d o un punto», que no casa con
      ningún número. Costó un rato verlo.
    */
    const exportado = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
    const recuadrado = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);

    if (exportado) {
      const ancho = Number(exportado[1]);
      const alto = Number(exportado[2]);
      // El ancho, el que haga falta: nunca se recorta un gesto abierto. La altura, siempre
      // la misma, y apoyado abajo, que es lo que pone los pies de todas las poses en la
      // misma línea.
      const caja = Math.max(ancho, ANCHO_MINIMO);
      const x = ((ancho - caja) / 2).toFixed(1);
      const y = (alto - ALTO).toFixed(1);
      svg = svg.replace(exportado[0], `viewBox="${x} ${y} ${caja} ${ALTO}"`);
    } else if (!recuadrado || Number(recuadrado[2]) !== ALTO) {
      console.log(`  ${fichero}: viewBox inesperado, se deja como está`);
    }
  }

  // `width`/`height` al 100 % estorban: quien lo coloca decide el tamaño desde el CSS.
  svg = svg.replace(/\s+width="100%"/, '').replace(/\s+height="100%"/, '');

  writeFileSync(ruta, svg + '\n', 'utf-8');
  const despues = statSync(ruta).size;
  total += despues;
  tocados += 1;
  const ahorro = Math.round(((antes - despues) / antes) * 100);
  console.log(
    `  ${fichero.padEnd(24)} ${String(Math.round(despues / 1024)).padStart(3)} KB  (-${ahorro} %)`,
  );
}

console.log(`\n${tocados} ficheros, ${Math.round(total / 1024)} KB en total.`);
