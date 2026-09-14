import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rejillaDesdeSilabas } from '@/motor/rejillaRitmica';

/*
  Lo que se rompió el 2026-09-11 sin que ningún test avisara, ahora con test:

   - un mapa (seguir) con bloques tenía 30 notas para 32 pulsos, y sus frases no cuadraban;
   - los karaokes «en tres partes» se escriben a mano y la tercera tiene que ser la suma;
   - la percusión corporal con melodía necesita una nota (o un null) por golpe.
*/
const RAIZ = join(__dirname, '..');
const dir = join(RAIZ, 'content', 'actividades');
const actividades = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as {
    id: string;
    tipo: string;
    contenido: Record<string, unknown>;
  });

type Nota = { nota: string; pulsos: number };

describe('las obras y canciones del contenido', () => {
  it('un mapa con bloques tiene una nota por bloque o una por pulso, y no otra cosa', () => {
    const malos: string[] = [];
    for (const a of actividades.filter((x) => x.tipo === 'seguir')) {
      const c = a.contenido;
      const bloques = c.bloques as Array<{ pulsos?: number }> | undefined;
      const notas = c.notas as unknown[] | undefined;
      if (!bloques || !notas || c.silabas) continue;
      const pulsos = bloques.reduce((s, b) => s + (b.pulsos ?? 1), 0);
      if (notas.length !== pulsos && notas.length !== bloques.length) {
        malos.push(`${a.id}: ${notas.length} notas para ${bloques.length} bloques y ${pulsos} pulsos`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('en un karaoke en tres partes, la tercera es la primera más la segunda', () => {
    const malos: string[] = [];
    for (const a of actividades.filter((x) => x.tipo === 'karaoke')) {
      const ej = a.contenido.ejercicios as Array<{ notas: Nota[] }> | undefined;
      if (!ej || ej.length !== 3) continue;
      const suma = [...ej[0]!.notas, ...ej[1]!.notas];
      if (JSON.stringify(ej[2]!.notas) !== JSON.stringify(suma)) malos.push(a.id);
    }
    expect(malos).toEqual([]);
  });

  it('la percusión corporal con melodía lleva una nota o un null por golpe', () => {
    const malos: string[] = [];
    for (const a of actividades.filter((x) => x.tipo === 'cuerpo')) {
      const patron = a.contenido.patron as unknown[];
      const melodia = a.contenido.melodia as unknown[] | undefined;
      if (melodia && melodia.length !== patron.length) malos.push(`${a.id}: ${melodia.length} notas para ${patron.length} golpes`);
      for (const campo of ['volumenMelodia', 'volumenGolpes'] as const) {
        const v = a.contenido[campo] as number | undefined;
        if (v !== undefined && (v < 0 || v > 1)) malos.push(`${a.id}: ${campo} ${v}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('en tocar a tiempo, la melodía tiene una nota por golpe del patrón', () => {
    const malos: string[] = [];
    for (const a of actividades.filter((x) => x.tipo === 'tocar-a-tiempo')) {
      const melodia = a.contenido.melodia as string[] | undefined;
      if (!melodia) continue;
      const ejercicios = (a.contenido.ejercicios as Array<{ silabas?: string[] }> | undefined) ?? [a.contenido as { silabas?: string[] }];
      for (const e of ejercicios) {
        if (!e.silabas) continue;
        const golpes = rejillaDesdeSilabas(e.silabas).golpes.length;
        if (golpes !== melodia.length) malos.push(`${a.id}: ${melodia.length} notas para ${golpes} golpes`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('toda letra declara su idioma y no está vacía', () => {
    const malos: string[] = [];
    for (const a of actividades) {
      const letra = (a as { letra?: { idioma?: string; texto?: string } }).letra;
      if (!letra) continue;
      if (!letra.idioma || !letra.texto?.trim()) malos.push(a.id);
    }
    expect(malos).toEqual([]);
  });
});

/**
 * La letra de «Debajo un botón» está escrita en dos sitios y **tiene que ser la misma**.
 *
 * En C1-37 es la de la percusión corporal, cotejada contra las transcripciones de COAEM y
 * Partyflauta; en C1-40 es la que se lee en pantalla mientras se toca. Se copió de una a
 * otra sílaba a sílaba a propósito (`CLAUDE.md` §10: una letra no se escribe de memoria), y
 * sin este test nada impediría que alguien retocase una y dejase la otra diciendo otra cosa.
 *
 * Y de paso vigila lo que hace legítimo ese reparto: que las dos melodías coincidan nota por
 * nota y figura por figura. Si un día dejan de coincidir, el reparto de sílabas de C1-40 deja
 * de estar verificado y hay que rehacerlo, no ajustarlo.
 */
describe('la letra de «Debajo un botón», en sus dos actividades', () => {
  const cuerpo = actividades.find((a) => a.id === 'c1-37-debajo-un-boton-con-el-cuerpo')!;
  const karaoke = actividades.find((a) => a.id === 'c1-40-debajo-un-boton-con-la-pandilla')!;

  const silabas = cuerpo.contenido.silabas as string[];
  const melodia = cuerpo.contenido.melodia as string[];
  const patron = (cuerpo.contenido.patron as Array<{ pulsos?: number }>).map((p) => p.pulsos ?? 1);
  const entera = (karaoke.contenido.ejercicios as Array<{ notas: Array<Nota & { palabra?: string[] }> }>)
    .find((e) => e.notas.length === silabas.length)!.notas;

  it('las dos existen y tienen el mismo número de notas', () => {
    expect(silabas).toHaveLength(melodia.length);
    expect(entera).toHaveLength(melodia.length);
  });

  it('la melodía y las figuras coinciden nota por nota', () => {
    expect(entera.map((n) => n.nota)).toEqual(melodia);
    expect(entera.map((n) => n.pulsos)).toEqual(patron);
  });

  it('cada nota lleva su sílaba, y una sola', () => {
    // Una sílaba por nota es lo que distingue una letra cantada del nombre de una figura,
    // donde las sílabas se reparten DENTRO de una nota («e-le-fan-te» en una redonda).
    expect(entera.map((n) => n.palabra)).toEqual(silabas.map((s) => [s]));
  });
});

