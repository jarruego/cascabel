import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { encaja, palabrasDePractica } from '@/app/busqueda';

describe('lo que el buscador lee de la práctica', () => {
  it('traduce el compás a como se dice, y no busca el compás libre', () => {
    expect(encaja('seis por ocho', palabrasDePractica({ compas: '6/8' }))).toBe(true);
    expect(encaja('6/8', palabrasDePractica({ compas: '6/8' }))).toBe(true);
    expect(palabrasDePractica({ compas: 'libre' })).toBe('');
  });

  it('las figuras con su nombre de verdad, silencios incluidos', () => {
    const p = palabrasDePractica({ figuras: ['corchea', 'silencio-negra', 'sincopa'] });
    expect(encaja('corchea', p)).toBe(true);
    expect(encaja('silencio de negra', p)).toBe(true);
    expect(encaja('sincopa', p)).toBe(true);
  });

  it('el método y la secuencia, con acento o sin él', () => {
    expect(encaja('Kodály', palabrasDePractica({ metodo: ['kodaly'] }))).toBe(true);
    expect(encaja('kodaly', palabrasDePractica({ metodo: ['kodaly'] }))).toBe(true);
    expect(encaja('xilófono', palabrasDePractica({ secuencia: 'laminas' }))).toBe(true);
  });

  it('con varias palabras tienen que estar todas', () => {
    expect(encaja('tresillo 6/8', 'tresillo 6/8 seis por ocho')).toBe(true);
    expect(encaja('tresillo vals', 'tresillo 6/8 seis por ocho')).toBe(false);
  });
});

describe('el fallo que hubo: lo que se busca se encuentra', () => {
  const DIR = join(__dirname, '..', 'content', 'actividades');
  const actividades = readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as {
      id: string;
      titulo: string;
      etiquetas?: string[];
      practica?: Parameters<typeof palabrasDePractica>[0];
    });
  const pajarDe = (a: (typeof actividades)[number]) =>
    `${a.titulo} ${(a.etiquetas ?? []).join(' ')} ${palabrasDePractica(a.practica)}`;
  const busca = (q: string) => actividades.filter((a) => encaja(q, pajarDe(a))).map((a) => a.id);

  it('«anacrusa» encuentra la 329', () => {
    expect(busca('anacrusa')).toContain('c3-29-empieza-en-el-fuerte-o-antes');
  });

  it('un compositor encuentra sus obras aunque el título no lo nombre', () => {
    expect(busca('grieg')).toEqual(expect.arrayContaining(['c2-38-la-manana-de-grieg-con-la-pandilla', 'c3-45-en-la-gruta-del-rey-de-la-montana']));
    expect(busca('beethoven')).toEqual(expect.arrayContaining(['c2-14-himno-de-la-alegria', 'c2-16-cuatro-bandas', 'c3-44-para-elisa']));
  });

  it('una figura encuentra las actividades que la declaran', () => {
    expect(busca('tresillo')).toEqual(expect.arrayContaining(['c3-32-tresillo-o-corcheas', 'tr-14-ritmos-del-mundo']));
    expect(busca('semicorchea').length).toBeGreaterThanOrEqual(2);
  });

  it('toda actividad tiene alguna etiqueta', () => {
    const sin = actividades.filter((a) => !a.etiquetas?.length).map((a) => a.id);
    expect(sin).toEqual([]);
  });
});
