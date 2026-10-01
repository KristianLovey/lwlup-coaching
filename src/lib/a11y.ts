'use client'
import { useEffect } from 'react'
import type { KeyboardEvent } from 'react'

/**
 * Pomoć za kontrole koje nisu <button>.
 *
 * <button> besplatno donosi fokus tabom, aktivaciju Enterom i razmakom te ulogu
 * za čitač ekrana; <div onClick> ne donosi ništa od toga, pa je takav element
 * mišem upotrebljiv, a tipkovnicom nedostupan. Umjesto ručnog onClicka raširi
 * ovo — klik i tipkovnica onda idu kroz isti poziv i ne mogu se razići.
 */
export function clickable(
  onActivate: () => void,
  opts: { label?: string; pressed?: boolean; expanded?: boolean } = {},
) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': opts.label,
    'aria-pressed': opts.pressed,
    'aria-expanded': opts.expanded,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault() // razmak bi inače odskrolao stranicu
        onActivate()
      }
    },
  }
}

/**
 * Escape zatvara prozor — ono što miš dobije klikom na zatamnjenu pozadinu.
 * Bez toga se u modal uđe tabom, a izaći se ne može.
 */
export function useEscapeKey(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const fn = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose, active])
}
