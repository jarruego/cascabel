/**
 * Signos musicales con nombre, para el contenido: un JSON dice `"glifo": "clave-sol"` y no
 * un código de Bravura. Son puntos de la fuente Bravura (SMuFL), la misma que usa el resto
 * del proyecto; con la fuente del sistema la mitad no existen.
 *
 * Cada uno lleva su **caja**: dónde está el dibujo respecto al origen del glifo, en ems,
 * `[x0, y0, x1, y1]` con la y hacia arriba. Hace falta porque una fuente musical no coloca
 * los signos en la caja del carácter como una fuente de texto: los dibuja respecto a la
 * línea del pentagrama. La clave de sol baja dos tercios de em por debajo del origen y la
 * negra sube casi uno entero, así que centrarlos como texto los deja descolgados (lo vio el
 * autor el 2026-09-13). Las cajas se midieron en `public/fuentes/Bravura.woff2` con
 * fontTools; si cambia la fuente, se vuelven a medir.
 */
export interface Glifo {
  codigo: string;
  caja: readonly [number, number, number, number];
}

export const GLIFOS = {
  'clave-sol': { codigo: '\uE050', caja: [0.0, -0.658, 0.671, 1.098] }, // gClef
  'clave-fa': { codigo: '\uE062', caja: [-0.005, -0.635, 0.684, 0.262] }, // fClef
  redonda: { codigo: '\uE1D2', caja: [0.0, -0.137, 0.459, 0.136] }, // noteWhole
  blanca: { codigo: '\uE1D3', caja: [0.0, -0.145, 0.341, 0.875] }, // noteHalfUp
  negra: { codigo: '\uE1D5', caja: [0.0, -0.141, 0.332, 0.875] }, // noteQuarterUp
  corchea: { codigo: '\uE1D7', caja: [0.0, -0.138, 0.566, 0.873] }, // note8thUp
  'silencio-negra': { codigo: '\uE4E5', caja: [0.001, -0.375, 0.27, 0.373] }, // restQuarter
  sostenido: { codigo: '\uE262', caja: [0.0, -0.348, 0.249, 0.35] }, // accidentalSharp
  bemol: { codigo: '\uE260', caja: [0.0, -0.175, 0.226, 0.439] }, // accidentalFlat
  calderon: { codigo: '\uE4C0', caja: [0.003, -0.003, 0.605, 0.329] }, // fermataAbove
  forte: { codigo: '\uE522', caja: [-0.141, -0.152, 0.364, 0.444] }, // dynamicForte
  piano: { codigo: '\uE520', caja: [-0.089, -0.142, 0.366, 0.274] }, // dynamicPiano
  acento: { codigo: '\uE4A0', caja: [0.0, 0.001, 0.339, 0.245] }, // articAccentAbove
  repeticion: { codigo: '\uE041', caja: [0.001, 0.0, 0.367, 1.0] }, // repeatRight
  segno: { codigo: '\uE047', caja: [0.004, -0.027, 0.55, 0.759] }, // segno
  coda: { codigo: '\uE048', caja: [-0.004, -0.158, 0.955, 0.898] }, // coda
  pentagrama: { codigo: '\uE01A', caja: [0.0, -0.016, 0.75, 1.016] }, // staff5LinesWide
  uno: { codigo: '\uE081', caja: [0.02, -0.25, 0.314, 0.251] }, // timeSig1
  dos: { codigo: '\uE082', caja: [0.02, -0.257, 0.426, 0.254] }, // timeSig2
  tres: { codigo: '\uE083', caja: [0.02, -0.251, 0.401, 0.249] }, // timeSig3
  cuatro: { codigo: '\uE084', caja: [0.02, -0.25, 0.45, 0.251] }, // timeSig4
  // Flechas: las de emoji van dentro de un botón azul que no pega con nada (lo dijo el autor
  // el 2026-09-13); las de SMuFL son una flecha y nada más.
  'flecha-arriba': { codigo: '\uEB60', caja: [0.0, 0.0, 0.228, 0.527] }, // arrowBlackUp
  'flecha-abajo': { codigo: '\uEB64', caja: [0.0, 0.0, 0.228, 0.527] }, // arrowBlackDown
} as const satisfies Record<string, Glifo>;

export type NombreGlifo = keyof typeof GLIFOS;

export function esGlifo(nombre: string): nombre is NombreGlifo {
  return Object.prototype.hasOwnProperty.call(GLIFOS, nombre);
}

/**
 * El `viewBox` que centra el signo en un cuadrado, con un poco de aire, para dibujarlo con
 * `<text>` en el origen a tamaño de fuente 1: así las coordenadas del SVG son ems y la caja
 * medida vale tal cual.
 */
export function cuadroDe(nombre: NombreGlifo, aire = 1.15): { viewBox: string; lado: number } {
  const [x0, y0, x1, y1] = GLIFOS[nombre].caja;
  const lado = Math.max(x1 - x0, y1 - y0) * aire;
  const cx = (x0 + x1) / 2;
  const cy = -(y0 + y1) / 2; // en SVG la y va hacia abajo
  const f = (n: number) => n.toFixed(3);
  return { viewBox: `${f(cx - lado / 2)} ${f(cy - lado / 2)} ${f(lado)} ${f(lado)}`, lado };
}
