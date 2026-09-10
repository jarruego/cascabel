/**
 * Copiar un enlace al portapapeles, sin que nada salga del aparato.
 *
 * Es la manera de que un maestro pase una actividad a otro —o se la mande al ordenador del
 * aula— sin cuentas ni botones de redes: el enlace es público y no lleva nada dentro, así
 * que copiarlo no comparte ningún dato. Lo pidió el autor el 2026-09-10.
 *
 * `navigator.clipboard` exige contexto seguro y a veces permiso; cuando falla se prueba la
 * vía vieja de seleccionar un campo oculto. Devuelve si se ha copiado: quien llama decide
 * qué decir, y nunca sube una excepción.
 */
export async function copiarEnlace(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Se cae a la vía vieja.
  }
  try {
    const campo = document.createElement('textarea');
    campo.value = url;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const copiado = document.execCommand('copy');
    campo.remove();
    return copiado;
  } catch {
    return false;
  }
}

/** El enlace de la pantalla actual, sin parámetros ni ancla: lo que se comparte es la actividad. */
export function enlaceActual(): string {
  return `${window.location.origin}${window.location.pathname}`;
}
