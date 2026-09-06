import { describe, expect, it } from 'vitest';
import {
  aMidiSMF,
  aMusicXML,
  cantidadVariable,
  figuraXml,
  type NotaExportable,
} from '@/datos/exportar';

const MELODIA: NotaExportable[] = [
  { nota: 'C4', inicio: 0, duracion: 1 },
  { nota: 'E4', inicio: 1, duracion: 1 },
  { nota: 'G4', inicio: 2, duracion: 2 },
];

const texto = (bytes: Uint8Array, desde: number, largo: number) =>
  String.fromCharCode(...bytes.slice(desde, desde + largo));

describe('cantidad de longitud variable', () => {
  /*
    Es donde se equivoca todo el mundo. Un delta mayor de 127 escrito como un solo byte
    produce un fichero que se ABRE SIN ERROR y suena a otra cosa, porque el sintetizador
    interpreta ese byte como un evento. No hay síntoma hasta que se escucha.
  */
  it('un byte hasta 127', () => {
    expect(cantidadVariable(0)).toEqual([0x00]);
    expect(cantidadVariable(64)).toEqual([0x40]);
    expect(cantidadVariable(127)).toEqual([0x7f]);
  });

  it('dos bytes a partir de 128, con el bit alto marcando continuación', () => {
    expect(cantidadVariable(128)).toEqual([0x81, 0x00]);
    expect(cantidadVariable(480)).toEqual([0x83, 0x60]);
    expect(cantidadVariable(8192)).toEqual([0xc0, 0x00]);
  });

  it('todos los bytes menos el último llevan el bit alto', () => {
    for (const v of [200, 1000, 100000]) {
      const bytes = cantidadVariable(v);
      expect(bytes.slice(0, -1).every((b) => (b & 0x80) !== 0)).toBe(true);
      expect(bytes[bytes.length - 1]! & 0x80).toBe(0);
    }
  });

  it('rechaza un delta negativo en vez de escribir basura', () => {
    expect(() => cantidadVariable(-1)).toThrow();
  });
});

describe('fichero MIDI', () => {
  const midi = aMidiSMF(MELODIA, 120);

  it('empieza por MThd con una cabecera de seis bytes', () => {
    expect(texto(midi, 0, 4)).toBe('MThd');
    expect([...midi.slice(4, 8)]).toEqual([0, 0, 0, 6]);
  });

  it('es de formato 0 y una sola pista', () => {
    // Una melodía es una voz, y un fichero de una pista lo abre todo sin preguntar.
    expect([...midi.slice(8, 10)]).toEqual([0, 0]);
    expect([...midi.slice(10, 12)]).toEqual([0, 1]);
  });

  it('declara 480 pulsos por negra', () => {
    expect(midi[12]! * 256 + midi[13]!).toBe(480);
  });

  it('lleva un bloque MTrk cuya longitud declarada es la real', () => {
    // Si la longitud miente, el fichero no abre en ningún sitio.
    expect(texto(midi, 14, 4)).toBe('MTrk');
    const declarada =
      (midi[18]! << 24) | (midi[19]! << 16) | (midi[20]! << 8) | midi[21]!;
    expect(declarada).toBe(midi.length - 22);
  });

  it('acaba en el evento de fin de pista', () => {
    // Sin esto, muchos programas se niegan a abrirlo.
    expect([...midi.slice(-4)]).toEqual([0x00, 0xff, 0x2f, 0x00]);
  });

  it('escribe el tempo pedido', () => {
    // 120 ppm son 500000 microsegundos por negra.
    const i = midi.indexOf(0x51);
    const us = (midi[i + 2]! << 16) | (midi[i + 3]! << 8) | midi[i + 4]!;
    expect(us).toBe(500000);
  });

  it('hay tantos encendidos como apagados', () => {
    const cuenta = (estado: number) => [...midi].filter((b, i) => b === estado && i > 22).length;
    expect(cuenta(0x90)).toBe(MELODIA.length);
    expect(cuenta(0x80)).toBe(MELODIA.length);
  });

  it('una melodía vacía sigue produciendo un fichero válido', () => {
    const vacio = aMidiSMF([], 100);
    expect(texto(vacio, 0, 4)).toBe('MThd');
    expect([...vacio.slice(-4)]).toEqual([0x00, 0xff, 0x2f, 0x00]);
  });
});

describe('MusicXML', () => {
  const xml = aMusicXML(MELODIA, 120, 'Prueba');

  it('es un score-partwise con una parte', () => {
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain('<score-part id="P1">');
    expect(xml).toContain('<work-title>Prueba</work-title>');
  });

  it('escribe las notas con su altura y su octava', () => {
    expect(xml).toContain('<step>C</step>');
    expect(xml).toContain('<octave>4</octave>');
    expect(xml).toContain('<step>G</step>');
  });

  it('rellena los huecos con silencios explícitos', () => {
    /*
      MusicXML no admite huecos: un compás tiene que sumar exactamente su duración. Un
      editor que encuentre un hueco o lo rellena a su manera o se queja, así que rellenarlo
      nosotros es lo que hace que el fichero se abra igual en MuseScore y en Sibelius.
    */
    const conHueco = aMusicXML([{ nota: 'C4', inicio: 2, duracion: 1 }], 120);
    expect(conHueco).toContain('<rest/>');
  });

  it('cierra todos los compases que abre', () => {
    const abiertos = (xml.match(/<measure /g) ?? []).length;
    const cerrados = (xml.match(/<\/measure>/g) ?? []).length;
    expect(abiertos).toBe(cerrados);
    expect(abiertos).toBeGreaterThan(0);
  });

  it('declara el tempo', () => {
    expect(xml).toContain('tempo="120"');
  });
});

describe('figuras', () => {
  it('cada duración tiene su nombre', () => {
    expect(figuraXml(4)).toBe('whole');
    expect(figuraXml(2)).toBe('half');
    expect(figuraXml(1)).toBe('quarter');
    expect(figuraXml(0.5)).toBe('eighth');
    expect(figuraXml(0.25)).toBe('16th');
  });
});
