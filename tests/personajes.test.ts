import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERSONAJES, POSES, personajeDe, rutaDe } from '@/ui/personajes';

/**
 * Los personajes de cocomusic.
 *
 * Dos clases de comprobación. La del **mapa nota → personaje**, donde el caso que importa
 * son los dos «do»: Dora abre y Doby cierra, y confundirlos pondría al personaje del final
 * del recorrido en la primera tecla del teclado.
 *
 * Y la de los **ficheros**, que es la que se rompe sola: un nombre mal escrito no da ningún
 * error —el componente cae a `neutro` y sigue, que es lo que se le pide— pero la pose no
 * aparece nunca y nadie se entera. Ya pasó con `doby-palmeea.svg`.
 */

const DIR = join(__dirname, '..', 'public', 'personajes');
const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.svg'));

describe('el mapa de notas', () => {
  it('cada nota de la escala tiene su personaje', () => {
    expect(personajeDe('C4')).toBe('dora');
    expect(personajeDe('D4')).toBe('rex');
    expect(personajeDe('E4')).toBe('milo');
    expect(personajeDe('F4')).toBe('fara');
    expect(personajeDe('G4')).toBe('sol');
    expect(personajeDe('A4')).toBe('laia');
    expect(personajeDe('B4')).toBe('simon');
  });

  it('el do de arriba es Doby, no Dora', () => {
    // Es el caso de todo el mapa: Doby cierra la octava y cierra el recorrido. Ponerlo en
    // la primera tecla sería contar la metodología al revés.
    expect(personajeDe('C5')).toBe('doby');
    expect(personajeDe('C4')).toBe('dora');
  });

  it('los sostenidos van con su nota natural', () => {
    // Un fa sostenido sigue siendo territorio de Fara: no hay personaje para las negras.
    expect(personajeDe('F#4')).toBe('fara');
  });

  it('una nota sin octava usa la de referencia', () => {
    expect(personajeDe('C')).toBe('dora');
  });

  it('lo que no es una nota no devuelve un personaje al azar', () => {
    expect(personajeDe('bombo')).toBeNull();
    expect(personajeDe('')).toBeNull();
  });
});

describe('los ficheros de dibujo', () => {
  it('hay al menos un personaje dibujado', () => {
    expect(ficheros.length).toBeGreaterThan(0);
  });

  it('todo fichero se llama <personaje>-<pose>.svg', () => {
    // Un nombre mal escrito no rompe nada: la pose simplemente no aparece nunca. Por eso
    // hace falta comprobarlo aquí y no descubrirlo mirando la pantalla.
    const validos = new Set<string>();
    for (const p of PERSONAJES) for (const pose of POSES) validos.add(`${p}-${pose}.svg`);
    // `-main` es la lámina de referencia del personaje, no una pose de la aplicación.
    const sueltos = ficheros.filter((f) => !validos.has(f) && !f.endsWith('-main.svg'));
    expect(sueltos).toEqual([]);
  });

  it('todas las poses comparten ALTURA, que es lo que las hace del mismo tamaño', () => {
    // El ancho no: cantar con los brazos abiertos ocupa más que estar de pie, y eso es el
    // gesto. Lo que tiene que coincidir es el personaje, no la caja. Lo unifica
    // `npm run personajes` y esto comprueba que se ha pasado.
    const alturas = new Set<string>();
    for (const f of ficheros) {
      const svg = readFileSync(join(DIR, f), 'utf-8');
      const m = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
      expect(m, `${f}: sin viewBox normalizado; pasa \`npm run personajes\``).toBeTruthy();
      alturas.add(m![2]!);
    }
    expect([...alturas]).toHaveLength(1);
  });

  it('ninguna pose se ha quedado recortada al normalizar', () => {
    // El lienzo empezó siendo cuadrado y `milo-canta` —354 de ancho, brazos abiertos— se
    // habría perdido cincuenta unidades por cada lado sin que nadie lo notara mirando los
    // otros nueve.
    const recortadas: string[] = [];
    for (const f of ficheros) {
      const svg = readFileSync(join(DIR, f), 'utf-8');
      const m = /viewBox="(-?[\d.]+) [-\d.]+ ([\d.]+) [\d.]+"/.exec(svg);
      // Un desplazamiento positivo en X significa que la ventana empieza DENTRO del dibujo.
      if (m && Number(m[1]) > 0) recortadas.push(f);
    }
    expect(recortadas).toEqual([]);
  });

  it('ningún dibujo lleva texto, que es lo que impediría traducirlo', () => {
    const conTexto = ficheros.filter((f) =>
      /<text|font-family/.test(readFileSync(join(DIR, f), 'utf-8')),
    );
    expect(conTexto).toEqual([]);
  });

  it('la ruta que construye el código es la que existe en disco', () => {
    // Comprobado contra un fichero de verdad: si `rutaDe` cambiara de forma, el componente
    // pediría una ruta que no está y caería a `neutro` en silencio.
    const alguno = ficheros.find((f) => f.endsWith('-neutro.svg'));
    expect(alguno).toBeTruthy();
    const personaje = alguno!.replace('-neutro.svg', '') as (typeof PERSONAJES)[number];
    expect(rutaDe(personaje, 'neutro')).toBe(`/personajes/${alguno}`);
  });
});

describe('quién presenta cada actividad', () => {
  const DIR_ACT = join(__dirname, '..', 'content', 'actividades');
  const actividades = readdirSync(DIR_ACT)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR_ACT, f), 'utf-8')) as {
      id: string;
      personaje?: string;
    });

  it('el personaje declarado es uno de los ocho', () => {
    const raros = actividades
      .filter((a) => a.personaje && !PERSONAJES.includes(a.personaje as never))
      .map((a) => `${a.id} → ${a.personaje}`);
    expect(raros).toEqual([]);
  });

  it('solo se asigna un personaje que esté dibujado', () => {
    // Declararlo antes de tener el dibujo no rompe nada —el componente cae a `neutro` y
    // luego a nada— pero deja la pantalla sin personaje sin que nadie se entere. Mejor
    // esperar a que exista.
    const dibujados = new Set(ficheros.map((f) => f.split('-')[0]));
    const sinDibujo = actividades
      .filter((a) => a.personaje && !dibujados.has(a.personaje))
      .map((a) => `${a.id} → ${a.personaje}`);
    expect(sinDibujo).toEqual([]);
  });
});

describe('el reparto está completo', () => {
  const DIR_ACT = join(__dirname, '..', 'content', 'actividades');
  const todas = readdirSync(DIR_ACT)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR_ACT, f), 'utf-8')) as {
      id: string;
      personaje?: string;
    });

  it('todas las actividades declaran su personaje', () => {
    // Hay un valor por defecto —Dora—, así que faltar no rompe nada: sale Dora presentando
    // una actividad de ritmo y nadie se entera. Declararlo obliga a haberlo pensado.
    expect(todas.filter((a) => !a.personaje).map((a) => a.id)).toEqual([]);
  });

  it('los ocho tienen alguna actividad', () => {
    // Un personaje dibujado, con diez poses y sin salir en ninguna parte sería trabajo
    // tirado, y de los que no se notan.
    const usados = new Set(todas.map((a) => a.personaje));
    expect([...PERSONAJES].filter((p) => !usados.has(p))).toEqual([]);
  });
});

/**
 * Que la pandilla salga entera, y repartida.
 *
 * El personaje de cada actividad se elige por lo que trabaja, no por reparto, y eso está
 * bien; pero aplicado a medias dejó a Doby en cinco actividades y a Dora en una de
 * Infantil, y el autor lo notó el 2026-09-10: «hay personajes que salen muy poco o nada».
 * Este test no pide reparto igual —sería falso—: pide que nadie baje de la mitad de lo que
 * le tocaría a partes iguales, ni suba del doble. Los umbrales salen de cuántas
 * actividades hay, así que crecen con el catálogo.
 */
describe('la pandilla sale repartida', () => {
  const DIR_ACTIVIDADES = join(__dirname, '..', 'content', 'actividades');
  const declarados = readdirSync(DIR_ACTIVIDADES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => (JSON.parse(readFileSync(join(DIR_ACTIVIDADES, f), 'utf-8')) as { personaje?: string }).personaje ?? 'dora');
  const parte = declarados.length / PERSONAJES.length;

  it('ningún personaje baja de la mitad de su parte ni sube del doble', () => {
    const cuenta = Object.fromEntries(PERSONAJES.map((p) => [p, declarados.filter((x) => x === p).length]));
    const fuera = PERSONAJES.filter((p) => cuenta[p]! < parte / 2 || cuenta[p]! > parte * 2);
    expect(fuera, JSON.stringify(cuenta)).toEqual([]);
  });
});
