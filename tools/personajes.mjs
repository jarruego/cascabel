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
 *    Se les da a todas **el mismo lienzo cuadrado**, con el dibujo centrado en horizontal y
 *    **apoyado abajo**. Apoyado abajo y no centrado: lo que tiene que coincidir entre una
 *    pose y otra son los pies. Si se centrara, un personaje con los brazos en alto —que
 *    ocupa más arriba— bajaría los pies para compensar, y al alternar poses parecería que
 *    da saltos.
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
 * Lado del lienzo común, en unidades del dibujo.
 *
 * Un poco más que la pose más alta que hay, para que ninguna quede pegada al borde: el
 * personaje necesita aire, y en algunos sitios se recorta en redondo.
 */
const LADO = 250;

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
      // Centrado en horizontal, apoyado abajo: los pies de todas las poses caen en la misma
      // línea, que es lo que hace que el personaje no dé saltos al cambiar de gesto.
      const x = ((ancho - LADO) / 2).toFixed(1);
      const y = (alto - LADO).toFixed(1);
      svg = svg.replace(exportado[0], `viewBox="${x} ${y} ${LADO} ${LADO}"`);
    } else if (!recuadrado || Number(recuadrado[1]) !== LADO) {
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
