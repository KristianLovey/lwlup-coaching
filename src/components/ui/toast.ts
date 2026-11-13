import { toast as sonner } from 'sonner'

/**
 * Obavijesti panela (Sonner). Greške ostaju dulje jer ih treba pročitati.
 * Prikazuje ih <UiHosts/> montiran u korijenu panela.
 */
export const toast = {
  success: (message: string) => sonner.success(message),
  error: (message: string) => sonner.error(message, { duration: 6000 }),
  info: (message: string) => sonner(message),
}
