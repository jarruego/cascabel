import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
