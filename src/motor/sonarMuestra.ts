import { APP } from '@/config';

/**
 * Reproduce una muestra corta de `public/audio/`.
 *
 * Usa `HTMLAudioElement` y no el `AudioContext`: son sonidos sueltos disparados por un
 * toque, sin necesidad de precisión de milisegundos. Cuando llegue T1.7 y el sampler real,
 * las actividades rítmicas pasarán por el `AudioContext`, que sí garantiza el instante;
 * esto seguirá valiendo para los estímulos de elección y emparejamiento.
 */
export function sonarMuestra(ruta: string): HTMLAudioElement | null {
  if (!ruta) return null;
  const a = new Audio(`${APP.rutaAudio}/${ruta}`);
  void a.play().catch(() => {
    // Sin gesto previo el navegador bloquea la reproducción. No es un error del niño y
    // no debe interrumpir la actividad: se sigue, y la vía visual basta.
  });
  return a;
}

/** Dos sonidos seguidos, para la autocorrección por el oído de «emparejar». */
export async function sonarSeguidos(rutas: string[], separacionMs = 450): Promise<void> {
  for (let i = 0; i < rutas.length; i++) {
    sonarMuestra(rutas[i]!);
    if (i < rutas.length - 1) {
      await new Promise((r) => setTimeout(r, separacionMs));
    }
  }
}
