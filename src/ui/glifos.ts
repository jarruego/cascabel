/**
 * Signos musicales con nombre, para el contenido: un JSON dice `"glifo": "clave-sol"` y no
 * un código de Bravura. Son puntos de la fuente Bravura (SMuFL), la misma que usa el resto
 * del proyecto; con la fuente del sistema la mitad no existen.
 */
export const GLIFOS = {
  'clave-sol': '\uE050', // gClef
  'clave-fa': '\uE062', // fClef
  redonda: '\uE1D2', // noteWhole
  blanca: '\uE1D3', // noteHalfUp
  negra: '\uE1D5', // noteQuarterUp
  corchea: '\uE1D7', // note8thUp
  'silencio-negra': '\uE4E5', // restQuarter
  sostenido: '\uE262', // accidentalSharp
  bemol: '\uE260', // accidentalFlat
  calderon: '\uE4C0', // fermataAbove
  forte: '\uE522', // dynamicForte
  piano: '\uE520', // dynamicPiano
  acento: '\uE4A0', // articAccentAbove
  repeticion: '\uE041', // repeatRight
  segno: '\uE047', // segno
  coda: '\uE048', // coda
  pentagrama: '\uE014', // staff5Lines
} as const;

export type NombreGlifo = keyof typeof GLIFOS;

export function esGlifo(nombre: string): nombre is NombreGlifo {
  return Object.prototype.hasOwnProperty.call(GLIFOS, nombre);
}
