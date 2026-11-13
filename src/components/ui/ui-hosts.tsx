'use client'
import { Toaster } from 'sonner'
import { ConfirmHost } from './confirm'
import './ui.css'

/**
 * Toastovi i dijalog potvrde. Montira se jednom, unutar korijena panela
 * (.lwl-admin-os / .lwl-panel), da sve nasljeđuje tokene panela.
 */
export function UiHosts() {
  return (
    <>
      {/* gore u sredini: dolje su sticky trake za spremanje (meet card) */}
      <Toaster
        position="top-center"
        theme="dark"
        visibleToasts={3}
        offset={16}
        mobileOffset={12}
        gap={8}
        toastOptions={{ className: 'ui-toast', duration: 3000 }}
      />
      <ConfirmHost />
    </>
  )
}
