/**
 * Način rada za slabije uređaje.
 *
 * Postavka je po uređaju (localStorage), ne po računu: isti lifter na starom
 * mobitelu je želi, a na laptopu ne. Uključena znači atribut `data-perf` na
 * <html>, a globals.css onda gasi animacije, prijelaze, zamućenja, sjene i
 * pozadinske efekte. Atribut postavlja skripta u <head> (PERF_BOOT_SCRIPT) prije
 * prvog iscrtavanja, pa nema bljeska animacija dok se React ne učita.
 */

export const PERF_KEY = 'lwl:perf-mode'

/** Inline skripta za <head> — mora biti mala i ne smije baciti grešku. */
export const PERF_BOOT_SCRIPT =
  `try{if(localStorage.getItem('${PERF_KEY}')==='1')document.documentElement.setAttribute('data-perf','')}catch(e){}`

export function isPerfMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.hasAttribute('data-perf')
}

export function setPerfMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(PERF_KEY, '1')
    else localStorage.removeItem(PERF_KEY)
  } catch { /* privatni način / puna pohrana — vrijedi do osvježavanja */ }
  document.documentElement.toggleAttribute('data-perf', on)
}
