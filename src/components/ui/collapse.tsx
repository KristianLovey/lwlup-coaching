'use client'
import type { ReactNode } from 'react'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react'

/**
 * Sadržaj koji se glatko otvara i zatvara (visina + prozirnost), umjesto da
 * samo nestane. overflow: hidden vrijedi samo dok animacija traje, da ne odreže
 * tooltipe grafova. Uz prefers-reduced-motion nema animacije.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="collapse"
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}
