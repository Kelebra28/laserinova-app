/**
 * Contacto de prueba del simulador: a él no se le manda nada real por WhatsApp,
 * no cuenta para la ventana de 24 h ni dispara avisos a los administradores.
 */
export const SIMULATOR_NAME_MARKER = "Simulador";
export const SIMULATOR_CONTACT_NAME = `Cliente de Prueba (${SIMULATOR_NAME_MARKER})`;
/** Número fijo de un contacto de prueba antiguo (los nuevos tienen número aleatorio y se reconocen por el nombre). */
export const LEGACY_SIMULATOR_PHONE = "5211058132407";

export function isSimulatorContact(contact: { name?: string | null; phone?: string | null } | null | undefined): boolean {
  if (!contact) return false;
  return !!contact.name?.includes(SIMULATOR_NAME_MARKER) || !!contact.phone?.includes(LEGACY_SIMULATOR_PHONE);
}
